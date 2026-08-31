const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');
const app = express();
const fs = require('fs'); // Add this

// Create HTTP server using Express app
const http = require('http');
const server = http.createServer(app);

const allowedOrigins = [
    "http://localhost:5173",
    "https://handyconnect.netlify.app",
];

const previewRegex = /^https:\/\/deploy-preview-\d+--handyconnect\.netlify\.app$/;

// Initialize Socket.IO with the HTTP server
const io = require("socket.io")(server, {
    cors: {
        origin: function (origin, callback) {
            if (!origin) return callback(null, true);

            if (
                allowedOrigins.includes(origin) ||
                previewRegex.test(origin)
            ) {
                return callback(null, true);
            }

            callback(new Error("Not allowed by Socket.IO CORS"));
        },
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type", "Authorization"],
    },
});

app.use(express.json());

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no Origin header (Postman, server-to-server, etc.)
        if (!origin) return callback(null, true);

        if (
            allowedOrigins.includes(origin) ||
            previewRegex.test(origin)
        ) {
            return callback(null, true);
        }

        callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.set('io', io);

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // This was previously missing entirely, which is why controller code
    // like `io.to(receiverId).emit('receive_message', ...)` never reached
    // anyone: no socket had ever joined a room named after its userId.
    socket.on('register', ({ userId }) => {
        if (!userId) {
            console.warn(`Socket ${socket.id} tried to register without a userId`);
            return;
        }

        const room = userId.toString();
        socket.join(room);
        socket.data.userId = room; // handy for cleanup/logging on disconnect
        console.log(`Socket ${socket.id} registered and joined room ${room}`);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id, socket.data.userId ? `(room ${socket.data.userId})` : '');
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