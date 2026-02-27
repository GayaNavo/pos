

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
    },
    lastName: {
        type: String,
    },
    mobile: {
        type: String,
        unique: true
    },
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        ref: "RolePermissions"
    },
    profileImage: {
        type: String
    },
    loginAttempts: {
        type: Number,
        required: true,
        default: 0
    },
    lockUntil: {
        type: Date
    },
    lockCount: {
        type: Number,
        default: 0
    },
    accountStatus: {
        type: String,
        enum: ['active', 'blocked'],
        default: 'active'
    },
    resetOTP: String,
    resetOTPExpires: Date,
    resetOTPAttempts: {
        type: Number,
        default: 0
    },
    passwordHistory: {
        type: [String],
        default: []
    }


});

userSchema.virtual("isLocked").get(function () {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.methods.isPasswordReused = async function (newPassword) {
    for (let oldHash of this.passwordHistory) {
        const match = await bcrypt.compare(newPassword, oldHash);
        if (match) return true;
    }
    return false;
};

userSchema.methods.updatePassword = async function (newPassword) {
    if (await this.isPasswordReused(newPassword)) {
        throw new Error('Password was used recently. Choose a different one.');
    }

    if (this.password) {
        this.passwordHistory.unshift(this.password);
    }

    if (this.passwordHistory.length > 5) {
        this.passwordHistory = this.passwordHistory.slice(0, 5);
    }
    this.password = newPassword;
    await this.save();
};

const User = mongoose.model('User', userSchema);
module.exports = User;
