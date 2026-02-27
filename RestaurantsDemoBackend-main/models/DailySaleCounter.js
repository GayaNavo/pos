


const mongoose = require('mongoose');

const DailySaleCounterSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true }, // e.g., '2025-05-08'
  count: { type: Number, required: true, default: 1 },
});

module.exports = mongoose.model('DailySaleCounter', DailySaleCounterSchema);
