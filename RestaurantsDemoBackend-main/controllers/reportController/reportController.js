/*
 * Copyright (c) 2025 Ideazone (Pvt) Ltd
 * Proprietary and Confidential
 *
 * This source code is part of a proprietary Point-of-Sale (POS) system developed by Ideazone (Pvt) Ltd.
 * Use of this code is governed by a license agreement and an NDA.
 * Unauthorized use, modification, distribution, or reverse engineering is strictly prohibited.
 *
 * Contact info@ideazone.lk for more information.
 */

const { getReportDataService } = require("../../services/dashboardService");
const Purchase = require('../../models/purchaseModel');
const PurchaseReturn = require('../../models/purchaseReturnModel');
const Sale = require('../../models/saleModel');
const SaleReturn = require('../../models/saleReturnModel');
const Customer = require('../../models/customerModel');
const Expenses = require('../../models/expensesModel');
const Cash = require('../../models/posModel/cashModel');
const Product = require('../../models/products/product');
const { getSriLankanDateRange, calculateReportValues } = require('../../services/profitAndLossService');

const getReportData = async (req, res) => {
    const { warehouse } = req.params;
    try {
        const reportData = await getReportDataService(warehouse);

        res.status(200).json({
            message: "Report data fetched successfully",
            data: reportData,
        });
    } catch (error) {
        console.error("Error getting report data:", error);
        return res.status(500).json({
            message: "Server Error",
            status: "fail",
            error: "Something went wrong, please try again later.",
        });
    }
};

const toColomboYMD = (utcDate) => {
    if (!utcDate) return null;
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Colombo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(utcDate);
};

const toColomboDMY = (utcDate) => {
    if (!utcDate) return null;
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Colombo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).formatToParts(utcDate);
    const { day, month, year } = parts.reduce((a, { type, value }) => ({ ...a, [type]: value }), {});
    return `${day}/${month}/${year}`;
};

