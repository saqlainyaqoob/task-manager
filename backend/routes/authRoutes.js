const express = require('express');
const c = require('../controllers/authController');
const { identify, requireAuth } = require('../middleware/auth');
const router = express.Router();

router.post('/register', c.register);                    // POST  /api/auth/register
router.post('/login', c.login);                          // POST  /api/auth/login
router.get('/me', identify, requireAuth, c.getMe);       // GET   /api/auth/me
router.patch('/me', identify, requireAuth, c.updateMe);  // PATCH /api/auth/me

module.exports = router;
