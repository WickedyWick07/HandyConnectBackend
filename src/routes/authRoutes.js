const express = require('express');
const { registerUser, loginUser, refreshToken, completeProviderSignup, fetchCurrentUser } = require('../controllers/authController');
const router = express.Router();
const upload = require('../middleware/upload');
const authenticateJWT = require('../middleware/authMiddleware')


console.log("authenticateJWT:", authenticateJWT); // Should log a function
console.log("fetchCurrentUser:", fetchCurrentUser);

// Define routes
router.post('/register', registerUser);
router.get('/user', (req, res) => fetchCurrentUser(req, res));
router.post('/complete-provider-signup',  (req, res, next) => {
    console.log('Route matched for /complete-provider-signup');
    next();
}, 
    upload.fields([
        { name: 'profile_picture', maxCount: 1 },
        { name: 'certifications', maxCount: 5 }
    ]),
    completeProviderSignup // Ensure this is correctly attached to the route
);

router.post('/login', loginUser);
router.post('/refresh-token', refreshToken);

// Export the router
module.exports = router;
