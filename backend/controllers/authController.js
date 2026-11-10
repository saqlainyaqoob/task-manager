// Register, login, and profile. Passwords are hashed with bcrypt; sessions are JWTs.
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const httpError = (status, message) => Object.assign(new Error(message), { status });
const sign = (id) => jwt.sign({ sub: String(id) }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
const GUEST_RE = /^[A-Za-z0-9-]{8,64}$/;

// When a guest signs in or registers, their guest tasks become the user's tasks.
async function claimGuestTasks(userId, guestId) {
  if (typeof guestId === 'string' && GUEST_RE.test(guestId)) {
    await pool.query('UPDATE tasks SET user_id = $1, guest_id = NULL WHERE guest_id = $2 AND user_id IS NULL', [userId, guestId]);
  }
}

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, guestId } = req.body || {};
    if (typeof name !== 'string' || !name.trim() || name.length > 80) throw httpError(400, 'name is required (max 80 chars)');
    if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email)) throw httpError(400, 'a valid email is required');
    if (typeof password !== 'string' || password.length < 8) throw httpError(400, 'password must be at least 8 characters');

    const hash = await bcrypt.hash(password, 10);
    let result;
    try {
      result = await pool.query(
        'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, created_at',
        [name.trim(), email.trim().toLowerCase(), hash]
      );
    } catch (err) {
      if (err.code === '23505') throw httpError(409, 'That email is already registered'); // unique violation
      throw err;
    }
    const user = result.rows[0];
    await claimGuestTasks(user.id, guestId);
    res.status(201).json({ data: { token: sign(user.id), user } });
  } catch (err) { next(err); }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password, guestId } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string') throw httpError(400, 'email and password are required');
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.trim().toLowerCase()]);
    const row = result.rows[0];
    // Same message for "no such user" and "wrong password" so attackers learn nothing.
    if (!row || !(await bcrypt.compare(password, row.password_hash))) throw httpError(401, 'Invalid email or password');
    await claimGuestTasks(row.id, guestId);
    const { password_hash, ...user } = row;
    res.status(200).json({ data: { token: sign(user.id), user } });
  } catch (err) { next(err); }
};

exports.getMe = async (req, res, next) => {
  try {
    const result = await pool.query('SELECT id, name, email, created_at FROM users WHERE id = $1', [req.user.id]);
    if (result.rowCount === 0) throw httpError(401, 'Account no longer exists');
    res.status(200).json({ data: result.rows[0] });
  } catch (err) { next(err); }
};

exports.updateMe = async (req, res, next) => {
  try {
    const { name } = req.body || {};
    if (typeof name !== 'string' || !name.trim() || name.length > 80) throw httpError(400, 'name is required (max 80 chars)');
    const result = await pool.query(
      'UPDATE users SET name = $1 WHERE id = $2 RETURNING id, name, email, created_at',
      [name.trim(), req.user.id]
    );
    res.status(200).json({ data: result.rows[0] });
  } catch (err) { next(err); }
};
