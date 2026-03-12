require('dotenv').config();

// This script lists all users in MongoDB
async function listUsers() {
    try {
        // Connect to MongoDB
        const mongoose = require('mongoose');
        
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('MongoDB connected successfully\n');

        // Import User model
        const User = require('./models/userModel');
        
        // Get all users
        const users = await User.find().select('-password -resetOTP -passwordHistory');
        
        console.log('===========================================');
        console.log('           ALL USERS IN DATABASE          ');
        console.log('===========================================\n');
        
        if (users.length === 0) {
            console.log('No users found in database.');
        } else {
            users.forEach((user, index) => {
                console.log(`User #${index + 1}:`);
                console.log(`  Username: ${user.username}`);
                console.log(`  Mobile: ${user.mobile}`);
                console.log(`  Role: ${user.role}`);
                console.log(`  Account Status: ${user.accountStatus}`);
                console.log(`  Login Attempts: ${user.loginAttempts}`);
                console.log(`  Is Locked: ${user.isLocked}`);
                if (user.lockUntil) {
                    console.log(`  Lock Until: ${new Date(user.lockUntil).toLocaleString()}`);
                }
                console.log('-------------------------------------------');
            });
            
            console.log('\n💡 Tip: Try logging in with any of these usernames.');
            console.log('The password should be the one from .env file or the one you set when creating the user.');
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

listUsers();
