// Why this file exists: configures Express and starts listening.
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const taskRoutes = require('./routes/taskRoutes');
const authRoutes = require('./routes/authRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

if (!process.env.JWT_SECRET) {
  console.error('Missing JWT_SECRET in backend/.env (see .env.example)');
  process.exit(1);
}

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN })); // allow the React dev server
app.use(express.json());                              // parse JSON request bodies into req.body

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);                    // every /api/tasks/... request goes to the router
app.use(notFound);                                    // no route matched -> 404
app.use(errorHandler);                                // must be LAST: catches all errors

const PORT = process.env.PORT || 5001;
app.listen(PORT, (err) => {
  if (err) {
    console.error(`Could not start on port ${PORT}:`, err.message);
    process.exit(1);
  }
  console.log(`API running on http://localhost:${PORT}`);
});
