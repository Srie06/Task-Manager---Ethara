const express = require("express");
const db = require("../db");
const authMiddleware = require("../middleware/auth");
const { requireAdminOrPL } = require("../middleware/role");

const router = express.Router();

router.use(authMiddleware);

router.get("/", async (_req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, name, version, factuality_guide, helpfulness_guide, safety_guide, created_by, created_at
       FROM rubrics
       ORDER BY created_at DESC`
    );
    return res.json(result.rows);
  } catch (err) {
    return next(err);
  }
});

router.post("/", requireAdminOrPL, async (req, res, next) => {
  try {
    const { name, version, factuality_guide, helpfulness_guide, safety_guide } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Rubric name is required" });
    }
    const result = await db.query(
      `INSERT INTO rubrics (name, version, factuality_guide, helpfulness_guide, safety_guide, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        name.trim(),
        version || null,
        factuality_guide || null,
        helpfulness_guide || null,
        safety_guide || null,
        req.user.id
      ]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
