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
const Schema = mongoose.Schema;

const productSchema = new Schema({
    currentID: { type: String, required: true },
    variationValue: { type: String},
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    taxRate: { type: Number},
    subtotal: { type: Number, required: true },
    warehouse: { type: String,},
});

const purchaseReturnScheema = new Schema({
    refferenceId : { type: String, required: true, unique: true }, 
    date: { type: Date, required: true },
    supplier: { type: String, required: true },
    grandTotal: { type: Number, required: true },
    paidAmount: { type: Number, required: true },
    note: {type: String, required: true},
    productsData: [productSchema],
    warehouse: { type: String, required: true },
    returnType: { type: String, required: true },
},
{ timestamps: true } 
);

const PurchaseReturn = mongoose.model('purchaseReturn', purchaseReturnScheema);

module.exports = PurchaseReturn;
