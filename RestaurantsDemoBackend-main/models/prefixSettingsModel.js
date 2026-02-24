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

// models/PrefixSettings.js
const mongoose = require('mongoose');

// Define the schema
const prefixSettingsSchema = new mongoose.Schema({
    salePrefix: {
        type: String,
        required: true,
    },
    saleReturnPrefix: {
        type: String,
        required: true,
    },
    purchasePrefix: {
        type: String,
        required: true,
    },
    purchaseReturnPrefix: {
        type: String,
        required: true,
    },
    expensePrefix: {
        type: String,
        required: true,
    },
});

const PrefixSettings = mongoose.model('PrefixSettings', prefixSettingsSchema);
module.exports = PrefixSettings;
