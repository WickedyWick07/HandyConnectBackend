const mongoose = require('mongoose'); 

const ServiceProviderSchema = new mongoose.Schema({
    user: {type: mongoose.Schema.Types.ObjectId, ref:'User', required: true},
    services: {type: [String], required:true},
    certifications: { type: [String], required: [true, 'At least one certification is required'] },
    profilePicture: {type:String, required:[true, 'Profile picture is required']},
    companyName: {type:String, required:true },
    description: {type:String, required: true},
    yearsInService: {type:Number, required:true},
    phoneNumber: {type:Number, required:true},
    createdAt: {type:Date, default:Date.now}},{ timestamps: true })


module.exports = mongoose.model('ServiceProvider', ServiceProviderSchema);