

const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    email: { type: String, required: true },
    currency: { type: String, required: true },
    companyName: { type: String, required: true },
    companyMobile: { type: String, required: true },
    developerBy: { type: String },
    whatsappNumber: { type: String },
    country: { type: String },
    city: { type: String },
    dateFormat: { type: String },
    postalCode: { type: String },
    address: { type: String },
    defaultWarehouse: { type: String },
    menuType: { type: String , enum: ['local', 'foreign'] , default: 'local' },
    logo: String,
    barCategories: { 
        type: [String], 
        default: ['Bar', 'Beverages', 'Drinks'] 
    },
    dualScreenMode: {
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model('Settings', settingsSchema);
