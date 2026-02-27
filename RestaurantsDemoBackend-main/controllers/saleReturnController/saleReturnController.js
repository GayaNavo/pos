

const Sale = require('../../models/saleModel')
const SalePayment = require('../../models/salePaymentModel')
const Product = require('../../models/products/product');
const SaleReturn = require('../../models/saleReturnModel')
const posController = require('../posController/posController')
const mongoose = require('mongoose');
const generateReferenceId = require('../../utils/generateReferenceID');
const { formatToSriLankaTime } = require("../../utils/timeZone");
const moment = require('moment-timezone');

const convertToColomboTime = (date) => {
    if (!date) return null;
    const colomboDate = new Date(date).toLocaleString('en-GB', {
        timeZone: 'Asia/Colombo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });

    const [datePart, timePart] = colomboDate.split(', ');
    return {
        full: colomboDate,
        dateOnly: datePart,
        timeOnly: timePart,
        iso: date.toISOString()
    };
};

const returnSale = async (req, res) => {
    const date = new Date();
    try {
        const returnData = req.body;
        returnData.date = date;

        // Validation
        if (!returnData || !returnData.productsData || returnData.productsData.length === 0) {
            return res.status(400).json({ message: 'Invalid data: Missing product information.' });
        }
        if (!returnData.note) {
            return res.status(400).json({ message: 'Invalid data: Missing Note' });
        }
        if (!returnData.warehouse) {
            return res.status(400).json({ message: 'Invalid data: Missing warehouse' });
        }
        if (!returnData.customer) {
            return res.status(400).json({ message: 'Invalid data: Missing customer' });
        }

        const refferenceId = await generateReferenceId('SALE_RETURN');
        returnData.refferenceId = refferenceId;

        returnData.productsData = returnData.productsData.map(product => ({
            ...product,
            warehouse: product.warehouse || null
        }));

        // GROUP PRODUCTS BY ID AND WAREHOUSE TO AVOID CONFLICTS
        const productGroups = {};
        
        returnData.productsData.forEach((product) => {
            const { currentID, returnQty, ptype, selectedVariation, warehouse: warehouseKey, returnStatus } = product;

            // Only process items where returnStatus is true (checkbox is checked)
            if (returnStatus !== true || !returnQty || returnQty <= 0) {
                return;
            }

            const groupKey = `${currentID}_${warehouseKey}`;
            
            if (!productGroups[groupKey]) {
                productGroups[groupKey] = {
                    currentID,
                    warehouseKey,
                    ptype,
                    updates: []
                };
            }

            productGroups[groupKey].updates.push({
                selectedVariation,
                returnQty,
                ptype
            });
        });

        // Process each product group
        const updatePromises = Object.values(productGroups).map(async (group) => {
            const { currentID, warehouseKey, updates } = group;

            if (!mongoose.Types.ObjectId.isValid(currentID)) {
                throw new Error(`Invalid product ID: ${currentID}`);
            }

            const updatedProduct = await Product.findById(currentID);
            if (!updatedProduct) throw new Error(`Product not found: ${currentID}`);

            const warehouseData = updatedProduct.warehouse.get(warehouseKey);
            if (!warehouseData) throw new Error(`Warehouse ${warehouseKey} not found`);

            // Apply all updates for this product
            updates.forEach(({ selectedVariation, returnQty, ptype }) => {
                if (ptype === 'Single') {
                    const newQty = (warehouseData.productQty || 0) + (returnQty || 0);
                    warehouseData.productQty = newQty;
                    console.log(`Updated Single product ${currentID}: new qty = ${newQty}`);

                } else if (ptype === 'Variation') {
                    if (!selectedVariation) {
                        throw new Error(`selectedVariation missing for product ${currentID}`);
                    }

                    const variation = warehouseData.variationValues.get(selectedVariation);
                    if (!variation) {
                        throw new Error(
                            `Variation '${selectedVariation}' not found for product ${currentID} in warehouse ${warehouseKey}`
                        );
                    }

                    const newQty = (variation.productQty || 0) + (returnQty || 0);
                    variation.productQty = newQty;
                    console.log(`Updated Variation product ${currentID} (${selectedVariation}): new qty = ${newQty}`);
                }
            });

            // Mark modified and save once per product
            updatedProduct.markModified(`warehouse.${warehouseKey}`);
            await updatedProduct.save();
            
            return updatedProduct;
        });

        await Promise.all(updatePromises);

        await Sale.findOneAndUpdate(
            { _id: returnData.id },
            { $set: { returnStatus: true } },
            { new: true }
        );

        const newSaleReturn = new SaleReturn(returnData);
        const savedReturn = await newSaleReturn.save();

        res.status(201).json({
            message: 'Sale return saved successfully',
            saleReturn: savedReturn
        });

    } catch (error) {
        console.error('Error saving sale return:', error);

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                message: 'Validation error during sale return creation.',
                error: error.message
            });
        }

        if (error.message && (
            error.message.includes('Invalid product ID') ||
            error.message.includes('Product not found') ||
            error.message.includes('Warehouse') ||
            error.message.includes('Variation')
        )) {
            return res.status(400).json({
                message: 'Product update error during sale return.',
                error: error.message
            });
        }

        res.status(500).json({
            message: 'Failed to save sale return',
            error: error.message
        });
    }
};

