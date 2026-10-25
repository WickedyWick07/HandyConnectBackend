const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceProvider', required: true, index: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    review: { type: String, required: true, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Review', reviewSchema);