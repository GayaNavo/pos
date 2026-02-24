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

// Product Schema
const productSchema = new mongoose.Schema({
    currentID: { type: String, required: true },
    name: { type: String, required: true },
    AdjustmentType: { type: String, required: true },
    price: { type: String, required: true },
    productCost: {type: Number, require: true},
    ptype: { type: String, required: true }, 
    variationValue: { type: String },
    quantity: { type: Number, required: true }, //
    taxRate: { type: Number },
    subtotal: { type: Number, required: true },
});

// Adjustment Schema
const adjustmentSchema = new mongoose.Schema({
    refferenceId: { type: String, required: true, unique: true }, // Changed to String and made unique
    date: { type: Date, default: Date.now },
    grandTotal: { type: Number, required: true },
    productsData: { type: [productSchema], required: true },
    warehouse: { type: String, default: null },
},
{ timestamps: true } 
);

const Adjustment = mongoose.model('adjustment', adjustmentSchema);
module.exports = Adjustment;
