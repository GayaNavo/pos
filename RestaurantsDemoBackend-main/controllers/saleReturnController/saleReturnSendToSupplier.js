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

const mongoose = require('mongoose');
const SaleReturn = require('../../models/saleReturnModel');
const Product = require('../../models/products/product');
const PurchaseReturn = require('../../models/purchaseReturnModel');
const Settings = require('../../models/settingsModel');
const generateReferenceId = require('../../utils/generateReferenceID');

const fetchSaleReturnProducts = async (req, res) => {
    const { id, keyword } = req.query;
    const supplier = req.params.supplier;

    try {
        let saleReturns;
        let allProductsData = [];

        const normalizedFilterSupplier = supplier ? supplier.toString().trim().toLowerCase().replace(/\s+/g, ' ') : 'all';

        if (id) {
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({ message: 'Invalid sale return ID format' });
            }

            const saleReturn = await SaleReturn.findById(id);
            if (!saleReturn) {
                return res.status(404).json({ message: 'Sale return not found' });
            }

            // Get product IDs (currentID maps to Product._id)
            const productIds = saleReturn.productsData
                .filter(p => !p.returnStatus)
                .map(p => {
                    try {
                        return new mongoose.Types.ObjectId(p.currentID);
                    } catch (e) {
                        return null;
                    }
                })
                .filter(id => id);

            const products = await Product.find({
                _id: { $in: productIds }
            }).select('supplier _id code');

            const supplierMap = {};
            products.forEach(product => {
                supplierMap[product._id.toString()] = product.supplier ? product.supplier.trim() : 'Unknown';
            });

            const filteredProductsData = saleReturn.productsData.filter(productData => {
                if (productData.returnStatus) {
                    return false;
                }

                const productSupplier = supplierMap[productData.currentID];
                if (normalizedFilterSupplier !== 'all') {
                    if (!productSupplier || productSupplier === 'Unknown') {
                        return false;
                    }

                    const normalizedProductSupplier = productSupplier.toLowerCase().trim().replace(/\s+/g, ' ');


                    if (normalizedProductSupplier !== normalizedFilterSupplier) {
                        return false;
                    }
                }

                return true;
            }).map(productData => ({
                currentID: productData.currentID,
                ptype: productData.ptype || 'No Product Type',
                name: productData.name,
                returnQty: productData.returnQty,
                variationValue: productData.variationValue || 'No variations',
                selectedVariation: productData.selectedVariation || '',
                productCost: productData.productCost,
                taxRate: productData.taxRate || 0,
                warehouse: productData.warehouse,
                price: productData.price,
                subtotal: productData.subtotal,
                supplier: supplierMap[productData.currentID] || 'Unknown'
            }));

            const aggregatedProductsData = aggregateProducts(filteredProductsData);
            return res.status(200).json({ productsData: aggregatedProductsData });
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
        } else {
            saleReturns = await SaleReturn.find();
            if (!saleReturns || saleReturns.length === 0) {
                return res.status(404).json({ message: 'No sale returns found.' });
            }
        }

        // Get all unique product IDs from all sale returns
        const allProductIds = [];
        saleReturns.forEach(saleReturn => {
            saleReturn.productsData.forEach(productData => {
                if (!productData.returnStatus) {
                    try {
                        const objectId = new mongoose.Types.ObjectId(productData.currentID);
                        allProductIds.push(objectId);
                    } catch (e) {
                        console.log('DEBUG: Invalid ObjectId for currentID:', productData.currentID);
                    }
                } else {
                    console.log('DEBUG: Skipping product due to returnStatus true in all:', productData.currentID);
                }
            });
        });
        const uniqueProductIds = [...new Set(allProductIds.map(id => id.toString()))].map(id => new mongoose.Types.ObjectId(id));
        const products = await Product.find({
            _id: { $in: uniqueProductIds }
        }).select('supplier _id code');
        if (products.length > 0) {
            console.log('DEBUG: Sample matched products:', products.slice(0, 2).map(p => ({ _id: p._id.toString(), code: p.code, supplier: p.supplier })));
        }

        const supplierMap = {};
        products.forEach(product => {
            supplierMap[product._id.toString()] = product.supplier ? product.supplier.trim() : 'Unknown';
        });

        for (const saleReturn of saleReturns) {
            const filteredProductsData = saleReturn.productsData.filter(productData => {
                if (productData.returnStatus) {
                    return false;
                }

                const productSupplier = supplierMap[productData.currentID];
                if (normalizedFilterSupplier !== 'all') {
                    if (!productSupplier || productSupplier === 'Unknown') {
                        return false;
                    }

                    const normalizedProductSupplier = productSupplier.toLowerCase().trim().replace(/\s+/g, ' ');
                    if (normalizedProductSupplier !== normalizedFilterSupplier) {
                        return false;
                    }
                } else {
                    console.log('DEBUG: Supplier "all" - including product:', productData.currentID);
                }

                return true;
            }).map(productData => ({
                currentID: productData.currentID,
                ptype: productData.ptype || 'standard',
                name: productData.name,
                returnQty: productData.returnQty,
                variationValue: productData.variationValue || 'No variations',
                selectedVariation: productData.selectedVariation || '',
                productCost: productData.productCost,
                taxRate: productData.taxRate || 0,
                warehouse: productData.warehouse,
                price: productData.price,
                subtotal: productData.subtotal,
                supplier: supplierMap[productData.currentID] || 'Unknown'
            }));
            allProductsData.push(...filteredProductsData);
        }
        const productsData = aggregateProducts(allProductsData);
        res.status(200).json({ productsData });

    } catch (error) {
        console.error('Error fetching sale returns:', error);
        res.status(500).json({ message: 'Error fetching sale returns', error: error.message });
    }
};

