const UserSettings = require('../models/UserSettings');
const User = require('../models/User');
const express = require('express');
const argon2 = require('argon2');


// Update Language
const updateLanguage = async (req, res) => {
    try {
        const { user, language } = req.body;
        const userSettings = await UserSettings.findOne({ user });

        if (!userSettings) {
            return res.status(404).json({ message: 'User settings not found' });
        }

        userSettings.language = language;
        await userSettings.save();

        res.status(200).json({ message: 'Language updated successfully' });
    } catch (error) {
        console.error('Error updating language:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

const changePassword = async (req, res) => {
    try {
        const { user, currentPassword, newConfirmedPassword } = req.body;

        if (!user || !currentPassword || !newConfirmedPassword) {
            return res.status(400).json({ message: 'User ID and password are required to change password' });
        }

        const existingUser = await User.findById(user._id);
        if (!existingUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isMatch = await argon2.verify(existingUser.password, currentPassword);
        if (!isMatch) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }
        const hashedPassword = await argon2.hash(newConfirmedPassword);

        existingUser.password = hashedPassword;
        await existingUser.save({ validateModifiedOnly: true });


        return res.status(200).json({ message: 'Password updated successfully' });
    } catch (err) {
        console.error('Error changing password:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};


// Update Region
const updateRegion = async (req, res) => {
    try {
        const { user, region } = req.body;
        const userSettings = await UserSettings.findOne({ user });

        if (!userSettings) {
            return res.status(404).json({ message: 'User settings not found' });
        }

        userSettings.region = region;
        await userSettings.save();

        res.status(200).json({ message: 'Region updated successfully' });
    } catch (error) {
        console.error('Error updating region:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};



// Update Notifications
const updatePushNotifications = async (req, res) => {
    try {
        const { user, email_notification, push_notification } = req.body;
        const userSettings = await UserSettings.findOne({ user });

        if (!userSettings) {
            return res.status(404).json({ message: "User's settings not found" });
        }

        if (email_notification !== undefined) {
            userSettings.email_notifications = email_notification;
        }

        if (push_notification !== undefined) {
            userSettings.push_notifications = push_notification;
        }

        await userSettings.save();
        res.status(200).json({ message: 'User settings updated successfully' });
    } catch (error) {
        console.error('Error updating user settings:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

const deleteProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const userID = id
        await User.deleteOne({ _id: userID });
        return res.status(200).json({message:'User deleted successfully '})
    } catch(err){
        console.error('Error deleting user:', err);
        return res.status(500).json({ message: 'Internal server error' });  
    }
}


const fetchUserSettings= async (req, res) => {
    try{
        const { user } = req.body;
        const userId = user._id
        const userSettings = await UserSettings.findOne({ userId });

        const settings = await UserSettings.findOneAndUpdate(
            { user }, // Find by user ID
            { $setOnInsert: { user } }, // Insert only if it doesn't exist
            { new: true, upsert: true } // Create new if not found
        );

        return res.status(200).json({message:'Successfully fetched settings', data: settings})
    } catch(err){
        console.error('Error fetching user settings:', err);
        return res.status(200).json({message: 'Internal server error'})
    }
}


module.exports = { updatePushNotifications, updateLanguage, updateRegion, deleteProfile, fetchUserSettings, changePassword };
