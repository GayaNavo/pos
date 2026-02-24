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

const Sale = require('../../models/saleModel')
const SalePayment = require('../../models/salePaymentModel')
const Product = require('../../models/products/product');
const Settings = require('../../models/settingsModel')
const SaleReturn = require('../../models/saleReturnModel')
const Cash = require('../../models/posModel/cashModel');
const mongoose = require('mongoose');
const { isEmpty } = require('lodash');
const Quatation = require('../../models/quatationModel');
const generateReferenceId = require('../../utils/generateReferenceID');
const io = require('../../server');
const Handlebars = require('handlebars');
const DailySaleCounter = require('../../models/DailySaleCounter');
const { formatToSriLankaTime } = require('../../utils/timeZone');
const moment = require("moment-timezone");
const ReceiptSettings = require('../../models/receiptSettingsModel');
const { generateReceiptTemplate } = require('./templateGenerator');
const Order = require('../../models/orderModel');
const receiptettingsController = require('../settingsController/receiptSettingsController');
const KOTSettings = require('../../models/kotSettingsModel');
const { generateKOTTemplate } = require('../settingsController/kotTemplateGenerator');
const BOTSettings = require('../../models/botSettingsModel');
const { generateBOTTemplate } = require('../settingsController/botTemplateGenerator');
const { splitByCategory } = require('../../utils/categoryFilters');

function formatDate(dateString) {
    const date = new Date(dateString);
    const options = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'Asia/Colombo'
    };

    return new Intl.DateTimeFormat('en-GB', options).format(date).replace(',', '');
}

