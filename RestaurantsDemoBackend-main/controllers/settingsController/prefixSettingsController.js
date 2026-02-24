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

const prefixSettings = require('../../models/prefixSettingsModel')

// Create new settings
const createOrUpdatePrefixSettings = async (req, res) => {
    try {
        const settingsData = req.body;
        const updatedSettings = await prefixSettings.findOneAndUpdate({}, settingsData, {
            new: true,
            upsert: true // Create if doesn't exist
        });
        res.status(201).json({ message: 'Settings saved successfully!', data: updatedSettings });
    } catch (error) {
        console.error('Error saving settings:', error);

        res.status(500).json({
            status: 'error',
            message: 'Internal server error while saving settings.',
            error: error.message
        });
    }
};

//Get setting
const getPrefixSettings = async (req, res) => {
    try {
        const settings = await prefixSettings.findOne(); // Assuming you have only one document for settings
        if (!settings) {
            return res.status(404).json({ message: 'Settings not found' });
        }
        res.status(200).json(settings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
module.exports ={createOrUpdatePrefixSettings,getPrefixSettings}