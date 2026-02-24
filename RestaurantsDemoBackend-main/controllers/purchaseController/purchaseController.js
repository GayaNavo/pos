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

const Purchase = require('../../models/purchaseModel')
const PurchasePayment = require("../../models/purchasePaymentModel")
const Product = require('../../models/products/product');
const posController = require('../posController/posController')
const mongoose = require('mongoose');
const Cash = require('../../models/posModel/cashModel');
const { isEmpty } = require('lodash');
const generateReferenceId = require('../../utils/generateReferenceID');
const { formatToSriLankaTime } = require('../../utils/timeZone');

const createPurchase = async (req, res) => {
    try {
        const purchaseData = req.body;

        // Generate a reference ID for the sale
        const refferenceId = await generateReferenceId('PURCHASE');
        purchaseData.refferenceId = refferenceId;

        // Validation checks using isEmpty
        if (isEmpty(purchaseData.warehouse)) {
            return res.status(400).json({ message: 'Warehouse is required.', status: 'unsuccess' });
        }

        if (isEmpty(purchaseData.date)) {
            return res.status(400).json({ message: 'Date is required.', status: 'unsuccess' });
        }
        if (isEmpty(purchaseData.supplier)) {
            return res.status(400).json({ message: 'Supplier is required.', status: 'unsuccess' });
        }
        if (isEmpty(purchaseData.paymentStatus)) {
            return res.status(400).json({ message: 'Payment Status is required.', status: 'unsuccess' });
        }
        if (isEmpty(purchaseData.orderStatus)) {
            return res.status(400).json({ message: 'Order Status is required.', status: 'unsuccess' });
        }

        purchaseData.paymentType = purchaseData.paymentType || '';
        purchaseData.orderStatus = purchaseData.orderStatus || 'ordered';
        const now = new Date();
        const currentTimeString = now.toISOString().split('T')[1];
        purchaseData.date = new Date(purchaseData.date + 'T' + currentTimeString);

        const newPruchase = new Purchase(purchaseData);
        const productsData = purchaseData.productsData;

        const productMap = new Map(); // Map to store fetched products

        // Prepare update logic
        for (const product of productsData) {
            const { currentID, ptype, variationValue } = product;
            const quantity = Number(product.quantity);

            if (!mongoose.Types.ObjectId.isValid(currentID)) {
                return res.status(404).json({ message: `Invalid product ID: ${currentID}`, status: 'unsuccess' });
            }
            if (isNaN(quantity) || quantity < 0) {
                return res.status(400).json({ message: `Invalid Product Quantity for Product Id: ${currentID}`, status: 'unsuccess' });
            }

            // Fetch product once and reuse
            let updatedProduct = productMap.get(currentID);
            if (!updatedProduct) {
                updatedProduct = await Product.findById(currentID);
                if (!updatedProduct) {
                    return res.status(400).json({ message: `Product not found with ID: ${currentID}`, status: 'unsuccess' });
                }
                productMap.set(currentID, updatedProduct);
            }

            const warehouseKey = purchaseData.warehouse;
            const SelectedWarehouse = updatedProduct.warehouse.get(warehouseKey);
            if (!SelectedWarehouse) {
                return res.status(400).json({ message: `Warehouse ${warehouseKey} not found for product with ID: ${currentID}`, status: 'unsuccess' });
            }

            if (ptype === 'Single') {
                SelectedWarehouse.productQty += quantity;
            } else if (ptype === 'Variation') {
                const variation = SelectedWarehouse.variationValues.get(variationValue);
                if (!variation) {
                    return res.status(400).json({ message: `Variation ${variationValue} not found for product with ID: ${currentID}`, status: 'unsuccess' });
                }
                variation.productQty += quantity;
                updatedProduct.markModified(`warehouse.${warehouseKey}.variationValues`);
            } else {
                return res.status(400).json({ message: `Invalid product type for product with ID: ${currentID}`, status: 'unsuccess' });
            }
        }

        // Save all updated products
        for (const prod of productMap.values()) {
            await prod.save();
        }

        // Save the purchase
        await newPruchase.save();

        res.status(201).json({ message: 'Purchase saved successfully!', purchase: newPruchase });
    } catch (error) {
        console.error('Error saving Purchase:', error);
        res.status(500).json({ message: 'Error saving Purchase', error: error.message });
    }
};

