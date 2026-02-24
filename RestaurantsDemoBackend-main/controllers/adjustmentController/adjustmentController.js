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

const Adjustment = require('../../models/adjustmentModel')
const Product = require('../../models/products/product');
const mongoose = require('mongoose');
const generateReferenceId = require('../../utils/generateReferenceID');

// CREATE ADJUSTMENT
const createAdjustment = async (req, res) => {
    try {
        const adjustmentData = req.body;
        const referenceId = await generateReferenceId('ADJ');
        adjustmentData.refferenceId = referenceId;

        const newAdjustment = new Adjustment(adjustmentData);
        const productsData = adjustmentData.productsData;

        // Validation
        if (!adjustmentData.warehouse) {
            return res.status(400).json({ message: 'Warehouse is required.', status: 'unsuccess' });
        }
        if (!adjustmentData.refferenceId) {
            return res.status(400).json({ message: 'Reference ID is required.', status: 'unsuccess' });
        }
        if (!adjustmentData.date) {
            return res.status(400).json({ message: 'Date is required.', status: 'unsuccess' });
        }
        if (!Array.isArray(productsData) || productsData.length === 0) {
            return res.status(400).json({ message: 'No products provided for adjustment.', status: 'unsuccess' });
        }

        // Use sequential processing instead of Promise.all
        for (const product of productsData) {
            const { currentID, quantity, ptype, AdjustmentType, variationValue } = product;

            if (!mongoose.Types.ObjectId.isValid(currentID)) {
                return res.status(400).json({
                    message: `Invalid product ID: ${currentID}`,
                    status: 'unsuccess'
                });
            }

            // Fetch the product fresh each time
            const updatedProduct = await Product.findById(currentID);
            if (!updatedProduct) {
                return res.status(404).json({
                    message: `Product not found: ${currentID}`,
                    status: 'unsuccess'
                });
            }

            const numericQuantity = Number(quantity);
            const warehouseKey = adjustmentData.warehouse;

            if (ptype === 'Single') {
                const SelectedWarehouse = updatedProduct.warehouse.get(warehouseKey);

                if (!SelectedWarehouse) {
                    return res.status(404).json({
                        message: `Warehouse ${warehouseKey} not found for product with ID: ${currentID}`,
                        status: 'unsuccess'
                    });
                }

                const currentQty = Number(SelectedWarehouse.productQty || 0);

                if (AdjustmentType === 'addition') {
                    SelectedWarehouse.productQty = currentQty + numericQuantity;
                } else if (AdjustmentType === 'subtraction') {
                    if (currentQty < numericQuantity) {
                        return res.status(400).json({
                            message: `Insufficient stock for Product ID: ${currentID}. Available: ${currentQty}, Required: ${numericQuantity}`,
                            status: 'unsuccess'
                        });
                    }
                    SelectedWarehouse.productQty = currentQty - numericQuantity;
                }

                updatedProduct.markModified('warehouse');
                await updatedProduct.save();

            } else if (ptype === 'Variation') {
                const SelectedWarehouse = updatedProduct.warehouse.get(warehouseKey);

                if (!SelectedWarehouse) {
                    return res.status(404).json({
                        message: `Warehouse ${warehouseKey} not found for product with ID: ${currentID}`,
                        status: 'unsuccess'
                    });
                }

                //Case-insensitive variation key matching
                const availableVariations = Array.from(SelectedWarehouse.variationValues.keys());
                const matchedKey = availableVariations.find(
                    key => key.toLowerCase() === variationValue.toLowerCase()
                );

                if (!matchedKey) {
                    return res.status(404).json({
                        message: `Variation ${variationValue} not found for product with ID: ${currentID}. Available variations: ${availableVariations.join(', ')}`,
                        status: 'unsuccess'
                    });
                }

                const variation = SelectedWarehouse.variationValues.get(matchedKey);
                const currentVariationQty = Number(variation.productQty || 0);

                if (AdjustmentType === 'addition') {
                    variation.productQty = currentVariationQty + numericQuantity;
                } else if (AdjustmentType === 'subtraction') {
                    if (currentVariationQty < numericQuantity) {
                        return res.status(400).json({
                            message: `Insufficient stock for Variation ${matchedKey} of Product ID: ${currentID}. Available: ${currentVariationQty}, Required: ${numericQuantity}`,
                            status: 'unsuccess'
                        });
                    }
                    variation.productQty = currentVariationQty - numericQuantity;
                }
                updatedProduct.markModified(`warehouse.${warehouseKey}.variationValues`);
                updatedProduct.markModified('warehouse');
                await updatedProduct.save();
            }
        }
        await newAdjustment.save();
        res.status(201).json({
            message: 'Adjustment saved successfully!',
            adjustment: newAdjustment,
            status: 'success'
        });
    } catch (error) {
        console.error('Error saving adjustment:', error);
        res.status(500).json({
            message: 'Error saving adjustment',
            error: error.message,
            status: 'unsuccess'
        });
    }
};

