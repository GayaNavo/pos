const User = require('../../models/userModel');
const CryptoJS = require('crypto-js');
const mailSettingsSchema = require("../../models/mailSettingsModel");
const nodemailer = require('nodemailer');
require('dotenv').config();
const MAX_OTP_ATTEMPTS = 3;

const sendBlockWarningEmail = async (user) => {
    try {
        const mailSettings = await mailSettingsSchema.findOne();
        if (!mailSettings) throw new Error('Mail settings not found');

        const transporter = nodemailer.createTransport({
            host: mailSettings.mailHost,
            port: mailSettings.mailPort,
            secure: true,
            auth: {
                user: mailSettings.mailMailer,
                pass: mailSettings.password,
            },
            tls: { rejectUnauthorized: false },
        });

        await transporter.verify();

        const mailOptions = {
            from: `${mailSettings.mailSenderName} <${mailSettings.mailMailer}>`,
            to: user.username,
            subject: 'Your account has been temporarily blocked',
            text: `Dear ${user.firstName || 'User'},\n\nYour account has been temporarily blocked due to multiple invalid OTP attempts. You can try again after 30 minutes.\n\nIf this wasn't you, please contact support immediately.\n\nRegards,\n${mailSettings.mailSenderName}`,
        };

        await transporter.sendMail(mailOptions);
    } catch (err) {
        console.error('Error sending block warning email:', err);
    }
};

