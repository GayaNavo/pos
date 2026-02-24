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

const express = require('express');
const router = express.Router();

// Import CRUD route handlers
const getRoutes = require('./getRoutes');
const postRoutes = require('./postRoutes');
const putRoutes = require('./putRoutes');
const deleteRoutes = require('./deleteRoutes');

// Use CRUD routes with a base path
router.use('/', getRoutes);
router.use('/', postRoutes);
router.use('/', putRoutes);
router.use('/', deleteRoutes);

module.exports = router;
