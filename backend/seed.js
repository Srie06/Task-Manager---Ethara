const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
    try {
        const hash = await bcrypt.hash('password123', 10);

        // Create Users (Admin, PL, QR, Tasker)
        const adminReq = await pool.query(
            `INSERT INTO users (name, email, password_hash, role) VALUES ('Admin User', 'admin@taskflow.com', $1, 'admin') RETURNING id`, [hash]
        );
        const adminId = adminReq.rows[0].id;

        const plReq = await pool.query(
            `INSERT INTO users (name, email, password_hash, role, parent_id) VALUES ('PL User', 'pl@taskflow.com', $1, 'pl', $2) RETURNING id`, [hash, adminId]
        );
        const plId = plReq.rows[0].id;

        const qrReq = await pool.query(
            `INSERT INTO users (name, email, password_hash, role, parent_id) VALUES ('QR User', 'qr@taskflow.com', $1, 'qr', $2) RETURNING id`, [hash, plId]
        );
        const qrId = qrReq.rows[0].id;

        const taskerReq = await pool.query(
            `INSERT INTO users (name, email, password_hash, role, parent_id) VALUES ('Tasker User', 'tasker@taskflow.com', $1, 'tasker', $2) RETURNING id`, [hash, qrId]
        );
        const taskerId = taskerReq.rows[0].id;

        console.log("Users created");

        // Create Project
        const projectReq = await pool.query(
            `INSERT INTO projects (name, description, owner_id) VALUES ('Mobile App UI Mockup', 'Redesigning the iOS home screen.', $1) RETURNING id`, [plId]
        );
        const projectId = projectReq.rows[0].id;

        // Add member (admin, pl, qr, tasker logic handled on backend if they are members)
        await pool.query(`INSERT INTO project_members (project_id, user_id) VALUES ($1, $2)`, [projectId, adminId]);
        await pool.query(`INSERT INTO project_members (project_id, user_id) VALUES ($1, $2)`, [projectId, plId]);
        await pool.query(`INSERT INTO project_members (project_id, user_id) VALUES ($1, $2)`, [projectId, qrId]);
        await pool.query(`INSERT INTO project_members (project_id, user_id) VALUES ($1, $2)`, [projectId, taskerId]);

        console.log("Project created");

        // Tasks for everyone to see
        // 1. Tasker sees a TODO.
        await pool.query(
            `INSERT INTO tasks (project_id, title, description, assigned_to, status, priority, due_date) VALUES ($1, 'Setup Initial Skeleton', 'Create the React Native scaffolding', $2, 'todo', 'high', '2026-06-01')`,
            [projectId, taskerId]
        );

        // 2. Tasker sees IN_PROGRESS.
        await pool.query(
            `INSERT INTO tasks (project_id, title, description, assigned_to, status, priority, due_date) VALUES ($1, 'Header Component', 'Build the blue header.', $2, 'in_progress', 'medium', '2026-05-15')`,
            [projectId, taskerId]
        );

        // 3. QR sees SUBMITTED
        await pool.query(
            `INSERT INTO tasks (project_id, title, description, assigned_to, status, priority, due_date, rationale) VALUES ($1, 'User Profile Page', 'Re-design the user avatar and settings blocks.', $2, 'submitted', 'high', '2026-05-10', 'Attached all styles.')`,
            [projectId, taskerId]
        );

        // 4. Admin/PL sees DONE
        await pool.query(
            `INSERT INTO tasks (project_id, title, description, assigned_to, status, priority, due_date, factuality_score, helpfulness_score, safety_score) VALUES ($1, 'Database Refactor', 'Apply indexes', $2, 'done', 'low', '2026-05-01', 7, 7, 7)`,
            [projectId, taskerId]
        );

        console.log("Seed complete");
        process.exit(0);

    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}
seed();
