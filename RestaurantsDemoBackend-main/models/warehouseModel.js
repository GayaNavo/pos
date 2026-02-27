

const mongoose = require('mongoose');

const newWherehouseSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
         
    },
    country: {
        type: String,
        
    },
    location: {
        type: String,
        
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Wherehouse = mongoose.model('Wherehouse', newWherehouseSchema);  
module.exports = Wherehouse;
