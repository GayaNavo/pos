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
const Settings = require('../../models/settingsModel');
const path = require('path');
const fs = require('fs');

// Create a new product
const createProduct = async (req, res) => {
    try {
        let image = null;
        const { name, code, brand, category, barcode, unit, saleUnit, purchase, ptype, status, supplier, variation, warehouse, note, isInventory } = req.body;
        let { variationValues } = req.body;

        if (req.file) {
            image = path.join('uploads', req.file.filename);
        }

        // Parse JSON fields if they are strings
        let parsedWarehouse = warehouse;
        if (typeof warehouse === 'string') {
            try {
                parsedWarehouse = JSON.parse(warehouse);
            } catch (error) {
                return res.status(400).json({ message: 'Invalid JSON data provided for warehouse', error: error.message });
            }
        }

        if (typeof variationValues === 'string') {
            try {
                variationValues = JSON.parse(variationValues);
            } catch (error) {
                return res.status(400).json({ message: 'Invalid JSON data provided for variation values', error: error.message });
            }
        }

        // Ensure parsedWarehouse is an object
        if (typeof parsedWarehouse !== 'object' || Array.isArray(parsedWarehouse)) {
            return res.status(400).json({ message: 'Warehouse data should be an object' });
        }

        const existingProductByName = await Product.findOne({ name });
        if (existingProductByName) {
            return res.status(400).json({ message: 'Product name already exists. Please choose a different name.' });
        }

        // Create an array to store missing fields
        let missingFields = [];

        // Check for missing fields and add to the missingFields array
        if (!name) missingFields.push('name');
        if (!code) missingFields.push('code');
        if (!isInventory) missingFields.push('isInventory');
        if (!brand) missingFields.push('brand');
        if (!category) missingFields.push('category');
        if (!saleUnit) missingFields.push('saleUnit');
        if (!ptype) missingFields.push('ptype');
        if (!parsedWarehouse) missingFields.push('warehouse');
        if (!supplier) missingFields.push('supplier');

        if (missingFields.length > 0) {
            return res.status(400).json({
                message: `The following fields are required: ${missingFields.join(', ')}`,
            });
        }

        let warehouseData = {};
        if (ptype === 'Single') {
            Object.keys(parsedWarehouse).forEach(warehouseName => {
                warehouseData[warehouseName] = {
                    productQty: parsedWarehouse[warehouseName].productQty || 0,
                    orderTax: parsedWarehouse[warehouseName].orderTax || 0,
                    productCost: parsedWarehouse[warehouseName].productCost || 0,
                    productPrice: parsedWarehouse[warehouseName].productPrice || 0,
                    foreignPrice: parsedWarehouse[warehouseName].foreignPrice || 0,
                    stockAlert: parsedWarehouse[warehouseName].stockAlert || 0,
                    taxType: parsedWarehouse[warehouseName].taxType || 0,
                    discount: parsedWarehouse[warehouseName].discount || 0,
                    profitMargin: parsedWarehouse[warehouseName].profitMargin || 0,
                };
            });
        } else if (ptype === 'Variation') {
            Object.keys(parsedWarehouse).forEach(warehouseName => {
                warehouseData[warehouseName] = { variationValues: {} };

                Object.keys(parsedWarehouse[warehouseName]).forEach(variationName => {
                    const rawVariation = parsedWarehouse[warehouseName][variationName];
                    // Ensure each field is properly converted to number where needed
                    const variationObj = {
                        productQty: Number(rawVariation.productQty || 0),
                        productCost: Number(rawVariation.productCost || 0),
                        productPrice: Number(rawVariation.productPrice || 0),
                        foreignPrice: Number(rawVariation.foreignPrice || 0),
                        stockAlert: Number(rawVariation.stockAlert || 0),
                        orderTax: Number(rawVariation.orderTax || 0),
                        discount: Number(rawVariation.discount || 0),
                        profitMargin: Number(rawVariation.profitMargin || 0),
                        code: rawVariation.code || "",
                        taxType: rawVariation.taxType || "Exclusive",
                    };
                    warehouseData[warehouseName].variationValues[variationName] = variationObj;
                });
            });
        }

        // Create new product object
        const newProduct = new Product({
            name,
            code,
            brand,
            isInventory,
            category,
            barcode,
            image,
            saleUnit,
            purchase,
            ptype,
            status,
            supplier,
            warehouse: warehouseData,
            variation,
            note
        });

        await newProduct.save();
        return res.status(201).json({ message: 'Product created successfully', product: newProduct });

    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                message: 'Validation error',
                error: error.message,
                details: error.errors,
            });
        } else if (error.code === 11000) {
            return res.status(400).json({
                message: 'Duplicate key error',
                error: error.message,
            });
        } else {
            return res.status(500).json({
                message: 'Server Error',
                error: error.message,
            });
        }
    }
};

