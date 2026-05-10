const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function reset() {
  await pool.query('DROP TABLE IF EXISTS tasks CASCADE');
  await pool.query('DROP TABLE IF EXISTS project_members CASCADE');
  await pool.query('DROP TABLE IF EXISTS projects CASCADE');
  await pool.query('DROP TABLE IF EXISTS rubrics CASCADE');
  await pool.query('DROP TABLE IF EXISTS users CASCADE');
  console.log('Dropped all tables!');
  
  const schema = fs.readFileSync('./schema.sql', 'utf8');
  await pool.query(schema);
  console.log('All tables recreated successfully!');
  process.exit(0);
}

reset().catch(e => {
  console.error(e.message);
  process.exit(1);
});