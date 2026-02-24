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

const User = require('../../models/userModel'); // Import the User model
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose')
require('dotenv').config();
const bcrypt = require('bcrypt');
const CryptoJS = require('crypto-js');
const { sendWelcomeEmail } = require('../../middleware/mailMiddleware');
const Permissions = require('../../models/rolesPermissionModel');
const mailSettingsSchema = require('../../models/mailSettingsModel');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

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

const addUser = async (req, res) => {
    const { firstName, lastName, mobile, username, role, password } = req.body;

    if (!username.includes('@')) {
        return res.status(400).json({
            status: 'error',
            message: 'Username must be a valid email address containing "@"',
        });
    }

    try {
        // Validate input fields
        const missingFields = [];
        if (!firstName) missingFields.push('firstName');
        if (!lastName) missingFields.push('lastName');
        if (!mobile) missingFields.push('mobile');
        if (!username) missingFields.push('username');
        if (!role) missingFields.push('role');
        if (!password) missingFields.push('password');

        // If there are missing fields, return an error response
        if (missingFields.length > 0) {
            return res.status(400).json({
                status: 'error',
                message: `The following fields are required: ${missingFields.join(', ')}`,
                missingFields,
            });
        }

        // Validate password strength
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?#&])[A-Za-z\d@$!%*?#&]{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                status: 'error',
                message: 'Password must be at least 8 characters long, include at least one uppercase letter, one lowercase letter, one number, and one special character.',
            });
        }

        // Check if username already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({
                status: 'error',
                message: 'User with this username already exists',
            });
        }

        // Check if mobile number already exists
        const existingMobile = await User.findOne({ mobile });
        if (existingMobile) {
            return res.status(400).json({
                status: 'error',
                message: 'User with this mobile number already exists',
            });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new user
        const newUser = new User({
            firstName,
            lastName,
            mobile,
            username,
            password: hashedPassword,
            role,
        });
        await newUser.save();

        // Respond with success
        return res.status(201).json({
            status: 'success',
            message: 'User registered successfully',
        });
    } catch (err) {
        console.error('Error adding user:', err);
        return res.status(500).json({
            status: 'error',
            message: 'Server error. Please try again later.',
        });
    }
};

const updateUser = async (req, res) => {
    const { id, username, firstName, lastName, role, mobile } = req.body;

    if (username && !username.includes('@')) {
        return res.status(400).json({
            status: 'error',
            message: 'Username must be a valid email address containing "@"',
        });
    }

    if (!username.includes('@')) {
        return res.status(400).json({
            message: 'Username must be a valid email address containing "@"',
            status: 'fail'
        });
    }

    if (mobile) {
        const mobileRegex = /^0\d{9}$/;
        if (!mobileRegex.test(mobile)) {
            return res.status(400).json({
                status: 'error',
                message: 'Mobile number must start with 0 and be exactly 10 digits.',
            });
        }
    }

    try {
        // Validate required fields
        let profileImage = null;
        const missingFields = [];
        if (!firstName) missingFields.push('firstName');
        if (!lastName) missingFields.push('lastName');
        if (!mobile) missingFields.push('mobile');

        // Return error for missing fields
        if (missingFields.length > 0) {
            return res.status(400).json({
                status: 'error',
                message: `The following fields are required: ${missingFields.join(', ')}`,
                missingFields,
            });
        }

        // Ensure either `id` or `username` is provided
        if (!id && !username) {
            return res.status(400).json({
                status: 'error',
                message: 'Either User ID or username is required to identify the user.',
            });
        }

        // Retrieve user by `id` or `username`
        const user = id ? await User.findById(id) : await User.findOne({ username });
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found',
            });
        }

        // Check if the `mobile` number is already in use by another user
        const existingUserWithMobile = await User.findOne({
            mobile,
            _id: { $ne: user._id }, // Exclude the current user
        });
        if (existingUserWithMobile) {
            return res.status(400).json({
                status: 'error',
                message: 'The mobile number is already associated with another user.',
            });
        }

        // Check if the `username` is already in use by another user
        if (username && username !== user.username) {
            const existingUserWithUsername = await User.findOne({
                username,
                _id: { $ne: user._id }, // Exclude the current user
            });
            if (existingUserWithUsername) {
                return res.status(400).json({
                    status: 'error',
                    message: 'The username is already associated with another user.',
                });
            }
        }

        // Update user fields if provided
        user.username = username || user.username;
        user.firstName = firstName || user.firstName;
        user.lastName = lastName || user.lastName;
        user.mobile = mobile || user.mobile;
        user.role = role || user.role;

        // Check if there's a new file upload
        if (req.file) {
            const newImagePath = path.join('uploads', 'user', req.file.filename);

            // Remove the old image if it exists
            if (user.profileImage) {
                const oldImagePath = path.resolve('uploads', 'user', path.basename(user.profileImage));
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
            user.profileImage = newImagePath;
        }

        // Save updated user data
        await user.save();

        // Respond with success
        res.json({
            status: 'success',
            message: 'User updated successfully',
            user: {
                id: user._id,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                mobile: user.mobile,
                role: user.role,
                profileImage
            },
        });
    } catch (err) {
        console.error('Error updating user:', err);

        // Respond with server error
        res.status(500).json({
            status: 'error',
            message: 'An internal server error occurred. Please try again later.',
        });
    }
};