// Fetch all products
const findAllProducts = async (req, res) => {
    try {
        // Check if pagination parameters exist
        const pageQuery = req.query.page || {};
        const size = parseInt(pageQuery.size) || 0;
        const number = parseInt(pageQuery.number) || 1;
        const offset = (number - 1) * size;
        const sort = req.query.sort || '';

        // Handle sorting order (ascending or descending)
        const sortOrder = {};
        if (sort.startsWith('-')) {
            sortOrder[sort.slice(1)] = -1;
        } else if (sort) {
            sortOrder[sort] = 1;
        }

        const totalItems = await Product.countDocuments();
        let products;
        if (size > 0) {
            products = await Product.find()
                .sort(sortOrder)
                .skip(offset)
                .limit(size);
        } else {
            products = await Product.find().sort(sortOrder);
        }

        const formattedProducts = products.map(product => ({
            ...product.toObject(),
            createdAt: product.createdAt.toISOString().slice(0, 10),
            variationValues: product.variationValues ? Object.fromEntries(product.variationValues) : {},
            warehouse: product.warehouse ? Object.fromEntries(product.warehouse) : {},
            image: product.image ? `${req.protocol}://${req.get('host')}/uploads/product/${path.basename(product.image)}` : null,
        }));

        const totalPages = size > 0 ? Math.ceil(totalItems / size) : 1;
        return res.status(200).json({
            status: 'Products fetched successfully',
            products: formattedProducts,
            totalItems,
            totalPages,
            currentPage: size > 0 ? number : 1,
        });

    } catch (error) {
        console.error('Error fetching products:', error);
        return res.status(500).json({ status: 'Error fetching products', error: error.message });
    }
};

