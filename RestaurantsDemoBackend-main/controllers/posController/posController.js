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

const HeldProducts = require('../../models/posModel/holdProductModel');
const Product = require('../../models/products/product');
const { ObjectId } = require('mongodb');
const Cash = require('../../models/posModel/cashModel');
const User = require('../../models/userModel');
const Permissions = require('../../models/rolesPermissionModel');
const Settings = require('../../models/settingsModel');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const ZReading = require('../../models/zBillRecord');
const mongoose = require('mongoose');
const moment = require("moment");
const KOTSettings = require('../../models/kotSettingsModel');
const { generateKOTTemplate } = require('../settingsController/kotTemplateGenerator');
const BOTSettings = require('../../models/botSettingsModel');
const { generateBOTTemplate } = require('../settingsController/botTemplateGenerator');
const { splitByCategory } = require('../../utils/categoryFilters');
const Handlebars = require('handlebars');
const ReceiptSettings = require('../../models/receiptSettingsModel');
const { generateReceiptTemplate } = require('../saleController/templateGenerator');

const cashHandIn = async (req, res) => {
    const { cashAmount, username, name, openTime,
        oneRupee, twoRupee, fiveRupee, tenRupee, twentyRupee, fiftyRupee, hundredRupee, fiveHundredRupee, thousandRupee, fiveThousandRupee } = req.body;
    try {
        const existingUser = await Cash.findOne({ username });
        if (existingUser) {
            return res.status(400).json({
                status: 'fail',
                message: 'Username already exists. Please use a different username.'
            });
        }
        const currentCash = await Cash.findOne();

        if (currentCash) {
            currentCash.totalBalance += cashAmount;
            currentCash.cashHandIn = cashAmount; // Keep track of the total cash added
            await currentCash.save();
            return res.status(200).json({ message: 'Cash updated successfully', cash: currentCash });
        } else {
            const newCash = new Cash({
                username,
                name,
                openTime,
                cashHandIn: cashAmount,
                totalBalance: cashAmount,
                oneRupee, twoRupee, fiveRupee, tenRupee, twentyRupee, fiftyRupee, hundredRupee, fiveHundredRupee, thousandRupee, fiveThousandRupee
            });
            await newCash.save();
            return res.status(201).json({ message: 'New cash record created successfully', cash: newCash });
        }
    } catch (error) {
        console.error('Error updating cash:', error);
        // Structured error response
        return res.status(500).json({
            message: 'An error occurred while updating cash.',
            error: error.message,
        });
    }
};

const closeRegister = async (req, res) => {
    const { id } = req.params;
    try {
        const deletedRegister = await Cash.findByIdAndDelete(id);
        if (!deletedRegister) {
            return res.status(404).json({ status: "Not Found", message: "Registry not found" });
        }
        res.json({ status: "Success", message: "Registry deleted" });
    } catch (error) {
        console.error('Error deleting registry:', error);
        // Structured error response
        return res.status(500).json({
            message: 'An error occurred while deleting cash registry.',
            error: error.message,
        });
    }
}

const findAllProductsForPos = async (req, res) => {
    try {
        const products = await Product.find();
        if (!products.length) {
            return res.status(404).json({ status: 'No products found' });
        }
        // Map through products to format variationValues and other fields
        const Allproduct = products.map(product => {
            const productObj = product.toObject();

            // Format the createdAt date to YYYY-MM-DD
            const formattedCreatedAt = productObj.createdAt.toISOString().slice(0, 10);

            // Convert variationValues Map to a regular object
            const formattedVariationValues = {};
            if (productObj.variationValues) {
                productObj.variationValues.forEach((value, key) => {
                    formattedVariationValues[key] = value;
                });
            }

            // Convert image to base64 data URL if it exists
            let imageUrl = null;
            if (productObj.image) {
                imageUrl = `${req.protocol}://${req.get('host')}/uploads/product/${path.basename(productObj.image)}`;
            }
            return {
                _id: productObj._id,
                name: productObj.name,
                code: productObj.code,
                isInventory: productObj.isInventory,
                brand: productObj.brand,
                category: productObj.category,
                barcode: productObj.barcode,
                unit: productObj.unit,
                saleUnit: productObj.saleUnit,
                purchase: productObj.purchase,
                ptype: productObj.ptype,
                status: productObj.status,
                quantityLimit: productObj.quantityLimit,
                suplier: productObj.suplier,
                warehouse: productObj.warehouse,
                variation: productObj.variation,
                variationType: productObj.variationType,
                variationValues: formattedVariationValues,
                note: productObj.note,
                productCost: productObj.productCost,
                productPrice: productObj.productPrice,
                productQty: productObj.productQty,
                oderTax: productObj.oderTax,
                taxType: productObj.taxType,
                stockAlert: productObj.stockAlert,
                image: imageUrl,
                createdAt: formattedCreatedAt
            };
        });

        return res.status(200).json({ status: 'Products fetched successfully', products: Allproduct });
    } catch (error) {
        console.error('Error fetching products:', error);
        return res.status(500).json({ status: 'Error fetching products', error: error.message });
    }
};

