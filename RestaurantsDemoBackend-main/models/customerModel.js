

const mongoose = require('mongoose');
const newCustomer = new mongoose.Schema({
    name: {
        type: String,
        required: true, 
    },
    mobile: {
        type: String,
        required: true,
        unique: true,
    },
    address: {
        type: String,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Customers = mongoose.model('customers', newCustomer);
module.exports = Customers;