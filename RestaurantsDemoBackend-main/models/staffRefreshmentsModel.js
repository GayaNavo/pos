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

// Product Schema (for items sold in staff refreshments)
const productSchema = new mongoose.Schema({
    currentId: { type: String, required: true },  // Changed to match frontend key
    name: { type: String, required: true },
    issuedQty: { type: Number, required: true },
    returnQty: { type: Number, default: 0 },
    productCost: { type: Number, required: true },
    stockQty: {type:Number, required:true},
    totalCost: { type: Number, required: true },
    variation: { type: String },
    warehouseId: { type: String, required: true },  // Ensure warehouseId is part of the product schema
});

// Sale Schema (staff refreshments sales)
const saleSchema = new mongoose.Schema({
    totalAmount: { type: String, required: true }, // Added totalAmount field to match the frontend
    date: { type: Date, default: Date.now },
    productsData: { type: [productSchema], required: true },  // Reference to the products array
    warehouse: { type: String, required: true, default: null },
}, { timestamps: true });

const Sale = mongoose.model('staffRefreshmentSale', saleSchema);

module.exports = Sale;