// Delete a user by ID
const deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        if (!id) {
            return res.status(400).json({
                status: 'error',
                message: 'User ID is required to delete a user',
            });
        }
        const user = await User.findByIdAndDelete(id);

        // Handle case where user does not exist
        if (!user) {
            return res.status(404).json({ status: 'error', message: 'User not found', });
        }

        // Delete the user's profile image if it exists
        if (user.profileImage) {
            const imagePath = path.resolve('uploads', 'user', path.basename(user.profileImage));
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath); // Delete the image file
            }
        }

        res.status(200).json({ status: 'success', message: 'User and profile image deleted successfully', });
    } catch (error) {
        console.error('Error deleting user:', error);
        if (error.name === 'CastError') { return res.status(400).json({ status: 'error', message: 'Invalid User ID format', }); }
        res.status(500).json({ status: 'error', message: 'An internal server error occurred. Please try again later.', });
    }
};

//Find User
const fetchUsers = async (req, res) => {
    const { id, username, acc } = req.query;
    const key1 = process.env.SUPER_ADMIN_KEY;
    const key2 = "be5&2N*alr%hJ-oG";
    let requestingUserRole = null;

    try {
        if (!acc || !key1) {
            return res.status(400).json({ message: "Missing encrypted role or decryption key" });
        }
        const firstDecryption = CryptoJS.AES.decrypt(acc, key2).toString(CryptoJS.enc.Utf8);
        requestingUserRole = CryptoJS.AES.decrypt(firstDecryption, key1).toString(CryptoJS.enc.Utf8);

        let users;
        if (id) {
            users = await User.findById(id);
            if (!users) {
                return res.status(404).json({ message: 'User not found' });
            }
            if (requestingUserRole !== 'superAdmin' && users.role === 'superAdmin') {
                return res.status(403).json({ message: 'Access denied' });
            }
            users = [users];
        } else if (username) {
            let query = { username: new RegExp(username, 'i') };
            if (requestingUserRole !== 'superAdmin') {
                query.role = { $ne: 'superAdmin' };
            }
            users = await User.find(query);
            if (!users.length) {
                return res.status(404).json({ message: 'User not found' });
            }
        } else {
            const size = parseInt(req.query.page?.size) || 10;
            const number = parseInt(req.query.page?.number) || 1;

            let baseQuery = {};
            if (requestingUserRole !== 'superAdmin') {
                baseQuery.role = { $ne: 'superAdmin' };
            }

            if (req.query.page) {
                const offset = (number - 1) * size;

                users = await User.find(baseQuery)
                    .skip(offset)
                    .limit(size);

                const totalCount = await User.countDocuments(baseQuery);

                if (!users.length) {
                    return res.status(404).json({ message: 'No users found' });
                }

                const usersData = await Promise.all(users.map(async user => {
                    const userObj = user.toObject();
                    const profileImage = user.profileImage
                        ? `${req.protocol}://${req.get('host')}/uploads/user/${path.basename(user.profileImage)}`
                        : null;

                    const permissions = await Permissions.find({ roleName: user.role });

                    return {
                        _id: user._id,
                        username: user.username,
                        role: user.role,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        mobile: user.mobile,
                        accountStatus: user.accountStatus,
                        profileImage: profileImage,
                        permissions: permissions,
                    };
                }));

                return res.status(200).json({
                    users: usersData,
                    totalPages: Math.ceil(totalCount / size),
                    currentPage: number,
                    totalUsers: totalCount,
                });
            } else {
                users = await User.find(baseQuery);
                if (!users.length) {
                    return res.status(404).json({ message: 'No users found' });
                }
            }
        }

        const usersData = await Promise.all(users.map(async user => {
            const userObj = user.toObject();
            const profileImage = user.profileImage
                ? `${req.protocol}://${req.get('host')}/uploads/user/${path.basename(user.profileImage)}`
                : null;
            const permissions = await Permissions.find({ roleName: user.role });

            return {
                _id: user._id,
                username: user.username,
                role: user.role,
                firstName: user.firstName,
                lastName: user.lastName,
                mobile: user.mobile,
                accountStatus: user.accountStatus,
                profileImage: profileImage,
                permissions: permissions,
            };
        }));

        res.json(id || username ? usersData[0] : usersData);
    } catch (error) {
        console.error('Error fetching profile data:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const searchUsers = async (req, res) => {
    const { keyword, acc } = req.query;
    const key1 = process.env.SUPER_ADMIN_KEY;
    const key2 = "be5&2N*alr%hJ-oG";
    let requestingUserRole = null;

    try {
        if (!keyword) {
            return res.status(400).json({ message: "Keyword is required for search" });
        }

        if (acc) {
            const firstDecryption = CryptoJS.AES.decrypt(acc, key2).toString(CryptoJS.enc.Utf8);
            requestingUserRole = CryptoJS.AES.decrypt(firstDecryption, key1).toString(CryptoJS.enc.Utf8);
        }

        const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        let query = {
            $or: [
                { username: { $regex: new RegExp(escapedKeyword, 'i') } },
                { firstName: { $regex: new RegExp(escapedKeyword, 'i') } },
                { lastName: { $regex: new RegExp(escapedKeyword, 'i') } }
            ]
        };

        if (requestingUserRole !== 'superAdmin') {
            query.role = { $ne: 'superAdmin' };
        }
        const users = await User.find(query).limit(20);

        if (!users.length) {
            return res.status(404).json({ message: 'No users found' });
        }
        const usersData = await Promise.all(users.map(async user => {
            const userObj = user.toObject();
            const profileImage = user.profileImage
                ? `${req.protocol}://${req.get('host')}/uploads/user/${path.basename(user.profileImage)}`
                : null;

            const permissions = await Permissions.find({ roleName: user.role });

            return {
                _id: user._id,
                username: user.username,
                role: user.role,
                firstName: user.firstName,
                lastName: user.lastName,
                mobile: user.mobile,
                accountStatus: user.accountStatus,
                profileImage: profileImage,
                permissions: permissions,
                createdAt: user.createdAt?.toISOString().slice(0, 10) || null
            };
        }));

        return res.status(200).json({
            status: "success",
            users: usersData
        });

    } catch (error) {
        console.error('Search users error:', error);
        return res.status(500).json({
            status: "error",
            message: "Server error during search"
        });
    }
};

const updateUserStatus = async (req, res) => {
    const { id } = req.params;
    const { accountStatus } = req.body;

    try {
        // Validate accountStatus
        if (!accountStatus || !['active', 'blocked'].includes(accountStatus)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid account status. Must be either "active" or "blocked".',
            });
        }

        // Validate user ID
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid user ID format.',
            });
        }

        // Find user
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found.',
            });
        }

        user.accountStatus = accountStatus;
        user.loginAttempts = 0;
        user.lockUntil = null;
        user.lockCount = 0;
        user.resetOTP = undefined;
        user.resetOTPExpires = undefined;
        user.resetOTPAttempts = 0;
        await user.save();

        // Send email notification
        try {
            const mailSettings = await getMailSettings();
            const transporter = nodemailer.createTransport({
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

            const senderName = mailSettings.mailSenderName || 'POS System';
            const subject =
                accountStatus === 'blocked'
                    ? '⚠️ Your Account Has Been Blocked'
                    : '✅ Your Account Has Been Unblocked';

            const htmlContent =
                accountStatus === 'blocked'
                    ? `<p>Hello ${user.firstName || user.username},</p>
             <p>Your account has been <b>blocked</b> by the administrator. You will not be able to login until it is unblocked.</p>
             <p>If this wasn’t you, please contact support immediately.</p>`
                    : `<p>Hello ${user.firstName || user.username},</p>
             <p>Your account has been <b>unblocked</b> by the administrator. You can now login.</p>`;

            await transporter.sendMail({
                from: `${senderName} <${mailSettings.mailMailer}>`,
                to: user.username,
                subject,
                html: htmlContent,
            });

            console.log(`Email sent to ${user.username} about account ${accountStatus}.`);
        } catch (emailError) {
            console.error('Failed to send email notification:', emailError);
        }

        return res.status(200).json({
            status: 'success',
            message: `User account has been ${accountStatus === 'blocked' ? 'blocked' : 'unblocked'} successfully.`,
            data: {
                id: user._id,
                username: user.username,
                accountStatus: user.accountStatus,
            },
        });
    } catch (err) {
        console.error(' Error updating account status:', err.message);
        if (err.name === 'ValidationError') {
            return res.status(400).json({
                status: 'error',
                message: 'Validation failed. Please check the provided data.',
                details: err.errors,
            });
        }
        return res.status(500).json({
            status: 'error',
            message: 'An unexpected error occurred while updating account status. Please try again later.',
        });
    }
};

module.exports = { addUser, updateUser, fetchUsers, deleteUser, searchUsers, updateUserStatus };
