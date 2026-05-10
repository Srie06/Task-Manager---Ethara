const express = require("express");
const db = require("../db");
const authMiddleware = require("../middleware/auth");
const { requireAdmin, requireAdminOrPL } = require("../middleware/role");

const router = express.Router();

router.use(authMiddleware);

async function isProjectMember(projectId, userId) {
  const membership = await db.query(
    `SELECT 1
     FROM project_members
     WHERE project_id = $1 AND user_id = $2`,
    [projectId, userId]
  );
  return membership.rows.length > 0;
}

router.get("/", async (req, res, next) => {
  try {
    const role = req.user.role;
    let queryArgs = [];
    let filterSql = "";

    if (role === "admin") {
      filterSql = "1=1";
    } else if (role === "pl") {
      filterSql = "p.pl_id = $1";
      queryArgs.push(req.user.id);
    } else if (role === "qr") {
      filterSql = "pm.user_id = $1";
      queryArgs.push(req.user.id);
    } else if (role === "tasker") {
      filterSql = "EXISTS (SELECT 1 FROM tasks t WHERE t.project_id = p.id AND t.assigned_to = $1)";
      queryArgs.push(req.user.id);
    }

    const result = await db.query(
      `SELECT DISTINCT p.id, p.name, p.description, p.owner_id, p.pl_id, p.completion_percent, p.status, p.created_at, p.rubric_id,
              r.name AS rubric_name, u.name AS pl_name,
              (SELECT COUNT(*)::int FROM project_members pm2 WHERE pm2.project_id = p.id) AS member_count
       FROM projects p
       LEFT JOIN rubrics r ON r.id = p.rubric_id
       LEFT JOIN users u ON u.id = p.pl_id
       LEFT JOIN project_members pm ON pm.project_id = p.id
       WHERE ${filterSql}
       ORDER BY p.created_at DESC`,
      queryArgs
    );

    return res.json(result.rows);
  } catch (error) {
    return next(error);
  }
});

router.post("/", requireAdminOrPL, async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const { name, description, rubric_id: rubricIdRaw, rubric: rubricInline } = req.body;
    if (!name) return res.status(400).json({ error: "Project name is required" });

    await client.query("BEGIN");
    let rubricId = rubricIdRaw ?? null;

    if (rubricInline && typeof rubricInline === "object" && rubricInline.name) {
      const rb = rubricInline;
      const inserted = await client.query(
        `INSERT INTO rubrics (name, version, factuality_guide, helpfulness_guide, safety_guide, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [String(rb.name).trim(), rb.version || null, rb.factuality_guide || null, rb.helpfulness_guide || null, rb.safety_guide || null, req.user.id]
      );
      rubricId = inserted.rows[0].id;
    }

    const projectResult = await client.query(
      `INSERT INTO projects (name, description, owner_id, rubric_id, pl_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name.trim(), description || null, req.user.id, rubricId, req.user.role === 'pl' ? req.user.id : null]
    );

    const project = projectResult.rows[0];
    await client.query(
      `INSERT INTO project_members (project_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (project_id, user_id) DO NOTHING`,
      [project.id, req.user.id]
    );

    await client.query("COMMIT");
    return res.status(201).json(project);
  } catch (error) {
    await client.query("ROLLBACK");
    return next(error);
  } finally {
    client.release();
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const projectId = Number(req.params.id);

    const role = req.user.role;
    if (role !== "admin") {
      let canView = false;
      if (role === "pl") {
        const pCheck = await db.query(`SELECT pl_id FROM projects WHERE id=$1`, [projectId]);
        if (pCheck.rows[0]?.pl_id === req.user.id) canView = true;
      } else if (role === "qr") {
        canView = await isProjectMember(projectId, req.user.id);
      } else if (role === "tasker") {
        const d = await db.query(`SELECT 1 FROM tasks WHERE project_id=$1 AND assigned_to=$2`, [projectId, req.user.id]);
        if (d.rows.length > 0) canView = true;
      }
      if (!canView) return res.status(403).json({ error: "Not allowed to view this project" });
    }

    const projectResult = await db.query(
      `SELECT p.id, p.name, p.description, p.owner_id, p.pl_id, p.completion_percent, p.status, p.created_at, p.rubric_id,
              r.name AS rubric_name, r.version AS rubric_version,
              pl_user.name AS pl_name
       FROM projects p
       LEFT JOIN rubrics r ON r.id = p.rubric_id
       LEFT JOIN users pl_user ON p.pl_id = pl_user.id
       WHERE p.id = $1`,
      [projectId]
    );

    if (projectResult.rows.length === 0) return res.status(404).json({ error: "Project not found" });

    const membersResult = await db.query(
      `SELECT u.id, u.name, u.email, u.role, u.parent_id
       FROM project_members pm
       JOIN users u ON u.id = pm.user_id
       WHERE pm.project_id = $1
       ORDER BY CASE 
                WHEN u.role = 'admin' THEN 1
                WHEN u.role = 'pl' THEN 2
                WHEN u.role = 'qr' THEN 3
                ELSE 4 END, u.name ASC`,
      [projectId]
    );

    const taskSummaryResult = await db.query(
      `SELECT status, COUNT(*)::int as count FROM tasks WHERE project_id = $1 GROUP BY status`,
      [projectId]
    );
    const taskSummary = taskSummaryResult.rows.reduce((acc, row) => ({ ...acc, [row.status]: row.count }), {});

    return res.json({
      ...projectResult.rows[0],
      members: membersResult.rows,
      taskSummary
    });
  } catch (error) {
    return next(error);
  }
});