// Update a product
const updateProduct = async (req, res) => {
    const productId = req.params.id;
    let updatedProduct = req.body;

    try {
        // Retrieve the existing product from the database
        const existingProduct = await Product.findById(productId);
        if (!existingProduct) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Parse JSON fields if they are strings
        let parsedWarehouse = updatedProduct.warehouse;
        if (typeof updatedProduct.warehouse === 'string') {
            try {
                parsedWarehouse = JSON.parse(updatedProduct.warehouse);
            } catch (error) {
                return res.status(400).json({ message: 'Invalid JSON data provided for warehouse', error: error.message });
            }
        }

        let variationValues = updatedProduct.variationValues;
        if (typeof updatedProduct.variationValues === 'string') {
            try {
                variationValues = JSON.parse(updatedProduct.variationValues);
            } catch (error) {
                return res.status(400).json({ message: 'Invalid JSON data provided for variation values', error: error.message });
            }
        }

        // Ensure parsedWarehouse is an object
        if (typeof parsedWarehouse !== 'object' || Array.isArray(parsedWarehouse)) {
            return res.status(400).json({ message: 'Warehouse data should be an object' });
        }

        // Create an array to store missing fields
        let missingFields = [];

        // Check for missing fields and add to the missingFields array
        if (!updatedProduct.name) missingFields.push('name');
        if (!updatedProduct.code) missingFields.push('code');
        if (!updatedProduct.isInventory) missingFields.push('isInventory');
        if (!updatedProduct.brand) missingFields.push('brand');
        if (!updatedProduct.category) missingFields.push('category');
        if (!updatedProduct.saleUnit) missingFields.push('saleUnit');
        if (!updatedProduct.ptype) missingFields.push('ptype');
        if (!parsedWarehouse) missingFields.push('warehouse');
        if (!updatedProduct.supplier) missingFields.push('supplier');

        // If there are missing fields, return an error response with the missing fields
        if (missingFields.length > 0) {
            return res.status(400).json({
                message: `The following fields are required: ${missingFields.join(', ')}`
            });
        }

        // Check for existing product with the same code (excluding the current product)
        const existingProductCode = await Product.findOne({ code: updatedProduct.code, _id: { $ne: productId } });
        if (existingProductCode) {
            return res.status(400).json({ message: 'This product code already exists' });
        }

        const existingProductName = await Product.findOne({ name: updatedProduct.name, _id: { $ne: productId } });
        if (existingProductName) {
            return res.status(400).json({ message: 'This product name already exists' });
        }

        // Prepare warehouse data
        let warehouseData = {};
        if (updatedProduct.ptype === 'Single') {
            // For single type products, each warehouse has its data
            Object.keys(parsedWarehouse).forEach(warehouseName => {
                warehouseData[warehouseName] = {
                    productQty: parsedWarehouse[warehouseName].productQty || 0,
                    orderTax: parsedWarehouse[warehouseName].orderTax || 0,
                    productCost: parsedWarehouse[warehouseName].productCost || 0,
                    productPrice: parsedWarehouse[warehouseName].productPrice || 0,
                    foreignPrice: parsedWarehouse[warehouseName].foreignPrice || 0,
                    stockAlert: parsedWarehouse[warehouseName].stockAlert || 0,
                    taxType: parsedWarehouse[warehouseName].taxType || 0,
                    discount: parsedWarehouse[warehouseName].discount || 0,
                };
            });
        } else if (updatedProduct.ptype === 'Variation') {
            // For variation type products, each warehouse has its variation data
            Object.keys(parsedWarehouse).forEach(warehouseName => {
                warehouseData[warehouseName] = {
                    variationValues: {}
                };

                // Assign variation values to each warehouse
                Object.keys(parsedWarehouse[warehouseName].variationValues).forEach(variationType => {
                    warehouseData[warehouseName].variationValues[variationType] = parsedWarehouse[warehouseName].variationValues[variationType];
                });
            });
        }

        // Handle image update
        if (req.file) {
            const productImagePath = path.join('uploads', req.file.filename);

            // Delete the old image from the product folder
            if (existingProduct.image) {
                const oldImagePath = path.resolve('uploads', 'product', path.basename(existingProduct.image)); // Resolve to old image path
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath); // Remove old image file
                }
            }

            // Set the new image path
            updatedProduct.image = productImagePath;
        } else {
            // Preserve the existing image if no new image is uploaded
            updatedProduct.image = existingProduct.image;
        }

        // Proceed to update the product in the database
        const result = await Product.findByIdAndUpdate(
            productId,
            {
                $set: {
                    name: updatedProduct.name,
                    code: updatedProduct.code,
                    isInventory: updatedProduct.isInventory,
                    brand: updatedProduct.brand,
                    category: updatedProduct.category,
                    image: updatedProduct.image,
                    saleUnit: updatedProduct.saleUnit,
                    ptype: updatedProduct.ptype,
                    supplier: updatedProduct.supplier,
                    warehouse: warehouseData,
                    variation: updatedProduct.variation,
                    note: updatedProduct.note
                }
            },
            { new: true } // Return the updated document
        );

        // Check if the update was successful
        if (!result) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Return the updated product as a response
        return res.status(200).json({ message: 'Product updated successfully', product: result });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                message: 'Validation error',
                error: error.message,
                details: error.errors,
            });
        } else if (error.code === 11000) {
            return res.status(400).json({
                message: 'Duplicate key error',
                error: error.message,
            });
        } else {
            return res.status(500).json({
                message: 'Server Error',
                error: error.message,
            });
        }
    }
};

