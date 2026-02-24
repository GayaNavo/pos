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

const Permissions = require('../models/rolesPermissionModel');

// Fetch the user's role and corresponding permissions
const verifyPermission = async (user) => {
    try {
        console.log(`Fetching permissions for role: ${user.role}`);
        const rolePermissions = await Permissions.findOne({ roleName: user.role });

        if (!rolePermissions) {
            throw new Error('No permissions found for this role');
        }

        console.log(`Permissions found for role ${user.role}:`, rolePermissions.permissions);
        return rolePermissions.permissions; // Return the permissions object
    } catch (error) {
        console.error('Error in verifying permissions:', error.message || error);
        throw error; // Rethrow the error for proper handling
    }
};

module.exports = { verifyPermission };
