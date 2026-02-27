

const PurchaseReturn = require('../../models/purchaseReturnModel')
const Purchase = require('../../models/purchaseModel')
const Product = require('../../models/products/product');
const mongoose = require('mongoose');
const generateReferenceId = require('../../utils/generateReferenceID');
const { isEmpty } = require('lodash')
const { formatToSriLankaTime } = require('../../utils/timeZone');

const returnPurchase = async (req, res) => {
    const date = new Date();

    try {
        const { id, ...returnData } = req.body;

        // 1. Validate basic requirements
        if (isEmpty(returnData.warehouse)) {
            return res.status(400).json({ message: 'Warehouse is required.', status: 'unsuccess' });
        }

        const returnProductsData = returnData.productsData;

        if (!returnProductsData || returnProductsData.length === 0) {
            return res.status(400).json({ message: 'No products to return', status: 'unsuccess' });
        }

        // 2. Verify original purchase exists and is not already returned
        const originalPurchase = await Purchase.findById(id);
        if (!originalPurchase) {
            return res.status(404).json({ message: 'Original purchase not found for return', status: 'unsuccess' });
        }
        
        if (originalPurchase.returnStatus === true) {
            return res.status(400).json({ 
                message: 'This purchase has already been returned', 
                status: 'unsuccess' 
            });
        }

        // 3. Validate all products and quantities BEFORE making any changes
        const productUpdates = [];
        
        for (const product of returnProductsData) {
            const {
                currentID,
                quantity = 0,
                ptype,
                variationValue,
                name,
            } = product;

            // Validate return quantity
            if (quantity <= 0) {
                return res.status(400).json({ 
                    message: `Invalid return quantity for ${name}. Quantity must be greater than 0.`, 
                    status: 'unsuccess' 
                });
            }

            if (!mongoose.Types.ObjectId.isValid(currentID)) {
                return res.status(400).json({ message: `Invalid product ID: ${currentID}`, status: 'unsuccess' });
            }

            const updatedProduct = await Product.findById(currentID);
            if (!updatedProduct) {
                return res.status(404).json({ message: `Product not found with ID: ${currentID}`, status: 'unsuccess' });
            }

            const warehouseKey = returnData.warehouse;
            const SelectedWarehouse = updatedProduct.warehouse.get(warehouseKey);
            if (!SelectedWarehouse) {
                return res.status(404).json({
                    message: `Warehouse ${warehouseKey} not found for product ID: ${currentID}`,
                    status: 'unsuccess',
                });
            }

            // Validate stock availability and prepare updates
            if (ptype === 'Single') {
                if (SelectedWarehouse.productQty < quantity) {
                    return res.status(400).json({
                        message: `Not enough stock for ${name}. Available: ${SelectedWarehouse.productQty}, Requested: ${quantity}`,
                        status: 'unsuccess',
                    });
                }
                productUpdates.push({ product: updatedProduct, type: 'Single', quantity, warehouseKey });
            }
            // Variation product
            else if (ptype === 'Variation') {
                const variation = SelectedWarehouse.variationValues.get(variationValue);
                if (!variation) {
                    return res.status(404).json({
                        message: `Variation ${variationValue} not found for product ${name}`,
                        status: 'unsuccess',
                    });
                }
                if (variation.productQty < quantity) {
                    return res.status(400).json({
                        message: `Not enough stock for variation ${variationValue} of ${name}. Available: ${variation.productQty}, Requested: ${quantity}`,
                        status: 'unsuccess',
                    });
                }
                productUpdates.push({ product: updatedProduct, type: 'Variation', quantity, warehouseKey, variationValue });
            }
            // Invalid type
            else {
                return res.status(400).json({ message: `Invalid product type for product ${name}`, status: 'unsuccess' });
            }
        }

        // 4. All validations passed, now perform database operations
        // Generate reference & prepare return document
        const referenceId = await generateReferenceId('PURCHASE_RETURN');
        returnData.refferenceId = referenceId;
        returnData.date = date;
        returnData.returnType = 'company';

        // Save the return record
        const newPurchaseReturn = new PurchaseReturn(returnData);
        const savedReturn = await newPurchaseReturn.save();

        // Mark original purchase as returned
        originalPurchase.returnStatus = true;
        await originalPurchase.save();

        // Update product quantities
        for (const update of productUpdates) {
            const { product, type, quantity, warehouseKey, variationValue } = update;
            const SelectedWarehouse = product.warehouse.get(warehouseKey);

            if (type === 'Single') {
                SelectedWarehouse.productQty -= quantity;
            } else if (type === 'Variation') {
                const variation = SelectedWarehouse.variationValues.get(variationValue);
                variation.productQty -= quantity;
                product.markModified(`warehouse.${warehouseKey}.variationValues`);
            }

            await product.save();
        }

        // 5. Success
        res.status(201).json({
            message: 'Purchase return saved successfully',
            purchaseReturn: savedReturn,
        });
    } catch (error) {
        console.error('Error processing purchase return:', error);
        const message = error.message || 'Failed to process purchase return';
        res.status(500).json({ message, status: 'unsuccess', error });
    }
};