// DELETE ADJUSTMENT
const deleteAdjustment = async (req, res) => {
    const { id } = req.params; 
    try {
        const deletedAdjustment = await Adjustment.findByIdAndDelete(id);
        if (!deletedAdjustment) {
            return res.status(404).json({ message: 'Adjustment not found' });
        }
        res.status(200).json({ message: 'Adjustment deleted successfully!', adjustment: deletedAdjustment });
    } catch (error) {
        console.error('Error in deleteAdjustment:', error.message);
        res.status(500).json({ message: `Error deleting adjustment: ${error.message}` });
    }
};

//FIND ADJUSTMENT BY ID FOR UPDATE
const findAdjustmentByIdForUpdate = async (req, res) => {
    const { id } = req.params;

    // Validate the sale ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid sale ID format' });
    }
    try {
        // Find the sale by ID
        const sale = await Adjustment.findById(id);
        if (!sale) {
            return res.status(404).json({ message: 'Sale not found' });
        }

        // Extract product IDs from the sale's productsData
        const productIds = sale.productsData.map(product => product.currentID);

        // Fetch corresponding base products using product IDs
        const products = await Product.find({ _id: { $in: productIds } });

        // Map through the sale's productsData and attach the base product details
        const updatedProductsData = sale.productsData.map(productData => {
            const baseProduct = products.find(p => p._id.toString() === productData.currentID);
            const warehouseKey = sale.warehouse;
            if (baseProduct) {
                let stockQty = "";

                const selectedWarehouse = baseProduct.warehouse.get(warehouseKey);

                if (!selectedWarehouse) {
                    console.error(`Warehouse ${warehouseKey} not found for product with ID: ${baseProduct._id}`);
                    return {
                        ...productData,
                        stockQty: "N/A"
                    };
                }

                if (productData.variationValue && selectedWarehouse.variationValues) {
                    const variation = selectedWarehouse.variationValues.get(productData.variationValue);
                    if (variation) {
                        stockQty = variation.productQty || "";
                    } else {
                        console.error(`Variation ${productData.variationValue} not found for product with ID: ${baseProduct._id}`);
                    }
                } else {
                    stockQty = selectedWarehouse.productQty || "";
                }

                // Return product data with the attached stock quantity
                return {
                    currentID: productData.currentID,
                    variationValues: selectedWarehouse.variationValues,
                    selectedVariation: productData.variationValue,
                    AdjustmentType: productData.AdjustmentType,
                    name: productData.name,
                    productCost: productData.productCost,
                    ptype: productData.ptype,
                    quantity: productData.quantity,
                    productQty: stockQty, // Attach stock quantity
                    oderTax: productData.taxRate,
                    subtotal: productData.subtotal,
                    _id: productData._id
                };
            }

            console.warn(`Base product with currentID ${productData.currentID} not found.`);
            // Return original product data if no base product found
            return productData;
        });

        // Combine sale with the updated product details
        const saleWithUpdatedProducts = {
            ...sale.toObject(), // Spread existing sale fields
            productsData: updatedProductsData // Attach updated products data
        };

        // Send the updated sale data
        res.status(200).json(saleWithUpdatedProducts);

    } catch (error) {
        console.error('Error finding sale by ID:', error);
        res.status(500).json({ message: 'Error fetching sale by ID', error });
    }
};

// Retry logic function
const retryOperation = async (operation, retries = 3) => {
    while (retries > 0) {
        try {
            return await operation();
        } catch (error) {
            if (error.code === 112) { // WriteConflict
                retries -= 1;
                console.warn('Retrying operation due to write conflict. Retries left:', retries);
                if (retries === 0) throw error;
            } else {
                throw error; // Other errors should not be retried
            }
        }
    }
};

