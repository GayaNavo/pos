require('dotenv').config();

// This script resets the admin user password to the one in .env (non-interactive)
async function resetAdminPassword() {
    try {
        // Connect to MongoDB
        const mongoose = require('mongoose');
        
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('MongoDB connected successfully\n');

        // Import User model
        const User = require('./models/userModel');
        
        // Find the admin user
        const adminUser = await User.findOne({ username: process.env.ADMIN_USERNAME });
        
        if (!adminUser) {
            console.log('❌ Admin user not found in database!');
            console.log(`Looking for username: ${process.env.ADMIN_USERNAME}`);
            await mongoose.disconnect();
            return;
        }
        
        console.log('Found admin user:');
        console.log(`  Username: ${adminUser.username}`);
        console.log(`  Role: ${adminUser.role}`);
        console.log(`  Mobile: ${adminUser.mobile}`);
        console.log(`  Status: ${adminUser.accountStatus}\n`);
        
        // Reset password and unlock account
        adminUser.password = process.env.ADMIN_PASSWORD;
        adminUser.accountStatus = 'active';
        adminUser.loginAttempts = 0;
        adminUser.lockCount = 0;
        adminUser.lockUntil = null;
        await adminUser.save();
        
        console.log('✅ Password reset successfully!\n');
        console.log('===========================================');
        console.log('         LOGIN CREDENTIALS                  ');
        console.log('===========================================');
        console.log(`Username: ${adminUser.username}`);
        console.log(`Password: ${process.env.ADMIN_PASSWORD}`);
        console.log(`Role: ${adminUser.role}`);
        console.log('===========================================\n');
        console.log('You can now login with these credentials!');
        
        await mongoose.disconnect();
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

resetAdminPassword();