const fetchAllPurchaseReturns = async (req, res) => {
    try {
        const size = parseInt(req.query?.page?.size) || 10;
        const number = parseInt(req.query?.page?.number) || 1;
        const offset = (number - 1) * size;

        let purchaseReturns;
        let total = 0;
        let totalPages = 0;

        if (req.query?.page) {
            purchaseReturns = await PurchaseReturn.find()
                .sort({ createdAt: -1 })
                .skip(offset)
                .limit(size);

            if (!purchaseReturns || purchaseReturns.length === 0) {
                return res.status(404).json({ message: "No purchase returns found." });
            }

            total = await PurchaseReturn.countDocuments();
            totalPages = Math.ceil(total / size);
        } else {
            purchaseReturns = await PurchaseReturn.find();
        }

        // Attach formatted date but remove original `date`
        const formattedReturns = purchaseReturns.map(pr => {
            const obj = pr.toObject();
            const { date, ...rest } = obj;
            return {
                ...rest,
                date: formatToSriLankaTime(date)
            };
        });

        return res.status(200).json({
            message: req.query?.page
                ? 'Purchase returns fetched successfully with pagination'
                : 'Purchase returns fetched successfully',
            data: formattedReturns,
            ...(req.query?.page && {
                total,
                totalPages,
                currentPage: number,
                pageSize: size
            })
        });
    } catch (error) {
        console.error('Error fetching purchase returns:', error);
        res.status(500).json({ message: 'Failed to fetch purchase returns', error });
    }
};

const deletePurchaseReturn = async (req, res) => {
    try {
        const purchaseReturnId = req.params.id;
        const deletedPurchaseReturn = await PurchaseReturn.findByIdAndDelete(purchaseReturnId);
        if (!deletedPurchaseReturn) {
            return res.status(404).json({
                message: 'Purchase return not found',
            });
        }
        res.status(200).json({
            message: 'Purchase return deleted successfully',
            purchaseReturn: deletedPurchaseReturn,
        });
    } catch (error) {
        console.error('Error deleting purchase return:', error);
        res.status(500).json({ message: 'Failed to delete purchase return', error });
    }
};

const findPurchaseReturnById = async (req, res) => {
    const { id } = req.params;

    // Validate the purchase ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid purchase ID format' });
    }

    try {
        // Find the purchase by ID
        const purchase = await PurchaseReturn.findById(id).lean();
        if (!purchase) {
            return res.status(404).json({ message: 'Purchase not found' });
        }

        // Extract product IDs from the purchase's productsData
        const productIds = purchase.productsData.map(product => product.currentID);

        // Fetch corresponding base products using product IDs
        const products = await Product.find({ _id: { $in: productIds } }).lean();

        // Map through the purchase's productsData and attach the base product details (including stock quantities)
        const updatedProductsData = purchase.productsData.map(productData => {
            const baseProduct = products.find(p => p._id.toString() === productData.currentID);
            const ptype = baseProduct.ptype

            const warehouseKey = purchase.warehouse;
            if (baseProduct) {
                let stockQty = "";

                const selectedWarehouse = baseProduct.warehouse[warehouseKey];
                if (!selectedWarehouse) {
                    console.error(`Warehouse ${warehouseKey} not found for product with ID: ${baseProduct._id}`);
                    return {
                        ...productData,
                        stockQty: "N/A",
                        ptype
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
                    // For single products, directly assign stock quantity from base product
                    stockQty = selectedWarehouse.productQty || "";
                }

                // Log the stock quantity for debugging
                console.log(`Product ID: ${productData.currentID}, Stock Quantity: ${stockQty}`);

                // Return product data with the attached stock quantity
                return {
                    ...productData,
                    stockQty,
                    ptype
                };
            }

            // Return original product data if no base product found
            return {
                ...productData,
                stockQty,
                ptype: "N/A"
            };
        });

        const { date, ...purchaseWithoutDate } = purchase;
        const formattedDate = formatToSriLankaTime(purchase.date);

        const purchaseWithUpdatedProducts = {
            ...purchase,
            date: formattedDate,
            productsData: updatedProductsData
        };

        // Send the updated purchase data
        res.status(200).json(purchaseWithUpdatedProducts);

    } catch (error) {
        console.error('Error finding purchase by ID:', error);
        res.status(500).json({ message: 'Error fetching purchase by ID', error: error.message });
    }
};

