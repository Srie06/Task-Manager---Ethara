const express = require("express");
const db = require("../db");
const authMiddleware = require("../middleware/auth");
const { requireAdminOrPL } = require("../middleware/role");
const { passesApprovalGate, assertScore } = require("../lib/approvalGate");

const router = express.Router();

/** Linear workflow ordering for constrained role updates via PUT /:id (non-privileged users). */
const STATUS_ORDER = [
  "todo",
  "in_progress",
  "review",
  "done",
  "submitted",
  "qr_review",
  "approved",
  "rejected"
];

router.use(authMiddleware);

async function isProjectMember(projectId, userId) {
  const result = await db.query(
    `SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2`,
    [projectId, userId]
  );
  return result.rows.length > 0;
}

async function updateProjectCompletion(projectId) {
  const r = await db.query(`
    SELECT COUNT(*)::int AS total, COUNT(CASE WHEN status IN ('approved', 'done') THEN 1 END)::int AS done
    FROM tasks WHERE project_id = $1
  `, [projectId]);
  if (r.rows.length === 0) return;
  const { total, done } = r.rows[0];
  const percent = total > 0 ? (done / total) * 100 : 0;

  const projQuery = await db.query(`SELECT status FROM projects WHERE id = $1`, [projectId]);
  let status = projQuery.rows[0]?.status || 'active';
  if (total > 0 && done === total && status === 'active') status = 'in_review';

  await db.query(`UPDATE projects SET completion_percent = $1, status = $2 WHERE id = $3`, [percent, status, projectId]);
}

async function logQrSubmissionNotification(assigneeId, task) {
  const r = await db.query(`SELECT parent_id, role FROM users WHERE id = $1`, [assigneeId]);
  const parentId = r.rows[0]?.parent_id;
  if (!parentId) return;
  console.info(
    JSON.stringify({
      type: "TASK_SUBMITTED_NOTIFY_QR",
      qrUserId: parentId,
      taskerId: assigneeId,
      taskId: task.id,
      title: task.title,
      timestamp: new Date().toISOString()
    })
  );
}

router.get("/", async (req, res, next) => {
  try {
    const { project_id: projectIdRaw, status, assigned_to: assignedTo } = req.query;
    if (!projectIdRaw) {
      return res.status(400).json({ error: "project_id query param is required" });
    }

    const projectId = Number(projectIdRaw);
    const allowed = await isProjectMember(projectId, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: "Not allowed to view tasks for this project" });
    }

    const values = [projectId];
    let where = "WHERE t.project_id = $1";

    if (status) {
      values.push(status);
      where += ` AND t.status = $${values.length}`;
    }

    if (assignedTo) {
      if (assignedTo === "me") {
        values.push(req.user.id);
      } else {
        values.push(Number(assignedTo));
      }
      where += ` AND t.assigned_to = $${values.length}`;
    }

    where += req.user.appendTaskAssigneeFilter(values);

    const result = await db.query(
      `SELECT t.*, u.name AS assignee_name, p.name AS project_name
       FROM tasks t
       LEFT JOIN users u ON u.id = t.assigned_to
       JOIN projects p ON p.id = t.project_id
       ${where}
       ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC`,
      values
    );

    return res.json(result.rows);
  } catch (error) {
    return next(error);
  }
});