const findProductByKeyword = async (req, res) => {
    const { keyword } = req.query;
    try {
        let searchType;
        if (/^\d+$/.test(keyword)) {
            searchType = 'code';
        } else if (keyword.length > 0) {
            searchType = 'name';
        } else {
            return res.status(400).json({ status: 'Bad Request', message: 'Invalid keyword' });
        }

        let product;
        if (searchType === 'code') {
            product = await Product.findOne({ code: keyword });
        } else if (searchType === 'name') {
            product = await Product.findOne({ name: keyword });
        }

        if (!product) {
            return res.status(404).json({ status: 'Not Found', message: 'Product not found' });
        }

        const productObj = product.toObject();
        const formattedCreatedAt = productObj.createdAt.toISOString().slice(0, 10);

        const formattedVariationValues = {};
        if (productObj.variationValues) {
            productObj.variationValues.forEach((value, key) => {
                formattedVariationValues[key] = value;
            });
        }

        let imageUrl = null;
        if (productObj.image) {
            imageUrl = `${req.protocol}://${req.get('host')}/uploads/product/${path.basename(productObj.image)}`;
        }
        res.json({
            status: "Success",
            product: {
                _id: productObj._id,
                name: productObj.name,
                code: productObj.code,
                isInventory: productObj.isInventory,
                brand: productObj.brand,
                category: productObj.category,
                barcode: productObj.barcode,
                unit: productObj.unit,
                saleUnit: productObj.saleUnit,
                purchase: productObj.purchase,
                ptype: productObj.ptype,
                status: productObj.status,
                quantityLimit: productObj.quantityLimit,
                suplier: productObj.suplier,
                warehouse: productObj.warehouse,
                variation: productObj.variation,
                variationType: productObj.variationType,
                variationValues: formattedVariationValues,
                note: productObj.note,
                productCost: productObj.productCost,
                productPrice: productObj.productPrice,
                productQty: productObj.productQty,
                oderTax: productObj.oderTax,
                taxType: productObj.taxType,
                stockAlert: productObj.stockAlert,
                image: imageUrl,
                createdAt: formattedCreatedAt
            }
        });
    } catch (err) {
        res.status(500).json({ status: "Error", error: err.message });
        console.error("Error finding product:", err);
    }
};

const generateReferenceNo = async (req, res) => {
    try {
        let referenceNo;
        let isUnique = false;

        while (!isUnique) {
            referenceNo = `REF-${Math.floor(100000 + Math.random() * 900000)}`;
            const existingRef = await HeldProducts.findOne({ referenceNo });
            if (!existingRef) {
                isUnique = true;
            }
        }
        res.status(200).json({ referenceNo });
    } catch (error) {
        console.error('Error generating reference number:', error);
        res.status(500).json({ message: 'Error generating reference number', error: error.message });
    }
};