const getReportDataFromDateRange = async (req, res) => {
    console.log('[getReportDataFromDateRange] Called with warehouse:', req.params.warehouse, 'dates:', req.query);
    try {
        const { warehouse } = req.params;
        let { fromDate, toDate } = req.query;

        const mongoFilter = {};
        if (warehouse && warehouse.toLowerCase() !== 'all') {
            mongoFilter.warehouse = warehouse;
        }

        console.log('[getReportDataFromDateRange] Fetching sales with filter:', mongoFilter);

        const [saleArr, purchaseArr, saleRetArr, purchaseRetArr] =
            await Promise.all([
                Sale.find(mongoFilter).lean(),
                Purchase.find(mongoFilter).lean(),
                SaleReturn.find(mongoFilter).lean(),
                PurchaseReturn.find(mongoFilter).lean(),
            ]);

        console.log('[getReportDataFromDateRange] Found', saleArr.length, 'sales');

        let saleData = saleArr;
        let purchaseData = purchaseArr;
        let saleReturnData = saleRetArr;
        let purchaseReturnData = purchaseRetArr;

        if (fromDate && toDate) {
            const isInside = (utc) => {
                const ymd = toColomboYMD(utc);
                return ymd && ymd >= fromDate && ymd <= toDate;
            };
            const filterByDate = (arr) => arr.filter(d => isInside(d.date));

            saleData = filterByDate(saleArr);
            purchaseData = filterByDate(purchaseArr);
            saleReturnData = filterByDate(saleRetArr);
            purchaseReturnData = filterByDate(purchaseRetArr);
        }

        const desc = (a, b) => new Date(b.date) - new Date(a.date);
        saleData.sort(desc);
        purchaseData.sort(desc);
        saleReturnData.sort(desc);
        purchaseReturnData.sort(desc);

        // Enrich sale data with category information
        const enrichWithCategory = async (salesArray) => {
            // Get all unique product codes and IDs from sales
            const productCodes = new Set();
            const productIds = new Set();
            
            salesArray.forEach(sale => {
                if (sale.productsData && Array.isArray(sale.productsData)) {
                    sale.productsData.forEach(product => {
                        // Handle both 'code' and 'productCode' fields
                        if (product.productCode) {
                            productCodes.add(product.productCode);
                        }
                        if (product.code) {
                            productCodes.add(product.code);
                        }
                        if (product.currentID) {
                            productIds.add(product.currentID);
                        }
                    });
                }
            });

            console.log('[DEBUG] Product codes:', Array.from(productCodes).slice(0, 5));
            console.log('[DEBUG] Product IDs:', Array.from(productIds).slice(0, 5));

            // Fetch all products with their categories in one query
            const products = await Product.find({
                $or: [
                    { code: { $in: Array.from(productCodes) } },
                    { _id: { $in: Array.from(productIds) } }
                ]
            }).select('code _id category name').lean();

            console.log('[DEBUG] Found products:', products.length);
            if (products.length > 0) {
                console.log('[DEBUG] Sample product:', {
                    code: products[0].code,
                    category: products[0].category,
                    name: products[0].name
                });
            }

            // Create a map for quick lookup by both code and ID
            const productCategoryMap = {};
            products.forEach(p => {
                if (p.code) {
                    productCategoryMap[p.code] = p.category;
                }
                if (p._id) {
                    productCategoryMap[p._id.toString()] = p.category;
                }
            });

            console.log('[DEBUG] Category map size:', Object.keys(productCategoryMap).length);
            console.log('[DEBUG] Sample from category map:', Object.entries(productCategoryMap).slice(0, 3));

            // Enrich sales data
            return salesArray.map(sale => {
                if (sale.productsData && Array.isArray(sale.productsData)) {
                    sale.productsData = sale.productsData.map(product => {
                        // Try multiple fields to find the category
                        const lookupKey = product.productCode || product.code || product.currentID;
                        const category = productCategoryMap[lookupKey] || 
                                       productCategoryMap[product.currentID] || 
                                       'Uncategorized';
                        
                        console.log('[DEBUG] Product:', product.name, 'Code:', lookupKey, 'Category:', category);
                        
                        return {
                            ...product,
                            category: category
                        };
                    });
                }
                return sale;
            });
        };

        saleData = await enrichWithCategory(saleData);

        const fmt = (arr) => arr.map(d => ({ ...d, date: toColomboDMY(d.date) }));

        return res.status(200).json({
            message: 'Report data fetched successfully',
            query: { warehouse, fromDate, toDate },
            counts: {
                sales: saleData.length,
                purchases: purchaseData.length,
                saleReturns: saleReturnData.length,
                purchaseReturns: purchaseReturnData.length,
            },
            data: {
                saleData: fmt(saleData),
                purchaseData: fmt(purchaseData),
                saleReturnData: fmt(saleReturnData),
                purchaseReturnData: fmt(purchaseReturnData),
            },
        });
    } catch (err) {
        console.error('getReportDataFromDateRange error:', err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

const getFillteredReportData = async (req, res) => {
    const { warehouse, orderStatus, paymentStatus, paymentType, orderType, date } = req.query;
    console.log(warehouse, orderStatus, paymentStatus, paymentType, orderType, date);

    try {
        // Build filters
        const warehouseFilter = warehouse && warehouse !== "all" ? { warehouse } : {};
        const orderStatusFilter = orderStatus && orderStatus !== "all" ? { orderStatus } : {};
        const paymentStatusFilter = paymentStatus && paymentStatus !== "all" ? { paymentStatus } : {};
        const orderTypeFilter = orderType && orderType !== "All" ? { orderType } : {};

        let paymentTypeFilter = {};
        if (paymentType && paymentType !== "all" && paymentType.trim() !== "") {
            const paymentTypes = Array.isArray(paymentType) ? paymentType : [paymentType];
            paymentTypeFilter = {
                paymentType: {
                    $elemMatch: { type: { $in: paymentTypes } },
                },
            };
        }

        let dateFilter = {};
        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            dateFilter = { date: { $gte: startOfDay, $lte: endOfDay } };
        }

        // Combine filters
        const combinedFilter = {
            ...warehouseFilter,
            ...orderStatusFilter,
            ...paymentStatusFilter,
            ...paymentTypeFilter,
            ...orderTypeFilter,
            ...dateFilter,
        };

        console.log("Applied Filters:", { warehouseFilter, orderStatusFilter, paymentStatusFilter, paymentTypeFilter, orderTypeFilter, dateFilter });

        // UTC-safe date formatter (dd/mm/yyyy)
        const formatDateUTC = (utcDate) => {
            if (!utcDate) return null;
            const d = new Date(utcDate);
            const day = String(d.getUTCDate()).padStart(2, "0");
            const month = String(d.getUTCMonth() + 1).padStart(2, "0");
            const year = d.getUTCFullYear();
            return `${day}/${month}/${year}`;
        };

        // Query database
        const [sales, saleReturns, purchases, purchaseReturns, expenses] = await Promise.all([
            Sale.find(combinedFilter).sort({ createdAt: -1 }),
            SaleReturn.find(combinedFilter).sort({ createdAt: -1 }),
            Purchase.find(combinedFilter).sort({ createdAt: -1 }),
            PurchaseReturn.find(combinedFilter).sort({ createdAt: -1 }),
            Expenses.find(warehouseFilter).sort({ createdAt: -1 }),
        ]);

        // Format dates
        const formattedSales = sales.map((s) => ({ ...s._doc, date: formatDateUTC(s.date) }));
        const formattedSaleReturns = saleReturns.map((s) => ({ ...s._doc, date: formatDateUTC(s.date) }));
        const formattedPurchases = purchases.map((p) => ({ ...p._doc, date: formatDateUTC(p.date) }));
        const formattedPurchaseReturns = purchaseReturns.map((p) => ({ ...p._doc, date: formatDateUTC(p.date) }));
        const formattedExpenses = expenses.map((e) => ({ ...e._doc, date: formatDateUTC(e.date) }));

        // Send response
        res.status(200).json({
            message: "Report data fetched successfully",
            data: {
                sales: formattedSales,
                saleReturns: formattedSaleReturns,
                purchases: formattedPurchases,
                purchaseReturns: formattedPurchaseReturns,
                expenses: formattedExpenses,
            },
        });
    } catch (error) {
        console.error("Error getting report data:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

const allCustomerReport = async (req, res) => {
    const { name } = req.params;
    console.log(name)
    try {
        const customers = await Customer.find();
        if (!customers || customers.length === 0) {
            return res.status(404).json({ message: 'Customers not found' });
        }
        // Fetch sales data for each customer and filter out those with no sales
        const customersData = await Promise.all(customers.map(async (customer) => {
            const sales = await Sale.find(name);
            if (sales.length === 0) return null;  // Exclude customers with no sales

            return {
                _id: customer._id,
                name: customer.name,
                mobile: customer.mobile,
                sales: sales.map(sale => ({
                    saleId: sale._id,
                    warehouse: sale.warehouse,
                    date: sale.date,
                    amount: sale.grandTotal,
                    paid: sale.paidAmount,
                    paymentStatus: sale.paymentStatus,
                }))
            };
        }));
        // Filter out null values (customers with no sales)
        const filteredData = customersData.filter(customer => customer !== null);

        return res.status(200).json(filteredData);
    } catch (error) {
        // Log error for debugging
        console.error("Error getting report data:", error);

        // Return a more generic error message for unexpected issues
        return res.status(500).json({ message: 'Server Error', status: 'fail', error: 'Something went wrong, please try again later.' });
    }
}

const allCustomerReportById = async (req, res) => {
    const { name } = req.params
    try {
        const customers = await Customer.find({ name: name });
        if (!customers || customers.length === 0) {
            return res.status(404).json({ message: 'Customers not found' });
        }
        const customersData = await Promise.all(customers.map(async (customer) => {
            const sales = await Sale.find({ customer: customer.name });
            if (sales.length === 0) return null;

            return {
                _id: customer._id,
                name: customer.name,
                mobile: customer.mobile,
                sales: sales.map(sale => ({
                    saleId: sale._id,
                    warehouse: sale.warehouse,
                    date: sale.date,
                    amount: sale.grandTotal,
                    paid: sale.paidAmount,
                    paymentStatus: sale.paymentStatus,
                }))
            };
        }));
        // Filter out null values (customers with no sales)
        const filteredData = customersData.filter(customer => customer !== null);

        return res.status(200).json(filteredData);
    } catch (error) {
        console.error('Error fetching customers with sales data:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

const findReportByCustomer = async (req, res) => {
    const { name } = req.query;

    if (!name) {
        return res.status(400).json({ message: 'Customer name is required' });
    }
    try {
        const customers = await Customer.find({ name: { $regex: name, $options: 'i' } });
        if (!customers) {
            return res.status(404).json({ message: 'No customers found' });
        }
        const customersData = await Promise.all(customers.map(async (customer) => {
            // Fetch sales by using the customer's ID instead of name
            const sales = await Sale.find({ customer: customer.name });
            if (sales.length === 0) return null;  // Exclude customers with no sales

            return {
                _id: customer._id,
                name: customer.name,
                mobile: customer.mobile,
                sales: sales.map(sale => ({
                    saleId: sale._id,
                    warehouse: sale.warehouse,
                    date: sale.date,
                    amount: sale.grandTotal,
                    paid: sale.paidAmount,
                    paymentStatus: sale.paymentStatus,
                }))
            };
        }));

        const filteredData = customersData.filter(customer => customer !== null);

        if (filteredData.length === 0) {
            return res.status(404).json({ message: 'No customers with sales found' });
        }
        return res.status(200).json(filteredData);
    } catch (error) {
        console.error('Error fetching customer report by name:', error);
        return res.status(500).json({ message: 'Internal server error', error });
    }
};

const getZReportData = async (req, res) => {
    const { cashRegisterID } = req.params;

    try {
        const cashRegister = await Cash.findById(cashRegisterID);
        if (!cashRegister) {
            return res.status(404).json({
                message: 'Cash register not found',
                status: 'fail'
            });
        }

        const salesFilter = {
            cashRegisterID: cashRegisterID,
            saleType: "POS"
        };

        const sales = await Sale.find(salesFilter)
            .sort({ date: 1 })
            .lean();

        const totals = {
            grandTotal: 0,
            pureProfit: 0,
            totalTransactions: sales.length,
            cashBalance: 0
        };

        sales.forEach(sale => {
            totals.grandTotal += parseFloat(sale.grandTotal) || 0;
            totals.pureProfit += parseFloat(sale.pureProfit) || 0;
            totals.cashBalance += parseFloat(sale.cashBalance) || 0;
        });

        // 4. Prepare response
        res.status(200).json({
            message: 'Z-Report data fetched successfully',
            data: {
                sales,
                totals,
                registerInfo: {
                    openTime: cashRegister.openTime,
                    currentTime: new Date().toString(),
                    cashier: cashRegister.name || cashRegister.username,
                    startingBalance: cashRegister.totalBalance,
                    registerId: cashRegister._id,
                    timezone: "Asia/Colombo (UTC+5:30)"
                }
            }
        });

    } catch (error) {
        console.error("Error in getZReportData:", error);
        res.status(500).json({
            message: 'Server Error',
            status: 'fail',
            error: error.message
        });
    }
};

const getTodayReportData = async (req, res) => {
    const { warehouse } = req.params;
    try {
        const { startOfDay, endOfDay } = getSriLankanDateRange('today');

        console.log("Today Report Date Range (UTC):", startOfDay.toISOString(), endOfDay.toISOString());

        const warehouseFilter = warehouse === 'all' ? {} : { warehouse };
        const dateFilter = {
            date: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        };
        const filter = { ...warehouseFilter, ...dateFilter };

        const [sales, saleReturns, purchases, purchaseReturns, expenses] = await Promise.all([
            Sale.find(filter),
            SaleReturn.find(filter),
            Purchase.find(filter),
            PurchaseReturn.find(filter),
            Expenses.find(filter)
        ]);

        const calculatedValues = calculateReportValues(sales, saleReturns, expenses);

        res.status(200).json({
            message: 'Today report data fetched successfully',
            data: {
                sales,
                saleReturns,
                purchases,
                purchaseReturns,
                expenses,
                calculations: calculatedValues
            }
        });

    } catch (error) {
        console.error("Error getting today report data:", error);
        return res.status(500).json({
            message: 'Server Error',
            status: 'fail',
            error: 'Something went wrong, please try again later.'
        });
    }
};

const getLastWeekReportData = async (req, res) => {
    const { warehouse } = req.params;

    try {
        const { startOfDay, endOfDay } = getSriLankanDateRange('lastweek');

        console.log("Last Week Report Date Range (UTC):", startOfDay.toISOString(), endOfDay.toISOString());

        const warehouseFilter = warehouse === 'all' ? {} : { warehouse };
        const dateFilter = {
            date: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        };
        const filter = { ...warehouseFilter, ...dateFilter };

        const [sales, saleReturns, purchases, purchaseReturns, expenses] = await Promise.all([
            Sale.find(filter),
            SaleReturn.find(filter),
            Purchase.find(filter),
            PurchaseReturn.find(filter),
            Expenses.find(filter)
        ]);

        const calculatedValues = calculateReportValues(sales, saleReturns, expenses);

        res.status(200).json({
            message: 'Last week report data fetched successfully',
            data: {
                sales,
                saleReturns,
                purchases,
                purchaseReturns,
                expenses,
                calculations: calculatedValues
            }
        });
    } catch (error) {
        console.error("Error getting last week report data:", error);
        return res.status(500).json({
            message: 'Server Error',
            status: 'fail',
            error: 'Something went wrong, please try again later.'
        });
    }
};

const getLastMonthReportData = async (req, res) => {
    const { warehouse } = req.params;

    try {
        const { startOfDay, endOfDay } = getSriLankanDateRange('lastMonth');

        console.log("Last Month Report Date Range (UTC):", startOfDay.toISOString(), endOfDay.toISOString());

        const warehouseFilter = warehouse === 'all' ? {} : { warehouse };
        const dateFilter = {
            date: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        };
        const filter = { ...warehouseFilter, ...dateFilter };

        const [sales, saleReturns, purchases, purchaseReturns, expenses] = await Promise.all([
            Sale.find(filter),
            SaleReturn.find(filter),
            Purchase.find(filter),
            PurchaseReturn.find(filter),
            Expenses.find(filter)
        ]);

        const calculatedValues = calculateReportValues(sales, saleReturns, expenses);

        res.status(200).json({
            message: 'Last month report data fetched successfully',
            data: {
                sales,
                saleReturns,
                purchases,
                purchaseReturns,
                expenses,
                calculations: calculatedValues
            }
        });
    } catch (error) {
        console.error("Error getting last month report data:", error);
        return res.status(500).json({
            message: 'Server Error',
            status: 'fail',
            error: 'Something went wrong, please try again later.'
        });
    }
};

const getLastYearReportData = async (req, res) => {
    const { warehouse } = req.params;

    try {
        const { startOfDay, endOfDay } = getSriLankanDateRange('lastYear');

        console.log("Last Year Report Date Range (UTC):", startOfDay.toISOString(), endOfDay.toISOString());

        const warehouseFilter = warehouse === 'all' ? {} : { warehouse };
        const dateFilter = {
            date: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        };
        const filter = { ...warehouseFilter, ...dateFilter };

        const [sales, saleReturns, purchases, purchaseReturns, expenses] = await Promise.all([
            Sale.find(filter),
            SaleReturn.find(filter),
            Purchase.find(filter),
            PurchaseReturn.find(filter),
            Expenses.find(filter)
        ]);

        const calculatedValues = calculateReportValues(sales, saleReturns, expenses);

        res.status(200).json({
            message: 'Last year report data fetched successfully',
            data: {
                sales,
                saleReturns,
                purchases,
                purchaseReturns,
                expenses,
                calculations: calculatedValues
            }
        });
    } catch (error) {
        console.error("Error getting last year report data:", error);
        return res.status(500).json({
            message: 'Server Error',
            status: 'fail',
            error: 'Something went wrong, please try again later.'
        });
    }
};

module.exports = {
    getReportData, allCustomerReport, allCustomerReportById, findReportByCustomer, getFillteredReportData, getTodayReportData,
    getLastWeekReportData, getLastMonthReportData, getLastYearReportData, getZReportData, getReportDataFromDateRange
};
