const mongoose = require('mongoose');
const Review = require('../models/Review');
const Booking = require('../models/Bookings');
const ServiceProvider = require('../models/ServiceProvider');
const { notify } = require('../utils/notify');

const getUserId = (req) => req.user?.id || req.user?._id || req.user?.userId;

// POST /api/reviews   body: { bookingId, rating, review }
const createReview = async (req, res) => {
  try {
    const { bookingId, rating, review } = req.body;
    const stars = Number(rating);
    const text = (review || '').trim();

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ message: 'Invalid booking' });
    }
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }
    if (!text || text.length > 500) {
      return res.status(400).json({ message: 'Review must be 1 to 500 characters' });
    }

    const booking = await Booking.findById(bookingId).lean();
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const userId = getUserId(req);
    if (String(booking.user) !== String(userId)) {
      return res.status(403).json({ message: 'You can only review your own bookings' });
    }
    if (booking.status !== 'completed') {
      return res.status(400).json({ message: 'You can only review completed bookings' });
    }

    let created;
    try {
      created = await Review.create({
        booking: booking._id,
        provider: booking.service_provider,
        customer: userId,
        rating: stars,
        review: text,
      });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({ message: 'You have already reviewed this booking' });
      }
      throw err;
    }

    // Tell the provider (live, through the bell)
    try {
      const provider = await ServiceProvider.findById(booking.service_provider).select('user');
      if (provider?.user) {
        await notify({
          userId: provider.user,
          type: 'system',
          title: `New ${stars}-star review`,
          message: text.length > 80 ? `${text.slice(0, 80)}...` : text,
          link: '/dashboard/service-provider',
        });
      }
    } catch (notifyErr) {
      console.error('Review notification failed:', notifyErr.message);
    }

    res.status(201).json({ message: 'Review submitted', data: created });
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ message: 'Failed to submit review' });
  }
};

// GET /api/reviews/provider/:providerId   (ServiceProvider _id)
const getProviderReviews = async (req, res) => {
  try {
    const { providerId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(providerId)) {
      return res.status(400).json({ message: 'Invalid provider' });
    }

    const reviews = await Review.find({ provider: providerId })
      .populate('customer', 'firstName lastName')
      .sort('-createdAt')
      .lean();

    const count = reviews.length;
    const average = count
      ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / count) * 10) / 10
      : 0;

    res.json({
      average,
      count,
      data: reviews.map((r) => ({
        _id: r._id,
        rating: r.rating,
        review: r.review,
        createdAt: r.createdAt,
        reviewer_name: r.customer
          ? `${r.customer.firstName || ''} ${r.customer.lastName ? r.customer.lastName[0] + '.' : ''}`.trim()
          : 'Customer',
      })),
    });
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ message: 'Failed to load reviews' });
  }
};

// GET /api/reviews/mine  -> which of my bookings I already reviewed
const getMyReviews = async (req, res) => {
  try {
    const mine = await Review.find({ customer: getUserId(req) }).select('booking rating').lean();
    res.json({ data: mine.map((r) => ({ booking: String(r.booking), rating: r.rating })) });
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ message: 'Failed to load your reviews' });
  }
};

module.exports = { createReview, getProviderReviews, getMyReviews };