const updateAdjustment = async (req, res) => {
    try {
        const adjustmentId = req.params.id;
        const updateData = req.body;

        for (const productData of updateData.productsData) {
            const { AdjustmentType } = productData;
            if (AdjustmentType !== 'addition' && AdjustmentType !== 'subtraction') {
                return res.status(400).json({
                    message: `Invalid AdjustmentType: ${AdjustmentType}. It must be either 'addition' or 'subtraction'.`,
                    status: 'unsuccess'
                });
            }
        }

        const filteredProducts = updateData.productsData.filter((product) => product.currentID);

        let sessionError = null;

        await retryOperation(async (session) => {
            const existingAdjustment = await Adjustment.findById(adjustmentId).session(session);
            if (!existingAdjustment) {
                sessionError = { status: 404, message: 'Adjustment not found' };
                return;
            }

            for (const productData of filteredProducts) {
                const { currentID, quantity, ptype, AdjustmentType, variationValue } = productData;

                const product = await Product.findById(currentID).session(session);
                if (!product) {
                    sessionError = { status: 404, message: `Product not found: ${currentID}` };
                    return;
                }

                const numericQuantity = Number(quantity);

                const previousAdjustment = existingAdjustment.productsData.find((p) => {
                    if (ptype === 'Single') {
                        return p.currentID === currentID;
                    } else if (ptype === 'Variation') {
                        return p.currentID === currentID &&
                            p.variationValue?.toLowerCase() === variationValue?.toLowerCase();
                    }
                    return false;
                });

                const previousQuantity = previousAdjustment ? Number(previousAdjustment.quantity) : 0;
                const previousAdjustmentType = previousAdjustment ? previousAdjustment.AdjustmentType : null;

                const warehouseKey = updateData.warehouse;
                const selectedWarehouse = product.warehouse.get(warehouseKey);

                if (!selectedWarehouse) {
                    sessionError = { status: 404, message: `Warehouse ${warehouseKey} not found for product ID: ${currentID}` };
                    return;
                }

                if (ptype === 'Single') {
                    const currentQty = Number(selectedWarehouse.productQty || 0);

                    let adjustedQty = currentQty;
                    if (previousAdjustment) {
                        if (previousAdjustmentType === 'addition') {
                            adjustedQty -= previousQuantity;
                        } else if (previousAdjustmentType === 'subtraction') {
                            adjustedQty += previousQuantity;
                        }
                    }

                    if (AdjustmentType === 'addition') {
                        adjustedQty += numericQuantity;
                    } else if (AdjustmentType === 'subtraction') {
                        if (adjustedQty < numericQuantity) {
                            sessionError = { status: 400, message: `Insufficient stock for Product ID: ${currentID}. Available: ${adjustedQty}, Required: ${numericQuantity}` };
                            return;
                        }
                        adjustedQty -= numericQuantity;
                    }

                    if (adjustedQty < 0) {
                        sessionError = { status: 400, message: `Insufficient stock for Product ID: ${currentID}. Cannot have negative stock.` };
                        return;
                    }

                    selectedWarehouse.productQty = adjustedQty;
                    product.markModified(`warehouse.${warehouseKey}`);
                }
                else if (ptype === 'Variation') {
                    const availableVariations = Array.from(selectedWarehouse.variationValues.keys());
                    const matchedKey = availableVariations.find(
                        key => key.toLowerCase() === variationValue.toLowerCase()
                    );

                    if (!matchedKey) {
                        sessionError = { status: 404, message: `Variation ${variationValue} not found for product ID: ${currentID}. Available: ${availableVariations.join(', ')}` };
                        return;
                    }

                    const variation = selectedWarehouse.variationValues.get(matchedKey);
                    const currentVariationQty = Number(variation.productQty || 0);

                    let adjustedQty = currentVariationQty;
                    if (previousAdjustment) {
                        if (previousAdjustmentType === 'addition') {
                            adjustedQty -= previousQuantity;
                        } else if (previousAdjustmentType === 'subtraction') {
                            adjustedQty += previousQuantity;
                        }
                    }

                    if (AdjustmentType === 'addition') {
                        adjustedQty += numericQuantity;
                    } else if (AdjustmentType === 'subtraction') {
                        if (adjustedQty < numericQuantity) {
                            sessionError = { status: 400, message: `Insufficient stock for Variation ${matchedKey} of Product ID: ${currentID}. Available: ${adjustedQty}, Required: ${numericQuantity}` };
                            return;
                        }
                        adjustedQty -= numericQuantity;
                    }

                    if (adjustedQty < 0) {
                        sessionError = { status: 400, message: `Insufficient stock for Variation ${matchedKey} of Product ID: ${currentID}. Cannot have negative stock.` };
                        return;
                    }

                    variation.productQty = adjustedQty;
                    product.markModified(`warehouse.${warehouseKey}.variationValues`);
                }

                await product.save({ session });
            }

            existingAdjustment.productsData = updateData.productsData;
            existingAdjustment.updatedAt = new Date();

            await existingAdjustment.save({ session });
        });

        if (sessionError) {
            return res.status(sessionError.status).json({
                message: sessionError.message,
                status: 'unsuccess'
            });
        }

        res.status(200).json({
            message: 'Product quantities and adjustment updated successfully',
            status: 'success'
        });
    } catch (error) {
        console.error('Error updating adjustment:', error.message);
        res.status(500).json({
            message: error.message || 'Failed to update adjustment',
            status: 'unsuccess'
        });
    }
};