const deletePurchase = async (req, res) => {
    const { id } = req.params;

    try {
        const deletedPurchase = await Purchase.findByIdAndDelete(id);
        if (!deletedPurchase) {
            return res.status(404).json({ message: 'Purchase not found' });
        }
        res.status(200).json({ message: 'Purchase deleted successfully!', purchase: deletedPurchase });
    } catch (error) {
        console.error('Error deleting purchase:', error);
        res.status(500).json({ message: 'Error deleting purchase', error });
    }
};

const findPurchaseById = async (req, res) => {
    const { id } = req.params;

    // Validate the purchase ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid purchase ID format' });
    }

    try {
        const purchase = await Purchase.findById(id).lean();
        if (!purchase) {
            return res.status(404).json({ message: 'Purchase not found' });
        }
        const productIds = purchase.productsData.map(product => product.currentID);

        const products = await Product.find({ _id: { $in: productIds } }).lean();
        const updatedProductsData = purchase.productsData.map(productData => {
            const baseProduct = products.find(p => p._id.toString() === productData.currentID);

            const warehouseKey = purchase.warehouse;
            if (baseProduct) {
                let stockQty = "";

                const selectedWarehouse = baseProduct.warehouse[warehouseKey];
                if (!selectedWarehouse) {
                    console.error(`Warehouse ${warehouseKey} not found for product with ID: ${baseProduct._id}`);
                    return {
                        ...productData,
                        stockQty: "N/A"
                    };
                }

                // Check if the product has variations and find the correct variation stock
                if (productData.variationValue && selectedWarehouse.variationValues) {
                    const variation = selectedWarehouse.variationValues[productData.variationValue];
                    if (variation) {
                        stockQty = variation.productQty || "";
                    } else {
                        console.error(`Variation ${productData.variationValue} not found for product with ID: ${baseProduct._id}`);
                    }
                } else {
                    stockQty = selectedWarehouse.productQty || "";
                }

                return {
                    ...productData,
                    stockQty
                };
            }

            return {
                ...productData,
                stockQty
            };
        });

        const purchaseWithUpdatedProducts = {
            ...purchase,
            date: formatToSriLankaTime(purchase.date),
            productsData: updatedProductsData
        };

        res.status(200).json(purchaseWithUpdatedProducts);

    } catch (error) {
        console.error('Error finding purchase by ID:', error);
        res.status(500).json({ message: 'Error fetching purchase by ID', error: error.message });
    }
};

const updatePurchase = async (req, res) => {
    try {
        const purchaseID = req.params.id;
        const updateData = req.body;

        if (isEmpty(updateData.paymentStatus)) {
            return res.status(400).json({ message: 'Payment Status is required.', status: 'unsuccess' });
        }
        if (isEmpty(updateData.orderStatus)) {
            return res.status(400).json({ message: 'Order Status is required.', status: 'unsuccess' });
        }

        const existingPurchase = await Purchase.findById(purchaseID);
        if (!existingPurchase) {
            return res.status(404).json({ message: 'Purchase not found' });
        }

        const existingProducts = existingPurchase.productsData;
        const updatedProducts = updateData.productsData;

        for (const product of updatedProducts) {
            const { currentID, quantity: newQuantity, ptype, variationValue } = product;

            const updatedProduct = await Product.findById(currentID);
            if (!updatedProduct) {
                return res.status(400).json({ message: `Invalid product ID: ${currentID}`, status: 'unsuccess' });
            }

            const warehouseKey = updateData.warehouse || existingPurchase.warehouse;
            const selectedWarehouse = updatedProduct.warehouse.get(warehouseKey);
            if (!selectedWarehouse) {
                return res.status(400).json({ message: `Warehouse ${warehouseKey} not found for product with ID: ${currentID}`, status: 'unsuccess' });
            }

            if (ptype === 'Single') {
                const existingProduct = existingProducts.find(p => {
                    const existingId = (p.currentID || p.productId || p.product || '').toString();
                    const newId = currentID.toString();
                    const hasNoVariation = !p.variationValue || p.variationValue === 'No variations';
                    return existingId === newId && hasNoVariation;
                });
                const previousQuantity = existingProduct ? existingProduct.quantity : 0;
                const quantityDifference = newQuantity - previousQuantity;

                if (quantityDifference !== 0) {
                    selectedWarehouse.productQty += quantityDifference;
                }
            } else if (ptype === 'Variation') {
                const existingVariation = existingProducts.find(
                    p => p.currentID === currentID && p.variationValue === variationValue
                );
                const previousQuantity = existingVariation ? existingVariation.quantity : 0;
                const quantityDifference = newQuantity - previousQuantity;

                if (quantityDifference !== 0) {
                    const variation = selectedWarehouse.variationValues.get(variationValue);
                    if (!variation) {
                        return res.status(400).json({ message: `Variation ${variationValue} not found for product ID: ${currentID}`, status: 'unsuccess' });
                    }
                    variation.productQty += quantityDifference;
                    updatedProduct.markModified(`warehouse.${warehouseKey}.variationValues`);
                }
            } else {
                return res.status(400).json({ message: `Invalid product type for product ID: ${currentID}`, status: 'unsuccess' });
            }

            await updatedProduct.save();
        }

        // Update the purchase document
        const updatedFields = {
            ...updateData,
            warehouse: existingPurchase.warehouse,
            supplier: existingPurchase.supplier,
        };

        const updatedPurchase = await Purchase.findByIdAndUpdate(
            purchaseID,
            updatedFields,
            { new: true, runValidators: true }
        );

        res.status(200).json({
            message: 'Purchase updated successfully',
            purchase: updatedPurchase,
        });
    } catch (error) {
        console.error('Error updating Purchase:', error);

        let statusCode = 500;
        let errorMessage = 'Failed to update Purchase';

        if (error.name === 'ValidationError') {
            statusCode = 400;
            errorMessage = Object.values(error.errors)
                .map(err => err.message)
                .join(', ');
        }
        else if (error.message) {
            errorMessage = error.message;
        }

        res.status(statusCode).json({
            message: errorMessage,
            status: 'unsuccess',
            error: error
        });
    }

};

