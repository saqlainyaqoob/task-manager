// Why this file exists: maps "HTTP method + URL" to a controller function.
const express = require('express');
const c = require('../controllers/taskController');
const { identify } = require('../middleware/auth');
const router = express.Router();

router.use(identify); // guests and logged-in users both allowed; sets req.user or req.guestId

router.get('/', c.getTasks);          // GET    /api/tasks
router.get('/:id', c.getTask);        // GET    /api/tasks/:id
router.post('/', c.createTask);       // POST   /api/tasks
router.put('/:id', c.replaceTask);    // PUT    /api/tasks/:id
router.patch('/:id', c.updateTask);   // PATCH  /api/tasks/:id
router.delete('/:id', c.deleteTask);  // DELETE /api/tasks/:id

module.exports = router;
