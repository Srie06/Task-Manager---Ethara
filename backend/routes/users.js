const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../db");
const authMiddleware = require("../middleware/auth");
const { requireAdmin } = require("../middleware/role");

const router = express.Router();

router.use(authMiddleware);
router.use(requireAdmin);

router.get("/", async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT u.id, u.name, u.email, u.role, u.parent_id, p.name AS parent_name
       FROM users u
       LEFT JOIN users p ON u.parent_id = p.id
       ORDER BY CASE 
                WHEN u.role = 'admin' THEN 1
                WHEN u.role = 'pl' THEN 2
                WHEN u.role = 'qr' THEN 3
                ELSE 4 END, u.name ASC`
        );
        return res.json(result.rows);
    } catch (err) { return next(err); }
});

router.post("/", async (req, res, next) => {
    try {
        const { name, email, password, role, parent_id } = req.body;
        if (!name || !email || !role || !password) {
            return res.status(400).json({ error: "Name, email, password, and role are required" });
        }
        const hash = await bcrypt.hash(String(password), 10);
        const result = await db.query(
            `INSERT INTO users (name, email, password_hash, role, parent_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, parent_id`,
            [name.trim(), String(email).toLowerCase().trim(), hash, role, parent_id || null]
        );
        return res.json(result.rows[0]);
    } catch (err) {
        if (err.code === "23505") return res.status(409).json({ error: "Email already exists" });
        return next(err);
    }
});

router.put("/:id", async (req, res, next) => {
    try {
        const { name, role, parent_id } = req.body;
        const result = await db.query(
            `UPDATE users SET name = COALESCE($1, name), role = COALESCE($2, role), parent_id = $3 WHERE id = $4 RETURNING id, name, email, role, parent_id`,
            [name || null, role || null, parent_id || null, req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
        return res.json(result.rows[0]);
    } catch (err) { return next(err); }
});

router.delete("/:id", async (req, res, next) => {
    try {
        const result = await db.query(`DELETE FROM users WHERE id = $1`, [req.params.id]);
        return res.json({ message: "deleted" });
    } catch (err) {
        if (err.code === "23503") return res.status(400).json({ error: "Cannot delete user. They own projects or tasks." });
        return next(err);
    }
});

module.exports = router;
