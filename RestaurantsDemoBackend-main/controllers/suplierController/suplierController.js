

const express = require('express');
const Suplier = require('../../models/suplierModel');
const mongoose = require('mongoose');
const multer = require('multer');
const XLSX = require('xlsx');

// Set up multer to store file in memory (without saving to disk)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage }).single('file');

//Creating Suplier
const createSuplier = async (req, res) => {
    const { name, companyName, mobile } = req.body;

    // Validate input fields
    if (!name) {
        return res.status(400).json({
            message: 'All fields are required. Please provide  name',
            status: 'fail'
        });
    }

    try {
        const existingSuplier = await Suplier.findOne({
            name: { $regex: new RegExp(`^${name}$`, 'i') }
        });

        if (existingSuplier) {
            return res.status(400).json({ message: 'Supplier already exists', status: 'fail' });
        }

        if (mobile && mobile.trim() !== "") {
            const mobileRegex = /^0\d{9}$/;
            if (!mobileRegex.test(mobile)) {
                return res.status(400).json({
                    message: 'Mobile number must start with 0 and be exactly 10 digits long.',
                    status: 'fail'
                });
            }
            const existingMobileNumberChecking = await Suplier.findOne({ mobile });
            if (existingMobileNumberChecking) {
                return res.status(400).json({
                    message: 'Mobile number already exists',
                    status: 'fail'
                });
            }
        }

        // Store mobile as undefined if empty to work with sparse index
        const mobileValue = mobile && mobile.trim() !== "" ? mobile : undefined;
        const newSuplier = new Suplier({ name, companyName, mobile: mobileValue });
        await newSuplier.save();
        return res.status(201).json({ message: 'Supplier created successfully', status: 'success' });

    } catch (error) {
        console.error('Supplier not added:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                message: 'Validation Error: Please check your input.',
                status: 'fail',
                error: error.message
            });
        }

        if (error.code === 11000) {
            return res.status(400).json({
                message: 'Duplicate Error: Some unique fields already exist.',
                status: 'fail',
                error: error.message
            });
        }
        return res.status(500).json({
            message: 'Server error. Please try again later.',
            status: 'fail',
            error: error.message
        });
    }
};

//Import suplier
const ImportSuplier = async (req, res) => {
    try {
        const { suppliers } = req.body;

        if (!Array.isArray(suppliers) || suppliers.length === 0) {
            return res.status(400).json({ message: 'No valid supplier data provided' });
        }

        // Transform and validate data
        const validatedSuppliers = [];

        suppliers.forEach((supplier) => {
            const name = supplier.name?.toString().trim();
            const companyName = supplier.companyName?.toString().trim();
            const mobile = supplier.mobile?.toString().trim();

            // Validate name
            if (!name) {
                return;
            }

            // Validate mobile number (local format 0xxxxxxxxx)
            if (!/^0\d{9}$/.test(mobile)) {
                return;
            }

            validatedSuppliers.push({ name, companyName, mobile });
        });

        if (validatedSuppliers.length === 0) {
            return res.status(400).json({ message: 'No valid supplier records found' });
        }

        // Check for duplicates in the database
        const existingSuppliers = await Suplier.find({
            mobile: { $in: validatedSuppliers.map(s => s.mobile) }
        });

        if (existingSuppliers.length > 0) {
            const duplicates = existingSuppliers.map(s => ({ name: s.name, mobile: s.mobile }));
            return res.status(400).json({
                message: 'Some suppliers already exist',
                duplicates
            });
        }

        // Save valid suppliers to the database
        const newSuppliers = await Suplier.insertMany(validatedSuppliers);

        res.status(201).json({
            message: 'Suppliers imported successfully',
            newSuppliers
        });

    } catch (error) {
        console.error('Unexpected error:', error);
        res.status(500).json({ message: 'Unexpected error occurred', error: error.message });
    }
};