const holdProducts = async (req, res) => {
    const { orderType, tableNo, tokenNo, products, isEditing, kotNote } = req.body;

    if (!Array.isArray(products)) {
        return res.status(400).json({ message: 'Invalid input data' });
    }

    try {
        // ✅ SYSTEM 1 SPECIFIC: Transform with offcialProduct and warehouse normalization
        const transformedProducts = products.map((product, index) => {
            const quantity = product.qty || product.quantity || 0;

            let offcialProduct = product.offcialProduct;

            if (offcialProduct === undefined || offcialProduct === null) {
                offcialProduct = product.currentID && product.currentID.startsWith('quick_') ? false : true;
            } else {
                console.log(`  - offcialProduct: ${offcialProduct}`);
            }

            let warehouseId = product.warehouse;
            if (typeof warehouseId === 'object' && warehouseId !== null) {
                const keys = Object.keys(warehouseId);
                if (keys.length > 0) {
                    warehouseId = keys[0];
                } else {
                    warehouseId = 'warehouse01';
                }
            }

            // If still not a string, use default
            if (typeof warehouseId !== 'string' || !warehouseId) {
                warehouseId = 'warehouse01';
            }
            const { qty, warehouse, ...rest } = product;
            const transformed = {
                ...rest,
                quantity,
                offcialProduct,
                warehouse: warehouseId,
                productProfit: product.productProfit || 0,
                taxRate: String(product.taxRate || product.tax || 0),
                isInventory: product.isInventory !== undefined ? product.isInventory : true,
            };
            return transformed;
        });

        let query = { orderType };
        if (orderType === 'dinein') query.tableNo = tableNo;
        else if (orderType === 'takeaway') query.tokenNo = tokenNo;

        let existingHeldOrder = await HeldProducts.findOne(query);
        let newlyAddedProducts = []; // Track only items that need to be printed

        if (existingHeldOrder) {
            // ✅ SYSTEM 2 LOGIC: Normalize existing products and build map
            const productMap = new Map();

            existingHeldOrder.products.forEach(rawProd => {
                const p = rawProd.toObject ? rawProd.toObject() : rawProd;

                const normalizedQuantity = Number(
                    p.quantity !== undefined ? p.quantity : (p.qty !== undefined ? p.qty : 0)
                );

                const normalizedSubtotal = Number(
                    p.subtotal !== undefined
                        ? p.subtotal
                        : (p.subTotal !== undefined ? p.subTotal : (p.price || 0) * normalizedQuantity)
                );

                // ✅ SYSTEM 1 SPECIFIC: Underscore separator
                const key = `${p.currentID}_${p.variation || 'none'}`;

                productMap.set(key, {
                    ...p,
                    quantity: normalizedQuantity,
                    subtotal: normalizedSubtotal,
                    // Clean legacy fields
                    qty: undefined,
                    subTotal: undefined
                });
            });

            if (isEditing) {
                // ✅ SYSTEM 2 LOGIC: Detect if full-edit payload (has originalQty)
                const isFullEditPayload = transformedProducts.some(
                    p => typeof p.originalQty === 'number' && !isNaN(p.originalQty)
                );

                transformedProducts.forEach(product => {
                    const key = `${product.currentID}_${product.variation || 'none'}`;
                    const existing = productMap.get(key);

                    if (!existing) {
                        // ✅ New product being added during edit
                        newlyAddedProducts.push(product);
                        productMap.set(key, {
                            ...product,
                            kotPrinted: true
                        });
                    } else {
                        const existingQty = Number(existing.quantity || 0);
                        const newQty = Number(product.quantity || 0);
                        const hasOriginalQty =
                            typeof product.originalQty === 'number' && !isNaN(product.originalQty);

                        if (hasOriginalQty) {
                            // ✅ SYSTEM 2 LOGIC: TRUE EDIT (loaded from hold with originalQty)
                            const quantityChange = newQty - existingQty;

                            if (quantityChange > 0) {
                                // Print only the difference
                                const unitPrice =
                                    product.price !== undefined
                                        ? Number(product.price)
                                        : (existing.price || 0);
                                const diffSubtotal = unitPrice * quantityChange;

                                newlyAddedProducts.push({
                                    ...product,
                                    quantity: quantityChange,
                                    subtotal: diffSubtotal
                                });
                            }

                            const finalQty = existingQty + quantityChange;
                            const unitPrice =
                                product.price !== undefined
                                    ? Number(product.price)
                                    : (existing.price || 0);
                            const finalSubtotal = unitPrice * finalQty;

                            productMap.set(key, {
                                ...existing,
                                ...product,
                                quantity: finalQty,
                                subtotal: finalSubtotal,
                                kotPrinted: true
                            });
                        } else {
                            // ✅ SYSTEM 2 LOGIC: NO originalQty -> ADD-ONLY (from billing)
                            const addedQty = newQty;
                            if (addedQty > 0) {
                                const unitPrice =
                                    product.price !== undefined
                                        ? Number(product.price)
                                        : (existing.price || 0);
                                const addedSubtotal = unitPrice * addedQty;

                                // Print KOT for added quantity
                                newlyAddedProducts.push({
                                    ...product,
                                    quantity: addedQty,
                                    subtotal: addedSubtotal
                                });

                                const newQuantity = existingQty + addedQty;
                                const newSubtotal = Number(existing.subtotal || 0) + addedSubtotal;

                                productMap.set(key, {
                                    ...existing,
                                    ...product,
                                    quantity: newQuantity,
                                    subtotal: newSubtotal,
                                    kotPrinted: true
                                });
                            } else {
                                // No addition, keep existing
                                productMap.set(key, {
                                    ...existing,
                                    ...product,
                                    quantity: existingQty,
                                    subtotal: existing.subtotal,
                                    kotPrinted: true
                                });
                            }
                        }
                    }
                });

                // ✅ SYSTEM 2 LOGIC: Only delete missing products in full-edit mode
                if (isFullEditPayload) {
                    const currentKeys = new Set(
                        transformedProducts.map(p => `${p.currentID}_${p.variation || 'none'}`)
                    );

                    for (const [key] of productMap.entries()) {
                        if (!currentKeys.has(key)) {
                            productMap.delete(key);
                        }
                    }
                }

            } else {
                // ✅ SYSTEM 2 LOGIC: ADD mode - accumulate quantities
                transformedProducts.forEach(p => {
                    const key = `${p.currentID}_${p.variation || 'none'}`;
                    const existing = productMap.get(key);

                    const addedQty = Number(p.quantity || 0);
                    const addedSubtotalInput =
                        p.subtotal !== undefined ? Number(p.subtotal) : 0;

                    if (!existing) {
                        // New product to hold
                        newlyAddedProducts.push({
                            ...p,
                            quantity: addedQty,
                            subtotal: addedSubtotalInput
                        });
                        productMap.set(key, {
                            ...p,
                            quantity: addedQty,
                            subtotal: addedSubtotalInput,
                            kotPrinted: true
                        });
                    } else {
                        const existingQty = Number(existing.quantity || 0);
                        const existingSubtotal = Number(existing.subtotal || 0);

                        let addedSubtotal = addedSubtotalInput;
                        if (!addedSubtotal) {
                            const unitPrice =
                                p.price !== undefined
                                    ? Number(p.price)
                                    : (existing.price || 0);
                            addedSubtotal = unitPrice * addedQty;
                        }

                        const newQuantity = existingQty + addedQty;
                        const newSubtotal = existingSubtotal + addedSubtotal;

                        // Print KOT for newly added quantity
                        newlyAddedProducts.push({
                            ...p,
                            quantity: addedQty,
                            subtotal: addedSubtotal
                        });

                        // Update with accumulated values
                        productMap.set(key, {
                            ...existing,
                            name: p.name || existing.name,
                            price: p.price || existing.price,
                            quantity: newQuantity,
                            subtotal: newSubtotal,
                            kotPrinted: true
                        });
                    }
                });
            }

            // Convert map back to array
            existingHeldOrder.products = Array.from(productMap.values());
            
            // Update kotNote if provided
            if (kotNote !== undefined) {
                existingHeldOrder.kotNote = kotNote;
            }
            
            await existingHeldOrder.save();
        } else {
            // ✅ Creating new hold order
            if (isEditing) {
                transformedProducts.forEach(product => {
                    if (!product.kotPrinted) {
                        // This product was not printed yet OR quantity increased
                        if (product.originalQty !== undefined && product.originalQty > 0) {
                            // Quantity was increased - print only the difference
                            const quantityDifference = product.quantity - product.originalQty;
                            if (quantityDifference > 0) {
                                newlyAddedProducts.push({
                                    ...product,
                                    quantity: quantityDifference,
                                    subtotal: (product.subtotal / product.quantity) * quantityDifference
                                });
                            }
                        } else {
                            newlyAddedProducts.push(product);
                        }
                    } else {
                        console.log(`   ⏭️ ALREADY PRINTED - Skip`);
                    }
                });
            } else {
                // This is a brand new order - print everything
                console.log('🆕 Brand new order - print all items');
                newlyAddedProducts = transformedProducts;
            }

            // Mark all as printed after this hold
            const productsToSave = transformedProducts.map(p => ({
                ...p,
                kotPrinted: true
            }));

            existingHeldOrder = new HeldProducts({
                orderType,
                tableNo: orderType === 'dinein' ? tableNo : undefined,
                tokenNo: orderType === 'takeaway' ? tokenNo : undefined,
                products: productsToSave,
                kotNote: kotNote || undefined
            });
            await existingHeldOrder.save();
        }

        // ✅ SYSTEM 1 SPECIFIC: Generate KOT/BOT using Settings
        let kotHtml = '';
        let botHtml = '';
        
        if (newlyAddedProducts.length > 0) {
            // 1. Fetch Settings
            const settings = await Settings.findOne(); // Fetch global settings
            const barCategories = settings?.barCategories || ['Bar', 'Beverages', 'Drinks'];

            // 2. Fetch products with category information
            const productsWithCategory = await Promise.all(
                newlyAddedProducts.map(async (p) => {
                    let category = '';
                    if (p.currentID && mongoose.Types.ObjectId.isValid(p.currentID)) {
                        const product = await Product.findById(p.currentID).select('category').lean();
                        category = product?.category || '';
                    }
                    return {
                        ...p,
                        category: category
                    };
                })
            );

            // 3. Split products by category
            const { barItems, kitchenItems } = splitByCategory(productsWithCategory, barCategories);

            // 4. Calculate Total Amount for identifier
            const identifier = existingHeldOrder.orderType === 'dinein'
                ? `Table ${existingHeldOrder.tableNo}`
                : `Token ${existingHeldOrder.tokenNo}`;

            // 5. Generate KOT for kitchen items
            if (kitchenItems.length > 0) {
                let kotSettings = await KOTSettings.findOne();
                if (!kotSettings) kotSettings = await KOTSettings.create({});

                const totalAmount = kitchenItems.reduce((sum, p) => sum + (p.subtotal || 0), 0);

                const kotData = {
                    productsData: kitchenItems.map(p => ({
                        name: p.name || 'Unnamed Product',
                        quantity: p.quantity || 0,
                        size: (p.variation && p.variation !== 'No variations')
                            ? p.variation.charAt(0).toUpperCase()
                            : '-',
                        subtotal: p.subtotal || 0,
                    })),
                    todaySaleNumber: 0,
                    date: new Date(),
                    paymentStatus: 'HELD',
                    orderIdentifier: `Running Order - ${identifier}`,
                    note: kotNote || undefined,
                    subtotal: totalAmount,
                    grandTotal: totalAmount
                };

                kotHtml = generateKOTTemplate(kotData, kotSettings, settings || {}, req);
            }

            // 6. Generate BOT for bar items
            if (barItems.length > 0) {
                let botSettings = await BOTSettings.findOne();
                if (!botSettings) botSettings = await BOTSettings.create({});

                const totalAmount = barItems.reduce((sum, p) => sum + (p.subtotal || 0), 0);

                const botData = {
                    productsData: barItems.map(p => ({
                        name: p.name || 'Unnamed Product',
                        quantity: p.quantity || 0,
                        size: (p.variation && p.variation !== 'No variations')
                            ? p.variation.charAt(0).toUpperCase()
                            : '-',
                        subtotal: p.subtotal || 0,
                    })),
                    todaySaleNumber: 0,
                    date: new Date(),
                    paymentStatus: 'HELD',
                    note: `Running Order - ${identifier}`,
                    subtotal: totalAmount,
                    grandTotal: totalAmount
                };

                botHtml = generateBOTTemplate(botData, botSettings, settings || {}, req);
            }
        }

        res.status(201).json({
            message: 'Held products saved successfully',
            data: existingHeldOrder,
            kotHtml,
            botHtml,
            newItemsCount: newlyAddedProducts.length,
            status: 'success'
        });

    } catch (error) {
        console.error('💥 Error in holdProducts:', error);
        console.error('Error details:', {
            message: error.message,
            errors: error.errors
        });
        res.status(500).json({
            message: 'An error occurred while holding products.',
            error: error.message,
            validationErrors: error.errors
        });
    }
};