Handlebars.registerHelper('formatCurrency', function (number) {
    if (isNaN(number)) return '0.00';
    const [integerPart, decimalPart] = parseFloat(number).toFixed(2).split('.');
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${formattedInteger}.${decimalPart}`;
});

const createSale = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    const date = new Date()

    try {
        const currentDate = new Date().toISOString().split('T')[0];
        let todaySaleNumber = 1;
        let counterDoc = await DailySaleCounter.findOne({ date: currentDate });

        if (!counterDoc) {
            counterDoc = new DailySaleCounter({ date: currentDate, count: 1 });
        } else {
            counterDoc.count += 1;
        }
        todaySaleNumber = counterDoc.count;
        await counterDoc.save();

        const saleData = req.body;
        if (!saleData.invoiceNumber) {
            throw new Error("Invoice number is missing");
        }

        const referenceId = await generateReferenceId('SALE');
        saleData.refferenceId = referenceId;
        const formattedInvoiceNumber = `${saleData.invoiceNumber}${String(todaySaleNumber)}`;
        saleData.invoiceNumber = formattedInvoiceNumber;
        saleData.daySaleNumber = todaySaleNumber;

        // Fetch default warehouse from settings in the database
        const settings = await Settings.findOne();
        if (!settings || !settings.defaultWarehouse) {
            throw new Error("Default warehouse is not configured in settings.");
        }
        const defaultWarehouse = settings.defaultWarehouse;

        // Validation checks
        if (isEmpty(saleData.warehouse) && isEmpty(saleData.warehouseId)) {
            throw new Error('Warehouse is required.');
        }
        if (isEmpty(saleData.refferenceId)) {
            throw new Error('Reference ID is required.');
        }
        if (!saleData.productsData || saleData.productsData.length === 0) {
            throw new Error('Products Data is required.');
        }
        if (isEmpty(saleData.paymentStatus)) {
            throw new Error('Payment Status is required.');
        }

        saleData.cashierUsername = saleData.cashierUsername || 'Unknown';
        saleData.paymentType = saleData.paymentType || 'cash';
        saleData.orderStatus = saleData.orderStatus || 'ordered';
        saleData.customer = saleData.customer || 'Unknown';
        saleData.warehouse = saleData.warehouse || saleData.warehouseId;
        saleData.date = date;

        if (!Array.isArray(saleData.paymentType)) {
            return res.status(400).json({ message: 'Invalid paymentType format.', status: 'unsuccess' });
        }
        const paymentTypes = saleData.paymentType.map(payment => {
            if (!payment.type || !payment.amount) {
                throw new Error(`Invalid payment type: ${JSON.stringify(payment)}`);
            }
            return { type: payment.type, amount: Number(payment.amount) };
        });

        saleData.paymentType = paymentTypes;

        // Check if the selected warehouse is different from the default warehouse
        const hasOfficialProducts = saleData.productsData.some(p => p.offcialProduct === true);
        if (hasOfficialProducts && saleData.warehouse !== defaultWarehouse) {
            res.status(400).json({
                message: "Sale creation unsuccessful. Please choose official products from the default warehouse to create a sale.",
                status: 'unsuccess'
            });
            return;
        }

        // Cash register check
        const cashRegister = await Cash.findOne();
        if (!cashRegister) {
            return res.status(400).json({ message: 'Cash register not found. Sale creation failed.', status: 'unsuccess' });
        }

        // Enrich products with productCode for persistence and printing
        try {
            const officialProductIds = saleData.productsData
                .filter(p => p.offcialProduct === true)
                .map(p => p.currentID);

            if (officialProductIds.length > 0) {
                const codeDocs = await Product.find({ _id: { $in: officialProductIds } }).select('code');
                const idToCode = new Map(codeDocs.map(d => [String(d._id), d.code]));

                saleData.productsData = saleData.productsData.map(p => ({
                    ...p,
                    productCode: p.offcialProduct === true
                        ? (p.productCode || idToCode.get(String(p.currentID)) || '')
                        : ''
                }));
            }
        } catch (e) {
            console.warn('Could not enrich product codes for sale products:', e?.message);
        }

        const newSale = new Sale(saleData);
        const productsData = saleData.productsData;

        // Prepare update promises for product quantities - ONLY for official products
        const updatePromises = productsData
            .filter(product => product.offcialProduct === true)
            .map(async (product) => {
                const { currentID, quantity, ptype, warehouse, isInventory } = product;

                // Skip validation and database operations for temporary products
                if (product.offcialProduct === false) {
                    return null;
                }

                if (!mongoose.Types.ObjectId.isValid(currentID)) {
                    throw new Error(`Invalid product ID: ${currentID}`);
                }
                if (!warehouse) {
                    throw new Error(`Warehouse not provided for product with ID: ${currentID}`);
                }
                const updatedProduct = await Product.findById(currentID);
                if (!updatedProduct) {
                    throw new Error(`Product not found with ID: ${currentID}`);
                }

                const warehouseData = updatedProduct.warehouse.get(warehouse);
                if (!warehouseData) {
                    throw new Error("Sale creation unsuccessful. Please choose products from the default warehouse to create a sale.");
                }

                if (isInventory) {
                    if (ptype === 'Single') {
                        if (warehouseData.productQty < quantity) {
                            throw new Error(`Insufficient stock for product with ID: ${currentID}`);
                        }
                        warehouseData.productQty -= quantity;
                    } else if (ptype === 'Variation') {
                        const variationKey = product.variationValue;
                        const variation = warehouseData.variationValues?.get(variationKey);
                        if (!variation) {
                            throw new Error(`Variation ${variationKey} not found for product with ID: ${currentID}`);
                        }
                        if (variation.productQty < quantity) {
                            throw new Error(`Insufficient stock for variation ${variationKey} of product with ID: ${currentID}`);
                        }
                        variation.productQty -= quantity;
                    } else {
                        throw new Error(`Invalid product type for product with ID: ${currentID}`);
                    }
                } else {
                    // When isInventory is false, just add quantity back to stock (or handle accordingly)
                    if (ptype === 'Single') {
                        warehouseData.productQty += quantity;
                    } else if (ptype === 'Variation') {
                        const variationKey = product.variationValue;
                        const variation = warehouseData.variationValues?.get(variationKey);
                        if (!variation) {
                            throw new Error(`Variation ${variationKey} not found for product with ID: ${currentID}`);
                        }
                        variation.productQty += quantity;
                    } else {
                        throw new Error(`Invalid product type for product with ID: ${currentID}`);
                    }
                }

                updatedProduct.warehouse.set(warehouse, warehouseData);
                await updatedProduct.save();
                return updatedProduct;
            });

        await Promise.all(updatePromises);
        await newSale.save();

        // MARK PLACED ORDER AS COMPLETED + RE-EMIT CURRENT LIST 
        // MARK PLACED ORDER AS COMPLETED + RE-EMIT CURRENT LIST 
        if (saleData.orderId && mongoose.Types.ObjectId.isValid(saleData.orderId)) {
            try {
                const order = await Order.findById(saleData.orderId);

                if (order && (order.status === 'placed' || order.status === 'pending' || order.status === 'ready')) {
                    order.status = 'completed';
                    order.completedAt = new Date();
                    order.saleInvoiceNumber = newSale.invoiceNumber;
                    await order.save();

                    console.log(`Order ${saleData.orderId} marked as completed`);

                    // === REMOVE ALL SOCKET.IO CODE ===
                    // === REPLACE WITH BROADCASTCHANNEL (INSTANT UPDATE) ===

                    const channel = req.app.get('orderChannel');
                    if (channel) {
                        // 1. Notify all POS screens: this order is now completed
                        channel.postMessage({
                            type: 'ORDER_COMPLETED',
                            orderId: saleData.orderId.toString()
                        });

                        // 2. Send fresh list of remaining PLACED orders
                        const latestPlacedOrders = await Order.find({ status: 'placed' })
                            .sort({ placedAt: -1 })
                            .lean();

                        channel.postMessage({
                            type: 'PLACED_UPDATED',
                            placedOrders: latestPlacedOrders,
                            placedCount: latestPlacedOrders.length
                        });

                        // 3. Send fresh list of PENDING orders (optional but nice)
                        const latestPendingOrders = await Order.find({ status: 'pending' })
                            .sort({ createdAt: -1 })
                            .lean();

                        channel.postMessage({
                            type: 'PENDING_UPDATED',
                            pendingOrders: latestPendingOrders
                        });
                    }

                }
            } catch (err) {
                console.error('Failed to update placed order status:', err);
            }
        }

        // Cash register logic (unique to createSale)
        const { paidAmount } = saleData;
        cashRegister.totalBalance += parseFloat(paidAmount);
        await cashRegister.save();

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const logoUrl = settings.logo
            ? `${baseUrl}/${settings.logo.replace(/\\/g, "/")}`
            : null;

        // Replace the existing template generation with:
        const receiptSettings = await ReceiptSettings.findOne();

        const safeReceiptSettings = receiptSettings || {
            header: { enabled: true, fields: [] },
            body: { enabled: true, columns: [] },
            summary: { enabled: true, fields: [] },
            footer: { enabled: true, customFields: [], showBarcode: true, showSystemBy: true },
            general: { paperSize: '80mm', fontSize: '13px', fontFamily: 'Arial, sans-serif', margin: '10px', showSectionHeaders: true, compactMode: false },
            logoPath: ''
        };
        // Prepare template data in the exact format as your expected design
        const templateData = {
            invoiceNumber: newSale.invoiceNumber || '',
            cashierUsername: newSale.cashierUsername || '',
            todaySaleNumber: todaySaleNumber || 0,
            date: date,
            customer: newSale.customer || '',
            orderType: newSale.orderType || 'Normal',
            productsData: saleData.productsData.map(product => ({
                currentID: product.currentID, // ✅ Include ID for category lookup
                name: product.name || 'Unnamed Product',
                price: product.price || 0,
                quantity: product.quantity || 0,
                subtotal: product.subtotal || 0,
                discount: product.discount || 0,
                tax: product.taxRate || 0,
                productCode: product.productCode || '',
                variationValue: product.variationValue || '',
                size: (product.variationValue && product.variationValue !== 'No variations')
                    ? product.variationValue.charAt(0).toUpperCase()
                    : '-',
            })),
            grandTotal: newSale.grandTotal || 0,
            discount: newSale.discount || 0,
            discountType: newSale.discountType || 'fixed',
            discountValue: newSale.discountValue || 0,
            paidAmount: newSale.paidAmount || 0,
            tax: newSale.tax || 0,
            taxPercentage: newSale.tax || 0,
            cashBalance: newSale.cashBalance || 0,
            paymentType: saleData.paymentType.map(payment => ({
                type: payment.type || 'Unknown',
                amount: payment.amount || 0,
            })),
            note: newSale.note || '',
            shipping: newSale.shipping || 0,
            serviceCharge: newSale.serviceCharge || 0,
            serviceChargeType: newSale.serviceChargeType || 'fixed',
        };

        // Generate the bill template using the new generator
        const html = generateReceiptTemplate(templateData, safeReceiptSettings, settings, req);

        // START KOT/BOT GENERATION (Dynamic)

        // Fetch bar categories from settings
        const barCategories = settings?.barCategories || ['Bar', 'Beverages', 'Drinks'];

        console.log('=== Starting Category Enrichment ===');
        console.log('Bar Categories:', barCategories);
        console.log('Total products in sale:', templateData.productsData.length);
        console.log('Product fields:', templateData.productsData.map(p => ({ 
            name: p.name, 
            currentID: p.currentID,
            _id: p._id,
            hasCurrentID: !!p.currentID 
        })));

        // Enrich products with category field from database
        const productIds = templateData.productsData
            .filter(p => p.currentID) // Fetch categories for ALL products, not just official ones
            .map(p => p.currentID);

        console.log('Product IDs to fetch:', productIds);

        let productsWithCategory = [...templateData.productsData];

        if (productIds.length > 0) {
            try {
                const productDocs = await Product.find({ _id: { $in: productIds } })
                    .select('_id category')
                    .lean();
                
                console.log('Fetched product docs:', productDocs.map(d => ({ id: d._id, category: d.category })));
                
                const idToCategoryMap = new Map(
                    productDocs.map(doc => [String(doc._id), doc.category])
                );

                productsWithCategory = templateData.productsData.map(p => ({
                    ...p,
                    category: idToCategoryMap.get(String(p.currentID)) || ''
                }));

                console.log('Products after enrichment:', productsWithCategory.map(p => ({ 
                    name: p.name, 
                    category: p.category,
                    offcialProduct: p.offcialProduct 
                })));
            } catch (err) {
                console.error('Error enriching product categories:', err);
            }
        } else {
            console.log('No official products found - all products will go to kitchen');
        }

        // Split products by category
        const { barItems, kitchenItems } = splitByCategory(productsWithCategory, barCategories);

        // Debug logging
        console.log('=== BOT/KOT Filtering Debug ===');
        console.log('Bar Categories:', barCategories);
        console.log('Total Products:', productsWithCategory.length);
        console.log('Products with categories:', productsWithCategory.map(p => ({ name: p.name, category: p.category })));
        console.log('Bar Items Count:', barItems.length);
        console.log('Kitchen Items Count:', kitchenItems.length);
        console.log('===============================');

        let kotHtml = '';
        let botHtml = '';

        // Generate KOT for kitchen items
        if (kitchenItems.length > 0) {
            let kotSettings = await KOTSettings.findOne();
            if (!kotSettings) {
                kotSettings = await KOTSettings.create({});
            }

            kotHtml = generateKOTTemplate(
                {
                    ...templateData,
                    todaySaleNumber: todaySaleNumber || 0,
                    paymentStatus: newSale.paymentStatus,
                    productsData: kitchenItems,
                    subtotal: newSale.grandTotal || 0,
                    note: saleData.kotNote || templateData.note || '',
                },
                kotSettings,
                settings,
                req
            );
        }

        // Generate BOT for bar items
        if (barItems.length > 0) {
            let botSettings = await BOTSettings.findOne();
            if (!botSettings) {
                botSettings = await BOTSettings.create({});
            }

            botHtml = generateBOTTemplate(
                {
                    ...templateData,
                    todaySaleNumber: todaySaleNumber || 0,
                    paymentStatus: newSale.paymentStatus,
                    productsData: barItems,
                    subtotal: newSale.grandTotal || 0
                },
                botSettings,
                settings,
                req
            );
        }


        const compiledTemplate = Handlebars.compile(html);
        const finalHtml = compiledTemplate({
            ...templateData,
            formatDate: Handlebars.helpers.formatDate,
            formatCurrency: Handlebars.helpers.formatCurrency,
            formatPercentage: Handlebars.helpers.formatPercentage,
            abs: Handlebars.helpers.abs
        });
        await session.commitTransaction();
        res.status(201).json({ message: 'Sale created successfully!', html: finalHtml, kotHtml, botHtml, status: 'success' });

    } catch (error) {
        console.error('Error saving sale:', error);
        await session.abortTransaction();
        res.status(500).json({ message: error.message, status: 'unsuccess' });
    } finally {
        session.endSession();
    }
};

const createNonPosSale = async (req, res) => {
    try {
        const saleData = req.body;
        const referenceId = await generateReferenceId('SALE');
        saleData.refferenceId = referenceId;
        const date = new Date()

        const providedDate = new Date(date);
        if (isNaN(providedDate)) {
            return res.status(400).json({ message: 'Invalid date format.', status: 'unsuccess' });
        }
        const formattedDate = providedDate.toISOString().split('T')[0];
        const dateForInvoice = formattedDate.replace(/-/g, '');

        // Get or increment counter for the given date
        const counterDoc = await DailySaleCounter.findOneAndUpdate(
            { date: formattedDate },
            { $inc: { count: 1 } },
            { upsert: true, new: true }
        );

        const todaySaleNumber = counterDoc.count;

        // Generate the invoice number
        saleData.invoiceNumber = `${dateForInvoice}${String(todaySaleNumber)}`;
        saleData.daySaleNumber = todaySaleNumber;
        saleData.date = date;

        // Validation checks using isEmpty
        if (isEmpty(saleData.warehouse) && isEmpty(saleData.warehouseId)) {
            return res.status(400).json({ message: 'Warehouse is required.', status: 'unsuccess' });
        }
        if (isEmpty(saleData.refferenceId)) {
            return res.status(400).json({ message: 'Reference ID is required.', status: 'unsuccess' });
        }
        if (!saleData.productsData || saleData.productsData.length === 0) {
            return res.status(400).json({ message: 'Products Data is required.', status: 'unsuccess' });
        }

        if (isEmpty(saleData.warehouse) && isEmpty(saleData.warehouses)) {
            return res.status(400).json({ message: 'Warehouse is required.', status: 'unsuccess' });
        }

        // Default values for optional fields
        saleData.cashierUsername = saleData.cashierUsername || 'Unknown';
        saleData.warehouse = saleData.warehouse || saleData.warehouseId;

        const paymentTypes = saleData.paymentType.map(payment => {
            if (!payment.type || !payment.amount) {
                throw new Error(`Invalid payment type: ${JSON.stringify(payment)}`);
            }
            return { type: payment.type, amount: Number(payment.amount) };
        });

        saleData.paymentType = paymentTypes;

        const newSale = new Sale(saleData);
        const productsData = saleData.productsData;

        // Prepare update promises for product quantities - ONLY for official products
        const updatePromises = productsData
            .filter(product => product.offcialProduct === true)
            .map(async (product) => {
                const { currentID, quantity, stockQty, ptype, warehouse, isInventory } = product;

                // Skip validation and database operations for temporary products
                if (product.offcialProduct === false) {
                    return null;
                }

                if (!mongoose.Types.ObjectId.isValid(currentID)) {
                    return Promise.reject({ message: `Invalid product ID: ${currentID}`, status: 'unsuccess' });
                }

                if (!warehouse) {
                    return Promise.reject({ message: `Warehouse not provided for product with ID: ${currentID}`, status: 'unsuccess' });
                }

                const updatedProduct = await Product.findById(currentID);
                if (!updatedProduct) {
                    return Promise.reject({ message: `Product not found with ID: ${currentID}`, status: 'unsuccess' });
                }

                const warehouseData = updatedProduct.warehouse.get(warehouse);
                if (!warehouseData) {
                    console.error(`Error: Warehouse ${warehouse} not found for product ID: ${currentID}`);
                    return Promise.reject({
                        message: `Warehouse with ID ${warehouse} not found for product with ID: ${currentID}`,
                        status: 'unsuccess'
                    });
                }

                if (isInventory) {
                    if (ptype === 'Single') {
                        console.log(`Debug: Current stock for product ${currentID} in warehouse ${warehouse}:`, warehouseData.productQty);

                        if (warehouseData.productQty < quantity) {
                            console.error(`Error: Insufficient stock for product ${currentID} (Available: ${warehouseData.productQty}, Required: ${quantity})`);
                            return Promise.reject({ message: `Insufficient stock for product with ID: ${currentID}`, status: 'unsuccess' });
                        }

                        warehouseData.productQty -= quantity;
                    } else if (ptype === 'Variation') {
                        const variationKey = product.variationValue;
                        const variation = warehouseData.variationValues?.get(variationKey);

                        if (!variation) {
                            return Promise.reject({ message: `Variation ${variationKey} not found for product with ID: ${currentID}`, status: 'unsuccess' });
                        }

                        if (variation.productQty < quantity) {
                            return Promise.reject({ message: `Insufficient stock for variation ${variationKey} of product with ID: ${currentID}`, status: 'unsuccess' });
                        }

                        variation.productQty -= quantity;
                    } else {
                        return Promise.reject({ message: `Invalid product type for product with ID: ${currentID}`, status: 'unsuccess' });
                    }
                } else {
                    if (ptype === 'Single') {
                        console.log(`Inventory not tracked for product ${currentID}. Increasing stock in warehouse ${warehouse} by ${quantity}.`);
                        warehouseData.productQty += quantity;
                    } else if (ptype === 'Variation') {
                        const variationKey = product.variationValue;
                        const variation = warehouseData.variationValues?.get(variationKey);

                        if (!variation) {
                            return Promise.reject({ message: `Variation ${variationKey} not found for product with ID: ${currentID}`, status: 'unsuccess' });
                        }

                        console.log(`Inventory not tracked for variation ${variationKey} of product ${currentID}. Increasing stock by ${quantity}.`);
                        variation.productQty += quantity;
                    } else {
                        return Promise.reject({ message: `Invalid product type for product with ID: ${currentID}`, status: 'unsuccess' });
                    }
                }


                updatedProduct.warehouse.set(warehouse, warehouseData);
                await updatedProduct.save();
                return updatedProduct;
            });

        await Promise.all(updatePromises);
        await newSale.save();

        res.status(201).json({ message: 'Non-POS Sale created successfully!', sale: newSale, status: 'success' });
    } catch (error) {
        console.error('Error saving Non-POS sale:', error);
        res.status(500).json({ message: 'Error saving Non-POS sale', error: error.message, status: 'unsuccess' });
    }
};

const deleteSale = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({ message: 'ID is required' });
    }
    try {
        const deletedSale = await Sale.findByIdAndDelete(id);
        if (!deletedSale) {
            return res.status(404).json({ message: 'Sale not found' });
        }
        res.status(200).json({ message: 'Sale deleted successfully!', sale: deletedSale });
    } catch (error) {
        console.error('Error deleting sale:', error);
        res.status(500).json({ message: 'Error deleting sale', error });
    }
};

const payingForSale = async (req, res) => {
    const { saleId, amountToPay, payingAmount, paymentType, currentDate } = req.body;

    try {
        const sale = await Sale.findById(saleId);
        if (!sale) {
            return res.status(404).json({ error: 'Sale not found' });
        }

        if (typeof sale.grandTotal !== 'number' || typeof sale.paidAmount !== 'number') {
            return res.status(400).json({ message: 'Invalid sale amount data' });
        }

        const numericPayingAmount = Number(payingAmount);
        const numericAmountToPay = Number(amountToPay);

        const newTotalPaidAmount = sale.paidAmount + numericPayingAmount;
        if (newTotalPaidAmount > numericAmountToPay) {
            return res.status(400).json({ message: 'Payment exceeds the amount to pay.' });
        }

        const newPayment = new SalePayment({
            saleId,
            amountToPay: numericAmountToPay,
            payingAmount: numericPayingAmount,
            currentDate: currentDate || Date.now(),
            paymentType: paymentType || 'Default',
        });

        await newPayment.save();
        const existingPaymentIndex = sale.paymentType.findIndex(pt => pt.type === paymentType);

        if (existingPaymentIndex !== -1) {
            sale.paymentType[existingPaymentIndex].amount += numericPayingAmount;
        } else {
            sale.paymentType.push({ type: paymentType, amount: numericPayingAmount });
        }

        sale.paidAmount = newTotalPaidAmount;
        const allPayments = await SalePayment.find({ saleId });
        const totalPaidAmount = allPayments.reduce((sum, payment) => sum + payment.payingAmount, 0);

        const dueAmount = numericAmountToPay - totalPaidAmount;

        if (totalPaidAmount === 0) {
            sale.paymentStatus = 'unpaid';
        } else if (totalPaidAmount >= sale.grandTotal) {
            sale.paymentStatus = 'paid';
        } else if (totalPaidAmount > 0 && totalPaidAmount < sale.grandTotal) {
            sale.paymentStatus = 'partial';
        }

        await sale.save();

        return res.status(201).json({
            message: 'Payment recorded successfully',
            payment: newPayment,
            sale: {
                saleId: sale._id,
                paidAmount: totalPaidAmount,
                dueAmount: dueAmount,
                paymentStatus: sale.paymentStatus,
                paymentDetails: sale.paymentType,
            }
        });

    } catch (error) {
        console.error('Error recording payment:', error);
        res.status(500).json({ error: 'An error occurred while processing the payment' });
    }
};

const deletePaymentOfSale = async (req, res) => {
    const { id } = req.params;
    try {
        const payment = await SalePayment.findById(id);
        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        const saleId = payment.saleId;
        const sale = await Sale.findById(saleId);
        if (!sale) {
            return res.status(404).json({ message: 'Sale not found' });
        }
        sale.paidAmount -= payment.payingAmount;

        if (sale.paidAmount < 0) {
            sale.paidAmount = 0;
        }

        if (sale.paidAmount === 0) {
            sale.paymentStatus = 'Unpaid';
        } else if (sale.paidAmount >= sale.grandTotal) {
            sale.paymentStatus = 'Paid';
        } else {
            sale.paymentStatus = 'Partial';
        }

        // Save the updated sale
        await sale.save();

        // Delete the payment
        await SalePayment.findByIdAndDelete(id);

        return res.status(200).json({
            message: 'Payment deleted successfully',
            sale: {
                saleId: sale._id,
                paidAmount: sale.paidAmount,
                paymentStatus: sale.paymentStatus,
            },
        });
    } catch (error) {
        console.error('Error deleting payment:', error);
        res.status(500).json({ error: 'An error occurred while deleting the payment' });
    }
};

const fetchPaymentBySaleId = async (req, res) => {
    const { saleId } = req.params;
    try {
        const paymentData = await SalePayment.find({ saleId: saleId });
        if (!paymentData || paymentData.length === 0) {
            return res.status(404).json({ message: 'No payments found for this sale ID' });
        }
        res.status(200).json({ payments: paymentData });
    } catch (error) {
        console.error('Error fetching payment data:', error);
        res.status(500).json({ error: 'An error occurred while fetching payment data' });
    }
};

const findSaleById = async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid sale ID format' });
    }

    try {
        const sale = await Sale.findById(id).lean();
        if (!sale) {
            return res.status(404).json({ message: 'Sale not found' });
        }

        // Get only official product IDs to fetch from database
        const officialProductIds = sale.productsData
            .filter(product => product.offcialProduct === true)
            .map(product => product.currentID);

        const products = officialProductIds.length > 0
            ? await Product.find({ _id: { $in: officialProductIds } }).lean()
            : [];

        const updatedProductsData = sale.productsData.map(productData => {
            // For temporary products, return as-is without fetching from database
            if (productData.offcialProduct === false) {
                return {
                    currentID: productData.currentID,
                    name: productData.name,
                    isInventory: productData.isInventory,
                    price: productData.price,
                    productCost: productData.productCost,
                    ptype: productData.ptype,
                    discount: productData.discount || 0,
                    specialDiscount: productData.specialDiscount || 0,
                    quantity: productData.quantity,
                    stockQty: 0, // Temporary products don't have stock
                    taxRate: productData.taxRate || 0,
                    taxType: productData.taxType || 'none',
                    subtotal: productData.subtotal,
                    productProfit: productData.productProfit,
                    warehouse: productData.warehouse,
                    offcialProduct: false,
                    _id: productData._id
                };
            }

            // For official products, fetch from database
            const baseProduct = products.find(p => p._id.toString() === productData.currentID);
            const warehouseKey = productData.warehouse;
            if (baseProduct) {
                let stockQty = "";
                let productCost = ""
                let taxType = ""

                const selectedWarehouse = baseProduct.warehouse[warehouseKey];
                if (!selectedWarehouse) {
                    console.error(`Warehouse ${warehouseKey} not found for product with ID: ${baseProduct._id}`);
                    return {
                        ...productData,
                        stockQty: "N/A",
                        productCost,
                        taxType
                    };
                }

                if (productData.variationValue && selectedWarehouse.variationValues) {
                    const variation = selectedWarehouse.variationValues[productData.variationValue];
                    if (variation) {
                        stockQty = variation.productQty || "";
                        productCost = variation.productCost || "";
                        taxType = variation.taxType || "";
                    } else {
                        console.error(`Variation ${productData.variationValue} not found for product with ID: ${baseProduct._id}`);
                    }
                } else {
                    stockQty = selectedWarehouse.productQty || "";
                    productCost = selectedWarehouse.productCost || "";
                    taxType = selectedWarehouse.taxType || "";
                }

                return {
                    currentID: productData.currentID,
                    variationValues: selectedWarehouse.variationValues,
                    selectedVariation: productData.variationValue,
                    name: productData.name,
                    isInventory: productData.isInventory,
                    price: productData.price,
                    productCost: productData.productCost,
                    ptype: productData.ptype,
                    discount: productData.discount,
                    specialDiscount: productData.specialDiscount,
                    quantity: productData.quantity,
                    stockQty,
                    taxRate: productData.taxRate,
                    taxType,
                    subtotal: productData.subtotal,
                    productProfit: productData.productProfit,
                    warehouse: productData.warehouse,
                    offcialProduct: productData.offcialProduct,
                    _id: productData._id
                };
            }

            console.warn(`Base product with currentID ${productData.currentID} not found.`);
            return productData;
        });

        const saleWithUpdatedProducts = {   
            ...sale,
            date: formatToSriLankaTime(sale.date),
            productsData: updatedProductsData
        };
        res.status(200).json(saleWithUpdatedProducts);
    } catch (error) {
        console.error('❌ Error finding sale by ID:', error);
        res.status(500).json({ message: 'Error fetching sale by ID', error: error.message });
    }
};

const updateSale = async (req, res) => {
    try {
        const saleId = req.params.id;
        const updateData = req.body;

        // VALIDATE REQUIRED FIELDS 
        const requiredFields = ["paymentStatus", "orderStatus", "paymentType"];
        const missing = requiredFields.filter(field => !updateData[field]);

        if (missing.length) {
            return res.status(400).json({
                message: `Missing required field(s): ${missing.join(", ")}`,
                status: "unsuccess"
            });
        }

        updateData.cashierUsername = updateData.cashierUsername || 'Unknown';
        updateData.paymentType = updateData.paymentType || [];
        updateData.orderStatus = updateData.orderStatus || 'ordered';
        updateData.customer = updateData.customer || 'Unknown';

        const existingSale = await Sale.findById(saleId);
        if (!existingSale) {
            console.error("Sale not found:", saleId);
            return res.status(404).json({
                message: 'Sale not found',
                status: 'unsuccess'
            });
        }

        const existingProducts = existingSale.productsData;
        const updatedProducts = updateData.productsData;

        // Filter only official products for inventory updates
        const officialProducts = updatedProducts.filter(product => product.offcialProduct === true);

        // PROCESS EACH OFFICIAL PRODUCT (STOCK UPDATE) 
        for (const product of officialProducts) {
            try {
                const { currentID, quantity: newQuantity, ptype, variationValue, isInventory } = product;

                const targetWarehouse = product.warehouse || updateData.warehouse;
                if (!targetWarehouse) {
                    return res.status(400).json({
                        message: `Warehouse is required for product ${currentID}`,
                        status: 'unsuccess'
                    });
                }

                const updatedProduct = await Product.findById(currentID);
                if (!updatedProduct) {
                    return res.status(404).json({
                        message: `Product not found with ID: ${currentID}`,
                        status: 'unsuccess'
                    });
                }

                const warehouseData = updatedProduct.warehouse.get(targetWarehouse);
                if (!warehouseData) {
                    return res.status(404).json({
                        message: `Warehouse ${targetWarehouse} not found for product ${currentID}`,
                        status: 'unsuccess'
                    });
                }

                // SAFE VARIATION KEY MATCHING
                let actualVariationKey = variationValue;

                if (ptype === 'Variation') {
                    if (!variationValue) {
                        return res.status(400).json({
                            message: `variationValue is required for variation product ${currentID}`,
                            status: 'unsuccess'
                        });
                    }

                    if (!warehouseData.variationValues || typeof warehouseData.variationValues.keys !== 'function') {
                        return res.status(400).json({
                            message: `No variations defined for product ${currentID} in warehouse ${targetWarehouse}`,
                            status: 'unsuccess'
                        });
                    }

                    const availableVariations = Array.from(warehouseData.variationValues.keys());
                    const matchedKey = availableVariations.find(
                        key => key.toLowerCase() === variationValue.toLowerCase()
                    );

                    if (!matchedKey) {
                        return res.status(404).json({
                            message: `Variation "${variationValue}" not found. Available: ${availableVariations.join(', ')}`,
                            status: 'unsuccess'
                        });
                    }

                    actualVariationKey = matchedKey;
                    console.log(`Matched variation: "${variationValue}" → "${actualVariationKey}"`);
                } else {
                    actualVariationKey = null;
                }

                // FIND PREVIOUS PRODUCT IN SALE 
                const existingProduct = existingProducts.find(p => {
                    if (ptype === 'Single') {
                        return p.currentID === currentID;
                    } else if (ptype === 'Variation') {
                        return p.currentID === currentID &&
                            p.variationValue?.toLowerCase() === variationValue.toLowerCase();
                    }
                    return false;
                });

                const previousQuantity = existingProduct ? existingProduct.quantity : 0;
                const quantityDifference = newQuantity - previousQuantity;
                const oldWarehouse = existingProduct?.warehouse || existingSale.warehouse;
                const newWarehouse = targetWarehouse;

                if (quantityDifference === 0 && oldWarehouse === newWarehouse) {
                    continue;
                }

                const warehouseChanged = oldWarehouse !== newWarehouse;
                console.log(`Warehouse change: ${warehouseChanged} (${oldWarehouse} → ${newWarehouse})`);

                // INVENTORY HANDLING 
                if (isInventory) {
                    if (ptype === 'Single') {
                        if (warehouseChanged) {
                            const oldWH = updatedProduct.warehouse.get(oldWarehouse);
                            if (oldWH) oldWH.productQty += previousQuantity;

                            const newWH = updatedProduct.warehouse.get(newWarehouse);
                            if (!newWH || newWH.productQty < newQuantity) {
                                return res.status(400).json({
                                    message: `Insufficient stock in ${newWarehouse}. Available: ${newWH?.productQty}, Required: ${newQuantity}`,
                                    status: 'unsuccess'
                                });
                            }
                            newWH.productQty -= newQuantity;
                        } else {
                            const wh = updatedProduct.warehouse.get(newWarehouse);
                            if (!wh || (quantityDifference > 0 && wh.productQty < quantityDifference)) {
                                return res.status(400).json({
                                    message: `Insufficient stock. Available: ${wh?.productQty}, Required: ${quantityDifference}`,
                                    status: 'unsuccess'
                                });
                            }
                            wh.productQty -= quantityDifference;
                        }
                    }
                    // Variation + Inventory
                    else if (ptype === 'Variation') {
                        if (warehouseChanged) {
                            const oldWH = updatedProduct.warehouse.get(oldWarehouse);
                            if (oldWH?.variationValues?.has(actualVariationKey)) {
                                oldWH.variationValues.get(actualVariationKey).productQty += previousQuantity;
                            }

                            const newWH = updatedProduct.warehouse.get(newWarehouse);
                            if (!newWH?.variationValues?.has(actualVariationKey)) {
                                return res.status(400).json({
                                    message: `Variation ${actualVariationKey} not in warehouse ${newWarehouse}`,
                                    status: 'unsuccess'
                                });
                            }

                            const newVar = newWH.variationValues.get(actualVariationKey);
                            if (newVar.productQty < newQuantity) {
                                return res.status(400).json({
                                    message: `Insufficient stock for ${actualVariationKey}. Available: ${newVar.productQty}`,
                                    status: 'unsuccess'
                                });
                            }
                            newVar.productQty -= newQuantity;
                        } else {
                            const wh = updatedProduct.warehouse.get(newWarehouse);
                            if (!wh?.variationValues?.has(actualVariationKey)) {
                                return res.status(400).json({
                                    message: `Variation ${actualVariationKey} not found in warehouse ${newWarehouse}`,
                                    status: 'unsuccess'
                                });
                            }

                            const variation = wh.variationValues.get(actualVariationKey);
                            if (quantityDifference > 0 && variation.productQty < quantityDifference) {
                                return res.status(400).json({
                                    message: `Insufficient stock. Available: ${variation.productQty}, Required: ${quantityDifference}`,
                                    status: 'unsuccess'
                                });
                            }
                            variation.productQty -= quantityDifference;
                        }
                    }
                }
                // NON-INVENTORY HANDLING 
                else {
                    if (ptype === 'Single') {
                        if (warehouseChanged) {
                            const oldWH = updatedProduct.warehouse.get(oldWarehouse);
                            if (oldWH) oldWH.productQty -= previousQuantity;

                            const newWH = updatedProduct.warehouse.get(newWarehouse);
                            if (newWH) newWH.productQty += newQuantity;
                        } else {
                            const wh = updatedProduct.warehouse.get(newWarehouse);
                            if (wh) wh.productQty += quantityDifference;
                        }
                    }
                    // Variation + Non-Inventory
                    else if (ptype === 'Variation') {
                        if (warehouseChanged) {
                            const oldWH = updatedProduct.warehouse.get(oldWarehouse);
                            if (oldWH?.variationValues?.has(actualVariationKey)) {
                                oldWH.variationValues.get(actualVariationKey).productQty -= previousQuantity;
                            }

                            const newWH = updatedProduct.warehouse.get(newWarehouse);
                            if (newWH?.variationValues?.has(actualVariationKey)) {
                                const v = newWH.variationValues.get(actualVariationKey);
                                v.productQty += newQuantity;
                            }
                        } else {
                            const wh = updatedProduct.warehouse.get(newWarehouse);
                            if (wh?.variationValues?.has(actualVariationKey)) {
                                const v = wh.variationValues.get(actualVariationKey);
                                v.productQty += quantityDifference;
                            }
                        }
                    }
                }

                updatedProduct.markModified('warehouse');
                await updatedProduct.save();

            } catch (err) {
                console.error('Product update error:', err);
                return res.status(500).json({
                    message: `Error processing product: ${err.message}`,
                    status: 'unsuccess'
                });
            }
        }

        // UPDATE SALE DOCUMENT 
        updateData.productsData = updateData.productsData.map(p => ({
            ...p,
            warehouse: p.warehouse || updateData.warehouse || 'default_warehouse'
        }));

        const updatedSale = await Sale.findByIdAndUpdate(
            saleId,
            {
                ...updateData,
                warehouse: existingSale.warehouse,
                customer: existingSale.customer
            },
            { new: true, runValidators: true }
        );

        // CASH REGISTER UPDATE 
        const previousPaidAmount = parseFloat(existingSale.paidAmount) || 0;
        const newPaidAmount = parseFloat(updateData.paidAmount) || 0;
        const paidAmountDifference = newPaidAmount - previousPaidAmount;

        const cashRegister = await Cash.findOne();
        if (cashRegister) {
            cashRegister.totalBalance = parseFloat(cashRegister.totalBalance) + paidAmountDifference;
            await cashRegister.save();
        } else {
            return res.status(404).json({
                message: 'Cash register not found',
                status: 'unsuccess'
            });
        }

        // PAYMENT RECORDS: DELETE ALL OLD, INSERT ONLY NEW 
        await SalePayment.deleteMany({ saleId });

        const paymentTypes = updateData.paymentType || [];
        for (const pt of paymentTypes) {
            if (!pt.type || pt.amount == null) continue;

            const newPayment = new SalePayment({
                saleId,
                amountToPay: updatedSale.grandTotal,
                payingAmount: Number(pt.amount),
                currentDate: updateData.date || Date.now(),
                paymentType: pt.type,
            });
            await newPayment.save();
        }
        return res.status(200).json({
            message: 'Sale updated successfully',
            sale: updatedSale,
            status: 'success'
        });

    } catch (error) {
        console.error('Update sale error:', error);
        return res.status(500).json({
            message: 'Failed to update sale',
            error: error.message,
            status: 'unsuccess'
        });
    }
};

const deleteProductFromSale = async (req, res) => {
    const { saleID, productID, total } = req.query;
    if (!saleID) {
        return res.status(400).json({ message: 'sale ID is required' });
    }
    if (!productID) {
        return res.status(400).json({ message: 'product ID is required' });
    }
    try {
        const sale = await Sale.findById(saleID);
        if (!sale) {
            return res.status(404).json({ message: 'Sale not found' });
        }

        const productToDelete = sale.productsData.find(product => product.currentID === productID);
        if (!productToDelete) {
            return res.status(404).json({ message: 'Product not found in sale' });
        }

        // If it's an official product, restore stock
        if (productToDelete.offcialProduct === true && productToDelete.isInventory) {
            const updatedProduct = await Product.findById(productID);
            if (updatedProduct) {
                const warehouseData = updatedProduct.warehouse.get(productToDelete.warehouse);
                if (warehouseData) {
                    if (productToDelete.ptype === 'Single') {
                        warehouseData.productQty += productToDelete.quantity;
                    } else if (productToDelete.ptype === 'Variation' && productToDelete.variationValue) {
                        const variation = warehouseData.variationValues?.get(productToDelete.variationValue);
                        if (variation) {
                            variation.productQty += productToDelete.quantity;
                        }
                    }
                    updatedProduct.warehouse.set(productToDelete.warehouse, warehouseData);
                    await updatedProduct.save();
                }
            }
        }

        const newGrandTotal = sale.grandTotal - productToDelete.subtotal;

        const updatedSale = await Sale.findByIdAndUpdate(
            saleID,
            {
                $pull: { productsData: { currentID: productID } },
                grandTotal: newGrandTotal
            },
            { new: true }
        );

        if (updatedSale) {
            res.status(200).json({ message: "Product deleted successfully", sale: updatedSale });
        } else {
            res.status(404).json({ message: "Sale not found" });
        }
    } catch (error) {
        console.error("Error deleting product from sale:", error);
        res.status(500).json({ message: "An error occurred while deleting the product" });
    }
};

const fetchSales = async (req, res) => {
    const { id, keyword } = req.query;
    try {
        let sales;

        const formatSaleForDisplay = (sale) => ({
            ...sale,
            date: formatToSriLankaTime(sale.date)?.full || sale.date || 'N/A',
            createdAt: formatToSriLankaTime(sale.createdAt)?.full || sale.createdAt,
            updatedAt: formatToSriLankaTime(sale.updatedAt)?.full || sale.updatedAt
        });

        if (id) {
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({ message: 'Invalid sale ID format' });
            }

            const sale = await Sale.findById(id).lean();
            if (!sale) {
                return res.status(404).json({ message: 'Sale not found' });
            }

            // Get only official product IDs
            const officialProductIds = sale.productsData
                .filter(product => product.offcialProduct === true)
                .map(product => product.currentID);

            const products = officialProductIds.length > 0
                ? await Product.find({ _id: { $in: officialProductIds } }).lean()
                : [];

            const updatedProductsData = sale.productsData.map(productData => {
                // Handle temporary products
                if (productData.offcialProduct === false) {
                    return {
                        ...productData,
                        stockQty: 0 // Temporary products don't have stock
                    };
                }

                // Handle official products
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
                    ...productData,
                    stockQty
                };
            });

            const saleWithUpdatedProducts = {
                ...sale,
                productsData: updatedProductsData,
                date: formatToSriLankaTime(sale.date)?.full || sale.date || 'N/A',
                createdAt: formatToSriLankaTime(sale.createdAt)?.full || sale.createdAt,
                updatedAt: formatToSriLankaTime(sale.updatedAt)?.full || sale.updatedAt
            };

            return res.status(200).json(saleWithUpdatedProducts);
        }
        if (keyword) {
            if (keyword.length < 1) {
                return res.status(400).json({ message: 'Please provide a valid keyword.' });
            }

            sales = await Sale.find({
                $or: [
                    { customer: { $regex: new RegExp(keyword, 'i') } },
                    { refferenceId: { $regex: new RegExp(keyword, 'i') } }
                ]
            }).lean();

            if (!sales || sales.length === 0) {
                return res.status(404).json({ message: 'No sales found matching the provided keyword.' });
            }

            const formattedSales = sales.map(sale => formatSaleForDisplay(sale));
            return res.status(200).json(formattedSales);
        }

        // Paginated results
        if (req.query.page) {
            const size = parseInt(req.query.page.size) || 10;
            const number = parseInt(req.query.page.number) || 1;
            const offset = (number - 1) * size;

            sales = await Sale.find()
                .sort({ createdAt: -1 })
                .skip(offset)
                .limit(size)
                .lean();

            const totalSales = await Sale.countDocuments();

            const formattedSales = sales.map(sale => formatSaleForDisplay(sale));

            return res.status(200).json({
                sales: formattedSales,
                total: totalSales,
                size,
                number,
                totalPages: Math.ceil(totalSales / size)
            });
        } else {
            sales = await Sale.find().lean();
            if (!sales || sales.length === 0) {
                return res.status(404).json({ message: 'No sales found.' });
            }
            const formattedSales = sales.map(sale => formatSaleForDisplay(sale));
            return res.status(200).json(formattedSales);
        }

    } catch (error) {
        console.error('Error fetching sales:', error);
        res.status(500).json({ message: 'Error fetching sales', error: error.message });
    }
};

const searchSale = async (req, res) => {
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
                { customer: { $regex: new RegExp(`${escapedKeyword}`, 'i') } },
                { refferenceId: { $regex: new RegExp(`${escapedKeyword}`, 'i') } },
                { invoiceNumber: { $regex: new RegExp(`${escapedKeyword}`, 'i') } }
            ]
        };

        // Fetch sales based on the query
        const sales = await Sale.find(query).populate('productsData.currentID', 'productName productQty');

        if (!sales || sales.length === 0) {
            return res.status(404).json({
                status: "unsuccess",
                message: "No sales found for the provided keyword."
            });
        }

        // Format sales data if additional processing is needed
        const formattedSales = sales.map((sale) => {
            const saleObj = sale.toObject();

            return {
                _id: saleObj._id,
                refferenceId: saleObj.refferenceId,
                invoiceNumber: saleObj.invoiceNumber,
                customer: saleObj.customer,
                grandTotal: saleObj.grandTotal,
                orderStatus: saleObj.orderStatus,
                paymentStatus: saleObj.paymentStatus,
                paymentType: saleObj.paymentType,
                paidAmount: saleObj.paidAmount,
                warehouse: saleObj.warehouse,
                date: formatToSriLankaTime(saleObj.date)?.full || sale.date || 'N/A',
                discount: saleObj.discount,
                discountType: saleObj.discountType,
                offerPercentage: saleObj.offerPercentage,
                shipping: saleObj.shipping,
                tax: saleObj.tax,
                taxType: saleObj.taxType,
                serviceChargeValue: saleObj.serviceChargeValue,
                productsData: saleObj.productsData,
                createdAt: saleObj.createdAt
                    ? saleObj.createdAt.toISOString().slice(0, 10)
                    : null,
            };
        });

        return res.status(200).json({
            status: "success",
            sales: formattedSales
        });
    } catch (error) {
        console.error("Search sales error:", error);
        return res.status(500).json({
            status: "error",
            message: error.message
        });
    }
};

const fetchTodaySales = async (req, res) => {
    try {
        const todayStart = moment().tz("Asia/Colombo").startOf("day").toDate();
        const todayEnd = moment().tz("Asia/Colombo").endOf("day").toDate();

        const sales = await Sale.find({
            date: { $gte: todayStart, $lte: todayEnd }
        })
            .sort({ date: -1 })
            .lean();

        if (!sales || sales.length === 0) {
            return res.status(404).json({ message: 'No sales found for today.' });
        }

        // Collect product IDs
        const productIds = sales.flatMap(sale => sale.productsData.map(product => product.currentID));
        const products = await Product.find({ _id: { $in: productIds } }).lean();

        // Map sales with updated products & convert date
        const salesWithUpdatedProducts = sales.map(sale => {
            const updatedProductsData = sale.productsData.map(productData => {
                const baseProduct = products.find(p => p._id.toString() === productData.currentID);
                const warehouseKey = productData.warehouse;

                if (baseProduct) {
                    let stockQty = "";
                    let productCost = "";
                    const selectedWarehouse = baseProduct.warehouse[warehouseKey];

                    if (!selectedWarehouse) {
                        console.error(`Warehouse ${warehouseKey} not found for product with ID: ${baseProduct._id}`);
                        return {
                            ...productData,
                            stockQty: "N/A",
                            productCost
                        };
                    }

                    if (productData.variationValue && selectedWarehouse.variationValues) {
                        const variation = selectedWarehouse.variationValues[productData.variationValue];
                        if (variation) {
                            stockQty = variation.productQty || "";
                            productCost = variation.productCost || "";
                        } else {
                            console.error(`Variation ${productData.variationValue} not found for product with ID: ${baseProduct._id}`);
                        }
                    } else {
                        stockQty = selectedWarehouse.productQty || "";
                        productCost = selectedWarehouse.productCost || "";
                    }

                    return {
                        currentID: productData.currentID,
                        variationValues: selectedWarehouse.variationValues,
                        selectedVariation: productData.variationValue,
                        name: productData.name,
                        price: productData.price,
                        productCost: productData.productCost || productCost,
                        ptype: productData.ptype,
                        discount: productData.discount,
                        specialDiscount: productData.specialDiscount,
                        quantity: productData.quantity,
                        stockQty,
                        taxRate: productData.taxRate,
                        subtotal: productData.subtotal,
                        warehouse: productData.warehouse,
                        offcialProduct: productData.offcialProduct,
                        _id: productData._id
                    };
                }

                console.warn(`Base product with currentID ${productData.currentID} not found.`);
                return productData;
            });

            return {
                ...sale,
                date: moment(sale.date).tz("Asia/Colombo").format("YYYY/MM/DD HH:mm:ss"), // convert to Colombo time
                productsData: updatedProductsData
            };
        });

        res.status(200).json(salesWithUpdatedProducts);

    } catch (error) {
        console.error('❌ Error fetching today\'s sales:', error);
        res.status(500).json({ message: 'Error fetching today\'s sales', error: error.message });
    }
};

const fetchLastWeekSales = async (req, res) => {
    try {
        const lastWeek = moment().tz("Asia/Colombo").subtract(7, "days").startOf("day").toDate();
        const today = moment().tz("Asia/Colombo").endOf("day").toDate();

        const sales = await Sale.find({
            date: { $gte: lastWeek, $lte: today }
        })
            .sort({ date: -1 })
            .lean();

        if (!sales || sales.length === 0) {
            return res.status(404).json({ message: 'No sales found for the last week.' });
        }

        // Collect product IDs
        const productIds = sales.flatMap(sale => sale.productsData.map(product => product.currentID));
        const products = await Product.find({ _id: { $in: productIds } }).lean();

        // Map sales with updated products & convert date
        const salesWithUpdatedProducts = sales.map(sale => {
            const updatedProductsData = sale.productsData.map(productData => {
                const baseProduct = products.find(p => p._id.toString() === productData.currentID);
                const warehouseKey = productData.warehouse;

                if (baseProduct) {
                    let stockQty = "";
                    let productCost = "";
                    const selectedWarehouse = baseProduct.warehouse[warehouseKey];

                    if (!selectedWarehouse) {
                        console.error(`Warehouse ${warehouseKey} not found for product with ID: ${baseProduct._id}`);
                        return {
                            ...productData,
                            stockQty: "N/A",
                            productCost
                        };
                    }

                    if (productData.variationValue && selectedWarehouse.variationValues) {
                        const variation = selectedWarehouse.variationValues[productData.variationValue];
                        if (variation) {
                            stockQty = variation.productQty || "";
                            productCost = variation.productCost || "";
                        } else {
                            console.error(`Variation ${productData.variationValue} not found for product with ID: ${baseProduct._id}`);
                        }
                    } else {
                        stockQty = selectedWarehouse.productQty || "";
                        productCost = selectedWarehouse.productCost || "";
                    }

                    return {
                        currentID: productData.currentID,
                        variationValues: selectedWarehouse.variationValues,
                        selectedVariation: productData.variationValue,
                        name: productData.name,
                        price: productData.price,
                        productCost: productData.productCost || productCost,
                        ptype: productData.ptype,
                        discount: productData.discount,
                        specialDiscount: productData.specialDiscount,
                        quantity: productData.quantity,
                        stockQty,
                        taxRate: productData.taxRate,
                        subtotal: productData.subtotal,
                        warehouse: productData.warehouse,
                        offcialProduct: productData.offcialProduct,
                        productProfit: productData.productProfit,
                        _id: productData._id
                    };
                }

                console.warn(`Base product with currentID ${productData.currentID} not found.`);
                return productData;
            });

            return {
                ...sale,
                date: moment(sale.date).tz("Asia/Colombo").format("YYYY/MM/DD HH:mm:ss"), // convert to Colombo time
                productsData: updatedProductsData
            };
        });

        res.status(200).json(salesWithUpdatedProducts);

    } catch (error) {
        console.error('❌ Error fetching last week\'s sales:', error);
        res.status(500).json({ message: 'Error fetching last week\'s sales', error: error.message });
    }
};

const fetchLastMonthSales = async (req, res) => {
    try {
        const today = new Date();
        const lastMonth = new Date(today);
        lastMonth.setMonth(today.getMonth() - 1);
        lastMonth.setHours(0, 0, 0, 0);
        today.setHours(23, 59, 59, 999);

        const sales = await Sale.find({
            date: {
                $gte: lastMonth,
                $lte: today
            }
        })
            .sort({ date: -1 })
            .lean();

        if (!sales || sales.length === 0) {
            return res.status(404).json({ message: 'No sales found for the last month.' });
        }

        // Collect product IDs
        const productIds = sales.flatMap(sale => sale.productsData.map(product => product.currentID));
        const products = await Product.find({ _id: { $in: productIds } }).lean();

        // Map sales with updated products & convert date
        const salesWithUpdatedProducts = sales.map(sale => {
            const updatedProductsData = sale.productsData.map(productData => {
                const baseProduct = products.find(p => p._id.toString() === productData.currentID);
                const warehouseKey = productData.warehouse;

                if (baseProduct) {
                    let stockQty = "";
                    let productCost = "";
                    const selectedWarehouse = baseProduct.warehouse[warehouseKey];

                    if (!selectedWarehouse) {
                        console.error(`Warehouse ${warehouseKey} not found for product with ID: ${baseProduct._id}`);
                        return {
                            ...productData,
                            stockQty: "N/A",
                            productCost
                        };
                    }

                    if (productData.variationValue && selectedWarehouse.variationValues) {
                        const variation = selectedWarehouse.variationValues[productData.variationValue];
                        if (variation) {
                            stockQty = variation.productQty || "";
                            productCost = variation.productCost || "";
                        } else {
                            console.error(`Variation ${productData.variationValue} not found for product with ID: ${baseProduct._id}`);
                        }
                    } else {
                        stockQty = selectedWarehouse.productQty || "";
                        productCost = selectedWarehouse.productCost || "";
                    }

                    return {
                        currentID: productData.currentID,
                        variationValues: selectedWarehouse.variationValues,
                        selectedVariation: productData.variationValue,
                        name: productData.name,
                        price: productData.price,
                        productCost: productData.productCost || productCost,
                        ptype: productData.ptype,
                        discount: productData.discount,
                        specialDiscount: productData.specialDiscount,
                        quantity: productData.quantity,
                        stockQty,
                        taxRate: productData.taxRate,
                        subtotal: productData.subtotal,
                        offcialProduct: productData.offcialProduct,
                        warehouse: productData.warehouse,
                        _id: productData._id
                    };
                }

                console.warn(`Base product with currentID ${productData.currentID} not found.`);
                return productData;
            });

            return {
                ...sale,
                date: moment(sale.date).tz("Asia/Colombo").format("YYYY/MM/DD HH:mm:ss"), // convert to local time
                productsData: updatedProductsData
            };
        });

        res.status(200).json(salesWithUpdatedProducts);

    } catch (error) {
        console.error('❌ Error fetching last month\'s sales:', error);
        res.status(500).json({ message: 'Error fetching last month\'s sales', error: error.message });
    }
};

const fetchLastYearSales = async (req, res) => {
    try {
        const today = new Date();
        const lastYear = new Date(today);
        lastYear.setFullYear(today.getFullYear() - 1);
        lastYear.setHours(0, 0, 0, 0);
        today.setHours(23, 59, 59, 999);

        const sales = await Sale.find({
            date: { $gte: lastYear, $lte: today },
        })
            .sort({ date: -1 })
            .lean();

        if (!sales || sales.length === 0) {
            return res
                .status(404)
                .json({ message: "No sales found for the last year." });
        }

        const productIds = sales.flatMap((sale) =>
            sale.productsData.map((product) => product.currentID)
        );
        const products = await Product.find({ _id: { $in: productIds } }).lean();

        const salesWithUpdatedProducts = sales.map((sale) => {
            const updatedProductsData = sale.productsData.map((productData) => {
                const baseProduct = products.find(
                    (p) => p._id.toString() === productData.currentID
                );
                const warehouseKey = productData.warehouse;

                if (baseProduct) {
                    let stockQty = "";
                    let productCost = "";
                    const selectedWarehouse = baseProduct.warehouse[warehouseKey];

                    if (!selectedWarehouse) {
                        console.error(
                            `Warehouse ${warehouseKey} not found for product with ID: ${baseProduct._id}`
                        );
                        return {
                            ...productData,
                            stockQty: "N/A",
                            productCost,
                        };
                    }

                    if (productData.variationValue && selectedWarehouse.variationValues) {
                        const variation =
                            selectedWarehouse.variationValues[productData.variationValue];
                        if (variation) {
                            stockQty = variation.productQty || "";
                            productCost = variation.productCost || "";
                        } else {
                            console.error(
                                `Variation ${productData.variationValue} not found for product with ID: ${baseProduct._id}`
                            );
                        }
                    } else {
                        stockQty = selectedWarehouse.productQty || "";
                        productCost = selectedWarehouse.productCost || "";
                    }

                    return {
                        currentID: productData.currentID,
                        variationValues: selectedWarehouse.variationValues,
                        selectedVariation: productData.variationValue,
                        name: productData.name,
                        price: productData.price,
                        productCost: productData.productCost || productCost,
                        ptype: productData.ptype,
                        discount: productData.discount,
                        specialDiscount: productData.specialDiscount,
                        quantity: productData.quantity,
                        stockQty,
                        taxRate: productData.taxRate,
                        subtotal: productData.subtotal,
                        offcialProduct: productData.offcialProduct,
                        warehouse: productData.warehouse,
                        _id: productData._id,
                    };
                }

                console.warn(
                    `Base product with currentID ${productData.currentID} not found.`
                );
                return productData;
            });

            return {
                ...sale,
                date: moment(sale.date)
                    .tz("Asia/Colombo")
                    .format("YYYY/MM/DD HH:mm:ss"),
                productsData: updatedProductsData,
            };
        });

        res.status(200).json(salesWithUpdatedProducts);
    } catch (error) {
        console.error("❌ Error fetching last year's sales:", error);
        res.status(500).json({
            message: "Error fetching last year's sales",
            error: error.message,
        });
    }
};

const printInvoice = async (req, res) => {
    try {
        const { saleId } = req.params;
        const sale = await Sale.findById(saleId).lean();
        const settings = await Settings.findOne();
        const receiptSettings = await ReceiptSettings.findOne();

        if (!sale || !settings) {
            return res.status(404).json({ message: 'Sale or settings not found' });
        }

        // Prepare template data in the same format as createSale
        // Ensure productCode is available for printing
        let idToCode = new Map();
        try {
            const idsForCodes = sale.productsData.map(p => p.currentID);
            const codeDocs = await Product.find({ _id: { $in: idsForCodes } }).select('code');
            idToCode = new Map(codeDocs.map(d => [String(d._id), d.code]));
        } catch (e) {
            console.warn('printInvoice: unable to load product codes', e?.message);
        }
        const templateData = {
            invoiceNumber: sale.invoiceNumber || '',
            cashierUsername: sale.cashierUsername || '',
            todaySaleNumber: sale.daySaleNumber || 0,
            date: sale.date,
            customer: sale.customer || '',
            orderType: sale.orderType || 'Normal',
            productsData: sale.productsData.map(product => ({
                name: product.name || 'Unnamed Product',
                price: product.price || 0,
                quantity: product.quantity || 0,
                subtotal: product.subtotal || 0,
                discount: product.discount || 0,
                tax: product.taxRate || 0,
                productCode: product.productCode || idToCode.get(String(product.currentID)) || '',
                variationValue: product.variationValue || '',
                size: (product.variationValue && product.variationValue !== 'No variations')
                    ? product.variationValue.charAt(0).toUpperCase()
                    : '-',
            })),
            grandTotal: sale.grandTotal || 0,
            discount: sale.discount || 0,
            discountType: sale.discountType || 'fixed',
            discountValue: sale.discountValue || 0,
            paidAmount: sale.paidAmount || 0,
            tax: sale.tax || 0,
            taxPercentage: sale.tax || 0,
            cashBalance: sale.cashBalance || 0,
            paymentType: sale.paymentType.map(payment => ({
                type: payment.type || 'Unknown',
                amount: payment.amount || 0,
            })),
            note: sale.note || '',
            shipping: sale.shipping || 0,
            serviceCharge: sale.serviceCharge || 0,
            serviceChargeType: sale.serviceChargeType || 'fixed',
        };

        // Generate the bill template using the new generator (same as createSale)
        const html = generateReceiptTemplate(templateData, receiptSettings, settings, req);

        // Compile the template with Handlebars helpers
        const compiledTemplate = Handlebars.compile(html);
        const finalHtml = compiledTemplate({
            ...templateData,
            formatDate: Handlebars.helpers.formatDate,
            formatCurrency: Handlebars.helpers.formatCurrency
        });

        res.status(200).json({ html: finalHtml, status: 'success' });
    } catch (error) {
        console.error('Error generating invoice HTML:', error);
        res.status(500).json({ message: 'Error generating invoice', error: error.message });
    }
};

module.exports = {
    createSale, createNonPosSale, deleteSale, payingForSale, deletePaymentOfSale, fetchPaymentBySaleId, findSaleById, updateSale, deleteProductFromSale,
    fetchSales, searchSale, fetchTodaySales, fetchLastWeekSales, fetchLastMonthSales, fetchLastYearSales, printInvoice
};
