const mongoose = require('mongoose');
const argon2 = require('argon2'); // Use argon2 for hashing

const userSchema = new mongoose.Schema({
    firstName: {type:String, required:true},
    lastName: {type:String, required:true},
    password: {type:String, required:true, unique:true},
    email: {type:String, required:true},
    location:{type:String, required:true},
    role: {type:String, enum:['customer', 'service provider'], default: 'customer'},
    longitude: { type: Number },  // Store longitude directly
    latitude: { type: Number },  // Store latitude directly
    },{timestamps: true})

  
const User = mongoose.model('User', userSchema)
module.exports = User; 