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

const newExpensesData = new mongoose.Schema({
    refferenceId: { 
        type: String, 
        required: true, 
        unique: true 
    }, 
    warehouse: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    details: {
        type: String,
    },
},
{ timestamps: true } 
);

const ExpensesData = mongoose.model('Expenses', newExpensesData);
module.exports = ExpensesData;