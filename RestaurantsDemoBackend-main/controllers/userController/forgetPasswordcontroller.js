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

const User = require('../../models/userModel'); // Adjust the path as needed
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const CryptoJS = require('crypto-js');
const mailSettingsSchema = require('../../models/mailSettingsModel');


const getMailSettings = async () => {
    try {
        const mailSettings = await mailSettingsSchema.findOne();
        if (!mailSettings) {
            throw new Error('Mail settings not found in the database.');
        }
        return mailSettings;
    } catch (error) {
        console.error('Error fetching mail settings:', error);
        throw error;
    }
};

// Make reset code and send email
exports.sendResetCode = async (req, res) => {
    const { encryptedUsername } = req.body;
    const UsernameDecryptedKey = process.env.USER_KEY;

    // Input validation
    if (!encryptedUsername) {
        return res.status(400).json({
            status: 'error',
            message: 'Username is required',
        });
    }

    let username;
    try {
        // Decrypt the encrypted username
        const userKey = CryptoJS.AES.decrypt(encryptedUsername, UsernameDecryptedKey);
        username = userKey.toString(CryptoJS.enc.Utf8);

        if (!username || username.trim() === '') {
            return res.status(400).json({
                status: 'error',
                message: 'Decryption failed or username is empty',
            });
        }
    } catch (decryptionError) {
        console.error('Error decrypting username:', decryptionError);
        return res.status(400).json({
            status: 'error',
            message: 'Invalid encrypted username',
        });
    }

    let transporter;

    try {
        const mailSettings = await getMailSettings();
        transporter = nodemailer.createTransport({
            host: mailSettings.mailHost,
            port: mailSettings.mailPort,
            secure: true,
            auth: {
                user: mailSettings.mailMailer,
                pass: mailSettings.password,
            },
            tls: {
                rejectUnauthorized: false,
            },
        });

        // Verify the transporter configuration
        await transporter.verify();
    } catch (transporterError) {
        console.error('Error setting up email transporter:', transporterError);
        return res.status(500).json({
            status: 'error',
            message: 'Email service not available',
        });
    }

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ status: 'error', message: 'User not found' });
        }

        if (user.lockUntil && user.lockUntil <= Date.now()) {
            user.accountStatus = 'active';
            user.lockUntil = undefined;        
            user.resetOTPAttempts = 0;        
            await user.save();
        }

        if (user.accountStatus === 'blocked') {
            return res.status(403).json({
                status: 'error',
                message: 'Your account is currently blocked. Please contact support.',
            });
        }

        if (user.resetOTP && user.resetOTPExpires && user.resetOTPExpires > Date.now()) {
            const remainingTime = Math.ceil((user.resetOTPExpires - Date.now()) / 1000);
            return res.status(429).json({
                status: 'error',
                message: `You must wait ${remainingTime} seconds before requesting a new OTP.`,
            });
        }

        if (user.lockUntil && user.lockUntil > Date.now()) {
            return res.status(403).json({
                status: 'error',
                message: 'Your account is temporarily locked due to multiple failed attempts. Please try later.'
            });
        }

        const mailSettings = await getMailSettings();

        transporter = nodemailer.createTransport({
            host: mailSettings.mailHost,
            port: mailSettings.mailPort,
            secure: true,
            auth: {
                user: mailSettings.mailMailer,
                pass: mailSettings.password
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        // Verify the transporter
        await transporter.verify();

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 300000;

        user.resetOTP = otp;
        user.resetOTPExpires = expiresAt;
        await user.save();

        // Email content
        const mailOptions = {
            from: `${mailSettings.mailSenderName} <${mailSettings.mailMailer}>`,
            to: username,
            subject: 'Your password reset code',
            text: `Your password reset code is: ${otp}`
        };

        // Send email
        await transporter.sendMail(mailOptions);

        res.status(200).json({
            status: 'success',
            expiresAt,
            message: 'OTP sent successfully'
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to process request'
        });
    }
};