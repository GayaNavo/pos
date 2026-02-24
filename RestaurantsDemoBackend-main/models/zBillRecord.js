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

const ZReadingSchema = new mongoose.Schema({
  createdAt: {
    type: Date,
    default: Date.now
  },
  registers: [{
    cashRegisterID: {
      type: String,
      required: true
    },
    cashierName: {
      type: String,
      required: true
    },
    openedTime: {
      type: String,
      required: true
    },
    inputs: [{
      denomination: Number,
      quantity: Number,
      amount: Number
    }],
    cardPaymentAmount: {
      type: Number,
      default: 0
    },
    cashPaymentAmount: {
      type: Number,
      default: 0
    },
    bankTransferPaymentAmount: {
      type: Number,
      default: 0
    },
    totalProfitAmount: {
      type: Number,
      required: true, default: 0
    },
    totalDiscountAmount: {
      type: Number,
      default: 0
    },
    totalAmount: {
      type: Number,
      required: true
    },
    grandTotal: {
      type: Number,
      required: true
    },
    cashHandIn: {
      type: Number,
      default: 0
    },
    cashVariance: {
      type: Number,
      default: 0
    },
    closedTime: {
      type: Date,
      required: true
    }
  }]
});

module.exports = mongoose.model('ZReading', ZReadingSchema);
