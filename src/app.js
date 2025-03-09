const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');
const app = express();
const fs = require('fs'); // Add this

// Create HTTP server using Express app
const http = require('http');
const server = http.createServer(app);

// Initialize Socket.IO with the HTTP server
const io = require('socket.io')(server, {
    cors: {
        origin: "http://localhost:5173" || "https://handyconnect.netlify.app/",
        methods: ["GET", "POST"],
        allowedHeaders: 'Content-Type,Authorization'
    }
});

app.use(express.json());

const corsOptions = { 
    origin: 'http://localhost:5173' || "https://handyconnect.netlify.app/",
    methods: "GET,POST,PUT,DELETE,PATCH",
    allowedHeaders: 'Content-Type,Authorization'
};
app.use(cors(corsOptions));
app.set('io', io);

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });

    // Add your socket event handlers here
    socket.on('message', (message) => {
        console.log('Message received:', message);
        io.emit('message', message);
    });
});

app.get('/', (req, res) => {
    res.send("Api is running");
});



const uploadsPath = path.join(__dirname, 'middleware', 'uploads');
console.log('Static files path:', uploadsPath);
// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
}
// Add error handling to your static files middleware
app.use('/uploads', (req, res, next) => {
    console.log('Attempting to access:', req.url);
    console.log('Full file path:', path.join(uploadsPath, req.url));
    express.static(uploadsPath)(req, res, (err) => {
        if (err) {
            console.error('Static file error:', err);
            return res.status(404).send('File not found');
        }
        next();
    });
});



const authRoutes = require('./routes/authRoutes');
const serviceProviders = require('./routes/serviceProvidersRoutes');
const chatRoutes = require('./routes/chatRoutes')
const userSettings = require('./routes/userSettings')
app.use('/api/auth', authRoutes);
app.use('/api', serviceProviders);
app.use('/api', chatRoutes)
app.use('/api', userSettings)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Internal Server Error' });
});

// Export both server and app
module.exports = { app, server };



