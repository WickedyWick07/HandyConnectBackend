const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/adminMiddleware');
const {
    getStats, getCustomers, getProviders, getActiveJobs, setVerified, deleteUser,
} = require('../controllers/adminController');

// Every route below requires a valid token AND an admin role
router.use(authenticateJWT, adminOnly);

router.get('/stats', getStats);
router.get('/customers', getCustomers);
router.get('/providers', getProviders);
router.get('/active-jobs', getActiveJobs);
router.patch('/providers/:id/verify', setVerified);
router.delete('/users/:id', deleteUser);

module.exports = router;