const User = require('../models/User');

// Runs AFTER authenticateJWT. Checks the role in the database, not the token,
// so a demoted admin loses access immediately.
const adminOnly = async (req, res, next) => {
    try {
        const id = req.user?.id || req.user?._id || req.user?.userId;
        const user = await User.findById(id).select('role').lean();

        if (!user || user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }

        req.adminId = String(user._id);
        next();
    } catch (err) {
        console.error('adminOnly error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { adminOnly };