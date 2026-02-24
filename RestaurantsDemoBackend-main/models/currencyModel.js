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
const newCurrency = new mongoose.Schema({
    currencyName:{
        type:String,
        required:true
    },
    currencyCode:{
        type:String,
        required:true,
        unique: true,
    },
    currencySymbole:{
        type:String,
        required:true
    }
})
const Currency = mongoose.model('currency', newCurrency);
module.exports = Currency;
