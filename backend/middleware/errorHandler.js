// Why this file exists: ONE place that turns errors into consistent JSON.
exports.notFound = (req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
};

// Express recognises error handlers by their 4 arguments.
exports.errorHandler = (err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
  const status = err.status || 500;
  if (status === 500) console.error(err); // log real problems; show a safe message to the client
  res.status(status).json({ error: status === 500 ? 'Internal server error' : err.message });
};