//DELETE PRODUCT FROM ADJUSTMENT
const deleteProductFromAdjustment = async (req, res) => {
    const { adjustmentID, productID } = req.query; // Use only relevant fields

    try {
        // Find the adjustment by ID
        const adjustment = await Adjustment.findById(adjustmentID);
        if (!adjustment) {
            return res.status(404).json({ message: 'Adjustment not found' });
        }

        // Check if `productsData` exists and find the product
        if (!adjustment.productsData || adjustment.productsData.length === 0) {
            return res.status(404).json({ message: 'No products found in adjustment' });
        }

        const productToDelete = adjustment.productsData.find(product => product.currentID === productID);
        if (!productToDelete) {
            return res.status(404).json({ message: 'Product not found in adjustment' });
        }

        // Calculate the new grandTotal
        const newGrandTotal = adjustment.grandTotal - productToDelete.subtotal;

        // Update the adjustment document
        const updatedAdjustment = await Adjustment.findByIdAndUpdate(
            adjustmentID,
            {
                $pull: { productsData: { currentID: productID } },
                $set: { grandTotal: newGrandTotal },
            },
            { new: true }
        );

        if (updatedAdjustment) {
            console.log('Updated Adjustment after product deletion:', updatedAdjustment);
            res.status(200).json({ message: "Product deleted successfully", adjustment: updatedAdjustment });
        } else {
            res.status(404).json({ message: "Adjustment not found" });
        }
    } catch (error) {
        console.error("Error deleting product from Adjustment:", error);
        res.status(500).json({ message: "An error occurred while deleting the product" });
    }
};