const deleteSaleReturn = async (req, res) => {
    try {
        const saleReturnId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(saleReturnId)) {
            return res.status(400).json({ message: 'Invalid sale return ID format' });
        }
        const deletedSaleReturn = await SaleReturn.findByIdAndDelete(saleReturnId);
        if (!deletedSaleReturn) {
            return res.status(404).json({
                message: 'Sale return not found',
            });
        }
        res.status(200).json({
            message: 'Sale return deleted successfully',
            saleReturn: deletedSaleReturn,
        });
    } catch (error) {
        console.error('Error deleting sale return:', error);
        res.status(500).json({ message: 'Failed to delete sale return', error });
    }
};

const findSaleReturnById = async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ message: "sale ID is required" });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid sale return ID format" });
    }

    try {
        const saleReturn = await SaleReturn.findById(id);

        if (!saleReturn) {
            return res.status(404).json({ message: "Sale return not found" });
        }
        const formattedDate = formatToSriLankaTime(saleReturn.date);
        const productIds = saleReturn.productsData.map(product => product.currentID);
        const products = await Product.find({ _id: { $in: productIds } });

        const updatedProductsData = saleReturn.productsData.map(productData => {
            const baseProduct = products.find(p => p._id.toString() === productData.currentID);

            if (baseProduct) {
                let stokeQty = "";
                if (baseProduct.variationValues && baseProduct.variationValues.size > 0) {
                    const variation = baseProduct.variationValues.get(productData.variationValue);
                    if (variation) stokeQty = variation.productQty || "";
                } else {
                    stokeQty = baseProduct.productQty || "";
                }

                return {
                    ...productData.toObject(),
                    stokeQty
                };
            }

            return productData.toObject();
        });

        const saleReturnWithUpdatedProducts = {
            ...saleReturn.toObject(),
            date: formattedDate,
            productsData: updatedProductsData
        };

        res.status(200).json(saleReturnWithUpdatedProducts);

    } catch (error) {
        console.error("Error finding sale return by ID:", error);
        res.status(500).json({ message: "Error fetching sale return by ID", error });
    }
};

