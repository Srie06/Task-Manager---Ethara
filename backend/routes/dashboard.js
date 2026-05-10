const express = require("express");
const db = require("../db");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

router.use(authMiddleware);

const STATUS_KEYS = ["todo", "in_progress", "review", "done", "submitted", "qr_review", "approved", "rejected"];

function emptyByStatus() {
  return STATUS_KEYS.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});
}

router.get("/", async (req, res, next) => {
  try {
    const role = req.user.role;
    const userId = req.user.id;

    const values = [];
    let baseWhere = "";

    if (role === "admin") {
      baseWhere = "";
    } else if (role === "pl" || role === "qr" || role === "tasker") {
      baseWhere = `WHERE 1=1${req.user.appendTaskAssigneeFilter(values)}`;
    } else {
      baseWhere = "WHERE 1=1";
    }

    const totalResult = await db.query(
      `SELECT COUNT(*)::int AS total
       FROM tasks t
       ${baseWhere}`,
      values
    );

    const statusResult = await db.query(
      `SELECT t.status, COUNT(*)::int AS count
       FROM tasks t
       ${baseWhere}
       GROUP BY t.status`,
      values
    );

    const overdueValues = [...values];
    const overdueTail = `t.due_date < NOW()::date AND t.status NOT IN ('done','approved')`;
    const overdueWhere = baseWhere ? `${baseWhere} AND ${overdueTail}` : `WHERE ${overdueTail}`;

    const overdueResult = await db.query(
      `SELECT t.*, p.name AS project_name, u.name AS assignee_name
       FROM tasks t
       JOIN projects p ON p.id = t.project_id
       LEFT JOIN users u ON u.id = t.assigned_to
       ${overdueWhere}
       ORDER BY t.due_date ASC`,
      overdueValues
    );

    const pendingReviewParams = [userId];
    const pendingReviewWhere =
      role === "qr"
        ? `WHERE t.status = 'submitted' AND t.assigned_to IN (SELECT id FROM users WHERE parent_id = $1)`
        : "WHERE FALSE";

    const pendingReviewResult =
      role === "qr"
        ? await db.query(
          `SELECT COUNT(*)::int AS c FROM tasks t ${pendingReviewWhere}`,
          pendingReviewParams
        )
        : { rows: [{ c: 0 }] };

    let scopedTasksSql;
    let scopedParams;

    if (role === "admin" || role === "pl") {
      scopedTasksSql = `
        SELECT t.*, p.name AS project_name, u.name AS assignee_name
        FROM tasks t
        JOIN projects p ON p.id = t.project_id
        LEFT JOIN users u ON u.id = t.assigned_to
        ORDER BY t.updated_at DESC NULLS LAST, t.created_at DESC
        LIMIT 75`;
      scopedParams = [];
    } else if (role === "qr") {
      scopedParams = [];
      const suffix = req.user.appendTaskAssigneeFilter(scopedParams);
      scopedTasksSql = `
        SELECT t.*, p.name AS project_name, u.name AS assignee_name
        FROM tasks t
        JOIN projects p ON p.id = t.project_id
        LEFT JOIN users u ON u.id = t.assigned_to
        WHERE 1=1 ${suffix}
        ORDER BY CASE WHEN t.status = 'submitted' THEN 0 ELSE 1 END, t.due_date ASC NULLS LAST, t.created_at DESC
        LIMIT 100`;
    } else {
      scopedParams = [];
      const suffix = req.user.appendTaskAssigneeFilter(scopedParams);
      scopedTasksSql = `
        SELECT t.*, p.name AS project_name, u.name AS assignee_name
        FROM tasks t
        JOIN projects p ON p.id = t.project_id
        LEFT JOIN users u ON u.id = t.assigned_to
        WHERE 1=1 ${suffix}
        ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC
        LIMIT 100`;
    }

    const scopedTasksResult = await db.query(scopedTasksSql, scopedParams);

    const myTasksResult = await db.query(
      `SELECT t.*, p.name AS project_name
       FROM tasks t
       JOIN projects p ON p.id = t.project_id
       WHERE t.assigned_to = $1
       ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC`,
      [userId]
    );

    const completionResult = await db.query(
      `SELECT p.id AS project_id,
              p.name AS project_name,
              COUNT(t.id)::int AS total,
              COUNT(CASE WHEN t.status IN ('done','approved') THEN 1 END)::int AS done
       FROM projects p
       LEFT JOIN tasks t ON t.project_id = p.id
       ${role === "admin" || role === "pl"
        ? ""
        : "JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1"
      }
       GROUP BY p.id, p.name
       ORDER BY p.name ASC`,
      role === "admin" || role === "pl" ? [] : [userId]
    );

    const byStatus = emptyByStatus();
    statusResult.rows.forEach((row) => {
      if (Object.prototype.hasOwnProperty.call(byStatus, row.status)) {
        byStatus[row.status] = Number(row.count);
      }
    });

    const completionRate = completionResult.rows.map((row) => ({
      projectId: row.project_id,
      projectName: row.project_name,
      rate: row.total === 0 ? 0 : Math.round((row.done / row.total) * 100),
      done: row.done,
      total: row.total
    }));

    let plReviewTasks = [];
    if (role === "pl") {
      const plReviewQs = await db.query(
        `SELECT t.*, p.name AS project_name, u.name AS assignee_name, qr.name AS qr_reviewer_name
         FROM tasks t
         JOIN projects p ON p.id = t.project_id
         LEFT JOIN users u ON u.id = t.assigned_to
         LEFT JOIN users qr ON qr.id = t.reviewed_by
         WHERE p.pl_id = $1 AND t.status IN ('approved', 'rejected')
         ORDER BY t.updated_at DESC`,
        [userId]
      );
      plReviewTasks = plReviewQs.rows;
    }

    return res.json({
      totalTasks: totalResult.rows[0].total,
      byStatus,
      overdue: overdueResult.rows,
      myTasks: myTasksResult.rows,
      scopedTasks: scopedTasksResult.rows,
      pendingReviewCount: Number(pendingReviewResult.rows[0].c || 0),
      completionRate,
      plReviewTasks
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