//Update the suplier details
const UpdateSuplier = async (req, res) => {
    const { id, name, companyName, mobile } = req.body;
    if (!id) {
        return res.status(400).json({ message: 'ID is required' });
    }
    // Remove address from required fields
    if (!name) {
        return res.status(400).json({
            message: 'All fields are required. Please provide  name'
        });
    }
    //  Mobile validation: must start with 0 and be exactly 10 digits
    const mobileRegex = /^0\d{9}$/;
    if (mobile && !mobileRegex.test(mobile)) {
        return res.status(400).json({
            message: 'Mobile number must start with "0" and be exactly 10 digits.',
            status: 'fail'
        });
    }

    try {
        const suplier = await Suplier.findById(id);
        if (!suplier) {
            return res.status(404).json({ message: 'Suplier not found' });
        }

        const existingSuplier = await Suplier.findOne({ name, _id: { $ne: id } });
        if (existingSuplier) {
            return res.status(400).json({ message: 'Name already in use' });
        }

        const existingUserWithMobile = await Suplier.findOne({ mobile, _id: { $ne: suplier._id } });
        if (existingUserWithMobile) {
            return res.status(400).json({ message: 'Mobile number already exists' });
        }

        if (mobile && mobile.trim() !== "") {
            const mobileRegex = /^0\d{9}$/;
            if (!mobileRegex.test(mobile)) {
                return res.status(400).json({
                    message: 'Mobile number must start with "0" and be exactly 10 digits.',
                    status: 'fail'
                });
            }
            const existingUserWithMobile = await Suplier.findOne({ mobile, _id: { $ne: suplier._id } });
            if (existingUserWithMobile) {
                return res.status(400).json({ message: 'Mobile number already exists', status: 'fail' });
            }

            suplier.mobile = mobile;
        } else {
            suplier.mobile = "";
        }

        suplier.name = (typeof name !== "undefined") ? name : suplier.name;
        suplier.companyName = (typeof companyName !== "undefined") ? companyName : suplier.companyName;
        await suplier.save();
        res.json({ status: 'success', message: 'Suplier updated successfully' });
    } catch (error) {
        console.error('Error updating Supplier:', error);
        res.status(500).json({
            message: 'Server error. Please try again later.',
            status: 'fail',
            error: error.message
        });
    }
};

//Deleting suplier
const DeleteSuplier = async (req, res) => {
    const { id } = req.params;

    try {
        const suplier = await Suplier.findByIdAndDelete(id);
        if (!suplier) {
            return res.status(404).json({ message: 'Supplier not found', status: 'fail' });
        }

        res.status(200).json({ message: 'Successfully deleted the Supplier', status: 'success' });
    } catch (error) {
        console.error('Delete Supplier error:', error);

        // General server error
        res.status(500).json({ message: 'Server error. Please try again later.', status: 'fail', error: error.message });
    }
};

