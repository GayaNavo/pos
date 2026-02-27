

const User = require('../../models/userModel');
const verifyPermission = require('../../middleware/roleAuthMiddleware');
const PrefixSettings = require('../../models/prefixSettingsModel')
const ReceiptSettings = require('../../models/receiptSettingsModel')
const Permissions = require('../../models/rolesPermissionModel');
const nodemailer = require('nodemailer');
const mailSettings = require("../../models/mailSettingsModel");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const CryptoJS = require('crypto-js');
require('dotenv').config();
const path = require('path');
const fs = require('fs');

//Login and JWT token generation
const loginUser = async (req, res) => {
    const { encryptedUsername, encryptedPassword } = req.body;

    // Decrypt the password
    const passkey = CryptoJS.AES.decrypt(encryptedPassword, process.env.DECRYPTION_SECRET_PASSKEY);
    const userKey = CryptoJS.AES.decrypt(encryptedUsername, process.env.DECRYPTION_SECRET_USERKEY);

    const username = userKey.toString(CryptoJS.enc.Utf8);
    const password = passkey.toString(CryptoJS.enc.Utf8);

    // Validate the presence of both username and password
    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: 'Username and password are required'
        });
    }

    try {
        // Find the user by username
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password'
            });
        }

        // if released from locked period
        if (user.lockUntil && user.lockUntil <= Date.now()) {
            user.accountStatus = 'active';
            user.lockUntil = undefined;
            user.loginAttempts = 0;
            await user.save();
        }

        // Check if user is locked
        if (user.isLocked) {
            const unlockTimeColombo = new Date(user.lockUntil).toLocaleString("en-US", {
                timeZone: "Asia/Colombo",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true
            });

            return res.status(403).json({
                success: false,
                message: `Account locked. Try again after ${unlockTimeColombo}`
            });
        }

        if (user.accountStatus === 'blocked') {
            return res.status(403).json({
                success: false,
                message: 'Your account is currently blocked. Please contact support.'
            });
        }

        // Compare the provided password with the hashed password stored in the database
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            user.loginAttempts = (user.loginAttempts || 0) + 1;
            console.log(`Login attempt #${user.loginAttempts} for user ${username}`);

            if (user.loginAttempts >= 3) {
                user.lockCount = (user.lockCount || 0) + 1;
                const lockMinutes = user.lockCount >= 3 ? 40 : 15;
                user.lockUntil = new Date(Date.now() + lockMinutes * 60 * 1000);
                user.loginAttempts = 0;
                user.accountStatus = 'blocked';
                await user.save();

                const unlockTimeColombo = new Date(user.lockUntil).toLocaleString("en-US", {
                    timeZone: "Asia/Colombo",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true
                });

                if (user.lockCount >= 2) {
                    try {
                        const settings = await mailSettings.findOne();
                        if (!settings) {
                            console.error("Mail settings not found in DB!");
                        }

                        const transporter = nodemailer.createTransport({
                            host: settings.mailHost,
                            port: settings.mailPort,
                            secure: true,
                            auth: {
                                user: settings.mailMailer,
                                pass: settings.password
                            },
                        });

                        const senderName = settings?.mailSenderName || "POS System";
                        const userEmail = user.username;

                        const info = await transporter.sendMail({
                            from: `${senderName} <${settings.mailMailer}>`,
                            to: userEmail,
                            subject: `⚠️ Account Locked Due to Failed Login Attempts`,
                            html: `
                                <p>Hello ${user.firstName || user.username},</p>
                                <p>Your account has been locked for <b>${lockMinutes} minutes</b> due to repeated failed login attempts.</p>
                                <p>Unlock time (Colombo): <b>${unlockTimeColombo}</b></p>
                                <p>If this wasn’t you, please contact support immediately.</p>
                                <hr>
                                <small>POS Security System</small>
                            `
                        });

                        console.log("Email sent successfully! MessageId:", info.messageId);
                    } catch (err) {
                        console.error("Failed to send warning email:", err);
                    }
                }

                return res.status(403).json({
                    success: false,
                    message: `Account locked due to too many failed attempts. Try again after ${unlockTimeColombo} (Colombo Time)`
                });
            } else {
                const remainingAttempts = 3 - user.loginAttempts;
                await user.save();
                return res.status(401).json({
                    success: false,
                    message: `Incorrect password. You have ${remainingAttempts} attempt(s) remaining before your account is locked.`
                });
            }
        }

        // Check for prefixesData only (receipt settings are optional)
        let hasRequiredData = true;
        let hasPrefixSettings = true;
        
        try {
            const prefixes = await PrefixSettings.find();
            if (prefixes.length === 0) {
                hasRequiredData = false;
                hasPrefixSettings = false;
            }
        } catch (error) {
            console.error('Error fetching prefixes:', error.message || error);
            hasRequiredData = false;
            hasPrefixSettings = false;
        }

        //Successful login → reset attempts
        user.loginAttempts = 0;
        user.lockUntil = undefined;
        user.lockCount = 0;
        user.accountStatus = 'active';
        await user.save();

        // Check if role is a kitchen display role
        let isKitchenRole = false;
        try {
            const rolePermissions = await Permissions.findOne({ roleName: user.role });
            if (rolePermissions && rolePermissions.permissions) {
                const perms = rolePermissions.permissions instanceof Map
                    ? Object.fromEntries(rolePermissions.permissions)
                    : rolePermissions.permissions;
                isKitchenRole = perms.isKitchenRole === true;
            }
        } catch (err) {
            console.error('Error checking kitchen role:', err);
        }

        // Create a JWT token with 1-hour expiration
        const payload = {
            userId: user._id,
            username: user.username,
            role: user.role,
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

        // Optionally, you can encrypt the token
        const secretKey = process.env.SECRET_KEY || 'default_secret';
        const encryptedToken = CryptoJS.AES.encrypt(token, secretKey).toString();

        // Send a single response with both the token, encrypted token and hasRequiredData
        return res.status(200).json({
            success: true,
            token,
            encryptedToken,
            hasRequiredData,
            hasPrefixSettings,
            role: user.role,
            isKitchenRole
        });
    } catch (err) {
        console.error('Server error:', err.message || err); // Log the error safely
        return res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

//Fetch dashboard data
const getDashboardData = async (req, res) => {
    try {
        const userId = req.user.userId;
        console.log(`Fetching user data for userId: ${userId}`);

        const user = await User.findById(userId).select('-password');
        if (!user) {
            console.log("User not found");
            return res.status(404).json({ message: 'User not found' });
        }

        // Convert Mongoose document to plain JavaScript object
        const userObj = user.toObject();
        const profileImage = user.profileImage
            ? `${req.protocol}://${req.get('host')}/uploads/user/${path.basename(user.profileImage)}`
            : null;
        userObj.profileImage = profileImage;

        // Fetch the user's role and corresponding permissions
        let permissions = {};
        let prefixesData = {};
        let receiptData = {};
        let hasRequiredData = true;

        try {
            console.log("Fetching permissions for user role:", user.role);
            const rolePermissions = await Permissions.findOne({ roleName: user.role });

            if (!rolePermissions || !rolePermissions.permissions) {
                console.log("Role not found or has no permissions.");
                permissions = {};
            } else {
                if (rolePermissions && rolePermissions.permissions instanceof Map) {
                    permissions = Object.fromEntries(
                        [...rolePermissions.permissions.entries()].map(([key, value]) =>
                            [key, value instanceof Map ? Object.fromEntries(value) : value]
                        )
                    );
                } else {
                    permissions = {};
                }

            }

            console.log("Permissions fetched successfully:", permissions);
        } catch (error) {
            console.error('Error fetching permissions:', error.message || error);
        }

        try {
            console.log("Fetching prefix settings...");
            const prefixes = await PrefixSettings.find();
            prefixesData = prefixes.length > 0 ? prefixes : { message: 'No prefix settings found' };
            if (prefixes.length === 0) {
                hasRequiredData = false;
            }
            console.log("Prefix settings fetched:", prefixesData);
        } catch (error) {
            console.error('Error fetching prefixes:', error.message || error);
            prefixesData = { message: 'Error fetching prefix settings' };
            hasRequiredData = false;
        }

        try {
            console.log("Fetching receipt settings...");
            const receipts = await ReceiptSettings.find();
            receiptData = receipts.length > 0 ? receipts : { message: 'No receipt settings found' };
            if (receipts.length === 0) {
                hasRequiredData = false;
            }
            console.log("Receipt settings fetched:", receiptData);
        } catch (error) {
            console.error('Error fetching receipt settings:', error.message || error);
            receiptData = { message: 'Error fetching receipt settings' };
            hasRequiredData = false;
        }

        // Prepare the response data
        const responseData = {
            id: user._id,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            mobile: user.mobile,
            role: user.role,
            profileImage: userObj.profileImage,
            permissions: permissions,  
            prefixes: prefixesData,
            receipts: receiptData,
            hasRequiredData: hasRequiredData
        };

        console.log("Final Response Data:", JSON.stringify(responseData, null, 2));
        res.json(responseData);
    } catch (error) {
        console.error('Error fetching profile data:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { loginUser, getDashboardData };