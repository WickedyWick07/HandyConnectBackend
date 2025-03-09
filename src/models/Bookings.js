const mongoose = require('mongoose');

const STATUS_ENUM = ['pending', 'accepted', 'completed', 'declined'];
const ServiceBookingSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    service_provider: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceProvider', required: true },
    service: { type: String, required: true }, // Single service name/type
    location: { type: String, required: true },
    date: { type: String, required: true }, // ISO 8601 date (YYYY-MM-DD) format
    time: { type: String, required: true }, // ISO 8601 time (HH:mm:ss) format
    problem_description: { type: String, required: false }, // Single description
    status:{type:String, enum:STATUS_ENUM, default:'pending'} // Allowed values
});

module.exports = mongoose.model('ServiceBooking', ServiceBookingSchema);
