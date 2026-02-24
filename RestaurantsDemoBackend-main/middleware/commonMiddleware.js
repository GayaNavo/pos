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

// commonMiddleware.js
const express = require('express');
const cors = require('cors'); // Import the cors package
require('dotenv').config();

// CORS Middleware using the 'cors' package
const corsMiddleware = cors({
  origin: process.env.ORIGIN_URL,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

// Body Parser Middleware
const bodyParserMiddleware = express.json();

// Exporting as an object
module.exports = {
  corsMiddleware,
  bodyParserMiddleware
};
