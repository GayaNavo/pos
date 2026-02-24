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

const express = require('express');
const Customer = require('../../models/customerModel');
const mongoose = require('mongoose');

// Creating customer
const createCustomer = async (req, res) => {
    const { name, mobile, address } = req.body;

    // Validate input fields (address is optional)
    if (!name || !mobile) {
        return res.status(400).json({
            message: 'Required fields:  name, and mobile.',
            status: 'fail'
        });
    }

    try {
        const normalizedName = name.trim().toLowerCase();
        const existingCustomer = await Customer.findOne({
            name: { $regex: new RegExp(`^${normalizedName}$`, 'i') }
        });

        if (existingCustomer) {
            return res.status(400).json({
                message: 'Customer Name already exists.',
                status: 'fail'
            });
        }

        // Check if mobile number already exists
        const existingMobileNumberChecking = await Customer.findOne({ mobile });
        if (existingMobileNumberChecking) {
            return res.status(400).json({
                message: 'Mobile Number already exists.',
                status: 'fail'
            });
        }

        // Create new customer
        const newCustomer = new Customer({ name, mobile, address });
        await newCustomer.save();

        // Respond with success message
        return res.status(201).json({
            message: 'Customer created successfully!',
            status: 'success'
        });

    } catch (error) {
        console.error('Error adding customer:', error);

        // Check for specific error types
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                message: 'Validation Error: Please check your input.',
                status: 'fail',
                error: error.message
            });
        }

        // General server error
        return res.status(500).json({
            message: 'Server error. Please try again later.',
            status: 'fail',
            error: error.message
        });
    }
};

const walkInCustomer = async (req, res) => {
    const { name, address, mobile } = req.body;

    // Validate input
    if (!name || !mobile) {
        return res.status(400).json({
            message: 'Name, and Mobile are required.',
            status: 'fail',
        });
    }

    const normalizedName = name.trim().toLowerCase();
    const existingName = await Customer.findOne({
        name: { $regex: new RegExp(`^${normalizedName}$`, 'i') }
    });

    if (existingName) {
        return res.status(400).json({
            message: 'Customer Name already exists.',
            status: 'fail'
        });
    }

    try {
        // Check for duplicate  mobile
        const existingCustomer = await Customer.findOne({ $or: [{ mobile }] });
        if (existingCustomer) {
            return res.status(400).json({
                message: 'Customer with this  Mobile already exists.',
                status: 'fail',
            });
        }

        // Create new walk-in customer
        const newCustomer = new Customer({ name, address, mobile });
        await newCustomer.save();

        return res.status(201).json({
            message: 'Walk-in customer created successfully!',
            status: 'success',
        });
    } catch (error) {
        console.error('Error adding walk-in customer:', error);

        return res.status(500).json({
            message: 'Server error. Please try again later.',
            status: 'fail',
        });
    }
};

// Import customer
const ImportCustomer = async (req, res) => {
    try {
        const customers = req.body.customers;

        if (!Array.isArray(customers) || customers.length === 0) {
            return res.status(400).json({ message: 'Invalid customer data' });
        }

        // 🔹 Normalize and transform data to match schema
        const transformedCustomers = customers.map((customer) => ({
            name: customer.name !== undefined && customer.name !== null
                ? String(customer.name).trim()
                : '',

            mobile: customer.mobile !== undefined && customer.mobile !== null
                ? String(customer.mobile).trim()
                : '',

            // Address is optional — default to empty string if missing
            address: customer.address ? String(customer.address).trim() : ''
        }));

        // 🔹 Validate only name & mobile
        const validatedCustomers = transformedCustomers.filter((customer) => (
            customer.name && customer.mobile
        ));

        if (validatedCustomers.length === 0) {
            console.log('Rejected customers due to missing fields:', JSON.stringify(transformedCustomers, null, 2));
            return res.status(400).json({ message: 'No valid customer records found' });
        }

        // 🔹 Prepare case-insensitive duplicate check for name or exact match for mobile
        const duplicateConditions = validatedCustomers.flatMap((customer) => ([
            { name: { $regex: new RegExp(`^${customer.name}$`, 'i') } }, 
            { mobile: customer.mobile }                                 
        ]));

        // 🔹 Find duplicates in DB
        const existingCustomers = await Customer.find({ $or: duplicateConditions });

        if (existingCustomers.length > 0) {
            const duplicateUsers = existingCustomers.map((customer) => ({
                name: customer.name,
                mobile: customer.mobile
            }));
            console.log('Duplicate customers:', JSON.stringify(duplicateUsers, null, 2));

            return res.status(400).json({
                message: 'Some customers already exist',
                duplicates: duplicateUsers
            });
        }

        // 🔹 Save new customers
        await Customer.insertMany(validatedCustomers);

        return res.status(201).json({ message: 'Customers saved successfully' });

    } catch (error) {
        console.error('Error saving customers:', error.message);
        return res.status(500).json({ message: 'Failed to save customers', error: error.message });
    }
};

