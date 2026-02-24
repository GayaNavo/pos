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
const brandSchema = mongoose.Schema({
    brandName: {
        type: String,
        required: true
    },
    logo: {
        type:String
    },
});
const Brands = mongoose.model('Brand', brandSchema);
module.exports = Brands;
