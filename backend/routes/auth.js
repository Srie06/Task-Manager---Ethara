const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db");

const router = express.Router();

const ALLOWED_ROLES = ["admin", "pl", "qr", "tasker"];

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

/** Public: candidates for parent assignment during signup. */
router.get("/parent-options", async (req, res, next) => {
  try {
    const forRole = String(req.query.forRole || "");
    if (forRole === "tasker") {
      const r = await db.query(
        `SELECT id, name, email FROM users WHERE role = 'qr' ORDER BY name`
      );
      return res.json(r.rows);
    }
    if (forRole === "qr") {
      const r = await db.query(
        `SELECT id, name, email FROM users WHERE role = 'pl' ORDER BY name`
      );
      return res.json(r.rows);
    }
    return res.json([]);
  } catch (error) {
    return next(error);
  }
});

router.post("/signup", async (req, res, next) => {
  try {
    const { name, email, password, role: roleRaw, parent_id: parentRaw } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email and password are required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (!normalizedEmail.includes("@")) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const role = ALLOWED_ROLES.includes(roleRaw) ? roleRaw : "tasker";
    let parentId = null;

    if (role === "tasker") {
      if (parentRaw == null) {
        return res.status(400).json({ error: "Taskers must select their QR (parent)" });
      }
      const parentIdNum = Number(parentRaw);
      const pr = await db.query(`SELECT id, role FROM users WHERE id = $1`, [parentIdNum]);
      if (pr.rows.length === 0 || pr.rows[0].role !== "qr") {
        return res.status(400).json({ error: "Parent must be an existing QR user" });
      }
      parentId = parentIdNum;
    } else if (role === "qr") {
      if (parentRaw == null) {
        return res.status(400).json({ error: "QRs must select their PL (parent)" });
      }
      const parentIdNum = Number(parentRaw);
      const pr = await db.query(`SELECT id, role FROM users WHERE id = $1`, [parentIdNum]);
      if (pr.rows.length === 0 || pr.rows[0].role !== "pl") {
        return res.status(400).json({ error: "Parent must be an existing PL user" });
      }
      parentId = parentIdNum;
    } else {
      parentId = null;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const insertedUser = await db.query(
      `INSERT INTO users (name, email, password_hash, role, parent_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, role`,
      [name.trim(), normalizedEmail, hashedPassword, role, parentId]
    );

    const user = insertedUser.rows[0];
    const token = signToken(user);

    return res.status(201).json({ token, user });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ error: "Email already exists" });
    }
    return next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const userResult = await db.query(
      `SELECT id, name, role, password_hash
       FROM users
       WHERE email = $1`,
      [normalizedEmail]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = userResult.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = signToken(user);
    return res.json({
      token,
      user: { id: user.id, name: user.name, role: user.role }
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
