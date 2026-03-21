

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Base upload directory
const baseUploadDir = path.resolve(__dirname, '../uploads');

// Ensure base uploads folder exists
if (!fs.existsSync(baseUploadDir)) {
    fs.mkdirSync(baseUploadDir, { recursive: true });
}

// Helper to ensure subdirectory exists
const ensureDir = (subFolder) => {
    const dir = path.join(baseUploadDir, subFolder);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
};

// Allowed image types
const allowedMimes = [
    'image/jpeg', 'image/jpg', 'image/png',
    'image/gif', 'image/webp', 'image/svg+xml'
];

// File filter for images
const imageFileFilter = (req, file, cb) => {
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

// Dynamic storage based on subfolder
const createStorage = (subFolder) => multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, ensureDir(subFolder));
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}_${file.originalname}`);
    }
});

// Pre-configured uploads
const uploadProduct = multer({ 
    storage: createStorage('product'), 
    fileFilter: imageFileFilter 
});

const uploadLogo = multer({ 
    storage: createStorage('logos'), 
    fileFilter: imageFileFilter 
});

const uploadBrand = multer({ 
    storage: createStorage('brand'), 
    fileFilter: imageFileFilter 
});

const uploadCategory = multer({ 
    storage: createStorage('category'), 
    fileFilter: imageFileFilter 
});

const uploadUser = multer({ 
    storage: createStorage('user'), 
    fileFilter: imageFileFilter 
});

const uploadReceiptLogo = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, ensureDir('receipt-logos')),
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, 'receipt-logo-' + uniqueSuffix + path.extname(file.originalname));
        }
    }),
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: imageFileFilter
});

// Dynamic upload based on route URL
const dynamicUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            let subFolder = 'others';
            if (req.originalUrl.includes('Product')) subFolder = 'product';
            else if (req.originalUrl.includes('Brand')) subFolder = 'brand';
            else if (req.originalUrl.includes('Category')) subFolder = 'category';
            else if (req.originalUrl.includes('User')) subFolder = 'user';
            cb(null, ensureDir(subFolder));
        },
        filename: (req, file, cb) => {
            cb(null, `${Date.now()}_${file.originalname}`);
        }
    }),
    fileFilter: imageFileFilter
});

module.exports = { 
    uploadProduct, 
    uploadLogo,
    uploadBrand,
    uploadCategory,
    uploadUser,
    uploadReceiptLogo,
    dynamicUpload,
    ensureDir,
    baseUploadDir
};
