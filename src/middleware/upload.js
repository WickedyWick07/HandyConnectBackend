const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Simplify the path to 'middleware/uploads' relative to your current working directory
// Update path to point to the uploads folder in middleware
const uploadsPath = path.join(__dirname, 'uploads');
console.log('Upload directory path:', uploadsPath);

// Create the directory if it doesn't exist
if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsPath);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

// File filter (optional, for allowed file types)
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.mimetype)) {
        return cb(new Error('Only PDFs, JPEG, and PNG files are allowed'), false);
    }
    cb(null, true);  // Allow the file
};

// Set up the multer upload instance with file size limit
const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 1024 * 1024 * 5 },
});


module.exports = upload;
