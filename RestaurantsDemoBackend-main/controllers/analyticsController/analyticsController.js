const Sale = require('../../models/saleModel');
const Purchase = require('../../models/purchaseModel');

// Monthly sales aggregation
const getMonthlySales = async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();
        const sales = await Sale.aggregate([
            {
                $match: {
                    date: {
                        $gte: new Date(`${currentYear}-01-01`),
                        $lt: new Date(`${currentYear + 1}-01-01`)
                    }
                }
            },
            {
                $group: {
                    _id: { $month: "$date" },
                    totalSales: { $sum: "$grandTotal" },
                    pureProfit: { $sum: "$pureProfit" },
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    month: "$_id",
                    totalSales: 1,
                    pureProfit: 1,
                    count: 1,
                    _id: 0
                }
            },
            { $sort: { month: 1 } }
        ]);
        res.json(sales);
    } catch (error) {
        console.error('Error fetching monthly sales data:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Weekly sales aggregation
const getWeeklySales = async (req, res) => {
    try {
        const sales = await Sale.aggregate([
            {
                $group: {
                    _id: { $isoWeek: "$date" },
                    totalSales: { $sum: "$grandTotal" },
                    pureProfit: { $sum: "$pureProfit" },
                    count: { $sum: 1 },
                    startDate: { $min: "$date" }
                }
            },
            {
                $project: {
                    week: "$_id",
                    totalSales: 1,
                    pureProfit: 1,
                    count: 1,
                    startDate: 1,
                    _id: 0
                }
            },
            { $sort: { week: 1 } }
        ]);
        res.json(sales);
    } catch (error) {
        console.error('Error fetching weekly sales data:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Daily sales aggregation
const getDailySales = async (req, res) => {
    try {
        const sales = await Sale.aggregate([
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                    totalSales: { $sum: "$grandTotal" },
                    pureProfit: { $sum: "$pureProfit" },
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    date: "$_id",
                    totalSales: 1,
                    pureProfit: 1,
                    count: 1,
                    _id: 0
                }
            },
            { $sort: { date: 1 } }
        ]);
        res.json(sales);
    } catch (error) {
        console.error('Error fetching daily sales data:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Monthly purchases aggregation
const getMonthlyPurchases = async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();
        const purchases = await Purchase.aggregate([
            {
                $match: {
                    date: {
                        $gte: new Date(`${currentYear}-01-01`),
                        $lt: new Date(`${currentYear + 1}-01-01`)
                    }
                }
            },
            {
                $group: {
                    _id: { $month: "$date" },
                    totalPurchases: { $sum: "$grandTotal" },
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    month: "$_id",
                    totalPurchases: 1,
                    count: 1,
                    _id: 0,
                    label: { $concat: [{ $toString: "$_id" }, " ", { $toString: currentYear }] }
                }
            },
            { $sort: { month: 1 } }
        ]);
        res.json(purchases);
    } catch (error) {
        console.error('Error fetching monthly purchase data:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Weekly purchases aggregation
const getWeeklyPurchases = async (req, res) => {
    try {
        const purchases = await Purchase.aggregate([
            {
                $group: {
                    _id: { $isoWeek: "$date" },
                    totalPurchases: { $sum: "$grandTotal" },
                    count: { $sum: 1 },
                    startDate: { $min: "$date" }
                }
            },
            {
                $project: {
                    week: "$_id",
                    totalPurchases: 1,
                    count: 1,
                    startDate: 1,
                    _id: 0
                }
            },
            { $sort: { week: 1 } }
        ]);
        res.json(purchases);
    } catch (error) {
        console.error('Error fetching weekly purchase data:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Daily purchases aggregation
const getDailyPurchases = async (req, res) => {
    try {
        const purchases = await Purchase.aggregate([
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                    totalPurchases: { $sum: "$grandTotal" },
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    date: "$_id",
                    totalPurchases: 1,
                    count: 1,
                    _id: 0
                }
            },
            { $sort: { date: 1 } }
        ]);
        res.json(purchases);
    } catch (error) {
        console.error('Error fetching daily purchase data:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    getMonthlySales,
    getWeeklySales,
    getDailySales,
    getMonthlyPurchases,
    getWeeklyPurchases,
    getDailyPurchases
};