router.put("/:id/status", requireAdminOrPL, async (req, res, next) => {
  try {
    const projectId = Number(req.params.id);
    const { status } = req.body;
    const result = await db.query(`UPDATE projects SET status = $1 WHERE id = $2 RETURNING *`, [status, projectId]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Project not found" });
    return res.json(result.rows[0]);
  } catch (e) { return next(e); }
});

router.post("/:id/assign-pl", requireAdmin, async (req, res, next) => {
  try {
    const projectId = Number(req.params.id);
    const { pl_id } = req.body;
    const result = await db.query(`UPDATE projects SET pl_id = $1 WHERE id = $2 RETURNING *`, [pl_id, projectId]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Project not found" });

    // Optionally add them to members implicitly
    if (pl_id) {
      await db.query(`INSERT INTO project_members (project_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [projectId, pl_id]);
    }

    return res.json(result.rows[0]);
  } catch (e) { return next(e); }
});

router.post("/:id/members", async (req, res, next) => {
  try {
    if (!["admin", "pl", "qr"].includes(req.user.role)) return res.status(403).json({ error: "Not allowed" });
    const projectId = Number(req.params.id);
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const userResult = await db.query(
      `SELECT id, name, email, role FROM users WHERE email = $1`,
      [String(email).trim().toLowerCase()]
    );
    if (userResult.rows.length === 0) return res.status(404).json({ error: "User not found" });

    await db.query(
      `INSERT INTO project_members (project_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (project_id, user_id) DO NOTHING`,
      [projectId, userResult.rows[0].id]
    );
    return res.status(201).json({ message: "Member added", user: userResult.rows[0] });
  } catch (error) { return next(error); }
});

router.delete("/:id/members/:userId", async (req, res, next) => {
  try {
    if (!["admin", "pl", "qr"].includes(req.user.role)) return res.status(403).json({ error: "Not allowed" });
    const projectId = Number(req.params.id);
    const userId = Number(req.params.userId);
    await db.query(`DELETE FROM project_members WHERE project_id = $1 AND user_id = $2`, [projectId, userId]);
    return res.json({ message: "Member removed" });
  } catch (error) { return next(error); }
});

router.put("/:id", requireAdminOrPL, async (req, res, next) => {
  try {
    const projectId = Number(req.params.id);
    const { name, description, rubric_id: rubricId } = req.body;
    const result = Object.prototype.hasOwnProperty.call(req.body, "rubric_id")
      ? await db.query(
        `UPDATE projects SET name = COALESCE($1, name), description = COALESCE($2, description), rubric_id = $3 WHERE id = $4 RETURNING *`,
        [name || null, description || null, rubricId ?? null, projectId]
      )
      : await db.query(
        `UPDATE projects SET name = COALESCE($1, name), description = COALESCE($2, description) WHERE id = $3 RETURNING *`,
        [name || null, description || null, projectId]
      );

    if (result.rows.length === 0) return res.status(404).json({ error: "Project not found" });
    return res.json(result.rows[0]);
  } catch (error) { return next(error); }
});

router.delete("/:id", requireAdmin, async (req, res, next) => {
  try {
    const projectId = Number(req.params.id);
    const projectResult = await db.query(`SELECT id, owner_id FROM projects WHERE id = $1`, [projectId]);
    if (projectResult.rows.length === 0) return res.status(404).json({ error: "Project not found" });
    await db.query(`DELETE FROM projects WHERE id = $1`, [projectId]);
    return res.json({ message: "Project deleted" });
  } catch (error) { return next(error); }
});

module.exports = router;
