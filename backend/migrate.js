const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
    try {
        console.log("Migrating tasks table...");
        await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS pl_decision VARCHAR(20) DEFAULT 'pending' CHECK (pl_decision IN ('pending','confirmed','overridden'))`);
        await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS pl_reviewed_by INTEGER REFERENCES users(id)`);
        await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS pl_feedback TEXT`);

        console.log("Migrating projects table...");
        await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS pl_id INTEGER REFERENCES users(id)`);
        await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS completion_percent FLOAT DEFAULT 0`);
        await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','in_review','completed','archived'))`);

        console.log("Migration successful");
        process.exit(0);
    } catch (e) {
        console.error("Migration failed:", e.message);
        process.exit(1);
    }
}
migrate();
