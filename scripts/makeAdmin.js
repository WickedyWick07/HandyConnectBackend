require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const User = require('../src/models/User');

(async () => {
    const email = process.argv[2];
    if (!email) {
        console.error('Usage: node scripts/makeAdmin.js <email>');
        process.exit(1);
    }

    await connectDB();

    // updateOne skips enum validation, so this works even before you edit the model
    const result = await User.updateOne({ email }, { role: 'admin' });

    if (result.matchedCount === 0) console.log('No user found with that email');
    else console.log(`${email} is now an admin`);

    await mongoose.disconnect();
    process.exit(0);
})();