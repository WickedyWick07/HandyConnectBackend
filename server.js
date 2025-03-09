const { server } = require('./src/app');
const connectDB = require('./src/config/db');

connectDB()
    .then(() => console.log('Database connected successfully'))
    .catch(err => {
        console.error(`Database connection failed: ${err.message}`);
        process.exit(1);
    });

const PORT = process.env.PORT || 5000;

// Use server.listen instead of app.listen
server.listen(PORT, (err) => {
    if (err) {
        console.error(`Error starting server: ${err.message}`);
    } else {
        console.log(`Server running on port ${PORT}`);
    }
});