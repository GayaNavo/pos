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
const Warehouse = require('../../models/warehouseModel');

const createWarehouse = async (req, res) => {
    const { name, country, location } = req.body;
    const lowercaseName = name?.toLowerCase();

    const missingFields = [];
    if (!name) missingFields.push('name');

    if (missingFields.length > 0) {
        return res.status(400).json({
            status: 'error',
            message: `${missingFields.join(', ')} is required`,
            missingFields,
        });
    }
    try {
        const existingWarehouseByName = await Warehouse.findOne({
            name: { $regex: `^${lowercaseName}$`, $options: 'i' },
        });
        if (existingWarehouseByName) {
            return res.status(400).json({ message: 'Warehouse name already exists' });
        }

        // Save the new warehouse
        const newWarehouse = new Warehouse({
            name: lowercaseName,
            country,
            location,
        });
        await newWarehouse.save();
        return res.status(201).json({ message: 'Warehouse created successfully' });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Duplicate key error: Please ensure unique username, name, or mobile number' });
        }
        console.error('Warehouse not added', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

const UpdateWarehouse = async (req, res) => {
    const { id, name, country, location } = req.body;

    if (!id) {
        return res.status(400).json({ message: 'ID is required' });
    }
    const missingFields = [];
    if (name === undefined) missingFields.push('name');
    if (missingFields.length > 0) {
        return res.status(400).json({
            status: 'error',
            message: `${missingFields.join(', ')} is required`,
            missingFields,
        });
    }

    try {
        // Check if the warehouse exists by ID
        const warehouse = await Warehouse.findById(id);
        if (!warehouse) {
            return res.status(404).json({ message: 'Warehouse not found' });
        }
        const lowercaseName = name?.toLowerCase();
        const existingWarehouseByName = await Warehouse.findOne({
            name: lowercaseName,
            _id: { $ne: id },
        });
        if (existingWarehouseByName) {
            return res.status(400).json({ message: 'Warehouse name already exists' });
        }

        warehouse.name = lowercaseName || warehouse.name;
        warehouse.country = country || warehouse.country;
        warehouse.location = location || warehouse.location;
        await warehouse.save();
        res.status(200).json({ status: 'success', message: 'Warehouse updated successfully' });
    } catch (error) {
        if (error.code === 11000) {
            const duplicateKey = Object.keys(error.keyValue)[0];
            return res.status(400).json({
                message: `Duplicate key error: ${duplicateKey} '${error.keyValue[duplicateKey]}' already exists. Please use a unique value.`,
            });
        }
        console.error('Error updating warehouse:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

const DeleteWarehouse = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({ message: 'ID is required' });
    }
    try {
        const warehouse = await Warehouse.findByIdAndDelete(id);
        if (!warehouse) {
            return res.status(404).json({ message: 'Warehouse not found' })
        }
        res.status(200).json({ message: 'Succesfully deleted the Warehouse' })
    } catch (error) {
        console.error('Delete Warehouse error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const fetchWarehouses = async (req, res) => {
    const { keyword, id } = req.query;
    try {
        if (!keyword && !id) {
            const size = parseInt(req.query?.page?.size) || 10;
            const number = parseInt(req.query?.page?.number) || 1;
            const offset = (number - 1) * size;
            const sort = req.query.sort || '';

            // Handle sorting order (ascending or descending)
            const sortOrder = {};
            if (sort.startsWith('-')) {
                sortOrder[sort.slice(1)] = -1; // Descending order
            } else if (sort) {
                sortOrder[sort] = 1; // Ascending order
            }

            let warehouses;
            if (req.query.page) {
                // Fetch warehouses with pagination
                warehouses = await Warehouse.find()
                    .skip(offset)
                    .limit(size)
                    .sort(sortOrder);
            } else {
                // Fetch all warehouses without pagination
                warehouses = await Warehouse.find();
            }

            if (!warehouses || warehouses.length === 0) {
                return res.status(404).json({ message: 'No warehouses found' });
            }

            const warehouseData = warehouses.map(warehouse => ({
                _id: warehouse._id,
                name: warehouse.name,
                country: warehouse.country,
                createdAt: warehouse.createdAt,
                location: warehouse.location,
            }));

            const totalCount = await Warehouse.countDocuments();
            return res.status(200).json({
                warehouses: warehouseData,
                totalPages: Math.ceil(totalCount / size),
                currentPage: number,
                totalWarehouses: totalCount,
            });
        }

        // Fetch warehouse by ID
        if (id) {
            const warehouse = await Warehouse.findById(id);
            if (!warehouse) {
                return res.status(404).json({ message: 'Warehouse not found' });
            }
            const warehouseData = {
                _id: warehouse._id,
                name: warehouse.name,
                country: warehouse.country,
                createdAt: warehouse.createdAt,
                location: warehouse.location,
            };
            return res.status(200).json(warehouseData);
        }

        // Search warehouse by keyword
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
            const warehouses = await Warehouse.find(query);
            if (!warehouses || warehouses.length === 0) {
                return res.status(404).json({ message: 'No warehouses found' });
            }
            const warehouseData = warehouses.map(warehouse => ({
                _id: warehouse._id,
                name: warehouse.name,
                country: warehouse.country,
                createdAt: warehouse.createdAt,
                location: warehouse.location,
            }));
            return res.status(200).json(warehouseData);
        }

        // Invalid query parameters
        return res.status(400).json({ message: 'Invalid query parameters' });
    } catch (error) {
        console.error('Warehouse fetch error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

const searchWarehouse = async (req, res) => {
    const { keyword } = req.query; // Get keyword from query params

    try {
        if (!keyword) {
            return res.status(400).json({ status: "error", message: "Keyword is required for search." });
        }

        // Escape special regex characters in the keyword
        const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Build query to search by either username, city or name
        const query = {
            $or: [
                { name: { $regex: new RegExp(escapedKeyword, 'i') } }, // Contains in name
                { username: { $regex: new RegExp(escapedKeyword, 'i') } }, // Contains in username
                { city: { $regex: new RegExp(escapedKeyword, 'i') } }  // Contains in city
            ],
        };

        // Fetch warehouses based on the query
        const warehouses = await Warehouse.find(query).limit(20);

        if (!warehouses || warehouses.length === 0) {
            return res.status(404).json({ status: "unsuccess", message: "No warehouses found." });
        }

        // Format the warehouse data
        const formattedWarehouses = warehouses.map((warehouse) => {
            const warehouseObj = warehouse.toObject();

            return {
                _id: warehouseObj._id,
                name: warehouseObj.name,
                country: warehouseObj.country,
                location: warehouseObj.location,
                createdAt: warehouseObj.createdAt
                    ? warehouseObj.createdAt.toISOString().slice(0, 10)
                    : null,
            };
        });

        return res.status(200).json({ status: "success", warehouses: formattedWarehouses });
    } catch (error) {
        console.error("Search warehouses error:", error);
        return res.status(500).json({ status: "error", message: error.message });
    }
};


module.exports = { createWarehouse, DeleteWarehouse, UpdateWarehouse, fetchWarehouses, searchWarehouse };