// Delete a product
const deleteProduct = async (req, res) => {
    const { id } = req.params;
    try {
        // Find the product by ID
        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ status: "Not Found", message: "Product not found" });
        }

        // Delete the associated image file if it exists
        if (product.image) {
            const imagePath = path.resolve('uploads', 'product', path.basename(product.image));
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath); // Remove the image file
            }
        }
        // Delete the product from the database
        await Product.findByIdAndDelete(id);

        res.json({ status: "Success", message: "Product deleted" });
    } catch (err) {
        res.status(400).json({ status: "Unsuccessful", error: err.message });
        console.error("Product not deleted,try again", err);
    }
};

const findProductById = async (req, res) => {
    console.log('Request received at /api/findOneProduct');
    const { keyword, searchType } = req.query;
    const path = require('path');

    try {
        let product;

        if (searchType === 'code') {
            product = await Product.findOne({ code: String(keyword) });
        }
        else {
            product = await Product.findOne({ name: new RegExp(keyword, 'i') });
        }
        if (!product) {
            console.log('Product not found');
            return res.status(404).json({ status: "Not Found", message: "Product not found" });
        }
        product = product.toObject();
        const formatMapToObject = (map) => {
            if (!map) return {};
            return Object.fromEntries(map);
        };

        const formattedProduct = {
            ...product,
            createdAt: product.createdAt.toISOString().slice(0, 10),
            variationValues: formatMapToObject(product.variationValues),
            warehouse: formatMapToObject(product.warehouse),
            image: product.image ? `${req.protocol}://${req.get('host')}/uploads/product/${path.basename(product.image)}` : null,
        };

        res.json({ status: "Success", product: formattedProduct });
    } catch (err) {
        console.error("Product search error:", err);
        res.status(500).json({ status: "Unsuccessful", error: err.message });
    }
};

const searchProducts = async (req, res) => {
    const { keyword } = req.query;
    try {
        if (!keyword) {
            return res.status(400).json({ status: "error", message: "Keyword is required for search." });
        }

        const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const query = {
            $or: [
                { code: { $regex: new RegExp(`${escapedKeyword}`, 'i') } },
                { name: { $regex: new RegExp(`${escapedKeyword}`, 'i') } }
            ],
        };

        const products = await Product.find(query).limit(20);

        if (!products || products.length === 0) {
            return res.status(404).json({ status: "unsuccess", message: "No products found." });
        }

        // Format each product in the array
        const formattedProducts = products.map(product => ({
            ...product.toObject(),
            createdAt: product.createdAt.toISOString().slice(0, 10),
            variationValues: product.variationValues ? Object.fromEntries(product.variationValues) : {},
            warehouse: product.warehouse ? Object.fromEntries(product.warehouse) : {},
            image: product.image ? `${req.protocol}://${req.get('host')}/uploads/product/${path.basename(product.image)}` : null,
        }));

        return res.status(200).json({ status: "success", products: formattedProducts });
    } catch (error) {
        console.error("Search product error:", error);
        return res.status(500).json({ status: "error", message: error.message });
    }
};