const viewAllHeldProducts = async (req, res) => {
    try {
        const heldProducts = await HeldProducts.find();

        if (!heldProducts || heldProducts.length === 0) {
            return res.status(404).json({ message: 'No held products found' });
        }

        const allCurrentIds = heldProducts.flatMap(heldProduct =>
            heldProduct.products.map(product => product.currentID)
        );

        const officialProductIds = allCurrentIds.filter(id =>
            mongoose.Types.ObjectId.isValid(id) && !id.startsWith('quick_')
        );

        const baseProducts = officialProductIds.length > 0
            ? await Product.find({ _id: { $in: officialProductIds } })
            : [];

        const baseProductMap = baseProducts.reduce((acc, product) => {
            acc[product._id.toString()] = product.warehouse;
            return acc;
        }, {});

        const combinedData = heldProducts.map(heldProduct => ({
            _id: heldProduct._id,
            orderType: heldProduct.orderType,
            tableNo: heldProduct.tableNo,
            tokenNo: heldProduct.tokenNo,
            referenceNo: heldProduct.referenceNo,
            products: heldProduct.products.map(product => {
                const isTemporaryProduct = !mongoose.Types.ObjectId.isValid(product.currentID) ||
                    product.currentID.startsWith('quick_') ||
                    product.offcialProduct === false;

                const price = parseFloat(product.price) || 0;

                if (isTemporaryProduct) {
                    return {
                        id: product._id,
                        currentID: product.currentID,
                        isInventory: product.isInventory,
                        name: product.name || '',
                        variation: product.variation || '',
                        ptype: product.ptype,
                        productCost: product.productCost,
                        tax: product.tax,
                        taxType: product.taxType,
                        stokeQty: 'N/A',
                        price: price,
                        quantity: product.quantity || 0,
                        discount: product.discount || 0,
                        specialDiscount: product.specialDiscount || 0,
                        offcialProduct: false,
                        warehouse: product.warehouse,
                        variationValues: {},
                        subTotal: price * (product.quantity || 0),
                    };
                }

                const warehouseDetails = baseProductMap[product.currentID]
                    ? baseProductMap[product.currentID].get(product.warehouse)
                    : {};

                let stokeQty = warehouseDetails?.productQty || 0;
                let variationValues = warehouseDetails?.variationValues || {};

                if (product.variation && variationValues && variationValues instanceof Map) {
                    const variationDetails = variationValues.get(product.variation);
                    if (variationDetails) {
                        stokeQty = variationDetails.productQty || stokeQty;
                    }
                }

                return {
                    id: product._id,
                    currentID: product.currentID,
                    isInventory: product.isInventory,
                    name: product.name || '',
                    variation: product.variation || '',
                    ptype: product.ptype,
                    productCost: product.productCost,
                    tax: product.tax,
                    taxType: product.taxType,
                    stokeQty: stokeQty || 0,
                    price: price,
                    quantity: product.quantity || 0,
                    discount: product.discount || 0,
                    specialDiscount: product.specialDiscount || 0,
                    offcialProduct: product.offcialProduct !== false,
                    warehouse: product.warehouse,
                    variationValues: variationValues instanceof Map ? Object.fromEntries(variationValues) : variationValues,
                    subTotal: price * (product.quantity || 0),
                };
            }),
        }));

        res.status(200).json({
            message: 'Held products retrieved successfully',
            data: combinedData,
        });
    } catch (error) {
        console.error('Error retrieving held products:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const deleteHeldProduct = async (req, res) => {
    const { id } = req.params;

    // Validate the id parameter
    if (!id || id === "undefined") {
        return res.status(400).json({ message: 'Invalid product ID provided' });
    }

    // Validate ObjectId format
    const isValidObjectId = /^[a-fA-F0-9]{24}$/.test(id);
    if (!isValidObjectId) {
        return res.status(400).json({ message: 'Invalid product ID format' });
    }

    try {
        // Find and delete the held product by ID
        const deletedProduct = await HeldProducts.findByIdAndDelete(id);

        if (!deletedProduct) {
            return res.status(404).json({ message: 'Held product not found' });
        }

        // Respond with success
        res.status(200).json({ message: 'Held product deleted successfully' });
    } catch (error) {
        console.error('Error deleting held product:', error);
        return res.status(500).json({
            message: 'An error occurred while deleting held product.',
            error: error.message,
        });
    }
};

const getProductsByIds = async (req, res) => {
    const { ids } = req.body;
    try {
        const products = await Product.find({ _id: { $in: ids } });

        if (!products.length) {
            return res.status(404).json({ status: 'No products found for these IDs' });
        }
        const productsData = products.map(product => {
            const productObj = product.toObject();
            const formattedCreatedAt = productObj.createdAt ? productObj.createdAt.toISOString().slice(0, 10) : null;

            const formattedVariationValues = {};
            if (productObj.variationValues) {
                productObj.variationValues.forEach((value, key) => {
                    formattedVariationValues[key] = value;
                });
            }
            let imageUrl = null;
            if (productObj.image) {
                imageUrl = `${req.protocol}://${req.get('host')}/uploads/product/${path.basename(productObj.image)}`;
            }
            return {
                _id: productObj._id,
                name: productObj.name,
                isInventory: productObj.isInventory,
                code: productObj.code,
                quantity: productObj.productQty,
                variationValues: formattedVariationValues,
                image: imageUrl,
                createdAt: formattedCreatedAt
            };
        });
        return res.status(200).json({ status: 'Products fetched successfully', products: productsData });
    } catch (error) {
        console.error('Error fetching products by IDs:', error);
        return res.status(500).json({ status: 'Error fetching products by IDs', error: error.message });
    }
};

const updateProductQuantities = async (req, res) => {
    const productDetails = req.body.products;

    try {
        if (!Array.isArray(productDetails) || productDetails.length === 0) {
            return res.status(400).json({ status: 'Error', message: 'Invalid or empty products array' });
        }

        // Prepare update promises
        const updatePromises = productDetails.map(async (product) => {
            const { curruntID, qty, ptype, variationValue } = product;

            // Validate the current ID
            if (!ObjectId.isValid(curruntID)) {
                throw new Error(`Invalid product ID: ${curruntID}`);
            }

            // Check for valid quantity
            if (typeof qty !== 'number' || qty < 0) {
                throw new Error(`Invalid quantity for product with ID: ${curruntID}`);
            }

            // Update logic based on product type
            if (ptype === 'Single') {
                const updatedProduct = await Product.findById(curruntID);
                if (!updatedProduct) {
                    throw new Error(`Product not found with ID: ${curruntID}`);
                }

                // Reduce the stock quantity
                if (updatedProduct.productQty < qty) {
                    return res.status(400).json({ error: `Insufficient stock for product with ID: ${curruntID}` });
                }

                updatedProduct.productQty -= qty;
                await updatedProduct.save();
                return updatedProduct;
            } else if (ptype === 'Variation' && variationValue) {
                const updatedProduct = await Product.findById(curruntID);
                if (!updatedProduct) {
                    return res.status(404).json({ error: `Product not found with ID: ${curruntID}` });
                }

                const variationKey = variationValue;
                const variation = updatedProduct.variationValues.get(variationKey);

                if (!variation) {
                    throw new Error(`Variation ${variationKey} not found for product with ID: ${curruntID}`);
                }

                variation.productQty -= qty;
                if (variation.productQty < 0) {
                    return res.status(400).json({ error: `Insufficient stock for product with ID: ${curruntID}` });
                }

                // Save the updated product with updated variation
                await updatedProduct.save();
                return updatedProduct;
            } else {
                throw new Error(`Invalid product type or variation value for product with ID: ${curruntID}`);
            }
        });

        await Promise.all(updatePromises);

        res.status(200).json({ status: 'Success', message: 'Product quantities updated successfully' });
    } catch (error) {
        console.error('Error updating product quantities:', error);
        return res.status(500).json({
            message: 'An error occurred while updating product quantities.',
            error: error.message,
        });
    }
};

const findProducts = async (req, res) => {
    try {
        const { warehouse, brand, category, keyword } = req.query;

        const query = {};
        if (warehouse) {
            query[`warehouse.${warehouse}`] = { $exists: true };
        }
        if (brand) query.brand = brand;
        if (category) query.category = category;
        if (keyword) {
            // Escape special characters in keyword for regex
            const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const normalizedKeyword = escapeRegExp(keyword.trim());

            query.$or = [
                { name: new RegExp(normalizedKeyword, 'i') },
                { code: normalizedKeyword },
            ];
        }

        // Fetch products based on the query
        const products = await Product.find(query).lean();

        if (!products.length) {
            return res.status(404).json({ status: 'No products found for the specified criteria' });
        }

        // Format the products
        const formattedProducts = products.map((product) => {
            const productObj = { ...product };

            // Format the createdAt date to YYYY-MM-DD
            productObj.createdAt = productObj.createdAt ? productObj.createdAt.toISOString().slice(0, 10) : null;

            // Ensure warehouse information is correctly included
            if (productObj.warehouse && typeof productObj.warehouse === 'object') {
                Object.keys(productObj.warehouse).forEach((warehouseName) => {
                    const warehouseData = productObj.warehouse[warehouseName];

                    // Convert variationValues (if present) from Map to Object
                    if (warehouseData.variationValues instanceof Map) {
                        const formattedVariationValues = {};
                        warehouseData.variationValues.forEach((value, key) => {
                            formattedVariationValues[key] = value;
                        });
                        warehouseData.variationValues = formattedVariationValues;
                    }
                });
            }

            productObj.image = productObj.image
                ? `${req.protocol}://${req.get('host')}/uploads/product/${path.basename(productObj.image)}`
                : null;

            return productObj;
        });

        return res.status(200).json({ status: 'Products fetched successfully', products: formattedProducts });

    } catch (error) {
        console.error('Error finding products:', error);
        return res.status(500).json({
            message: 'An error occurred while finding products.',
            error: error.message,
        });
    }
};

const getAdminPasswordForDiscount = async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).send('Username and password are required.');
    }
    try {
        // Fetch user by username
        const user = await User.findOne({ username: username });
        if (!user) {
            return res.status(404).send('User not found.');
        }

        // Check password
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).send('Invalid password.');
        }

        // Fetch user role and corresponding permissions
        const rolePermissions = await Permissions.findOne({ roleName: user.role });
        if (!rolePermissions) {
            return res.status(404).send('Role permissions not found.');
        }

        const permissions = rolePermissions.permissions;
        console.log('Permissions:', permissions);

        if (!permissions || !(permissions instanceof Map)) {
            console.error('Permissions are not a Map:', permissions);
            return res.status(500).send('Server error. Please try again later.');
        }

        // Removed offer functionality
        return res.status(403).send('Feature not available.');
    } catch (error) {
        console.error('Error in getAdminPasswordForDiscount:', error);
        res.status(500).send('Server error. Please try again later.');
    }
};

