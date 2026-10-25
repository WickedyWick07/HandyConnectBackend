const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/adminMiddleware');
const upload = require('../middleware/upload'); // ← your multer file name
const {
    getStats, getCustomers, getProviders, getActiveJobs, setVerified, deleteUser,
    addCertifications, replaceCertification, removeCertification, replaceProfilePicture,
} = require('../controllers/adminController');

// Turns multer errors (wrong type, over 5 MB) into a clean JSON message
const handleUpload = (middleware) => (req, res, next) =>
    middleware(req, res, (err) => {
        if (err) return res.status(400).json({ message: err.message });
        next();
    });

router.use(authenticateJWT, adminOnly);

router.get('/stats', getStats);
router.get('/customers', getCustomers);
router.get('/providers', getProviders);
router.get('/active-jobs', getActiveJobs);
router.patch('/providers/:id/verify', setVerified);
router.delete('/users/:id', deleteUser);

router.post('/providers/:id/certifications', handleUpload(upload.array('certifications', 10)), addCertifications);
router.put('/providers/:id/certifications', handleUpload(upload.single('file')), replaceCertification);
router.delete('/providers/:id/certifications', removeCertification);
router.put('/providers/:id/profile-picture', handleUpload(upload.single('file')), replaceProfilePicture);

module.exports = router;