const fetchAdjustments = async (req, res) => {
    const { refferenceId, id } = req.query;
    try {
        // Fetch all adjustments with or without pagination
        if (!refferenceId && !id) {
            if (req.query.page) {
                const size = parseInt(req.query.page.size) || 10; // Default size is 10
                const number = parseInt(req.query.page.number) || 1; // Default page number is 1
                const offset = (number - 1) * size; // Calculate the offset for pagination
                // const sort = req.query.sort || ''; // Handle sorting if provided

                const adjustments = await Adjustment.find()
                    .skip(offset)
                    .limit(size)
                    .sort({ createdAt: -1 })

                if (!adjustments || adjustments.length === 0) {
                    return res.status(404).json({ message: 'No adjustments found' });
                }

                const total = await Adjustment.countDocuments();
                const totalPages = Math.ceil(total / size);

                return res.status(200).json({
                    data: adjustments,
                    total,
                    totalPages,
                    currentPage: number,
                    pageSize: size
                });
            }

            // Fetch all adjustments without pagination
            const adjustments = await Adjustment.find();
            if (!adjustments || adjustments.length === 0) {
                return res.status(404).json({ message: 'No adjustments found' });
            }
            return res.status(200).json(adjustments);
        }

        // Fetch adjustments by reference ID
        if (refferenceId) {
            if (refferenceId.length < 1) {
                return res.status(400).json({ message: 'Please provide at least one character.' });
            }

            const adjustments = await Adjustment.find({
                refferenceId: { $regex: `^${refferenceId}`, $options: 'i' }
            });

            if (!adjustments || adjustments.length === 0) {
                return res.status(404).json({ message: 'No adjustments found for this reference ID.' });
            }
            return res.status(200).json(adjustments);
        }

        // Fetch adjustment by ID for update
        if (id) {
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({ message: 'Invalid adjustment ID format.' });
            }

            const adjustment = await Adjustment.findById(id);
            if (!adjustment) {
                return res.status(404).json({ message: 'Adjustment not found.' });
            }

            // Extract product IDs from the adjustment's `productsData`
            const productIds = adjustment.productsData.map(product => product.currentID);

            // Fetch corresponding base products using product IDs
            const products = await Product.find({ _id: { $in: productIds } });

            // Map and enrich `productsData` with stock quantity
            const updatedProductsData = adjustment.productsData.map(productData => {
                const baseProduct = products.find(p => p._id.toString() === productData.currentID);

                if (baseProduct) {
                    let stockQty = "";

                    // Handle product variations
                    if (baseProduct.variationValues && baseProduct.variationValues.size > 0) {
                        const variation = baseProduct.variationValues.get(productData.variationValue);
                        stockQty = variation ? variation.productQty || "" : "";
                    } else {
                        // Single product stock quantity
                        stockQty = baseProduct.productQty || "";
                    }

                    return {
                        ...productData,
                        stockQty, // Attach stock quantity
                    };
                }

                console.warn(`Base product with currentID ${productData.currentID} not found.`);
                return productData;
            });

            // Combine adjustment with updated product details
            const adjustmentWithUpdatedProducts = {
                ...adjustment.toObject(),
                productsData: updatedProductsData,
            };

            return res.status(200).json(adjustmentWithUpdatedProducts);
        }

        // Invalid query parameters
        return res.status(400).json({ message: 'Invalid query parameters.' });
    } catch (error) {
        console.error('Error handling adjustments:', error);
        return res.status(500).json({ message: 'Internal server error.', error });
    }
};

const searchAdjustment = async (req, res) => {
    const { keyword } = req.query; // Extract the keyword from query parameters

    try {
        if (!keyword) {
            return res.status(400).json({
                status: "error",
                message: "Keyword is required for search."
            });
        }

        // Escape special regex characters in the keyword to prevent regex injection
        const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Build query to search by referenceId or warehouse
        const query = {
            $or: [
                { refferenceId: { $regex: new RegExp(`${escapedKeyword}`, 'i') } }, // Case-insensitive search by referenceId
                { warehouse: { $regex: new RegExp(`${escapedKeyword}`, 'i') } } // Case-insensitive search by warehouse
            ]
        };

        // Fetch adjustments based on the query
        const adjustments = await Adjustment.find(query).populate('productsData.currentID', 'productName productQty');

        if (!adjustments || adjustments.length === 0) {
            return res.status(404).json({
                status: "unsuccess",
                message: "No adjustments found for the provided keyword."
            });
        }

        // Format adjustment data if additional processing is needed
        const formattedAdjustments = adjustments.map((adjustment) => {
            const adjustmentObj = adjustment.toObject();

            return {
                _id: adjustmentObj._id,
                refferenceId: adjustmentObj.refferenceId,
                warehouse: adjustmentObj.warehouse,
                adjustmentDate: adjustmentObj.adjustmentDate,
                totalAmount: adjustmentObj.totalAmount,
                productsData: adjustmentObj.productsData,
                status: adjustmentObj.status,
                date: adjustmentObj.date,
                discount: adjustmentObj.discount,
                discountType: adjustmentObj.discountType,
                grandTotal: adjustmentObj.grandTotal,
                orderStatus: adjustmentObj.grandTotal,
                paidAmount: adjustmentObj.paidAmount,
                paymentStatus: adjustmentObj.paymentStatus,
                paymentType: adjustmentObj.paymentType,
                shipping: adjustmentObj.shipping,
                tax: adjustmentObj.tax,
                createdAt: adjustmentObj.createdAt
                    ? adjustmentObj.createdAt.toISOString().slice(0, 10)
                    : null,
            };
        });

        return res.status(200).json({
            status: "success",
            adjustments: formattedAdjustments
        });
    } catch (error) {
        console.error("Search adjustments error:", error);
        return res.status(500).json({
            status: "error",
            message: error.message
        });
    }
};


module.exports = { createAdjustment, deleteAdjustment, findAdjustmentByIdForUpdate, updateAdjustment, deleteProductFromAdjustment, fetchAdjustments, searchAdjustment }
