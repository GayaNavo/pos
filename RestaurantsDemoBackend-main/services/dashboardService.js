const Sale = require("../models/saleModel");
const SaleReturn = require("../models/saleReturnModel");
const Purchase = require("../models/purchaseModel");
const PurchaseReturn = require("../models/purchaseReturnModel");
const Expenses = require("../models/expensesModel");
const { getTodayColomboRange } = require("../utils/timeZone");

const formatAmount = (amount) => {
    if (amount >= 1000000000) { // 1 Billion
        return `${(amount / 1000000000).toFixed(4)}B`;
    }
    return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
};

const getReportDataService = async (warehouse) => {
    const warehouseFilter = warehouse === "all" ? {} : { warehouse };
    const { start, end } = getTodayColomboRange();

    const todayFilter = {
        ...warehouseFilter,
        date: { $gte: start, $lte: end },
    };

    const [ sales, saleReturns, purchases, purchaseReturns, expenses, todaySales, todaySaleReturns, todayPurchases,
         todayPurchaseReturns, todayExpenses, ] = await Promise.all([
        Sale.find(warehouseFilter),
        SaleReturn.find(warehouseFilter),
        Purchase.find(warehouseFilter),
        PurchaseReturn.find(warehouseFilter),
        Expenses.find(warehouseFilter),

        Sale.find(todayFilter),
        SaleReturn.find(todayFilter),
        Purchase.find(todayFilter),
        PurchaseReturn.find(todayFilter),
        Expenses.find(todayFilter),
    ]);

    // Totals (all-time)
    const totalSaleAmount = sales.reduce((t, s) => t + parseFloat(s.grandTotal || 0), 0);
    const totalSaleReturnAmount = saleReturns.reduce((t, s) => t + parseFloat(s.returnAmount || 0), 0);
    const totalPurchaseAmount = purchases.reduce((t, p) => t + parseFloat(p.grandTotal || 0), 0);
    const totalPurchaseReturnAmount = purchaseReturns.reduce((t, p) => t + parseFloat(p.grandTotal || 0), 0);
    const totalProfitAmount = sales.reduce((t, s) => t + parseFloat(s.pureProfit || 0), 0);
    const totalExpensesAmount = expenses.reduce((t, e) => t + parseFloat(e.amount || 0), 0);

    // Totals (today)
    const todaySaleAmount = todaySales.reduce((t, s) => t + parseFloat(s.grandTotal || 0), 0);
    const todaySaleReturnAmount = todaySaleReturns.reduce((t, s) => t + parseFloat(s.returnAmount || 0), 0);
    const todayPurchaseAmount = todayPurchases.reduce((t, p) => t + parseFloat(p.grandTotal || 0), 0);
    const todayPurchaseReturnAmount = todayPurchaseReturns.reduce((t, p) => t + parseFloat(p.grandTotal || 0), 0);
    const todayProfitAmount = todaySales.reduce((t, s) => t + parseFloat(s.pureProfit || 0), 0);
    const todayExpensesAmount = todayExpenses.reduce((t, e) => t + parseFloat(e.amount || 0), 0);

    return {
        raw: {
            sales,
            saleReturns,
            purchases,
            purchaseReturns,
            expenses,
            todaySales,
            todaySaleReturns,
            todayPurchases,
            todayPurchaseReturns,
            todayExpenses,
        },
        totals: {
            totalSale: formatAmount(totalSaleAmount),
            totalSaleReturn: formatAmount(totalSaleReturnAmount),
            totalPurchase: formatAmount(totalPurchaseAmount),
            totalPurchaseReturn: formatAmount(totalPurchaseReturnAmount),
            totalProfit: formatAmount(totalProfitAmount),
            totalExpenses: totalExpensesAmount,

            todaySale: formatAmount(todaySaleAmount),
            todaySaleReturn: formatAmount(todaySaleReturnAmount),
            todayPurchase: formatAmount(todayPurchaseAmount),
            todayPurchaseReturn: formatAmount(todayPurchaseReturnAmount),
            todayProfit: formatAmount(todayProfitAmount),
            todayExpenses: todayExpensesAmount,
        },
    };
};

module.exports = { getReportDataService };
