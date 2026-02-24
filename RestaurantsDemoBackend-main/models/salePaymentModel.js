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

const PaymentSchema = new Schema({
    saleId: {
        type:String,
        required: true
    },
    amountToPay: {
        type: Number,
        required: true
    },
    payingAmount: {
        type: Number,
        required: true
    },
    currentDate: {
        type: Date,
        default: Date.now
    },
    paymentType: {
        type: String,
        required: true
    }
})

const Payment = mongoose.model('sale_payment', PaymentSchema);

module.exports = Payment;