const verifyResetOTP = async (req, res) => {
    const { encryptedUsername, encryptedOTP } = req.body;

    // Enhanced input validation
    if (!encryptedUsername || !encryptedOTP) {
        console.warn('Missing required fields:', {
            hasUsername: !!encryptedUsername,
            hasOTP: !!encryptedOTP
        });
        return res.status(400).json({
            status: 'fail',
            message: 'Username and OTP are required'
        });
    }

    // Validate encrypted data format
    if (typeof encryptedUsername !== 'string' || typeof encryptedOTP !== 'string') {
        console.warn('Invalid data types:', {
            usernameType: typeof encryptedUsername,
            otpType: typeof encryptedOTP
        });
        return res.status(400).json({
            status: 'fail',
            message: 'Invalid data format'
        });
    }

    // Check for environment variables
    if (!process.env.USER_KEY || !process.env.OTP_KEY) {
        console.error('Missing environment variables:', {
            hasUserKey: !!process.env.USER_KEY,
            hasOtpKey: !!process.env.OTP_KEY
        });
        return res.status(500).json({
            status: 'fail',
            message: 'Server configuration error'
        });
    }

    let username, otpFromUser;

    try {
        // Decrypt username using USER_KEY
        try {
            const usernameBytes = CryptoJS.AES.decrypt(encryptedUsername, process.env.USER_KEY);
            username = usernameBytes.toString(CryptoJS.enc.Utf8);

            if (!username || username.trim().length === 0) {
                throw new Error('Username decryption resulted in empty string');
            }
        } catch (usernameDecryptError) {
            console.error('Username decryption error:', usernameDecryptError.message);
            return res.status(400).json({
                status: 'fail',
                message: 'Invalid username data'
            });
        }

        // Decrypt OTP using dedicated OTP_KEY
        try {
            const otpBytes = CryptoJS.AES.decrypt(encryptedOTP, process.env.OTP_KEY);
            otpFromUser = otpBytes.toString(CryptoJS.enc.Utf8);

            if (!otpFromUser || otpFromUser.trim().length === 0) {
                throw new Error('OTP decryption resulted in empty string');
            }
        } catch (otpDecryptError) {
            console.error('OTP decryption error:', otpDecryptError.message);
            return res.status(400).json({
                status: 'fail',
                message: 'Invalid OTP data'
            });
        }

    } catch (generalDecryptError) {
        console.error('General decryption error:', generalDecryptError.message);
        return res.status(400).json({
            status: 'fail',
            message: 'Invalid encrypted data'
        });
    }

    try {
        // Database operations with enhanced error handling
        let user;
        try {
            user = await User.findOne({ username: username.trim() });
        } catch (dbFindError) {
            console.error('Database find error:', dbFindError.message);
            return res.status(500).json({
                status: 'fail',
                message: 'Database error occurred'
            });
        }

        // User validation
        if (!user) {
            console.warn('User not found:', username);
            return res.status(400).json({
                status: 'fail',
                message: 'User not found'
            });
        }

        // Reset lockCount if lockUntil has passed
        const now = new Date();
        if (user.lockUntil && now > user.lockUntil) {
            user.lockCount = 0;
            user.lockUntil = undefined;
            user.resetOTP = undefined;
            user.accountStatus = 'active';
            await user.save();
        }

        if (!user.resetOTP) {
            console.warn('No OTP request found for user:', username);
            return res.status(400).json({
                status: 'fail',
                message: 'No OTP request found. Please request a new OTP.'
            });
        }

        if (!user.resetOTPExpires || now > user.resetOTPExpires) {
            user.resetOTP = undefined;
            user.resetOTPExpires = undefined;
            user.resetOTPAttempts = 0;
            await user.save();
            return res.status(400).json({ status: 'fail', message: 'OTP expired or invalid. Request a new one.' });
        }

        // Check if user exceeded OTP attempts
        if (user.resetOTPAttempts >= MAX_OTP_ATTEMPTS) {
            user.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
            user.accountStatus = 'blocked';
            user.resetOTP = '';
            await user.save();
            return res.status(403).json({ status: 'fail', message: 'Account locked due to multiple invalid OTP attempts. Try again later.' });
        }

        // Wrong OTP
        if (otpFromUser.trim() !== user.resetOTP.trim()) {
            user.resetOTPAttempts = (user.resetOTPAttempts || 0) + 1;
            if (user.resetOTPAttempts >= MAX_OTP_ATTEMPTS) {
                const lockDuration = user.lockCount >= 3 ? 60 : 30;
                user.lockUntil = new Date(Date.now() + lockDuration * 60 * 1000);
                user.resetOTP = undefined;
                user.resetOTPExpires = undefined;
                user.resetOTPAttempts = 0;
                user.accountStatus = 'blocked';

                await user.save();
                await sendBlockWarningEmail(user);

                return res.status(403).json({
                    status: 'fail',
                    message: `Account locked due to multiple invalid OTP attempts. Request a new OTP after ${lockDuration}.`
                });
            }

            await user.save();
            return res.status(400).json({
                status: 'fail',
                message: `Invalid OTP. You have ${MAX_OTP_ATTEMPTS - user.resetOTPAttempts} attempts left.`
            });
        }

        // Success - Clean up after correct OTP
        try {
            user.resetOTP = undefined;
            user.resetOTPExpires = undefined;
            user.resetOTPAttempts = 0;
            user.accountStatus = 'active';
            await user.save();

            console.info('OTP verified successfully for user:', username);
            return res.status(200).json({
                status: 'success',
                message: 'OTP verified successfully'
            });

        } catch (saveError) {
            console.error('Error saving after successful OTP verification:', saveError.message);
            return res.status(500).json({
                status: 'fail',
                message: 'OTP verified but cleanup failed. Please contact support.'
            });
        }

    } catch (error) {
        // Enhanced general error handling
        console.error('Unexpected error in verifyResetOTP:', {
            message: error.message,
            stack: error.stack,
            username: username || 'unknown'
        });

        if (error.name === 'ValidationError') {
            return res.status(400).json({ status: 'fail', message: 'Data validation failed' });
        } else if (error.name === 'MongoError' || error.name === 'MongoServerError') {
            return res.status(500).json({ status: 'fail', message: 'Database connection error. Please try again later.' });
        } else if (error.name === 'CastError') {
            return res.status(400).json({ status: 'fail', message: 'Invalid data format' });
        } else {
            return res.status(500).json({ status: 'fail', message: 'Server error. Please try again later.' });
        }
    }
};

module.exports = { verifyResetOTP };