router.post("/", requireAdminOrPL, async (req, res, next) => {
  try {
    const {
      title,
      description,
      project_id: projectId,
      assigned_to: assignedTo,
      due_date: dueDate,
      priority,
      status,
      prompt,
      response_a,
      response_b,
      rationale
    } = req.body;

    if (!title || !projectId || !dueDate) {
      return res.status(400).json({ error: "title, project_id and due_date are required" });
    }

    if (assignedTo) {
      const assigneeIsMember = await db.query(
        `SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2`,
        [projectId, assignedTo]
      );
      if (assigneeIsMember.rows.length === 0) {
        return res.status(400).json({ error: "Assignee must be a project member" });
      }
    }

    const task = await db.query(
      `INSERT INTO tasks (
         project_id, title, description, assigned_to, status, priority, due_date,
         created_by, prompt, response_a, response_b, rationale
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        projectId,
        title,
        description || null,
        assignedTo || null,
        status || "todo",
        priority || "medium",
        dueDate,
        req.user.id,
        prompt || null,
        response_a || null,
        response_b || null,
        rationale || null
      ]
    );

    return res.status(201).json(task.rows[0]);
  } catch (error) {
    return next(error);
  }
});

router.put("/:id/submit", async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    const taskResult = await db.query(`SELECT * FROM tasks WHERE id = $1`, [taskId]);
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    const task = taskResult.rows[0];
    const memberOk = await isProjectMember(task.project_id, req.user.id);
    if (!memberOk) {
      return res.status(403).json({ error: "Not allowed" });
    }

    if (req.user.role !== "tasker") {
      return res.status(403).json({ error: "Only taskers can submit work" });
    }

    if (task.assigned_to !== req.user.id) {
      return res.status(403).json({ error: "Only assigned tasker can submit this task" });
    }

    if (task.status !== "in_progress") {
      return res.status(400).json({ error: "Task must be in_progress before submission" });
    }

    const {
      rationale,
      prompt,
      response_a,
      response_b,
      factuality_score,
      helpfulness_score,
      safety_score
    } = req.body || {};

    if (!rationale || String(rationale).trim().length < 20) {
      return res.status(400).json({ error: "Rationale must be at least 20 characters" });
    }

    const updated = await db.query(
      `UPDATE tasks
       SET status = 'submitted',
           rationale = $1,
           prompt = COALESCE($2, prompt),
           response_a = COALESCE($3, response_a),
           response_b = COALESCE($4, response_b),
           factuality_score = COALESCE($5, factuality_score),
           helpfulness_score = COALESCE($6, helpfulness_score),
           safety_score = COALESCE($7, safety_score),
           updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [
        String(rationale).trim(),
        prompt ?? null,
        response_a ?? null,
        response_b ?? null,
        factuality_score ?? null,
        helpfulness_score ?? null,
        safety_score ?? null,
        taskId
      ]
    );

    await logQrSubmissionNotification(req.user.id, updated.rows[0]);
    await updateProjectCompletion(task.project_id);

    return res.json(updated.rows[0]);
  } catch (error) {
    return next(error);
  }
});

router.put("/:id/review", async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    const taskResult = await db.query(`SELECT * FROM tasks WHERE id = $1`, [taskId]);
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    const task = taskResult.rows[0];
    const memberOk = await isProjectMember(task.project_id, req.user.id);
    if (!memberOk) {
      return res.status(403).json({ error: "Not allowed" });
    }

    if (req.user.role !== "qr") {
      return res.status(403).json({ error: "Only QR may review submissions" });
    }

    if (task.status !== "submitted") {
      return res.status(400).json({ error: "Task must be submitted before review" });
    }

    if (!task.assigned_to) {
      return res.status(400).json({ error: "Task has no assignee" });
    }

    const assigneeRes = await db.query(`SELECT id, parent_id, role FROM users WHERE id = $1`, [
      task.assigned_to
    ]);
    const assignee = assigneeRes.rows[0];
    if (!assignee || assignee.role !== "tasker" || assignee.parent_id !== req.user.id) {
      return res.status(403).json({ error: "You are not the QR for this tasker" });
    }

    const { decision, feedback, factuality_score, helpfulness_score, safety_score } = req.body || {};

    if (decision !== "approved" && decision !== "rejected") {
      return res.status(400).json({ error: "decision must be approved or rejected" });
    }

    if (decision === "rejected") {
      const fb = feedback ? `\n\n[QR feedback]: ${String(feedback)}` : "";
      const updated = await db.query(
        `UPDATE tasks
         SET status = 'rejected',
             reviewed_by = $1,
             description = COALESCE(description, '') || $2,
             updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [req.user.id, fb, taskId]
      );
      await updateProjectCompletion(task.project_id);
      return res.json(updated.rows[0]);
    }

    const f = assertScore(factuality_score, "factuality_score");
    const h = assertScore(helpfulness_score, "helpfulness_score");
    const s = assertScore(safety_score, "safety_score");

    const candidateRow = {
      ...task,
      factuality_score: f,
      helpfulness_score: h,
      safety_score: s,
      reviewed_by: req.user.id
    };

    if (!passesApprovalGate(candidateRow)) {
      return res.status(400).json({
        error: "Approval validation failed: rationale (min 20 chars), scores, and reviewer must be present"
      });
    }

    const updated = await db.query(
      `UPDATE tasks
       SET status = 'approved',
           reviewed_by = $1,
           factuality_score = $2,
           helpfulness_score = $3,
           safety_score = $4,
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [req.user.id, f, h, s, taskId]
    );

    await updateProjectCompletion(task.project_id);
    return res.json(updated.rows[0]);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    return next(error);
  }
});

