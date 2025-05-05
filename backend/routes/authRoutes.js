const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Kök dizin route'u
router.get('/', (req, res) => {
  res.send('Sunucu çalışıyor! API endpointleri: /api/auth/signup');
});

// Diğer route'lar
router.post('/signup', authController.signup);

module.exports = router;