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

const offersSchema = new mongoose.Schema({
    offerName: { 
        type: String, 
        required: true,
        unique: true,
    },
    percentage: { 
        type: String,
        required: true,
    },
    createdBy: { 
        type: String,
        required: true,
    },
    endDate: { 
        type: String,
    },
});

offersSchema.index({ offerName: 1 }, { unique: true });
const Offers = mongoose.model('Offers', offersSchema);
module.exports = Offers;