const searchProductByName = async (req, res) => {
    const { keyword, warehouse } = req.query;
    const path = require('path');

    try {
        if (!keyword || keyword === "") {
            return res.status(400).json({ status: "error", message: "Keyword is required for search." });
        }

        let finalQuery = {};
        if (keyword !== "*") {
            const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const baseQuery = {
                $or: [
                    { code: { $regex: new RegExp(`${escapedKeyword}`, 'i') } },
                    { name: { $regex: new RegExp(`${escapedKeyword}`, 'i') } }
                ]
            };
            finalQuery = baseQuery;
        }

        if (warehouse) {
            finalQuery = {
                ...finalQuery,
                [`warehouse.${warehouse}`]: { $exists: true }
            };
        }

        const products = await Product.find(finalQuery).limit(50);

        if (!products || products.length === 0) {
            return res.status(404).json({ status: "unsuccess", message: "No products found." });
        }

        // Helper function to properly format Map data
        const formatMapToObject = (map) => {
            if (!map) return {};
            const obj = Object.fromEntries(map);
            for (const key in obj) {
                if (obj[key] && typeof obj[key] === 'object') {
                    if (obj[key] instanceof Map) {
                        obj[key] = Object.fromEntries(obj[key]);
                    }
                    if (obj[key].variationValues instanceof Map) {
                        obj[key].variationValues = Object.fromEntries(obj[key].variationValues);
                    }
                }
            }
            return obj;
        };

        const formattedProducts = products.map(product => {
            const productObj = product.toObject();
            let warehouseData = productObj.warehouse ? formatMapToObject(productObj.warehouse) : {};

            if (warehouse && warehouseData[warehouse]) {
                warehouseData = { [warehouse]: warehouseData[warehouse] };
            }

            return {
                ...productObj,
                createdAt: productObj.createdAt.toISOString().slice(0, 10),
                variationValues: productObj.variationValues ? formatMapToObject(productObj.variationValues) : {},
                warehouse: warehouseData,
                image: productObj.image ? `${req.protocol}://${req.get('host')}/uploads/product/${path.basename(productObj.image)}` : null,
            };
        });

        return res.status(200).json({ status: "success", products: formattedProducts });
    } catch (error) {
        console.error("Search product error:", error);
        return res.status(500).json({ status: "error", message: error.message });
    }
};

const findProductForUpdate = async (req, res) => {
    const { id } = req.params;

    try {

        const product = await Product.findById(id);

        if (!product) {
            return res.status(404).json({ status: "Not Found", message: "Product not found" });
        }
        const productObj = product.toObject();

        // Format the createdAt date to YYYY-MM-DD
        const formattedCreatedAt = productObj.createdAt.toISOString().slice(0, 10);

        // Convert variationValues Map to a regular object
        const formattedVariationValues = {};
        if (productObj.variationValues instanceof Map) {
            productObj.variationValues.forEach((value, key) => {
                formattedVariationValues[key] = value;
            });
        }

        // Convert warehouse Map to a regular object
        const formattedWarehouse = {};
        if (productObj.warehouse instanceof Map) {
            productObj.warehouse.forEach((warehouseData, warehouseName) => {
                formattedWarehouse[warehouseName] = warehouseData;
            });
        }

        // Generate image URL if an image exists
        let imageUrl = null;
        if (productObj.image) {
            imageUrl = `${req.protocol}://${req.get('host')}/uploads/product/${path.basename(productObj.image)}`;
        }

        res.json({
            status: "Success",
            product: {
                _id: productObj._id,
                name: productObj.name,
                isInventory: productObj.isInventory,
                code: productObj.code,
                brand: productObj.brand,
                category: productObj.category,
                barcode: productObj.barcode,
                saleUnit: productObj.saleUnit,
                purchase: productObj.purchase,
                ptype: productObj.ptype,
                status: productObj.status,
                supplier: productObj.supplier,
                warehouse: formattedWarehouse,
                variation: productObj.variation,
                variationType: productObj.variationType || null,
                variationValues: formattedVariationValues,
                note: productObj.note || null,
                productCost: productObj.productCost || 0,
                productPrice: productObj.productPrice || 0,
                productQty: productObj.productQty || 0,
                orderTax: productObj.orderTax || 0,
                taxType: productObj.taxType || 'Exclusive',
                stockAlert: productObj.stockAlert || 0,
                image: imageUrl,
                createdAt: formattedCreatedAt
            }
        });

    } catch (err) {
        console.error("Error fetching product:", err);
        res.status(500).json({ status: "Unsuccessful", error: err.message });
    }
};

module.exports = { findAllProducts, updateProduct, searchProductByName, deleteProduct, createProduct, findProductById, findProductForUpdate, searchProducts }
