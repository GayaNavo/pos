

const Cash = require('../../models/posModel/cashModel');

const cashHandIn = async (req, res) => {
    const openTime = new Date().toISOString();
    const { cashAmount, username, name, oneRupee, twoRupee, fiveRupee, tenRupee, twentyRupee, fiftyRupee, hundredRupee, fiveHundredRupee, thousandRupee, fiveThousandRupee } = req.body;

    // Validate input data
    if (!cashAmount || !username || !name || !openTime) {
        return res.status(400).json({
            status: 'fail',
            message: 'Missing required fields: cashAmount, username, name, openTime'
        });
    }
    if (cashAmount <= 500) {
        return res.status(400).json({
            status: 'fail',
            message: 'Cash amount must be more than 500.'
        });
    }

    else {
        try {
            const existingUser = await Cash.findOne({ username });
            if (existingUser) {
                return res.status(400).json({
                    status: 'fail',
                    message: 'This user already has an open cash register.'
                });
            }

            const newCash = new Cash({
                username,
                name,
                openTime,
                cashHandIn: cashAmount,
                totalBalance: cashAmount,
                oneRupee,
                twoRupee,
                fiveRupee,
                tenRupee,
                twentyRupee,
                fiftyRupee,
                hundredRupee,
                fiveHundredRupee,
                thousandRupee,
                fiveThousandRupee
            });

            await newCash.save();
            return res.status(201).json({
                status: 'success',
                message: 'New cash record created successfully',
                cash: newCash
            });
        } catch (error) {
            return res.status(500).json({
                status: 'error',
                message: 'Internal server error while updating cash.',
                error: error.message
            });
        }

    }
};

const closeRegister = async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({
            status: 'fail',
            message: 'ID is required'
        });
    }

    try {
        const deletedRegister = await Cash.findByIdAndDelete(id);
        if (!deletedRegister) {
            return res.status(404).json({
                status: 'fail',
                message: 'Registry not found'
            });
        }
        return res.status(200).json({
            status: 'success',
            message: 'Registry deleted successfully'
        });
    } catch (error) {
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error while deleting cash.',
            error: error.message
        });
    }
};

const getCashRegister = async (req, res) => {
    const { username } = req.params;

    try {
        const cashRegister = await Cash.find({ username });

        if (!cashRegister || cashRegister.length === 0) {
            return res.status(404).json({
                status: 'fail',
                message: 'No cash registers found for this user'
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Cash register(s) retrieved successfully',
            data: cashRegister
        });

    } catch (error) {
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error while retrieving cash registers',
            error: error.message
        });
    }
};

module.exports = { cashHandIn, closeRegister, getCashRegister };