const updatePurchaseReturn = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    const date = new Date();
    try {
        const purchaseReturnId = req.params.id;
        const updateData = req.body;

        // Validate that the purchase return ID is valid
        if (!mongoose.Types.ObjectId.isValid(purchaseReturnId)) {
            return res.status(400).json({ message: 'Invalid purchase return ID format' });
        }

        // Fetch the existing purchase return document
        const existingPurchaseReturn = await PurchaseReturn.findById(purchaseReturnId);
        if (!existingPurchaseReturn) {
            return res.status(404).json({ message: 'Purchase return not found' });
        }

        // Validate necessary fields
        if (isEmpty(updateData.warehouse)) {
            return res.status(400).json({ message: 'Warehouse is required.', status: 'unsuccess' });
        }

        // Extract product data to update the stock
        const productsData = updateData.productsData;

        // Prepare update promises for product quantities
        const updatePromises = productsData.map(async (product) => {
            const { currentID, quantity, ptype, variationValue } = product;

            // Validate the current ID
            if (!mongoose.Types.ObjectId.isValid(currentID)) {
                return Promise.reject({ message: `Invalid product ID: ${currentID}`, status: 'unsuccess' });
            }

            // Extract existing purchase quantity from the existing purchase return
            const existingProductData = existingPurchaseReturn.productsData.find(p => p.currentID === currentID);
            const existingPurchaseQty = existingProductData ? Number(existingProductData.quantity) : 0;

            // Update logic based on product type
            if (ptype === 'Single') {
                const updatedProduct = await Product.findById(currentID);
                if (!updatedProduct) {
                    return Promise.reject({ message: `Product not found with ID: ${currentID}`, status: 'unsuccess' });
                }

                const warehouseKey = existingPurchaseReturn.warehouse;
                const SelectedWarehouse = updatedProduct.warehouse.get(warehouseKey);

                if (!SelectedWarehouse) {
                    return Promise.reject({ message: `Warehouse ${warehouseKey} not found for product with ID: ${currentID}`, status: 'unsuccess' });
                }

                // Calculate the new stock quantity
                const newStockQty = SelectedWarehouse.productQty - existingPurchaseQty + quantity;
                if (newStockQty < 1) {
                    return Promise.reject({ message: `Stock quantity cannot be less than 1 for product with ID: ${currentID}`, status: 'unsuccess' });
                }

                // Update the stock quantity
                SelectedWarehouse.productQty = newStockQty;
                await updatedProduct.save();
                return updatedProduct;
            } else if (ptype === 'Variation') {
                const updatedProduct = await Product.findById(currentID);
                if (!updatedProduct) {
                    return Promise.reject({ message: `Product not found with ID: ${currentID}`, status: 'unsuccess' });
                }

                const warehouseKey = existingPurchaseReturn.warehouse;
                const SelectedWarehouse = updatedProduct.warehouse.get(warehouseKey);

                if (!SelectedWarehouse) {
                    return Promise.reject({ message: `Warehouse ${warehouseKey} not found for product with ID: ${currentID}`, status: 'unsuccess' });
                }

                const variation = SelectedWarehouse.variationValues.get(variationValue);

                if (!variation) {
                    return Promise.reject({ message: `Variation ${variationValue} not found for product with ID: ${currentID}`, status: 'unsuccess' });
                }

                // Calculate the new stock quantity for the variation
                const newVariationStockQty = variation.productQty - existingPurchaseQty + quantity;
                if (newVariationStockQty < 1) {
                    return Promise.reject({ message: `Stock quantity cannot be less than 1 for variation ${variationValue} of product with ID: ${currentID}`, status: 'unsuccess' });
                }

                // Update the quantity of the variation
                variation.productQty = newVariationStockQty;
                updatedProduct.markModified(`warehouse.${warehouseKey}.variationValues`);
                await updatedProduct.save();
                return updatedProduct;
            } else {
                return Promise.reject({ message: `Invalid product type for product with ID: ${currentID}`, status: 'unsuccess' });
            }
        });

        // Wait for all product updates to complete
        await Promise.all(updatePromises);

        // Only update the fields that are sent from the frontend
        const updatedFields = {
            ...updateData,
            date: date,
        };

        // Update the purchase return document
        const updatedPurchaseReturn = await PurchaseReturn.findByIdAndUpdate(
            purchaseReturnId,
            updatedFields,
            { new: true, runValidators: true }
        );

        await session.commitTransaction();
        res.status(200).json({
            message: 'Purchase return updated successfully.',
            purchaseReturn: updatedPurchaseReturn,
        });
    } catch (error) {
        console.error('Error updating purchase return:', error);
        await session.abortTransaction();
        res.status(500).json({ message: 'Failed to update purchase return', error: error.message });
    } finally {
        session.endSession();
    }
};