//Get details for Update
const getCustomerForUpdate = async (req, res) => {
    const { id } = req.params;
    try {
        const customer = await Customer.findById(id);
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        // Map customer data if necessary
        const customerData = {
            _id: customer._id,
            // username: customer.username,
            name: customer.name,
            // nic: customer.nic,
            mobile: customer.mobile,
            // country: customer.country,
            // city: customer.city,
            address: customer.address,
        };

        return res.status(200).json(customerData);
    } catch (error) {
        console.error('Error fetching customer by ID:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Update the customer details
const UpdateCustomer = async (req, res) => {
    const { id, name, mobile, address } = req.body;

    //  Validate required fields
    if (!id) {
        return res.status(400).json({ message: 'ID is required' });
    }

    if (!name || !mobile) {
        return res.status(400).json({
            message: 'Required fields: name and mobile.',
            status: 'fail'
        });
    }

    //  Validate mobile format
    const mobileRegex = /^0\d{9}$/;
    if (!mobileRegex.test(mobile)) {
        return res.status(400).json({
            message: 'Mobile number must start with "0" and be exactly 10 characters long.',
            status: 'fail'
        });
    }

    try {
        //  Find customer to update
        const customer = await Customer.findById(id);
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found', status: 'fail' });
        }

        //  Case-insensitive name duplicate check, excluding current customer
        const normalizedName = name.trim().toLowerCase();
        const existingCustomerWithName = await Customer.findOne({
            name: { $regex: new RegExp(`^${normalizedName}$`, 'i') },
            _id: { $ne: customer._id }
        });

        if (existingCustomerWithName) {
            return res.status(400).json({
                message: 'Customer Name already exists.',
                status: 'fail'
            });
        }

        //  Check for duplicate mobile, excluding current customer
        const existingUserWithMobile = await Customer.findOne({
            mobile,
            _id: { $ne: customer._id }
        });

        if (existingUserWithMobile) {
            return res.status(400).json({
                message: 'Mobile number already exists.',
                status: 'fail'
            });
        }

        // Update fields
        customer.name = name.trim();
        customer.mobile = mobile.trim();
        customer.address = address ? address.trim() : customer.address;

        await customer.save();

        return res.json({
            status: 'success',
            message: 'Customer updated successfully'
        });

    } catch (error) {
        console.error('Error updating customer:', error);
        return res.status(500).json({
            message: 'Server error. Please try again later.',
            status: 'fail',
            error: error.message
        });
    }
};

//Deleting customer
const DeleteCustomer = async (req, res) => {
    const { id } = req.params;
    try {
        const customer = await Customer.findByIdAndDelete(id);
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' })
        }
        res.status(200).json({ message: 'Succesfully deleted the customer' })
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Search customers by name starting with a given letter
const searchCustomerByName = async (req, res) => {
    const { name } = req.query; // get name from query params
    try {
        if (!name || name.length === 0) {
            return res.status(400).json({ message: 'Name query is required' });
        }
        const customers = await Customer.find({ name: new RegExp(`^${name}`, 'i') }); // find customers whose names start with the given letter

        if (customers.length === 0) {
            return res.status(404).json({ message: 'No customers found' });
        }

        const customerData = customers.map(customer => ({
            _id: customer._id,
            // username: customer.username,
            name: customer.name,
            mobile: customer.mobile,
            // city: customer.city
        }));
        console.log(customerData)
        return res.status(200).json({ customer: customerData });
    } catch (error) {
        console.error('Error fetching customers by name:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};


const searchCustomers = async (req, res) => {
    const { keyword } = req.query; // Get keyword from query params

    try {
        if (!keyword) {
            return res.status(400).json({ status: "error", message: "Keyword is required for search." });
        }
        // Build query to search by either name or username
        const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Build query to search by either name or mobile number
        const query = {
            $or: [
                { name: { $regex: new RegExp(escapedKeyword, 'i') } },
                { mobile: { $regex: new RegExp(escapedKeyword, 'i') } }
            ]
        };
        // Fetch customers based on the query
        const customers = await Customer.find(query).limit(20);

        if (!customers || customers.length === 0) {
            return res.status(404).json({ status: "unsuccess", message: "No customers found." });
        }

        // Format the customer data
        const formattedCustomers = customers.map((customer) => {
            const customerObj = customer.toObject();

            return {
                _id: customerObj._id,
                name: customerObj.name,
                // username: customerObj.username,
                mobile: customerObj.mobile,
                // city: customerObj.city,
                createdAt: customerObj.createdAt
                    ? customerObj.createdAt.toISOString().slice(0, 10)
                    : null,
            };
        });

        return res.status(200).json({ status: "success", customers: formattedCustomers });
    } catch (error) {
        console.error("Search customers error:", error);
        return res.status(500).json({ status: "error", message: error.message });
    }
};

//new combined function
const fetchCustomers = async (req, res) => {
    const { keyword, name, id, page } = req.query; // Extract query parameters
    try {
        let query = {};
        let projection = {};

        // Case 1: Fetch by ID for detailed update
        if (id) {
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({ message: 'Invalid customer ID format.' });
            }

            const customer = await Customer.findById(id);
            if (!customer) {
                return res.status(404).json({ message: 'Customer not found.' });
            }
            return res.status(200).json({
                _id: customer._id,
                // username: customer.username,
                name: customer.name,
                // nic: customer.nic,
                mobile: customer.mobile,
                // country: customer.country,
                // city: customer.city,
                address: customer.address,
            });
        }

        // Case 2: Search by keyword (username, name, city, or mobile)
        // if (keyword) {
        //     if (!isNaN(keyword)) {
        //         query.mobile = Number(keyword);
        //     } else {
        //         query = {
        //             $or: [
        //                 { username: new RegExp(keyword, 'i') },
        //                 { name: new RegExp(keyword, 'i') },
        //                 // { city: new RegExp(keyword, 'i') },
        //             ],
        //         };
        //     }
        // }

        // // Case 3: Search by name (name starts with a specific string)
        // if (name) {
        //     if (name.length === 0) {
        //         return res.status(400).json({ message: 'Name query is required.' });
        //     }
        //     query.name = new RegExp(`${name}`, 'i');
        //     projection = { username: 1, name: 1, mobile: 1, city: 1 }; // Limit fields
        // }

        // Case 4: Fetch all customers (with or without pagination)
        if (!keyword && !name && !id) {
            const size = parseInt(req.query.page?.size) || 10; // Default size is 10
            const number = parseInt(req.query.page?.number) || 1; // Default page number is 1
            const offset = (number - 1) * size; // Calculate offset
            const sort = req.query.sort || ''; // Handle sorting if provided

            // Handle sorting order (ascending or descending)
            const sortOrder = {};
            if (sort.startsWith('-')) {
                sortOrder[sort.slice(1)] = -1; // Descending order
            } else if (sort) {
                sortOrder[sort] = 1; // Ascending order
            }
            // Fetch customers with pagination
            const customers = await Customer.find(query, projection)
                .skip(offset)
                .limit(size)
                .sort(sortOrder);

            const totalCount = await Customer.countDocuments(query); // Total number of customers

            if (!customers || customers.length === 0) {
                return res.status(404).json({ message: 'No customers found.' });
            }

            // Map the customer data for consistency
            const customersData = customers.map(customer => ({
                _id: customer._id,
                username: customer.username,
                name: customer.name,
                // nic: customer.nic || '',
                mobile: customer.mobile || '',
                // country: customer.country,
                // city: customer.city,
                address: customer.address,
                createdAt: customer.createdAt,
            }));

            return res.status(200).json({
                customers: customersData,
                totalPages: Math.ceil(totalCount / size),
                currentPage: number,
                totalCustomers: totalCount,
            });
        } else {
            // Fetch all customers without pagination
            const customers = await Customer.find(query, projection);

            if (!customers || customers.length === 0) {
                return res.status(404).json({ message: 'No customers found.' });
            }

            // Map the customer data for consistency
            const customersData = customers.map(customer => ({
                _id: customer._id,
                username: customer.username,
                name: customer.name,
                // nic: customer.nic || '',
                mobile: customer.mobile || '',
                // country: customer.country,
                // city: customer.city,
                address: customer.address,
                createdAt: customer.createdAt,
            }));

            return res.status(200).json(customersData);
        }
    } catch (error) {
        console.error('Error fetching customers:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

module.exports = {
    createCustomer,
    walkInCustomer,
    DeleteCustomer,
    getCustomerForUpdate,
    UpdateCustomer,
    ImportCustomer,
    searchCustomerByName,
    fetchCustomers,
    searchCustomers
};