const fetchPaymentByPurchaseId = async (req, res) => {
    const { purchaseId } = req.params;
    try {
        const paymentData = await PurchasePayment.find({ purchaseId: purchaseId });
        if (!paymentData || paymentData.length === 0) {
            return res.status(404).json({ message: 'No payments found for this purchase ID' });
        }
        res.status(200).json({ payments: paymentData });
    } catch (error) {
        console.error('Error fetching purchase payment data:', error);
        res.status(500).json({ error: 'An error occurred while fetching purchase payment data' });
    }
};

const deletePaymentOfPurchase = async (req, res) => {
    const { id } = req.params; // Payment ID
    try {
        // Find the payment to delete
        const payment = await PurchasePayment.findById(id);
        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        const purchaseId = payment.purchaseId;

        // Find the associated purchase
        const purchase = await Purchase.findById(purchaseId);
        if (!purchase) {
            return res.status(404).json({ message: 'Purchase not found' });
        }

        // Subtract the payment amount from the purchase's paidAmount
        purchase.paidAmount -= payment.payingAmount;

        // Ensure paidAmount doesn't fall below 0
        if (purchase.paidAmount < 0) {
            purchase.paidAmount = 0;
        }

        // Recalculate the payment status
        if (purchase.paidAmount === 0) {
            purchase.paymentStatus = 'Unpaid';
        } else if (purchase.paidAmount >= purchase.grandTotal) {
            purchase.paymentStatus = 'Paid';
        } else {
            purchase.paymentStatus = 'Partial';
        }

        // Save the updated purchase
        await purchase.save();

        // Delete the payment
        await PurchasePayment.findByIdAndDelete(id);

        return res.status(200).json({
            message: 'Payment deleted successfully',
            purchase: {
                purchaseId: purchase._id,
                paidAmount: purchase.paidAmount,
                paymentStatus: purchase.paymentStatus,
            },
        });
    } catch (error) {
        console.error('Error deleting purchase payment:', error);
        res.status(500).json({ error: 'An error occurred while deleting the purchase payment' });
    }
};

