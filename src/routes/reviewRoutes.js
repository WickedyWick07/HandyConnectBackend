const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/authMiddleware');
const { createReview, getProviderReviews, getMyReviews } = require('../controllers/reviewController');

router.get('/mine', authenticateJWT, getMyReviews);
router.get('/provider/:providerId', getProviderReviews);
router.post('/', authenticateJWT, createReview);

module.exports = router;