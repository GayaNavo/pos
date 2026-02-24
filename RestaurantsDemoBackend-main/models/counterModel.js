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

const mongoose = require('mongoose');

// Counter schema for reference ID generation
const counterSchema = new mongoose.Schema({
    category: { type: String, required: true, unique: true }, // e.g., 'TRN', 'SL', 'PUR'
    currentValue: { type: Number, default: 1 }, // Start with 1, increment for each new reference ID
});

const Counter = mongoose.model('Counter', counterSchema);
module.exports = Counter;