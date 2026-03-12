require('dotenv').config();

async function unlockAdmin() {
    const mongoose = require('mongoose');
    await mongoose.connect(process.env.MONGODB_URL);
    console.log('Connected to MongoDB');

    const result = await mongoose.connection.collection('users').updateOne(
        { username: 'pos.ideazone@gmail.com' },
        {
            $set: { accountStatus: 'active', loginAttempts: 0, lockCount: 0 },
            $unset: { lockUntil: '' }
        }
    );

    console.log('Updated:', result.modifiedCount, 'document(s)');
    console.log('✅ Account unlocked! Try logging in now.');
    await mongoose.disconnect();
}

unlockAdmin().catch(console.error);