const fetchSaleReturns = async (req, res) => {
    const { id, keyword } = req.query;

    try {
        let saleReturns;
        if (id) {
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({ message: 'Invalid sale return ID format' });
            }

            const saleReturn = await SaleReturn.findById(id);
            if (!saleReturn) {
                return res.status(404).json({ message: 'Sale return not found' });
            }

            // Extract product IDs and fetch products
            const productIds = saleReturn.productsData.map(product => product.currentID);
            const products = await Product.find({ _id: { $in: productIds } });

            const updatedProductsData = saleReturn.productsData.map(productData => {
                const baseProduct = products.find(p => p._id.toString() === productData.currentID);
                let stockQty = "";

                if (baseProduct) {
                    if (baseProduct.variationValues && baseProduct.variationValues.size > 0) {
                        const variation = baseProduct.variationValues.get(productData.variationValue);
                        stockQty = variation ? variation.productQty || "" : "";
                    } else {
                        stockQty = baseProduct.productQty || "";
                    }
                }

                return {
                    ...productData.toObject(),
                    stockQty
                };
            });

            const saleReturnWithUpdatedProducts = {
                ...saleReturn.toObject(),
                date: formatToSriLankaTime(saleReturn.date)?.full || null,
                productsData: updatedProductsData
            };

            return res.status(200).json(saleReturnWithUpdatedProducts);
        }

        if (keyword) {
            if (keyword.length < 1) {
                return res.status(400).json({ message: 'Please provide a valid keyword.' });
            }

            saleReturns = await SaleReturn.find({
                $or: [
                    { customer: { $regex: new RegExp(keyword, 'i') } },
                    { refferenceId: { $regex: new RegExp(keyword, 'i') } }
                ]
            });

            if (!saleReturns || saleReturns.length === 0) {
                return res.status(404).json({ message: 'No sale returns found matching the provided keyword.' });
            }

            return res.status(200).json(
                saleReturns.map(sr => ({
                    ...sr.toObject(),
                    date: formatToSriLankaTime(sr.date)?.full || null
                }))
            );
        }

        // Pagination
        const size = parseInt(req.query?.page?.size) || 10;
        const number = parseInt(req.query?.page?.number) || 1;
        const offset = (number - 1) * size;

        if (req.query?.page) {
            saleReturns = await SaleReturn.find()
                .sort({ createdAt: -1 })
                .skip(offset)
                .limit(size);

            if (!saleReturns || saleReturns.length === 0) {
                return res.status(404).json({ message: 'No sale returns found.' });
            }

            const total = await SaleReturn.countDocuments();
            const totalPages = Math.ceil(total / size);

            return res.status(200).json({
                message: 'Sale returns fetched successfully with pagination',
                data: saleReturns.map(sr => ({
                    ...sr.toObject(),
                    date: formatToSriLankaTime(sr.date)?.full || null
                })),
                total,
                totalPages,
                currentPage: number,
                pageSize: size
            });
        }

        saleReturns = await SaleReturn.find();
        if (!saleReturns || saleReturns.length === 0) {
            return res.status(404).json({ message: 'No sale returns found.' });
        }

        res.status(200).json({
            message: 'Sale returns fetched successfully',
            saleReturns: saleReturns.map(sr => ({
                ...sr.toObject(),
                date: formatToSriLankaTime(sr.date)?.full || null
            }))
        });

    } catch (error) {
        console.error('Error fetching sale returns:', error);
        res.status(500).json({ message: 'Error fetching sale returns', error: error.message });
    }
};

const searchSaleReturns = async (req, res) => {
    const { keyword } = req.query;

    try {
        if (!keyword) {
            return res.status(400).json({
                status: "error",
                message: "Keyword is required for search."
            });
        }

        const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const query = {
            $or: [
                { customer: { $regex: new RegExp(`${escapedKeyword}`, "i") } },
                { refferenceId: { $regex: new RegExp(`${escapedKeyword}`, "i") } }
            ]
        };

        const saleReturns = await SaleReturn.find(query).populate(
            "productsData.currentID",
            "productName productQty"
        );

        if (!saleReturns || saleReturns.length === 0) {
            return res.status(404).json({
                status: "unsuccess",
                message: "No sale returns found for the provided keyword."
            });
        }

        // Format response
        const formattedSaleReturns = saleReturns.map((sr) => {
            const obj = sr.toObject();
            return {
                _id: obj._id,
                refferenceId: obj.refferenceId,
                customer: obj.customer,
                grandTotal: obj.grandTotal,
                warehouse: obj.warehouse,
                paidAmount: obj.paidAmount,
                returnAmount: obj.returnAmount,
                date: formatToSriLankaTime(obj.date)?.full || null,
                productsData: obj.productsData,
            };
        });

        return res.status(200).json({
            status: "success",
            saleReturns: formattedSaleReturns
        });
    } catch (error) {
        console.error("Search sale returns error:", error);
        return res.status(500).json({
            status: "error",
            message: error.message
        });
    }
};

