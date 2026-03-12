const bcrypt = require('bcrypt');
require('dotenv').config();

// This script creates the admin user in MongoDB
async function createAdminUser() {
    try {
        // Connect to MongoDB
        const mongoose = require('mongoose');
        
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('MongoDB connected successfully');

        // Import User model
        const User = require('./models/userModel');
        
        // Admin user details from .env
        const adminData = {
            firstName: process.env.ADMIN_FNAME,
            lastName: '',
            mobile: process.env.ADMIN_MOBILE,
            username: process.env.ADMIN_USERNAME,
            password: process.env.ADMIN_PASSWORD,
            role: process.env.ADMIN_ROLE,
            profileImage: '',
            loginAttempts: 0,
            lockCount: 0,
            accountStatus: 'active'
        };

        // Check if user exists by username
        const existingByusername = await User.findOne({ username: adminData.username });
        if (existingByusername) {
            console.log('⚠️  Admin user already exists!');
            console.log('Username:', existingByusername.username);
            console.log('Role:', existingByusername.role);
            
            // Ask if you want to reset password and unlock
            const readline = require('readline').createInterface({
                input: process.stdin,
                output: process.stdout
            });

            readline.question('\nDo you want to reset the password and unlock the account? (yes/no): ', async (answer) => {
                if (answer.toLowerCase() === 'yes') {
                    existingByusername.password = adminData.password;
                    existingByusername.accountStatus = 'active';
                    existingByusername.loginAttempts = 0;
                    existingByusername.lockCount = 0;
                    existingByusername.lockUntil = null;
                    await existingByusername.save();
                    console.log('✅ Password reset successfully and account unlocked!');
                }
                readline.close();
                await mongoose.disconnect();
            });
            
            return;
        }
        
        // Check if another user has the same mobile number
        const existingByMobile = await User.findOne({ mobile: adminData.mobile });
        if (existingByMobile) {
            console.log('⚠️  Another user with mobile number "' + adminData.mobile + '" already exists.');
            console.log('Please use a different mobile number in .env file or update the existing user.');
            console.log('Existing user mobile:', existingByMobile.mobile);
            console.log('Existing user username:', existingByMobile.username);
            await mongoose.disconnect();
            return;
        }

        // Create new admin user (password will be hashed automatically by the schema pre-save hook)
        const adminUser = new User(adminData);
        await adminUser.save();
        
        console.log('✅ Admin user created successfully!');
        console.log('\nLogin Credentials:');
        console.log('-------------------');
        console.log(`Email: ${adminData.username}`);
        console.log(`Password: ${adminData.password}`);
        console.log(`Role: ${adminData.role}`);
        console.log('\nYou can now login with these credentials.');

        await mongoose.disconnect();
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

createAdminUser();
