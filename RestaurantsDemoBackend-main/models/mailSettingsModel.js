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

const mailSettingsSchema = new mongoose.Schema({
  mailMailer: { type: String, required: true },
  mailHost: { type: String, required: true },
  mailPort: { type: Number, required: true },
  mailSenderName: { type: String, required: true },
  username: { type: String, required: true },
  password: { type: String},
  encryption: { type: String},
}, { timestamps: true });

module.exports = mongoose.model('MailSettings', mailSettingsSchema);