const getDateRangeUTC = (timeRange, timezone = 'Asia/Colombo') => {
    const now = moment.tz(timezone);

    let start, end;

    switch (timeRange) {
        case 'today':
            start = now.clone().startOf('day');
            end = now.clone().endOf('day');
            break;
        case 'lastweek':
            start = now.clone().subtract(7, 'days').startOf('day');
            end = now.clone().endOf('day');
            break;
        case 'lastMonth':
            start = now.clone().subtract(1, 'month').startOf('day');
            end = now.clone().endOf('day');
            break;
        case 'lastYear':
            start = now.clone().subtract(1, 'year').startOf('day');
            end = now.clone().endOf('day');
            break;
        default:
            start = now.clone().startOf('day');
            end = now.clone().endOf('day');
    }
    return {
        start: start.utc().toDate(),
        end: end.utc().toDate()
    };
};

const getTotalReturnAmount = async (req, res) => {
    try {
        const saleReturns = await SaleReturn.find().lean();

        if (!saleReturns || saleReturns.length === 0) {
            // Return 200 with 0 amount instead of 404 when no returns exist
            return res.status(200).json({ totalReturnAmount: 0, detailedReturns: [] });
        }

        const detailedReturns = saleReturns.map(sale => ({
            date: sale.date,
            returnAmount: sale.returnAmount,
            products: sale.productsData.map(product => ({
                name: product.name,
                price: product.price,
                returnQty: product.returnQty,
                restocking: product.restocking
            }))
        }));

        const totalReturnAmount = detailedReturns.reduce((total, saleReturn) => total + saleReturn.returnAmount, 0);

        res.status(200).json({ totalReturnAmount, detailedReturns });
    } catch (error) {
        console.error('❌ Error fetching total return amount:', error);
        res.status(500).json({ message: 'Failed to fetch total return amount', error: error.message });
    }
};

const getTodayReturnAmount = async (req, res) => {
    try {
        const { start, end } = getDateRangeUTC('today');
        console.log(`Fetching returns between ${start.toISOString()} and ${end.toISOString()}`);

        const saleReturns = await SaleReturn.find({
            date: {
                $gte: start,
                $lte: end
            }
        }).lean();

        if (!saleReturns || saleReturns.length === 0) {
            // Return 200 with 0 amount instead of 404 when no returns exist
            return res.status(200).json({ totalReturnAmount: 0, detailedReturns: [] });
        }

        const detailedReturns = saleReturns.map(sale => ({
            date: sale.date,
            returnAmount: sale.returnAmount,
            products: sale.productsData.map(product => ({
                name: product.name,
                price: product.price,
                returnQty: product.returnQty,
                restocking: product.restocking
            }))
        }));

        const totalReturnAmount = detailedReturns.reduce((total, saleReturn) => total + saleReturn.returnAmount, 0);

        res.status(200).json({ totalReturnAmount, detailedReturns });
    } catch (error) {
        console.error('❌ Error fetching today\'s return amount:', error);
        res.status(500).json({ message: 'Failed to fetch today\'s return amount', error: error.message });
    }
};