const payingForPurchase = async (req, res) => {
    const { purchaseId, amountToPay, payingAmount, paymentType, currentDate } = req.body;
    try {
        // Find the purchase by ID
        const purchase = await Purchase.findById(purchaseId);
        if (!purchase) {
            return res.status(404).json({ error: 'Purchase not found' });
        }

        // Ensure grandTotal and paidAmount are numbers
        if (typeof purchase.grandTotal !== 'number' || typeof purchase.paidAmount !== 'number') {
            return res.status(400).json({ message: 'Invalid purchase amount data' });
        }

        // Calculate the new total paid amount
        const newTotalPaidAmount = purchase.paidAmount + Number(payingAmount);

        // Ensure payment does not exceed amount to pay
        if (newTotalPaidAmount > Number(amountToPay)) {
            return res.status(400).json({ message: 'Payment exceeds the amount to pay.' });
        }

        // Create a new payment entry for the purchase
        const newPayment = new PurchasePayment({
            purchaseId,
            amountToPay: Number(amountToPay),
            payingAmount: Number(payingAmount),
            currentDate: currentDate || Date.now(),
            paymentType: paymentType || 'Default',
        });

        await newPayment.save();

        // Update the paid amount in the Purchase model
        purchase.paidAmount = newTotalPaidAmount;

        // Calculate total paid amount by summing all payments for the purchase
        const allPayments = await PurchasePayment.find({ purchaseId });
        const totalPaidAmount = allPayments.reduce((sum, payment) => sum + payment.payingAmount, 0);

        // Calculate due amount
        const dueAmount = Number(amountToPay) - totalPaidAmount;

        // Determine and set the payment status
        if (totalPaidAmount === 0) {
            purchase.paymentStatus = 'unpaid';
        } else if (totalPaidAmount >= purchase.grandTotal) {
            purchase.paymentStatus = 'paid';
        } else if (totalPaidAmount > 0 && totalPaidAmount < purchase.grandTotal) {
            purchase.paymentStatus = 'partial';
        }

        await purchase.save();

        return res.status(201).json({
            message: 'Purchase payment recorded successfully',
            payment: newPayment,
            purchase: {
                purchaseId: purchase._id,
                paidAmount: totalPaidAmount,
                dueAmount: dueAmount,
                paymentStatus: purchase.paymentStatus,
            }
        });
    } catch (error) {
        console.error('Error processing purchase payment:', error);
        res.status(500).json({ error: 'An error occurred while processing the purchase payment' });
    }
};

const deleteProductFromPurchase = async (req, res) => {
    const { purchaseID, productID, total } = req.query;

    try {
        // Step 1: Find the Purchase by PurchaseID
        const purchase = await Purchase.findById(purchaseID);
        if (!purchase) {
            return res.status(404).json({ message: 'Purchase not found' });
        }

        // Step 2: Check if the product exists in the Purchase's productsData
        const productToDelete = purchase.productsData.find(product => product.currentID === productID);
        if (!productToDelete) {
            return res.status(404).json({ message: 'Product not found in Purchase' });
        }

        // Step 3: Calculate the new grandTotal after removing the product's subtotal
        const newGrandTotal = purchase.grandTotal - productToDelete.subtotal;

        // Step 4: Update the sale by pulling the product out of productsData and updating grandTotal
        const updatedPurchase = await Purchase.findByIdAndUpdate(
            purchaseID,
            {
                $pull: { productsData: { currentID: productID } }, // Remove the product from the array
                grandTotal: newGrandTotal // Update the grandTotal
            },
            { new: true } // Return the updated document
        );

        // Step 5: Respond with success if the purchase was updated
        if (updatedPurchase) {
            res.status(200).json({ message: "Product deleted successfully", purchase: updatedPurchase });
        } else {
            res.status(404).json({ message: "purchase not found" });
        }
    } catch (error) {
        console.error("Error deleting product from purchase:", error);
        res.status(500).json({ message: "An error occurred while deleting the product" });
    }
};