const aggregateProducts = (products) => {
    const aggregated = {};
    products.forEach(product => {
        const variation = product.ptype === 'Variation'
            ? (product.selectedVariation || 'No variations')
            : 'No variations';

        const key = `${product.currentID}-${variation}-${product.ptype}-${product.warehouse}-${product.supplier}`;

        if (aggregated[key]) {
            aggregated[key].returnQty += product.returnQty || 0;
            aggregated[key].subtotal += product.subtotal || 0;
        } else {
            aggregated[key] = {
                ...product,
                variationValue: variation,
                returnQty: product.returnQty || 0,
                subtotal: product.subtotal || 0
            };
        }
    });

    return Object.values(aggregated);
};

const sendPurchaseReturnToSupplier = async (req, res) => {
    const { warehouse, grandTotal, paidAmount, supplier, note, productsData } = req.body;
    const date = new Date();
    if (!productsData) {
        return res.status(400).json({ message: 'selectedProduct is required' });
    }
    const referenceId = await generateReferenceId('PURCHASE_RETURN');
    const refferenceId = referenceId;
    const returnType = 'customer';

    const commonPurchaseData = {
        refferenceId,
        note,
        date: date,
        supplier,
        grandTotal,
        paidAmount,
        warehouse,
        returnType
    };

    const products = productsData.map(product => {
        const { warehouse = '', variationValue = '', price = 0, quantity = 0, subtotal = 0, name = 'Unknown', currentID = '', taxRate = 0, ptype = '' } = product;
        return {
            currentID,
            taxRate,
            ptype,
            variationValue: variationValue || 'No variations',
            name,
            price: price,
            quantity: quantity,
            subtotal,
            warehouse: warehouse
        };
    });

    const finalPurchaseData = {
        ...commonPurchaseData,
        productsData: products,
    };

    try {
        const purchaseReturn = new PurchaseReturn(finalPurchaseData);
        const savedPurchaseReturn = await purchaseReturn.save();

        await Promise.all(products.map(async (product) => {
            const { currentID, variationValue, quantity } = product;
            const saleReturn = await SaleReturn.findOneAndUpdate(
                { "productsData.currentID": currentID, "productsData.variationValue": variationValue },
                { $inc: { "productsData.$.returnQty": -quantity } },
                { new: true, runValidators: true }
            );

            if (!saleReturn) {
                console.error(`SaleReturn not found for currentID: ${currentID}, variationValue: ${variationValue}`);
            }
        }));

        res.status(201).json({ message: 'Purchase returned successfully!', data: savedPurchaseReturn });
    } catch (error) {
        console.error('Error saving purchase return:', error);
        res.status(500).json({ message: 'Failed to return Purchase', error: error.message });
    }
};

module.exports = { fetchSaleReturnProducts, sendPurchaseReturnToSupplier };