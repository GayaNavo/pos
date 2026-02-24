const User = require('../../models/userModel');
const CryptoJS = require('crypto-js');
const bcrypt = require('bcrypt');

exports.changePassword = async (req, res, next) => {
    const { id } = req.params;
    const { password: encryptedPassword } = req.body;

    if (!encryptedPassword) {
        return res.status(400).json({
            status: 'error',
            message: 'Password is required',
        });
    }

    // Decrypt incoming password using the env key you specified
    let decryptedPassword;
    try {
        const bytes = CryptoJS.AES.decrypt(encryptedPassword, process.env.DECRYPTION_SECRET_PASSKEY);
        decryptedPassword = bytes.toString(CryptoJS.enc.Utf8);
        if (!decryptedPassword || decryptedPassword.trim() === '') {
            return res.status(400).json({
                status: 'error',
                message: 'Decryption failed or password is empty',
            });
        }
    } catch (err) {
        console.error('Error during decryption:', err);
        return res.status(400).json({
            status: 'error',
            message: 'Invalid encrypted password format',
        });
    }

    try {
        // Find user
        const user = await User.findOne({ username: id });
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found',
            });
        }

        // Check new password against current password (prevent reusing current)
        const isSameAsCurrent = await bcrypt.compare(decryptedPassword, user.password);
        if (isSameAsCurrent) {
            return res.status(400).json({
                status: 'error',
                message: 'New password cannot be the same as the current password',
            });
        }

        // Optional: check against passwordHistory (prevent reusing recent passwords
        if (Array.isArray(user.passwordHistory) && user.passwordHistory.length > 0) {
            for (const oldHash of user.passwordHistory) {
                if (await bcrypt.compare(decryptedPassword, oldHash)) {
                    return res.status(400).json({
                        status: 'error',
                        message: 'New password cannot be the same as a recently used password',
                    });
                }
            }
        }

        // Save previous password into history (keep only last one)
        if (user.password) {
            user.passwordHistory = [user.password];
        } else {
            user.passwordHistory = [];
        }

        //  Hash new password and save
        const hashedPassword = await bcrypt.hash(decryptedPassword, 10);
        user.password = hashedPassword;
        await user.save();
        return res.status(200).json({
            status: 'success',
            message: 'Password updated successfully',
        });
    } catch (dbError) {
        console.error('Error updating password:', dbError);
        next(dbError);
    }
};