// //Fetch Suplier
const fetchSupplier = async (req, res) => {
    const { keyword, id, customerName } = req.query;

    try {
        // Handle fetching all suppliers with or without pagination
        if (!keyword && !id && !customerName) {
            const size = parseInt(req.query?.page?.size) || 10; // Default size is 10
            const number = parseInt(req.query?.page?.number) || 1; // Default page number is 1

            const offset = (number - 1) * size; // Calculate the offset for pagination
            const sort = req.query.sort || ''; // Handle sorting if provided

            // Handle sorting order (ascending or descending)
            const sortOrder = {};
            if (sort.startsWith('-')) {
                sortOrder[sort.slice(1)] = -1; // Descending order
            } else if (sort) {
                sortOrder[sort] = 1; // Ascending order
            }

            let suppliers;
            if (req.query.page) {
                // Fetch users with pagination
                suppliers = await Suplier.find()
                    .skip(offset)
                    .limit(size)
                    .sort(sort);

            } else {
                // Fetch all suppliers without pagination
                suppliers = await Suplier.find();
            }

            if (!suppliers || suppliers.length === 0) {
                return res.status(404).json({ message: 'No suppliers found' });
            }

            const supplierData = suppliers.map(supplier => ({
                _id: supplier._id,
                // username: supplier.username,
                name: supplier.name,
                companyName: supplier.companyName,
                mobile: supplier.mobile,
                // address: supplier.address,
                createdAt: supplier.createdAt,
            }));

            const totalCount = await Suplier.countDocuments(); // Total number of users

            return res.status(200).json({
                suppliers: supplierData,
                totalPages: Math.ceil(totalCount / size),
                currentPage: number,
                totalSuppliers: totalCount,
            });
        }

        // Handle "Find by Keyword"
        if (keyword) {
            let query = {};
            if (!isNaN(keyword)) {
                query.mobile = Number(keyword);
            } else {
                query = {
                    $or: [
                        { username: new RegExp(keyword, 'i') },
                        { name: new RegExp(keyword, 'i') },
                        { city: new RegExp(keyword, 'i') },
                    ],
                };
            }
            const suppliers = await Suplier.find(query);
            if (!suppliers || suppliers.length === 0) {
                return res.status(404).json({ message: 'No suppliers found' });
            }
            const supplierData = suppliers.map(supplier => ({
                _id: supplier._id,
                // username: supplier.username,
                name: supplier.name,
                companyName: supplier.companyName,
                mobile: supplier.mobile,
                // address: supplier.address,
                createdAt: supplier.createdAt,
            }));
            return res.status(200).json(supplierData);
        }

        // Handle "Get by ID for Update"
        if (id) {
            const supplier = await Suplier.findById(id);
            if (!supplier) {
                return res.status(404).json({ message: 'Supplier not found' });
            }
            const supplierData = {
                _id: supplier._id,
                // username: supplier.username,
                name: supplier.name,
                companyName: supplier.companyName,
                mobile: supplier.mobile,
                // address: supplier.address,
            };
            return res.status(200).json(supplierData);
        }

        // Handle "Search by Name"
        if (customerName) {
            const suppliers = await Suplier.find({
                name: new RegExp(`^${customerName}`, 'i'),
            });
            if (!suppliers || suppliers.length === 0) {
                return res.status(404).json({ message: 'No suppliers found' });
            }
            const supplierData = suppliers.map(supplier => ({
                _id: supplier._id,
                // username: supplier.username,
                name: supplier.name,
                mobile: supplier.mobile,
                // city: supplier.city,
            }));
            return res.status(200).json(supplierData);
        }

        return res.status(400).json({ message: 'Invalid query parameters' });
    } catch (error) {
        console.error('Error handling supplier request:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

const searchSuppliers = async (req, res) => {
    const { keyword } = req.query; // Get keyword from query params

    try {
        if (!keyword) {
            return res.status(400).json({ status: "error", message: "Keyword is required for search." });
        }

        // Escape special regex characters in the keyword
        const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Build query to search by either name or username
        const query = {
            $or: [
                { name: { $regex: new RegExp(escapedKeyword, 'i') } }, // Contains in name
                // { username: { $regex: new RegExp(escapedKeyword, 'i') } }  // Contains in username
            ],
        };

        // Fetch suppliers based on the query
        const suppliers = await Suplier.find(query).limit(20);

        if (!suppliers || suppliers.length === 0) {
            return res.status(404).json({ status: "unsuccess", message: "No suppliers found." });
        }

        // Format the supplier data
        const formattedSuppliers = suppliers.map((supplier) => {
            const supplierObj = supplier.toObject();

            return {
                _id: supplierObj._id,
                name: supplierObj.name,
                // username: supplierObj.username,
                mobile: supplierObj.mobile,
                // city: supplierObj.city,
                createdAt: supplierObj.createdAt
                    ? supplierObj.createdAt.toISOString().slice(0, 10)
                    : null,
            };
        });

        return res.status(200).json({ status: "success", suppliers: formattedSuppliers });
    } catch (error) {
        console.error("Search suppliers error:", error);
        return res.status(500).json({ status: "error", message: error.message });
    }
};

module.exports = { createSuplier, DeleteSuplier, UpdateSuplier, ImportSuplier, fetchSupplier, searchSuppliers };