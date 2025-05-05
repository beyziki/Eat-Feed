const pool = require('../config/db');

async function createUser({ name, surname, email, phone, password, role, token }) {
  const sql = `INSERT INTO users (name, surname, email, phone, password, role, verification_token, is_verified)
               VALUES (?, ?, ?, ?, ?, ?, ?, 0)`;
  await pool.execute(sql, [name, surname, email, phone, password, role, token]);
}

async function verifyUser(token) {
  const sql = `UPDATE users SET is_verified = 1 WHERE verification_token = ?`;
  const [result] = await pool.execute(sql, [token]);
  return result.affectedRows > 0;
}

async function findUserByEmail(email) {
  const sql = `SELECT * FROM users WHERE email = ?`;
  const [rows] = await pool.execute(sql, [email]);
  return rows[0];
}

module.exports = { createUser, verifyUser, findUserByEmail };
