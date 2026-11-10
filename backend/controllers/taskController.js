// Each function reads the request, runs SQL, sends a response.
// $1, $2... are PARAMETERS: pg sends values separately from the SQL text (prevents SQL injection).
// Authorization: every query is filtered by owner, so nobody can touch someone else's tasks.
const pool = require('../config/db');

const httpError = (status, message) => Object.assign(new Error(message), { status });

const parseId = (raw) => {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) throw httpError(400, 'id must be a positive integer');
  return id;
};

// SQL fragment + value that limits a query to the caller's own tasks. n = placeholder number.
const owner = (req, n) =>
  req.user
    ? { sql: `user_id = $${n}`, val: req.user.id }
    : { sql: `guest_id = $${n} AND user_id IS NULL`, val: req.guestId };

const validate = (body, partial) => {
  const out = {};
  if (body.title !== undefined || !partial) {
    if (typeof body.title !== 'string' || !body.title.trim() || body.title.length > 200)
      throw httpError(400, 'title is required (non-empty string, max 200 chars)');
    out.title = body.title.trim();
  }
  if (body.description !== undefined) {
    if (typeof body.description !== 'string') throw httpError(400, 'description must be a string');
    out.description = body.description;
  }
  if (body.completed !== undefined) {
    if (typeof body.completed !== 'boolean') throw httpError(400, 'completed must be true or false');
    out.completed = body.completed;
  }
  if (partial && Object.keys(out).length === 0)
    throw httpError(400, 'Provide at least one of: title, description, completed');
  return out;
};

// completed_at is set when a task becomes completed and cleared when it is reopened.
const COMPLETED_AT = (n) => `CASE WHEN $${n}::boolean THEN COALESCE(completed_at, NOW()) ELSE NULL END`;

// GET /api/tasks -> 200. Optional query: ?completed=true
exports.getTasks = async (req, res, next) => {
  try {
    const o = owner(req, 1);
    const params = [o.val];
    let sql = `SELECT * FROM tasks WHERE ${o.sql}`;
    if (req.query.completed === 'true' || req.query.completed === 'false') {
      params.push(req.query.completed === 'true');
      sql += ' AND completed = $2';
    }
    const result = await pool.query(sql + ' ORDER BY created_at DESC', params);
    res.status(200).json({ data: result.rows });
  } catch (err) { next(err); }
};

// GET /api/tasks/:id -> 200 or 404
exports.getTask = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const o = owner(req, 2);
    const result = await pool.query(`SELECT * FROM tasks WHERE id = $1 AND ${o.sql}`, [id, o.val]);
    if (result.rowCount === 0) throw httpError(404, `Task ${id} not found`);
    res.status(200).json({ data: result.rows[0] });
  } catch (err) { next(err); }
};

// POST /api/tasks -> 201
exports.createTask = async (req, res, next) => {
  try {
    const v = validate(req.body || {}, false);
    const result = await pool.query(
      `INSERT INTO tasks (title, description, completed, completed_at, user_id, guest_id)
       VALUES ($1, $2, $3, CASE WHEN $3::boolean THEN NOW() ELSE NULL END, $4, $5) RETURNING *`,
      [v.title, v.description ?? '', v.completed ?? false, req.user?.id ?? null, req.user ? null : req.guestId]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) { next(err); }
};

// PUT /api/tasks/:id -> replaces ALL editable fields
exports.replaceTask = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const v = validate(req.body || {}, false);
    const o = owner(req, 5);
    const result = await pool.query(
      `UPDATE tasks SET title = $1, description = $2, completed = $3, completed_at = ${COMPLETED_AT(3)}
       WHERE id = $4 AND ${o.sql} RETURNING *`,
      [v.title, v.description ?? '', v.completed ?? false, id, o.val]
    );
    if (result.rowCount === 0) throw httpError(404, `Task ${id} not found`);
    res.status(200).json({ data: result.rows[0] });
  } catch (err) { next(err); }
};

// PATCH /api/tasks/:id -> updates ONLY the fields sent
exports.updateTask = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const v = validate(req.body || {}, true);
    const keys = Object.keys(v); // whitelisted by validate(), so safe in SQL text
    const sets = keys.map((k, i) => `${k} = $${i + 1}`);
    if ('completed' in v) sets.push(`completed_at = ${COMPLETED_AT(keys.indexOf('completed') + 1)}`);
    const o = owner(req, keys.length + 2);
    const result = await pool.query(
      `UPDATE tasks SET ${sets.join(', ')} WHERE id = $${keys.length + 1} AND ${o.sql} RETURNING *`,
      [...keys.map((k) => v[k]), id, o.val]
    );
    if (result.rowCount === 0) throw httpError(404, `Task ${id} not found`);
    res.status(200).json({ data: result.rows[0] });
  } catch (err) { next(err); }
};

// DELETE /api/tasks/:id -> 204
exports.deleteTask = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const o = owner(req, 2);
    const result = await pool.query(`DELETE FROM tasks WHERE id = $1 AND ${o.sql}`, [id, o.val]);
    if (result.rowCount === 0) throw httpError(404, `Task ${id} not found`);
    res.status(204).send();
  } catch (err) { next(err); }
};
