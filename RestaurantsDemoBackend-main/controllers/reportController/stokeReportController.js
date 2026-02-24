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

const Product = require('../../models/products/product');
const Purchase = require('../../models/purchaseModel');
const PurchaseReturn = require('../../models/purchaseReturnModel');
const Sale = require('../../models/saleModel');
const SaleReturn = require('../../models/saleReturnModel');
const mongoose = require('mongoose');
const moment = require('moment-timezone');
const path = require('path');
const fs = require('fs');

const findAllStoke = async (req, res) => {
    const { warehouse } = req.params;

    try {
        const warehouseFilter = warehouse === 'all' ? {} : { [`warehouse.${warehouse}`]: { $exists: true } };
        const products = await Product.find(warehouseFilter);

        if (!products.length) {
            return res.status(404).json({ status: 'No products found' });
        }
        const allProducts = [];

        products.forEach(product => {
            const productObj = product.toObject();
            const formattedCreatedAt = productObj.createdAt.toISOString().slice(0, 10);

            let imageUrl = null;
            if (productObj.image) {
                imageUrl = `${req.protocol}://${req.get('host')}/uploads/product/${path.basename(productObj.image)}`;
            }

            if (warehouse === 'all') {
                productObj.warehouse.forEach((warehouseDetails, warehouseName) => {
                    processWarehouseData(warehouseName, warehouseDetails, productObj, formattedCreatedAt, imageUrl, allProducts);
                });
            } else {
                const warehouseDetails = productObj.warehouse.get(warehouse);
                if (warehouseDetails) {
                    processWarehouseData(warehouse, warehouseDetails, productObj, formattedCreatedAt, imageUrl, allProducts);
                }
            }
        });
        return res.status(200).json({ status: 'Products fetched successfully', products: allProducts });
    } catch (error) {
        console.error('Error fetching products:', error);
        return res.status(500).json({ status: 'Error fetching products', error: error.message });
    }
};

const processWarehouseData = (warehouseName, warehouseDetails, productObj, formattedCreatedAt, imageUrl, allProducts) => {
    if (!warehouseDetails) return;

    if (warehouseDetails.variationValues && warehouseDetails.variationValues.size > 0) {
        warehouseDetails.variationValues.forEach((value, key) => {
            allProducts.push({
                ...productObj,
                _id: `${productObj._id}-${warehouseName}-${key}`,
                name: `${productObj.name} - ${key}`,
                warehouseName,
                variationValue: key,
                variationDetails: value,
                productCost: value.productCost,
                productPrice: value.productPrice,
                productQty: value.productQty,
                orderTax: value.orderTax,
                stockAlert: value.stockAlert,
                image: imageUrl,
                createdAt: formattedCreatedAt
            });
        });
    } else {
        allProducts.push({
            ...productObj,
            _id: `${productObj._id}-${warehouseName}`,
            warehouseName,
            productCost: warehouseDetails.productCost,
            productPrice: warehouseDetails.productPrice,
            productQty: warehouseDetails.productQty,
            orderTax: warehouseDetails.orderTax,
            stockAlert: warehouseDetails.stockAlert,
            image: imageUrl,
            createdAt: formattedCreatedAt
        });
    }
};


const findStokeReportByCode = async (req, res) => {
    const { name } = req.query;

    try {
        if (!name) {
            return res.status(400).json({ status: "No search keyword provided" });
        }

        const searchRegex = new RegExp(name, "i");

        // Search by code OR name
        const products = await Product.find({
            $or: [{ code: searchRegex }, { name: searchRegex }]
        });

        if (!products.length) {
            return res.status(404).json({ status: "No products found for this search term" });
        }

        const searchResults = [];

        products.forEach(product => {
            const productObj = product.toObject();

            let imageUrl = null;
            if (productObj.image) {
                imageUrl = `${req.protocol}://${req.get("host")}/uploads/product/${path.basename(
                    productObj.image
                )}`;
            }

            productObj.warehouse.forEach((warehouseDetails, warehouseName) => {
                if (warehouseDetails.variationValues && warehouseDetails.variationValues.size > 0) {
                    warehouseDetails.variationValues.forEach((value, key) => {
                        searchResults.push({
                            ...productObj,
                            _id: `${productObj._id}_${key}`,
                            name: `${productObj.name} - ${key}`,
                            warehouseName,
                            variationValue: key,
                            variationDetails: value,
                            productCost: value.productCost,
                            productPrice: value.productPrice,
                            productQty: value.productQty,
                            orderTax: value.orderTax,
                            stockAlert: value.stockAlert,
                            image: imageUrl,
                            createdAt: productObj.createdAt.toISOString().slice(0, 10)
                        });
                    });
                } else {
                    searchResults.push({
                        ...productObj,
                        _id: `${productObj._id}-${warehouseName}`, // ensures uniqueness across warehouses
                        warehouseName,
                        productCost: warehouseDetails.productCost,
                        productPrice: warehouseDetails.productPrice,
                        productQty: warehouseDetails.productQty,
                        orderTax: warehouseDetails.orderTax,
                        stockAlert: warehouseDetails.stockAlert,
                        image: imageUrl,
                        createdAt: productObj.createdAt.toISOString().slice(0, 10)
                    });
                }
            });
        });

        // Normalize for flexible partial, case-insensitive filtering
        const normalize = str => str.replace(/\s+/g, " ").trim().toLowerCase();

        const filteredResults = searchResults.filter(product =>
            normalize(product.name).includes(normalize(name))
        );

        if (!filteredResults.length) {
            return res.status(404).json({ status: "No products found for this search term" });
        }

        return res.status(200).json({ status: "Products found", products: filteredResults });
    } catch (error) {
        console.error("Error searching products:", error);
        return res.status(500).json({ status: "Error searching products", error: error.message });
    }
};