const saveZReading = async (req, res) => {
    try {
        const records = Array.isArray(req.body) ? req.body : [req.body];

        if (records.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No records provided in request body'
            });
        }
        const validRegisters = [];
        const failedRecords = [];

        for (const [index, record] of records.entries()) {
            const requiredFields = ['cashRegisterID', 'cashierName', 'openedTime', 'totalAmount', 'grandTotal', 'closedTime'];
            const missingFields = requiredFields.filter(field =>
                record[field] === undefined || record[field] === null || record[field] === ''
            );

            if (missingFields.length > 0) {
                failedRecords.push({
                    index,
                    message: `Missing required fields: ${missingFields.join(', ')}`
                });
                continue;
            }

            const sanitizedInputs = (Array.isArray(record.inputs) ? record.inputs : []).map(input => ({
                denomination: Number(input.denomination) || 0,
                quantity: Number(input.quantity) || 0,
                amount: Number(input.amount) || 0
            }));

            validRegisters.push({
                cashRegisterID: record.cashRegisterID,
                cashierName: record.cashierName,
                openedTime: record.openedTime,
                inputs: sanitizedInputs,
                cardPaymentAmount: Number(record.cardPaymentAmount) || 0,
                cashPaymentAmount: Number(record.cashPaymentAmount) || 0,
                bankTransferPaymentAmount: Number(record.bankTransferPaymentAmount) || 0,
                totalDiscountAmount: Number(record.totalDiscountAmount) || 0,
                totalProfitAmount: Number(record.totalProfitAmount) || 0,
                totalAmount: Number(record.totalAmount),
                grandTotal: Number(record.grandTotal),
                cashHandIn: Number(record.cashHandIn) || 0,
                cashVariance: Number(record.cashVariance) || 0,
                closedTime: record.closedTime
            });
        }

        if (validRegisters.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid records to save',
                failedRecords
            });
        }

        const zReadingDoc = new ZReading({ registers: validRegisters });
        const savedDoc = await zReadingDoc.save();

        const statusCode = failedRecords.length === 0 ? 201 : 207;

        return res.status(statusCode).json({
            success: true,
            savedCount: validRegisters.length,
            failedCount: failedRecords.length,
            savedDoc,
            failedRecords,
            message: failedRecords.length === 0
                ? 'All registers saved in one ZReading document. Zrecords cleared.'
                : 'Partial save: some records failed. Zrecords not cleared.'
        });

    } catch (error) {
        console.error('Z-reading save error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while saving Z-reading document',
            errorDetails: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

const getAllZReadingDetails = async (req, res) => {
    try {
        console.log("Received query parameters:", req.query);

        // Extract page and size from nested object
        const page = parseInt(req.query.page?.number, 10) || 1;
        const size = parseInt(req.query.page?.size, 10) || 10;

        console.log(`Parsed values -> Page: ${page}, Size: ${size}`);

        const offset = (page - 1) * size;

        // Fetch paginated data sorted by createdAt descending (latest first)
        const zReadingDetails = await ZReading.find()
            .sort({ _id: -1 }) // latest first
            .skip(offset)
            .limit(size)
            .lean(); // plain JS objects for modification

        const totalZReadings = await ZReading.countDocuments();

        console.log(`Total Records: ${totalZReadings}, Records Returned: ${zReadingDetails.length}`);

        if (!zReadingDetails.length) {
            return res.status(404).json({
                success: false,
                message: 'No Z-readings found'
            });
        }

        // Format openedTime and closedTime
        const formattedZReadings = zReadingDetails.map(z => {
            // Safety check: ensure registers array exists before mapping
            if (z.registers && Array.isArray(z.registers)) {
                z.registers = z.registers.map(r => {
                    if (r.openedTime) {
                        const openDate = new Date(r.openedTime);
                        const day = String(openDate.getDate()).padStart(2, '0');
                        const month = String(openDate.getMonth() + 1).padStart(2, '0');
                        const year = openDate.getFullYear();
                        const hours = String(openDate.getHours()).padStart(2, '0');
                        const minutes = String(openDate.getMinutes()).padStart(2, '0');
                        const seconds = String(openDate.getSeconds()).padStart(2, '0');

                        r.openedTime = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
                    }

                    // Format closedTime (convert to Sri Lanka Time +05:30)
                    if (r.closedTime) {
                        const closeDate = new Date(r.closedTime);
                        const slTime = new Date(closeDate.getTime() + 5.5 * 60 * 60 * 1000);
                        const day = String(slTime.getUTCDate()).padStart(2, '0');
                        const month = String(slTime.getUTCMonth() + 1).padStart(2, '0');
                        const year = slTime.getUTCFullYear();
                        const hours = String(slTime.getUTCHours()).padStart(2, '0');
                        const minutes = String(slTime.getUTCMinutes()).padStart(2, '0');
                        const seconds = String(slTime.getUTCSeconds()).padStart(2, '0');

                        r.closedTime = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
                    }

                    return r;
                });
            } else {
                // If registers doesn't exist or isn't an array, initialize as empty array
                console.warn(`Z-reading document ${z._id} has no registers array`);
                z.registers = [];
            }
            return z;
        });

        res.status(200).json({
            success: true,
            data: formattedZReadings,
            currentPage: page,
            totalPages: Math.ceil(totalZReadings / size),
            totalItems: totalZReadings,
            message: 'Z-reading details retrieved successfully'
        });

    } catch (error) {
        console.error('Error retrieving Z-reading details:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

const getAllZReadingByDate = async (req, res) => {
    try {
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({
                success: false,
                message: "Date parameter is required"
            });
        }

        const startDate = new Date(date);
        const endDate = new Date(date);
        endDate.setDate(endDate.getDate() + 1);

        const query = {
            createdAt: {
                $gte: startDate,
                $lt: endDate
            }
        };

        let zReadingDetails = await ZReading.find(query);

        if (!zReadingDetails.length) {
            return res.status(404).json({
                success: false,
                message: 'No Z-readings found'
            });
        }

        // Convert openedTime and closedTime to Sri Lanka timezone format: dd/mm/yyyy hh:mm:ss
        zReadingDetails = zReadingDetails.map(zReading => {
            const updatedRegisters = zReading.registers.map(register => {
                const openedTimeSLT = new Date(register.openedTime).toLocaleString('en-GB', {
                    timeZone: 'Asia/Colombo',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                }).replace(',', '');

                const closedTimeSLT = new Date(register.closedTime).toLocaleString('en-GB', {
                    timeZone: 'Asia/Colombo',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                }).replace(',', '');

                return {
                    ...register._doc,
                    openedTime: openedTimeSLT,
                    closedTime: closedTimeSLT
                };
            });

            return {
                ...zReading._doc,
                registers: updatedRegisters
            };
        });

        res.status(200).json({
            success: true,
            data: zReadingDetails,
            message: 'Z-reading details retrieved successfully'
        });

    } catch (error) {
        console.error('Error retrieving Z-reading details:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

const deleteZReading = async (req, res) => {
    try {
        const { id } = req.params;

        const zReading = await ZReading.findByIdAndDelete(id);

        if (!zReading) {
            return res.status(404).json({
                success: false,
                message: 'Z-reading not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Z-reading deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting Z-reading:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

const printHeldOrderBill = async (req, res) => {
    try {
        const { heldOrderId } = req.params;

        const heldOrder = await HeldProducts.findById(heldOrderId);
        if (!heldOrder) {
            return res.status(404).json({ message: 'Held order not found', status: 'error' });
        }

        const settings = await Settings.findOne();
        const receiptSettings = await ReceiptSettings.findOne();

        if (!settings) {
            return res.status(404).json({ message: 'Settings not found', status: 'error' });
        }

        const safeReceiptSettings = receiptSettings || {
            header: { enabled: true, fields: [] },
            body: { enabled: true, columns: [] },
            summary: { enabled: true, fields: [] },
            footer: { enabled: true, customFields: [], showBarcode: true, showSystemBy: true },
            general: { paperSize: '80mm', fontSize: '13px', fontFamily: 'Arial, sans-serif', margin: '10px', showSectionHeaders: true, compactMode: false },
            logoPath: ''
        };

        const currentIds = heldOrder.products
            .filter(p => mongoose.Types.ObjectId.isValid(p.currentID))
            .map(p => p.currentID);

        const baseProducts = currentIds.length > 0
            ? await Product.find({ _id: { $in: currentIds } })
            : [];

        const baseProductMap = baseProducts.reduce((acc, product) => {
            acc[product._id.toString()] = product;
            return acc;
        }, {});

        let grandTotal = 0;
        let totalTax = 0;

        const productsData = heldOrder.products.map(product => {
            const savedPrice = parseFloat(product.price) || 0;
            let price = savedPrice;

            const baseProduct = baseProductMap[product.currentID?.toString()];
            let productCode = baseProduct?.code || '';
            let variationValue = product.variation || '';
            let size = (variationValue && variationValue !== 'No variations')
                ? variationValue.charAt(0).toUpperCase()
                : '-';

            const isTemporary = !mongoose.Types.ObjectId.isValid(product.currentID) ||
                product.currentID.startsWith('quick_') ||
                product.offcialProduct === false;

            if (isTemporary) {
                price = savedPrice;
            }

            const quantity = product.quantity || 1;
            const discount = product.discount || 0;
            const taxRate = product.tax || 0;
            const taxType = (product.taxType || 'inclusive').toLowerCase();

            let taxAmount = 0;
            let lineSubtotal = 0;

            if (taxType === 'exclusive') {
                taxAmount = (price * quantity) * (taxRate / 100);
                const totalBeforeDiscount = (price * quantity) + taxAmount;
                lineSubtotal = totalBeforeDiscount - discount;
            } else {
                lineSubtotal = (price * quantity) - discount;
                if (taxRate > 0) {
                    taxAmount = lineSubtotal * (taxRate / (100 + taxRate));
                }
            }

            grandTotal += lineSubtotal;
            totalTax += taxAmount;

            return {
                name: product.name || '',
                price: price,
                quantity: quantity,
                subtotal: parseFloat(lineSubtotal.toFixed(2)),
                discount: discount,
                tax: taxRate,
                taxRate: taxRate,
                taxAmount: parseFloat(taxAmount.toFixed(2)),
                productCode: productCode,
                variationValue: variationValue,
                size: size,
            };
        });

        const templateData = {
            invoiceNumber: `HOLD-${heldOrder._id.toString().slice(-6).toUpperCase()}`,
            cashierUsername: 'N/A',
            todaySaleNumber: 0,
            date: new Date(),
            customer: heldOrder.orderType === 'dinein'
                ? `Table ${heldOrder.tableNo}`
                : `Token ${heldOrder.tokenNo}`,
            productsData: productsData,
            grandTotal: parseFloat(grandTotal.toFixed(2)),
            discount: 0,
            discountType: 'fixed',
            discountValue: 0,
            paidAmount: 0,
            tax: parseFloat(totalTax.toFixed(2)),
            taxPercentage: 0,
            cashBalance: parseFloat(grandTotal.toFixed(2)),
            paymentType: [],
            note: 'UNPAID - Customer Copy',
            shipping: 0,
            serviceCharge: 0,
            serviceChargeType: 'fixed',
        };

        const html = generateReceiptTemplate(templateData, safeReceiptSettings, settings, req);

        const compiledTemplate = Handlebars.compile(html);
        const finalHtml = compiledTemplate({
            ...templateData,
            formatDate: Handlebars.helpers.formatDate,
            formatCurrency: Handlebars.helpers.formatCurrency
        });

        res.status(200).json({ html: finalHtml, status: 'success' });
    } catch (error) {
        console.error('Error generating held order bill:', error);
        res.status(500).json({ message: 'Error generating bill', error: error.message, status: 'error' });
    }
};

module.exports = { cashHandIn, saveZReading, getAllZReadingDetails, getAllZReadingByDate, deleteZReading, closeRegister, getAdminPasswordForDiscount, findProductByKeyword, generateReferenceNo, holdProducts, viewAllHeldProducts, deleteHeldProduct, getProductsByIds, updateProductQuantities, findProducts, findAllProductsForPos, printHeldOrderBill };
