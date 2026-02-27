

const Registry = require('../../models/posModel/cashModel');
const moment = require('moment-timezone');

// Controller to get all registry
const getAllRegistry = async (req, res) => {
    const { cashierUsername } = req.params;
    try {
        const registry = await Registry.findOne({ username: cashierUsername });

        if (!registry) {
            return res.status(404).json({ message: 'Registry not found', status: 'fail' });
        }

        const registryData = registry.toObject();
        if (registryData.openTime) {
            registryData.openTime = moment(registryData.openTime)
                .tz('Asia/Colombo')
                .format('YYYY/MM/DD HH:mm:ss');
        }

        console.log('Data ', registryData);
        res.status(200).json({ data: registryData });
    } catch (error) {
        console.error('Error getting all registry:', error);
        return res.status(500).json({
            message: 'Server Error',
            status: 'fail',
            error: 'Something went wrong, please try again later.'
        });
    }
};

module.exports = { getAllRegistry }