const findProductDetailsById = async (req, res) => {
    try {
        const { id } = req.params;

        // Split id for variation
        const parts = id.split(/[-_]/); // handles both _ and -
        const productId = parts[0];
        const variationValue = parts[1] || null;

        // Find product by _id
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Build queries for transactions
        const productQuery = { 'productsData.currentID': productId };
        const returnQuery = { 'productsData.currentID': productId };

        if (product.ptype === 'Variation' && variationValue) {
            productQuery['productsData.variationValue'] = variationValue;
            returnQuery.$or = [
                { 'productsData.selectedVariation': variationValue },
                { 'productsData.variationValue': variationValue },
            ];
        }

        // Fetch all transactions
        const [sales, saleReturns, purchases, purchaseReturns] = await Promise.all([
            Sale.find(productQuery),
            SaleReturn.find(returnQuery),
            Purchase.find(productQuery),
            PurchaseReturn.find(returnQuery),
        ]);

        // Convert UTC date to Colombo time
        const convertToColomboTime = (utcDate) => {
            if (!utcDate) return null;
            return moment(utcDate).tz('Asia/Colombo').format('YYYY/MM/DD HH:mm:ss');
        };

        // Filter only relevant product data in transactions
        const filterProductsInTransactions = (transactions, isReturn = false, isPurchaseReturn = false) => {
            return transactions
                .map((transaction) => {
                    const transactionObj = transaction.toObject();
                    transactionObj.date = convertToColomboTime(transaction.date);

                    transactionObj.productsData = transactionObj.productsData.filter((prod) => {
                        if (prod.currentID !== productId) return false;

                        if (product.ptype === 'Variation' && variationValue) {
                            const variationField = isReturn
                                ? isPurchaseReturn
                                    ? prod.variationValue
                                    : prod.selectedVariation || prod.variationValue
                                : prod.variationValue;
                            return variationField === variationValue;
                        }

                        return true; // Single product
                    });

                    return transactionObj;
                })
                .filter((transaction) => transaction.productsData.length > 0);
        };

        // Calculate summary
        const calculateSummary = () => {
            let totalSold = 0;
            let totalPurchased = 0;
            let totalReturned = 0;
            let totalRevenue = 0;
            let totalCost = 0;

            sales.forEach((sale) => {
                sale.productsData.forEach((prod) => {
                    if (prod.currentID === productId) {
                        if (product.ptype === 'Single' || prod.variationValue === variationValue) {
                            totalSold += prod.quantity;
                            totalRevenue += prod.subtotal;
                        }
                    }
                });
            });

            purchases.forEach((purchase) => {
                purchase.productsData.forEach((prod) => {
                    if (prod.currentID === productId) {
                        if (product.ptype === 'Single' || prod.variationValue === variationValue) {
                            totalPurchased += prod.quantity;
                            totalCost += prod.subtotal;
                        }
                    }
                });
            });

            saleReturns.forEach((returnItem) => {
                returnItem.productsData.forEach((prod) => {
                    if (prod.currentID === productId) {
                        if (product.ptype === 'Single' || (prod.selectedVariation || prod.variationValue) === variationValue) {
                            totalReturned += prod.returnQty || prod.quantity;
                        }
                    }
                });
            });

            purchaseReturns.forEach((returnItem) => {
                returnItem.productsData.forEach((prod) => {
                    if (prod.currentID === productId) {
                        if (product.ptype === 'Single' || prod.variationValue === variationValue) {
                            totalReturned += prod.returnQty || prod.quantity;
                        }
                    }
                });
            });

            return {
                totalSold,
                totalPurchased,
                totalReturned,
                currentStock: totalPurchased - totalSold + totalReturned,
                totalRevenue,
                totalCost,
                grossProfit: totalRevenue - totalCost,
            };
        };

        const sortByDateDesc = (transactions) => {
            return transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        };

        const summary = calculateSummary();
        const processedSales = sortByDateDesc(filterProductsInTransactions(sales, false, false));
        const processedSaleReturns = sortByDateDesc(filterProductsInTransactions(saleReturns, true, false));
        const processedPurchases = sortByDateDesc(filterProductsInTransactions(purchases, false, false));
        const processedPurchaseReturns = sortByDateDesc(filterProductsInTransactions(purchaseReturns, true, true));

        res.status(200).json({
            message: 'Report data fetched successfully',
            data: {
                sales: processedSales,
                saleReturns: processedSaleReturns,
                purchases: processedPurchases,
                purchaseReturns: processedPurchaseReturns,
            },
            productInfo: {
                id: productId,
                name: product.name,
                type: product.ptype,
                warehouse: null,
                variation: variationValue || null,
            },
            summary,
        });

    } catch (error) {
        console.error('Error fetching product details:', error);
        res.status(500).json({
            message: 'Failed to fetch product details',
            error: error.message,
        });
    }
};

module.exports = { findAllStoke, findStokeReportByCode, findProductDetailsById };