const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function createTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS chatbot_messages (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100),
      email VARCHAR(100),
      phone VARCHAR(20),
      issue TEXT,
      complaint_id VARCHAR(50) UNIQUE,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    await pool.query(query);
    console.log("✅ Table created successfully!");
  } catch (err) {
    console.error("❌ Error creating table:", err.message);
  } finally {
    await pool.end();
  }
}

createTable();
