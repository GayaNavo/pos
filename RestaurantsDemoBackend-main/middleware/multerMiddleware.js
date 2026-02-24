/*
 * Copyright (c) 2025 Ideazone (Pvt) Ltd
 * Proprietary and Confidential
 *
 * This source code is part of a proprietary Point-of-Sale (POS) system developed by Ideazone (Pvt) Ltd.
 * Use of this code is governed by a license agreement and an NDA.
 * Unauthorized use, modification, distribution, or reverse engineering is strictly prohibited.
 *
 * Contact info@ideazone.lk for more information.
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure directories exist
const productUploadDir = path.resolve(__dirname, '../uploads/product');
const logoUploadDir = path.resolve(__dirname, '../uploads/logos');

if (!fs.existsSync(productUploadDir)) {
    fs.mkdirSync(productUploadDir, { recursive: true });
}

if (!fs.existsSync(logoUploadDir)) {
    fs.mkdirSync(logoUploadDir, { recursive: true });
}

// Multer storage for product images
const productStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, productUploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}_${file.originalname}`);
    }
});

// Multer storage for company logos
const logoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, logoUploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `logo_${Date.now()}${path.extname(file.originalname)}`);
    }
});

const uploadProduct = multer({ storage: productStorage });
const uploadLogo = multer({ storage: logoStorage });

module.exports = { uploadProduct, uploadLogo };