const fetchPurchaseReturns = async (req, res) => {
    const { keyword } = req.query;

    try {
        let purchaseReturns;

        if (keyword) {

            let purchaseReturn;
            if (/^\d+$/.test(keyword)) {
                purchaseReturn = await PurchaseReturn.findOne({ refferenceId: keyword });
            } else if (mongoose.Types.ObjectId.isValid(keyword)) {
                purchaseReturn = await PurchaseReturn.findById(keyword);
            } else {
                purchaseReturns = await PurchaseReturn.find({
                    customer: { $regex: `^${keyword}`, $options: 'i' }
                });

                if (purchaseReturns.length === 0) {
                    return res.status(404).json({ message: 'No purchase returns found for this customer' });
                }

                return res.status(200).json(purchaseReturns);
            }

            if (purchaseReturn) {
                const productIds = purchaseReturn.productsData.map(product => product.currentID);
                const products = await Product.find({ _id: { $in: productIds } });

                const updatedProductsData = purchaseReturn.productsData.map(productData => {
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

                purchaseReturns = {
                    ...purchaseReturn.toObject(),
                    productsData: updatedProductsData
                };

                return res.status(200).json(purchaseReturns);
            }
        }

        // If no keyword, fetch all purchase returns
        purchaseReturns = await PurchaseReturn.find();
        return res.status(200).json({
            message: 'Purchase returns fetched successfully',
            purchaseReturns
        });

    } catch (error) {
        console.error('Error fetching purchase returns:', error);
        res.status(500).json({ message: 'Failed to fetch purchase returns', error });
    }
};

const removeProductFromPurchaseReturn = async (req, res) => {
    const { id, currentID } = req.body;
    if (!id || !currentID) {
        return res.status(400).json({ message: 'Both purchase return ID and product currentID are required' });
    }

    try {
        const purchaseReturn = await PurchaseReturn.findById(id);

        if (!purchaseReturn) {
            return res.status(404).json({ message: 'Purchase return not found' });
        }
        const productIndex = purchaseReturn.productsData.findIndex(
            product => product.currentID === currentID
        );

        if (productIndex === -1) {
            return res.status(404).json({ message: 'Product not found in purchase return' });
        }
        const [removedProduct] = purchaseReturn.productsData.splice(productIndex, 1);

        purchaseReturn.grandTotal -= removedProduct.subtotal;
        await purchaseReturn.save();

        res.status(200).json({
            message: 'Product removed successfully',
            updatedPurchaseReturn: purchaseReturn,
        });
    } catch (error) {
        console.error('Error removing product from purchase return:', error);
        res.status(500).json({
            message: 'Failed to remove product from purchase return',
            error: error.message,
        });
    }
};

const searchPurchaseReturns = async (req, res) => {
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
                { customer: { $regex: new RegExp(`${escapedKeyword}`, 'i') } },
                { refferenceId: { $regex: new RegExp(`${escapedKeyword}`, 'i') } }
            ]
        };

        // Fetch purchase returns based on the query
        const purchaseReturns = await PurchaseReturn.find(query).populate('productsData.currentID', 'productName productQty');

        if (!purchaseReturns || purchaseReturns.length === 0) {
            return res.status(404).json({
                status: "unsuccess",
                message: "No purchase returns found for the provided keyword."
            });
        }

        // Format purchase return data if additional processing is needed
        const formattedPurchaseReturns = purchaseReturns.map((purchaseReturn) => {
            const returnObj = purchaseReturn.toObject();

            return {
                _id: returnObj._id,
                refferenceId: returnObj.refferenceId,
                customer: returnObj.customer,
                returnDate: returnObj.returnDate,
                totalAmount: returnObj.totalAmount,
                productsData: returnObj.productsData,
                paidAmount: returnObj.paidAmount,
                grandTotal: returnObj.grandTotal,
                date: formatToSriLankaTime(returnObj.date),
                warehouse: returnObj.warehouse,
                returnType: returnObj.returnType,
                createdAt: returnObj.createdAt
                    ? returnObj.createdAt.toISOString().slice(0, 10)
                    : null,
            };
        });

        return res.status(200).json({
            status: "success",
            purchaseReturns: formattedPurchaseReturns
        });
    } catch (error) {
        console.error("Search purchase returns error:", error);
        return res.status(500).json({
            status: "error",
            message: error.message
        });
    }
};

module.exports = { returnPurchase, fetchAllPurchaseReturns, deletePurchaseReturn, updatePurchaseReturn, fetchPurchaseReturns, findPurchaseReturnById, removeProductFromPurchaseReturn, searchPurchaseReturns };