router.put("/:id/pl-review", requireAdminOrPL, async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    const taskResult = await db.query(`SELECT * FROM tasks WHERE id = $1`, [taskId]);
    if (taskResult.rows.length === 0) return res.status(404).json({ error: "Task not found" });
    const task = taskResult.rows[0];

    if (req.user.role !== "pl") {
      return res.status(403).json({ error: "Only PL can perform PL review" });
    }

    const { decision, feedback } = req.body || {};
    if (!["confirmed", "overridden"].includes(decision)) {
      return res.status(400).json({ error: "decision must be confirmed or overridden" });
    }

    let nextStatus = task.status;
    if (decision === "overridden") {
      if (task.status === "rejected") nextStatus = "approved";
      else if (task.status === "approved" || task.status === "done") nextStatus = "rejected";
    }

    const updated = await db.query(
      `UPDATE tasks
       SET status = $1,
           pl_decision = $2,
           pl_reviewed_by = $3,
           pl_feedback = COALESCE($4, pl_feedback),
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [nextStatus, decision, req.user.id, feedback || null, taskId]
    );

    await updateProjectCompletion(task.project_id);
    return res.json(updated.rows[0]);
  } catch (err) {
    return next(err);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    const existingTask = await db.query(`SELECT * FROM tasks WHERE id = $1`, [taskId]);
    if (existingTask.rows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    const task = existingTask.rows[0];
    const allowed = await isProjectMember(task.project_id, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: "Not allowed to update this task" });
    }

    const privileged = ["admin", "pl"].includes(req.user.role);

    const visParams = [taskId];
    const visSql = req.user.appendTaskAssigneeFilter(visParams);
    const visCheck = await db.query(`SELECT 1 FROM tasks t WHERE t.id = $1 ${visSql}`, visParams);
    if (visCheck.rows.length === 0 && !privileged) {
      return res.status(403).json({ error: "Not allowed to update this task in your role scope" });
    }

    if (!privileged) {
      const keys = Object.keys(req.body || {});
      if (!keys.every((k) => k === "status")) {
        return res.status(403).json({ error: "You can only update task status" });
      }
    }

    const nextStatus = req.body.status || task.status;
    if (!STATUS_ORDER.includes(nextStatus)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    if (req.body.status && !privileged) {
      if (req.body.status === "submitted") {
        return res.status(400).json({ error: "Use /submit endpoint to move to submitted" });
      }
      if (["submitted", "qr_review", "approved", "rejected"].includes(task.status)) {
        return res.status(400).json({ error: "Status is managed via submit/review workflow" });
      }
      const currentIndex = STATUS_ORDER.indexOf(task.status);
      const nextIndex = STATUS_ORDER.indexOf(req.body.status);
      if (Math.abs(nextIndex - currentIndex) > 1) {
        return res.status(400).json({ error: "Invalid status transition" });
      }
    }

    const result = await db.query(
      `UPDATE tasks
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           assigned_to = COALESCE($3, assigned_to),
           status = COALESCE($4, status),
           priority = COALESCE($5, priority),
           due_date = COALESCE($6, due_date),
           prompt = COALESCE($7, prompt),
           response_a = COALESCE($8, response_a),
           response_b = COALESCE($9, response_b),
           factuality_score = COALESCE($10, factuality_score),
           helpfulness_score = COALESCE($11, helpfulness_score),
           safety_score = COALESCE($12, safety_score),
           rationale = COALESCE($13, rationale),
           reviewed_by = COALESCE($14, reviewed_by),
           updated_at = NOW()
       WHERE id = $15
       RETURNING *`,
      [
        privileged ? req.body.title || null : null,
        privileged ? req.body.description || null : null,
        privileged ? req.body.assigned_to ?? null : null,
        req.body.status || null,
        privileged ? req.body.priority || null : null,
        privileged ? req.body.due_date || null : null,
        privileged ? req.body.prompt ?? null : null,
        privileged ? req.body.response_a ?? null : null,
        privileged ? req.body.response_b ?? null : null,
        privileged ? req.body.factuality_score ?? null : null,
        privileged ? req.body.helpfulness_score ?? null : null,
        privileged ? req.body.safety_score ?? null : null,
        privileged ? req.body.rationale ?? null : null,
        privileged ? req.body.reviewed_by ?? null : null,
        taskId
      ]
    );

    const updated = result.rows[0];

    if (updated.status === "approved" && !passesApprovalGate(updated)) {
      await db.query(`UPDATE tasks SET status = $1 WHERE id = $2`, [task.status, taskId]);
      return res.status(400).json({
        error: "Cannot approve without complete scores, rationale (min 20 chars), and reviewed_by"
      });
    }

    await updateProjectCompletion(task.project_id);
    return res.json(updated);
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", requireAdminOrPL, async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    await db.query(`DELETE FROM tasks WHERE id = $1`, [taskId]);
    return res.json({ message: "Task deleted" });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
