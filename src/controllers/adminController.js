const User = require('../models/User');
const ServiceProvider = require('../models/ServiceProvider');
const Booking = require('../models/Bookings');
const Conversation = require('../models/Conversation');
const Chat = require('../models/Chats');
const Notification = require('../models/Notifications');
const { notify } = require('../utils/notify');
const Review = require('../models/Review');

// GET /api/admin/stats
const getStats = async (req, res) => {
    try {
        const [customers, providers, verifiedProviders, byStatus] = await Promise.all([
            User.countDocuments({ role: 'customer' }),
            ServiceProvider.countDocuments(),
            ServiceProvider.countDocuments({ verified: true }),
            Booking.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
        ]);

        const b = { pending: 0, accepted: 0, completed: 0, declined: 0 };
        byStatus.forEach((s) => { if (s._id in b) b[s._id] = s.count; });

        res.json({
            customers,
            providers,
            verifiedProviders,
            pendingVerification: providers - verifiedProviders,
            activeJobs: b.accepted,
            bookings: { ...b, total: b.pending + b.accepted + b.completed + b.declined },
        });
    } catch (err) {
        console.error(err.stack);
        res.status(500).json({ message: 'Failed to load stats' });
    }
};

// GET /api/admin/customers
const getCustomers = async (req, res) => {
    try {
        const [customers, counts] = await Promise.all([
            User.find({ role: 'customer' }).select('-password').sort('-createdAt').lean(),
            Booking.aggregate([{ $group: { _id: '$user', count: { $sum: 1 } } }]),
        ]);

        const countMap = {};
        counts.forEach((c) => { countMap[String(c._id)] = c.count; });

        res.json({
            data: customers.map((c) => ({ ...c, bookingCount: countMap[String(c._id)] || 0 })),
        });
    } catch (err) {
        console.error(err.stack);
        res.status(500).json({ message: 'Failed to load customers' });
    }
};

// GET /api/admin/providers
const getProviders = async (req, res) => {
    try {
        const [providers, active, total] = await Promise.all([
            ServiceProvider.find().populate('user', '-password').sort('-createdAt').lean(),
            Booking.aggregate([
                { $match: { status: 'accepted' } },
                { $group: { _id: '$service_provider', count: { $sum: 1 } } },
            ]),
            Booking.aggregate([{ $group: { _id: '$service_provider', count: { $sum: 1 } } }]),
        ]);

        const activeMap = {};
        active.forEach((a) => { activeMap[String(a._id)] = a.count; });
        const totalMap = {};
        total.forEach((t) => { totalMap[String(t._id)] = t.count; });

        res.json({
            data: providers.map((p) => ({
                ...p,
                activeJobs: activeMap[String(p._id)] || 0,
                totalBookings: totalMap[String(p._id)] || 0,
            })),
        });
    } catch (err) {
        console.error(err.stack);
        res.status(500).json({ message: 'Failed to load providers' });
    }
};

// GET /api/admin/active-jobs
const getActiveJobs = async (req, res) => {
    try {
        const jobs = await Booking.find({ status: 'accepted' }).sort('-date').lean();

        const userIds = [...new Set(jobs.map((j) => String(j.user)))];
        const providerIds = [...new Set(jobs.map((j) => String(j.service_provider)))];

        const [users, providers] = await Promise.all([
            User.find({ _id: { $in: userIds } }).select('firstName lastName email').lean(),
            ServiceProvider.find({ _id: { $in: providerIds } }).select('companyName').lean(),
        ]);

        const userMap = {};
        users.forEach((u) => { userMap[String(u._id)] = u; });
        const providerMap = {};
        providers.forEach((p) => { providerMap[String(p._id)] = p; });

        res.json({
            data: jobs.map((j) => ({
                ...j,
                customer: userMap[String(j.user)] || null,
                provider: providerMap[String(j.service_provider)] || null,
            })),
        });
    } catch (err) {
        console.error(err.stack);
        res.status(500).json({ message: 'Failed to load active jobs' });
    }
};

// PATCH /api/admin/providers/:id/verify   body: { verified: true|false }
const setVerified = async (req, res) => {
    try {
        const verified = !!req.body.verified;

        const provider = await ServiceProvider.findByIdAndUpdate(
            req.params.id,
            { verified, verifiedAt: verified ? new Date() : null },
            { new: true }
        );

        if (!provider) return res.status(404).json({ message: 'Provider not found' });

        // Tell the provider (live, through the bell)
        await notify({
            userId: provider.user,
            type: 'system',
            title: verified ? 'Your account has been verified' : 'Your verification was removed',
            message: verified
                ? 'Customers now see the Verified badge on your profile.'
                : 'Please contact support if you think this is a mistake.',
            link: '/dashboard/service-provider',
        });

        res.json({ message: verified ? 'Provider verified' : 'Verification removed', data: provider });
    } catch (err) {
        console.error(err.stack);
        res.status(500).json({ message: 'Failed to update verification' });
    }
};

// DELETE /api/admin/users/:id   (works for customers and providers)
const deleteUser = async (req, res) => {
    try {
        const target = await User.findById(req.params.id);
        if (!target) return res.status(404).json({ message: 'User not found' });

        if (target.role === 'admin' || String(target._id) === req.adminId) {
            return res.status(400).json({ message: 'Admin accounts cannot be deleted here' });
        }

        const provider = await ServiceProvider.findOne({ user: target._id });

        // Bookings where this person is the customer or the provider
        const bookingFilter = [{ user: target._id }];
        if (provider) bookingFilter.push({ service_provider: provider._id });

        // Their conversations and messages
        const conversations = await Conversation.find({ participants: target._id }).select('_id').lean();
        const conversationIds = conversations.map((c) => c._id);

        await Promise.all([
            Booking.deleteMany({ $or: bookingFilter }),
            Chat.deleteMany({ conversationId: { $in: conversationIds } }),
            Conversation.deleteMany({ _id: { $in: conversationIds } }),
            Review.deleteMany({ $or: provider ? [{ customer: target._id }, { provider: provider._id }] : [{ customer: target._id }] }),
            Notification.deleteMany({ user: target._id }),
            provider ? ServiceProvider.deleteOne({ _id: provider._id }) : Promise.resolve(),
        ]);

        await User.deleteOne({ _id: target._id });

        res.json({ message: 'Profile deleted' });
    } catch (err) {
        console.error(err.stack);
        res.status(500).json({ message: 'Failed to delete profile' });
    }
};

module.exports = { getStats, getCustomers, getProviders, getActiveJobs, setVerified, deleteUser };