const fetchPurchases = async (req, res) => {
    const { id, supplierName, purchaseId } = req.query;
    try {
        let purchases;

        const formatPurchaseForDisplay = (purchase) => ({
            ...purchase,
            date: formatToSriLankaTime(purchase.date)?.full || purchase.date || 'N/A',
            createdAt: formatToSriLankaTime(purchase.createdAt)?.full || purchase.createdAt,
            updatedAt: formatToSriLankaTime(purchase.updatedAt)?.full || purchase.updatedAt
        });

        // Fetch by purchaseId
        if (purchaseId) {
            const purchase = await Purchase.findOne({ refferenceId: purchaseId }).lean();
            if (!purchase) return res.status(404).json({ message: "Purchase not found" });
            return res.status(200).json(formatPurchaseForDisplay(purchase));
        }

        // Fetch by ID
        if (id) {
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({ message: "Invalid purchase ID format" });
            }
            const purchase = await Purchase.findById(id).lean();
            if (!purchase) return res.status(404).json({ message: "Purchase not found" });
            return res.status(200).json(formatPurchaseForDisplay(purchase));
        }

        // Fetch all purchases with or without pagination
        const size = parseInt(req.query?.page?.size) || 10; // Default size is 10
        const number = parseInt(req.query?.page?.number) || 1; // Default page number is 1
        const offset = (number - 1) * size; // Calculate the offset for pagination

        // Paginated results
        if (req.query.page) {
            const size = parseInt(req.query.page.size) || 10;
            const number = parseInt(req.query.page.number) || 1;
            const offset = (number - 1) * size;

            purchases = await Purchase.find()
                .sort({ createdAt: -1 })
                .skip(offset)
                .limit(size)
                .lean();

            if (!purchases || purchases.length === 0) return res.status(404).json({ message: "No purchases found." });

            const total = await Purchase.countDocuments();
            const formattedPurchases = purchases.map(formatPurchaseForDisplay);

            return res.status(200).json({
                message: "Purchases fetched successfully with pagination",
                data: formattedPurchases,
                total,
                totalPages: Math.ceil(total / size),
                currentPage: number,
                pageSize: size
            });
        }

        // Fetch all purchases without pagination
        purchases = await Purchase.find().lean();
        if (!purchases || purchases.length === 0) return res.status(404).json({ message: "No purchases found." });

        const formattedPurchases = purchases.map(formatPurchaseForDisplay);
        return res.status(200).json(formattedPurchases);

    } catch (error) {
        console.error("Error fetching purchases:", error);
        res.status(500).json({ message: "Error fetching purchases", error: error.message });
    }
};

const searchPurchase = async (req, res) => {
    const { keyword } = req.query;

    try {
        if (!keyword) {
            return res.status(400).json({
                status: "error",
                message: "Keyword is required for search."
            });
        }

        // Escape special regex characters in the keyword to prevent regex injection
        const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Build query to search by customer or refferenceId
        const query = {
            $or: [
                //{ supplier: { $regex: new RegExp(`${escapedKeyword}`, 'i') } }, // Case-insensitive search
                { refferenceId: { $regex: new RegExp(`${escapedKeyword}`, 'i') } },
                { invoiceNumber: { $regex: new RegExp(`${escapedKeyword}`, 'i') } }
            ]
        };

        // Fetch purchases based on the query
        const purchases = await Purchase.find(query).populate('productsData.currentID', 'productName productQty');

        if (!purchases || purchases.length === 0) {
            return res.status(404).json({
                status: "unsuccess",
                message: "No purchases found for the provided keyword."
            });
        }

        // Format purchase data if additional processing is needed
        const formattedPurchases = purchases.map((purchase) => {
            const purchaseObj = purchase.toObject();

            return {
                _id: purchaseObj._id,
                refferenceId: purchaseObj.refferenceId,
                invoiceNumber: purchaseObj.invoiceNumber,
                supplier: purchaseObj.supplier,
                totalAmount: purchaseObj.totalAmount,
                purchaseDate: purchaseObj.purchaseDate,
                paymentStatus: purchaseObj.paymentStatus,
                paymentType: purchaseObj.paymentType,
                grandTotal: purchaseObj.grandTotal,
                discount: purchaseObj.discount,
                orderStatus: purchaseObj.orderStatus,
                discountType: purchaseObj.discountType,
                paidAmount: purchaseObj.paidAmount,
                shipping: purchaseObj.shipping,
                tax: purchaseObj.tax,
                warehouse: purchaseObj.warehouse,
                date: formatToSriLankaTime(purchaseObj.date)?.full || 'N/A',
                productsData: purchaseObj.productsData, // Include product details
                createdAt: purchaseObj.createdAt
                    ? purchaseObj.createdAt.toISOString().slice(0, 10)
                    : null,
            };
        });

        return res.status(200).json({
            status: "success",
            purchases: formattedPurchases
        });
    } catch (error) {
        console.error("Search purchases error:", error);
        return res.status(500).json({
            status: "error",
            message: error.message
        });
    }
};

module.exports = {
    createPurchase, deletePurchase, findPurchaseById, updatePurchase, fetchPaymentByPurchaseId, deletePaymentOfPurchase, payingForPurchase, deleteProductFromPurchase, fetchPurchases, searchPurchase
};
