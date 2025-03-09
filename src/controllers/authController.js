
const mongoose = require('mongoose'); // Imported
const argon2 = require('argon2');
const User = require('../models/User');
const ServiceProvider = require('../models/ServiceProvider')
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Utility functions
const generateAccessToken = (userId, role) => 
    jwt.sign({ id: userId, role }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });

const generateRefreshToken = (userId) => 
    jwt.sign({ id: userId }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });

// Register User
const registerUser = async (req, res) => {
    try {
        console.log('Registration Request body:', {
            ...req.body,
            passwordLength: req.body.password?.length
        });        
        
        const { firstName, lastName, email, password, role, longitude, latitude, location } = req.body;

        if (!firstName || !lastName || !email || !password || !longitude || !latitude || !location){
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const parsedLongitude = parseFloat(longitude);
        const parsedLatitude = parseFloat(latitude);

        // Validate that they are numbers
        if (isNaN(parsedLongitude) || isNaN(parsedLatitude)) {
            return res.status(400).json({ error: "Invalid coordinates. Must be numbers." });
        }




        const userExists = await User.findOne({ email });

        if (userExists) return res.status(400).json({ message: 'User already exists' });
        const hashedPassword = await argon2.hash(password);
        console.log('Hashed password :', hashedPassword);

        const user = await User.create({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            role,
            location,
            longitude: parsedLongitude,
            latitude: parsedLatitude
        });

        const accessToken = generateAccessToken(user._id, user.role);
        const refreshToken = generateRefreshToken(user._id);

        console.log('User Created:', {
            id: user._id,
            email: user.email,
            role: user.role,
            hasAccessToken: !!accessToken,
            hasRefreshToken: !!refreshToken
        });

        res.status(201).json({
            message: 'User created successfully',
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
                location: user.location,
                firstName: user.firstName,
                lastName: user.lastName
            },
            accessToken,
            refreshToken
        });
    } catch (error) {
        console.error(error.stack);
        console.error(error.message);
        res.status(500).json({ message: 'Registration failed' });
    }
};


const fetchCurrentUser = async (req, res) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];

        // Verify token
        let decodedToken;
        try {
            decodedToken = jwt.verify(token, process.env.JWT_SECRET);
            console.log("Decoded Token:",decodedToken)
        } catch (err) {
            console.error('Token verification failed:', err.message);
            window.location.href = '/login'
            return res.status(403).json({ message: 'Invalid or expired token' });
        }

        if (!decodedToken.id) {
            return res.status(400).json({ message: 'Invalid token payload' });
        }

        // Find user
        const user = await User.findById(decodedToken.id)
        console.log("user:", user)
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ user });
    } catch (error) {
        console.error('Server error in fetchCurrentUser:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        
        if (!refreshToken) {
            return res.status(400).json({ message: 'Refresh token required' });
        }

        // Verify refresh token
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        
        // Generate new access token
        const accessToken = jwt.sign(
            { userId: decoded.userId },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({ accessToken });
    } catch (error) {
        console.error('Error in refreshToken:', error);
        res.status(403).json({ message: 'Invalid refresh token' });
    }
};
const loginUser = async (req, res) => {
    try {
        console.log('Login Request body:', {
            email: req.body.email,
            password: req.body.password
        });

        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const user = await User.findOne({ email });
        console.log('User found:', user ? 'Yes' : 'No');

        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

          // Log lengths to verify data
          console.log('Input password length:', password.length);
          console.log('Stored hash length:', user.password.length);

          const isPasswordValid = await argon2.verify(user.password, password);
          console.log('Password valid:', isPasswordValid);

        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Invalid password' });
        }

        const accessToken = generateAccessToken(user._id, user.role);
        const refreshToken = generateRefreshToken(user._id);

        console.log('Login successful:', {
            userId: user._id,
            role: user.role,
            accessToken: !!accessToken,
            refreshToken: !!refreshToken
        });

        res.json({
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
                firstName: user.firstName,
                lastName: user.lastName
            },
            accessToken,
            refreshToken
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            message: 'Login failed',
            error: error.message 
        });
    }
};
const completeProviderSignup = async (req, res) => {
    try {
        console.log('Request Body:', req.body); // Log the body
        console.log('Files:', req.files); // Log the files

        let { userId, phoneNumber, services, companyName, yearsInService, description } = req.body;
        const profilePicture = req.files.profile_picture
        ? `/uploads/${req.files.profile_picture[0].filename}`
        : null;
    
        const certifications = req.files.certifications
        ? req.files.certifications.map(file => `/uploads/${file.filename}`)
        : [];
        if (!services || !certifications || !companyName || !yearsInService || !phoneNumber) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        console.log('Request Body:', req.body); // Logs text fields
        console.log('Files:', req.files);
        console.log('current user:', userId)

        const existingUser = await User.findById(userId);
        console.log('existing user:', existingUser)
        if (!existingUser || existingUser.role !== 'service provider') {
            return res.status(404).json({ message: 'Service provider not found' });
        }

         // Create a new ServiceProvider document
         const newServiceProvider = new ServiceProvider({
            user: userId,
            phoneNumber, // Reference to the User document
            services,
            certifications,
            profilePicture,
            companyName,
            description,
            yearsInService,
        });

        await newServiceProvider.save();
        // Respond with success
        res.status(200).json({
            message: 'Provider profile created successfully',
            serviceProvider: newServiceProvider,
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Provider signup failed' });
    }
};



// Refresh Token

module.exports = { registerUser, loginUser, generateAccessToken, generateRefreshToken, refreshToken, completeProviderSignup, fetchCurrentUser };
