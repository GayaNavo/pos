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

const DailySaleCounterSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true }, // e.g., '2025-05-08'
  count: { type: Number, required: true, default: 1 },
});

module.exports = mongoose.model('DailySaleCounter', DailySaleCounterSchema);