const getLastWeekReturnAmount = async (req, res) => {
    try {
        const { start: lastWeekStart, end: lastWeekEnd } = getDateRangeUTC('lastweek');
        console.log(`Fetching returns between ${lastWeekStart.toISOString()} and ${lastWeekEnd.toISOString()}`);

        const saleReturns = await SaleReturn.find({
            date: {
                $gte: lastWeekStart,
                $lte: lastWeekEnd
            }
        }).lean();

        if (!saleReturns || saleReturns.length === 0) {
            // Return 200 with 0 amount instead of 404 when no returns exist
            return res.status(200).json({ totalReturnAmount: 0, detailedReturns: [] });
        }

        const detailedReturns = saleReturns.map(sale => ({
            date: sale.date,
            returnAmount: sale.returnAmount,
            products: sale.productsData.map(product => ({
                name: product.name,
                price: product.price,
                returnQty: product.returnQty,
                restocking: product.restocking
            }))
        }));

        const totalReturnAmount = detailedReturns.reduce((total, saleReturn) => total + saleReturn.returnAmount, 0);


        res.status(200).json({ totalReturnAmount, detailedReturns });
    } catch (error) {
        console.error('❌ Error calculating last week\'s return amount:', error);
        res.status(500).json({ message: 'Failed to calculate last week\'s return amount', error: error.message });
    }
};

const getLastMonthReturnAmount = async (req, res) => {
    try {
        const { start: lastMonthStart, end: lastMonthEnd } = getDateRangeUTC('lastMonth');
        console.log(`Fetching returns between ${lastMonthStart.toISOString()} and ${lastMonthEnd.toISOString()}`);

        const saleReturns = await SaleReturn.find({
            date: {
                $gte: lastMonthStart,
                $lte: lastMonthEnd
            }
        }).lean();

        if (!saleReturns || saleReturns.length === 0) {
            // Return 200 with 0 amount instead of 404 when no returns exist
            return res.status(200).json({ totalReturnAmount: 0, detailedReturns: [] });
        }

        const detailedReturns = saleReturns.map(sale => ({
            date: sale.date,
            returnAmount: sale.returnAmount,
            products: sale.productsData.map(product => ({
                name: product.name,
                price: product.price,
                returnQty: product.returnQty,
                restocking: product.restocking
            }))
        }));

        const totalReturnAmount = detailedReturns.reduce((total, saleReturn) => total + saleReturn.returnAmount, 0);

        res.status(200).json({ totalReturnAmount, detailedReturns });
    } catch (error) {
        console.error('❌ Error calculating last month\'s return amount:', error);
        res.status(500).json({ message: 'Failed to calculate last month\'s return amount', error: error.message });
    }
};

const getLastYearReturnAmount = async (req, res) => {
    try {
        const { start: lastYearStart, end: lastYearEnd } = getDateRangeUTC('lastYear');
        console.log(`Fetching returns between ${lastYearStart.toISOString()} and ${lastYearEnd.toISOString()}`);

        const saleReturns = await SaleReturn.find({
            date: {
                $gte: lastYearStart,
                $lte: lastYearEnd
            }
        }).lean();

        if (!saleReturns || saleReturns.length === 0) {
            // Return 200 with 0 amount instead of 404 when no returns exist
            return res.status(200).json({ totalReturnAmount: 0, detailedReturns: [] });
        }

        const detailedReturns = saleReturns.map(sale => ({
            date: sale.date,
            returnAmount: sale.returnAmount,
            products: sale.productsData.map(product => ({
                name: product.name,
                price: product.price,
                returnQty: product.returnQty,
                restocking: product.restocking
            }))
        }));

        const totalReturnAmount = detailedReturns.reduce((total, saleReturn) => total + saleReturn.returnAmount, 0);

        res.status(200).json({ totalReturnAmount, detailedReturns });
    } catch (error) {
        console.error('❌ Error calculating last year\'s return amount:', error);
        res.status(500).json({ message: 'Failed to calculate last year\'s return amount', error: error.message });
    }
};

module.exports = {
    returnSale, deleteSaleReturn, getTotalReturnAmount, findSaleReturnById, fetchSaleReturns, searchSaleReturns, getTodayReturnAmount,
    getLastWeekReturnAmount, getLastMonthReturnAmount, getLastYearReturnAmount
};
