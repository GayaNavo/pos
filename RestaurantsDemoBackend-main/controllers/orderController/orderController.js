// controllers/orderController.js  (or wherever it is)

const Order = require("../../models/orderModel");
const mongoose = require("mongoose");
const Product = require("../../models/products/product");
const Settings = require('../../models/settingsModel');
const BOTSettings = require('../../models/botSettingsModel');
const { splitByCategory } = require('../../utils/categoryFilters');
const path = require("path");

const createOrder = async (req, res) => {
    try {
        const { orderType = "dine-in", tableNo, tokenNo, parcelNo, items, totalPrice, kotNote
        } = req.body;

        if (!items?.length || !totalPrice || totalPrice <= 0) {
            return res.status(400).json({ success: false, message: "Invalid order data" });
        }

        // VALIDATE CORRECT FIELD
        if (orderType === "dine-in" && !tableNo?.trim()) {
            return res.status(400).json({ success: false, message: "Table No required" });
        }
        if (orderType === "takeaway" && !tokenNo?.trim()) {
            return res.status(400).json({ success: false, message: "Token No required" });
        }
        if (orderType === "delivery" && !parcelNo?.trim()) {
            return res.status(400).json({ success: false, message: "Parcel No required" });
        }

        const order = new Order({
            orderType,
            tableNo: orderType === "dine-in" ? tableNo.trim() : undefined,
            tokenNo: orderType === "takeaway" ? tokenNo.trim() : undefined,
            parcelNo: orderType === "delivery" ? parcelNo.trim() : undefined,
            items,
            totalPrice,
            kotNote: kotNote || undefined,
            status: "pending"
        });

        const saved = await order.save();

        // LIVE ORDERS DISPLAY
        const displayRef =
            orderType === "dine-in" ? saved.tableNo :
                orderType === "takeaway" ? saved.tokenNo :
                    saved.parcelNo;

        const io = req.app.get('io');
        if (io) {
            io.emit('newOrder', {
                ...saved.toObject(),
                displayRef
            });
        }

        res.status(201).json({ success: true, data: saved, orderId: saved._id });

    } catch (err) {
        console.error("Order creation failed:", err);
        if (err.name === 'ValidationError') {
            const errors = Object.values(err.errors).map(e => e.message);
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors
            });
        }

        if (err.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "Duplicate order detected"
            });
        }

        // Any other error
        return res.status(500).json({
            success: false,
            message: "Failed to create order. Please try again."
        });
    }
};

const deleteOrder = async (req, res) => {
    try {
        const orderId = req.params.id;

        const deletedOrder = await Order.findByIdAndDelete(orderId);

        if (!deletedOrder) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        const io = req.app.get('io');
        if (io) {
            io.emit('orderDeleted', orderId);
        }
        res.json({ success: true, message: 'Order deleted', data: deletedOrder, orderId: orderId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const deleteAllOrders = async (req, res) => {
    try {
        // Delete only PENDING orders
        const result = await Order.deleteMany({ status: "pending" });

        const io = req.app.get('io');
        if (io) {
            io.emit('allOrdersDeleted');
        }

        return res.json({
            success: true,
            message: "All pending orders deleted successfully",
            deletedCount: result.deletedCount
        });

    } catch (err) {
        console.error("Delete all error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

const deleteAllPlceOrders = async (req, res) => {
    try {
        // Delete only PENDING orders
        const result = await Order.deleteMany({ status: "placed" });

        const io = req.app.get('io');
        if (io) {
            io.emit('allOrdersDeleted');
        }

        return res.json({
            success: true,
            message: "All pending orders deleted successfully",
            deletedCount: result.deletedCount,
            clearAll: true
        });

    } catch (err) {
        console.error("Delete all error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

const sanitizeTaxType = (value) => {
    if (!value || value === "0" || value === 0 || value === "null" || value === null || value === undefined || value === "") {
        return "none";
    }
    if (value === "1" || value === 1) return "Inclusive";
    if (value === "2" || value === 2) return "Exclusive";
    if (["Inclusive", "Exclusive", "none"].includes(value)) {
        return value;
    }
    return "none";
};

const updateOrder = async (req, res) => {
    try {
        const orderId = req.params.id;
        const { items, totalPrice, tableNo, tokenNo, parcelNo, orderType } = req.body;

        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ success: false, message: "Order not found" });
        if (order.status !== 'pending') {
            return res.status(400).json({ success: false, message: "Can only update pending orders" });
        }

        // Update items with sanitized taxType
        if (items && Array.isArray(items)) {
            order.items = items.map(item => ({
                ...item,
                taxType: sanitizeTaxType(item.taxType)
            }));
        }

        if (totalPrice !== undefined) order.totalPrice = totalPrice;
        if (orderType) order.orderType = orderType;

        // SMART FIELD ASSIGNMENT
        if (orderType === "dine-in") {
            order.tableNo = tableNo?.trim();
            order.tokenNo = undefined;
        } else if (orderType === "takeaway") {
            order.tableNo = undefined;
            order.tokenNo = tokenNo?.trim();
        } else if (orderType === "delivery") {
            order.tableNo = undefined;
            order.tokenNo = parcelNo?.trim();
        }

        const updatedOrder = await order.save();

        const io = req.app.get('io');
        if (io) {
            const displayRef = orderType === "dine-in" ? order.tableNo
                : orderType === "takeaway" ? order.tokenNo
                    : order.parcelNo;

            io.emit('orderUpdated', {
                ...updatedOrder.toObject(),
                displayRef
            });
        }

        return res.status(200).json({
            success: true,
            message: "Order updated!",
            data: updatedOrder
        });

    } catch (err) {
        console.error("Update order failed:", err);

        if (err.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: "Invalid Order ID format"
            });
        }

        if (err.name === 'ValidationError') {
            const errors = Object.values(err.errors).map(e => e.message).join(', ');
            return res.status(400).json({
                success: false,
                message: "Validation failed: " + errors
            });
        }

        return res.status(500).json({
            success: false,
            message: "Failed to update order. Please try again later."
        });
    }
};

const markOrderAsPlaced = async (req, res) => {
    try {
        const { orderId } = req.body;

        if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({
                success: false,
                message: "Valid orderId is required"
            });
        }

        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        if (order.status !== "pending") {
            return res.status(400).json({
                success: false,
                message: `Order is already ${order.status}`
            });
        }

        order.status = "placed";
        order.placedAt = new Date();
        await order.save();
        const io = req.app.get('io');
        if (io) {
            io.emit('orderUpdated', {
                ...order.toObject(),
                displayRef: order.orderType === "dine-in" ? order.tableNo :
                    order.orderType === "takeaway" ? order.tokenNo :
                        order.parcelNo
            });
        }

        return res.status(200).json({
            success: true,
            message: "Order marked as placed",
            data: order
        });

    } catch (err) {
        console.error("Error marking order as placed:", err);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

const placeOrderAndPrintKOT = async (req, res) => {
    let order = null;

    try {
        const { orderId, items, totalPrice } = req.body;

        if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({
                success: false,
                message: "Valid orderId is required"
            });
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Items array is required"
            });
        }

        // Fetch order
        order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        if (order.status !== "pending") {
            return res.status(400).json({
                success: false,
                message: `Order is already ${order.status}`
            });
        }

        // Update items with sanitized taxType
        order.items = items.map(item => ({
            id: item.id,
            name: item.name,
            ptype: item.ptype,
            offcialProduct: item.offcialProduct,
            stokeQty: item.stokeQty,
            quantity: item.quantity,
            price: item.price,
            productCost: item.productCost,
            tax: item.tax,
            taxType: sanitizeTaxType(item.taxType),
            discount: item.discount,
            specialDiscount: item.specialDiscount || 0,
            isInventory: item.isInventory,
            warehouse: item.warehouse,
            variationType: item.variationType,
            variationValue: item.variationValue,
            subtotal: item.subtotal,
            actualSellingPrice: item.actualSellingPrice,
            kotPrinted: item.kotPrinted,
            originalQty: item.originalQty
        }));

        if (totalPrice !== undefined && totalPrice !== null) {
            order.totalPrice = totalPrice;
        }

        // Mark as placed
        order.status = "placed";
        order.placedAt = new Date();
        await order.save();

        // Fetch settings for bar categories
        const settings = await Settings.findOne();
        const barCategories = settings?.barCategories || ['Bar', 'Beverages', 'Drinks'];

        // Prepare items with category information
        const itemsWithCategory = await Promise.all(
            order.items.map(async (item) => {
                let category = '';
                if (item.id && mongoose.Types.ObjectId.isValid(item.id)) {
                    const product = await Product.findById(item.id).select('category').lean();
                    category = product?.category || '';
                }
                return {
                    name: item.name || "Unknown Item",
                    variation: item.variationValue || "",
                    quantity: item.quantity || 1,
                    subtotal: item.subtotal || 0,
                    category: category
                };
            })
        );

        // Split items by category
        const { barItems, kitchenItems } = splitByCategory(itemsWithCategory, barCategories);

        let kotHtml = '';
        let botHtml = '';

        // Generate KOT for kitchen items
        if (kitchenItems.length > 0) {
            try {
                kotHtml = generateFullKOT({
                    orderType: order.orderType,
                    tableNo: order.tableNo,
                    tokenNo: order.tokenNo,
                    parcelNo: order.parcelNo,
                    products: kitchenItems,
                    kotNote: order.kotNote
                });
            } catch (kotError) {
                console.error("KOT generation failed:", kotError);
            }
        }

        // Generate BOT for bar items
        if (barItems.length > 0) {
            try {
                botHtml = generateFullBOT({
                    orderType: order.orderType,
                    tableNo: order.tableNo,
                    tokenNo: order.tokenNo,
                    parcelNo: order.parcelNo,
                    products: barItems
                });
            } catch (botError) {
                console.error("BOT generation failed:", botError);
            }
        }

        const latestPlacedOrders = await Order.find({ status: 'placed' })
            .sort({ placedAt: -1 })
            .lean();

        if (req.app.get('orderChannel')) {
            req.app.get('orderChannel').postMessage({
                type: 'PLACED_UPDATED',
                placedOrders: latestPlacedOrders,
                placedCount: latestPlacedOrders.length
            });
        }

        const io = req.app.get('io');
        if (io) {
            io.emit('orderPlaced', {
                order: order.toObject(),
                latestPlacedOrders,
                placedCount: latestPlacedOrders.length
            });
        }

        return res.status(200).json({
            success: true,
            message: "Order placed & tickets generated",
            order,
            kotHtml,
            botHtml,
            placedOrders: latestPlacedOrders,
            placedCount: latestPlacedOrders.length
        });

    } catch (error) {
        console.error("Error in placeOrderAndPrintKOT:", error);

        // Rollback if needed
        if (order && order.status === "placed") {
            try {
                order.status = "pending";
                order.placedAt = undefined;
                await order.save();
            } catch (revertErr) {
                console.error("Failed to revert order:", revertErr);
            }
        }

        return res.status(500).json({
            success: false,
            message: "Failed to place order"
        });
    }
};

function generateFullKOT(order) {
    const now = new Date();
    const dateTime = new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Colombo'
    }).format(now).replace(',', '');

    const orderIdentifier = order.orderType === "dine-in"
        ? `Table No: ${order.tableNo || "-"}`
        : `Token No: ${order.tokenNo || order.parcelNo || "-"}`;

    // Safely handle products array
    const productRows = (order.products || []).map(p => `
        <tr>
            <td style="width:50%; overflow-wrap: break-word; padding-bottom:8px; font-size:15px;">
                ${String(p.name || "Item").trim()}
            </td>
            <td style="width:20%; padding-bottom:8px; text-align:center; font-size:14px;">
                ${p.variation ? String(p.variation).charAt(0).toUpperCase() : "-"}
            </td>
            <td style="width:10%; text-align:center; padding-bottom:8px; font-size:16px; font-weight:bold;">
                ${p.quantity || 1}
            </td>
            <td style="width:20%; text-align:right; padding-bottom:8px; font-size:14px;">
                ${Number(p.subtotal || 0).toFixed(2)}
            </td>
        </tr>
    `).join("");

    return `
        <html>
        <head>
            <style>
                @page { size: 80mm auto; margin: 0; }
                body { 
                    font-family: 'Courier New', monospace; 
                    font-size: 13px; 
                    width: 80mm; 
                    margin: 0; 
                    padding: 8px; 
                    line-height: 1.4;
                }
                h3 { 
                    text-align: center; 
                    margin: 5px 0 10px; 
                    font-size: 18px; 
                    font-weight: bold;
                    letter-spacing: 1px;
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-top: 12px; 
                }
                th, td { 
                    font-size: 14px; 
                    padding: 4px 0;
                }
                th { 
                    border-bottom: 2px dashed black; 
                    padding-bottom: 8px;
                    font-weight: bold;
                }
                p { 
                    margin: 6px 0; 
                    text-align: center;
                    font-size: 15px;
                }
                .footer { 
                    text-align: center; 
                    margin-top: 20px; 
                    font-weight: bold;
                    font-size: 16px;
                }
            </style>
        </head>
        <body>
            <h3>Kitchen Order Ticket</h3>
            <p style="font-weight:bold;">${dateTime}</p>
            <p style="font-size:17px; font-weight:bold;">${orderIdentifier}</p>
            
            <table>
                <thead>
                    <tr>
                        <th style="text-align:left;">Item</th>
                        <th style="text-align:center;">Var</th>
                        <th style="text-align:center;">Qty</th>
                        <th style="text-align:right;">Sub</th>
                    </tr>
                </thead>
                <tbody>
                    ${productRows}
                </tbody>
            </table>

            ${order.kotNote ? `<p style="font-size:14px; margin-top:10px; text-align:left;"><strong>Note: </strong>${order.kotNote}</p>` : ''}
            <p class="footer">*** Wait for your order ***</p>
        </body>
        </html>
    `;
}

function generateFullBOT(order) {
    const now = new Date();
    const dateTime = new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Colombo'
    }).format(now).replace(',', '');

    const orderIdentifier = order.orderType === "dine-in"
        ? `Table No: ${order.tableNo || "-"}`
        : `Token No: ${order.tokenNo || order.parcelNo || "-"}`;

    // Safely handle products array
    const productRows = (order.products || []).map(p => `
        <tr>
            <td style="width:50%; overflow-wrap: break-word; padding-bottom:8px; font-size:15px;">
                ${String(p.name || "Item").trim()}
            </td>
            <td style="width:20%; padding-bottom:8px; text-align:center; font-size:14px;">
                ${p.variation ? String(p.variation).charAt(0).toUpperCase() : "-"}
            </td>
            <td style="width:10%; text-align:center; padding-bottom:8px; font-size:16px; font-weight:bold;">
                ${p.quantity || 1}
            </td>
            <td style="width:20%; text-align:right; padding-bottom:8px; font-size:14px;">
                ${Number(p.subtotal || 0).toFixed(2)}
            </td>
        </tr>
    `).join("");

    return `
        <html>
        <head>
            <style>
                @page { size: 80mm auto; margin: 0; }
                body { 
                    font-family: 'Courier New', monospace; 
                    font-size: 13px; 
                    width: 80mm; 
                    margin: 0; 
                    padding: 8px; 
                    line-height: 1.4;
                    background-color: #f8f9fa;
                }
                h3 { 
                    text-align: center; 
                    margin: 5px 0 10px; 
                    font-size: 18px; 
                    font-weight: bold;
                    letter-spacing: 1px;
                    color: #0066cc;
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-top: 12px; 
                }
                th, td { 
                    font-size: 14px; 
                    padding: 4px 0;
                }
                th { 
                    border-bottom: 2px dashed #0066cc; 
                    padding-bottom: 8px;
                    font-weight: bold;
                    color: #0066cc;
                }
                p { 
                    margin: 6px 0; 
                    text-align: center;
                    font-size: 15px;
                }
                .footer { 
                    text-align: center; 
                    margin-top: 20px; 
                    font-weight: bold;
                    font-size: 16px;
                    color: #0066cc;
                }
            </style>
        </head>
        <body>
            <h3>Bar Order Ticket</h3>
            <p style="font-weight:bold;">${dateTime}</p>
            <p style="font-size:17px; font-weight:bold;">${orderIdentifier}</p>
            
            <table>
                <thead>
                    <tr>
                        <th style="text-align:left;">Item</th>
                        <th style="text-align:center;">Var</th>
                        <th style="text-align:center;">Qty</th>
                        <th style="text-align:right;">Sub</th>
                    </tr>
                </thead>
                <tbody>
                    ${productRows}
                </tbody>
            </table>

            <p class="footer">*** Preparing your drinks ***</p>
        </body>
        </html>
    `;
}

const markOrderAsReady = async (req, res) => {
    try {
        const { orderId } = req.body;

        if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({
                success: false,
                message: "Valid orderId is required"
            });
        }

        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        // Toggle: if already ready, set back to placed; otherwise set to ready
        if (order.status === "ready") {
            order.status = "placed";
        } else if (order.status === "placed") {
            order.status = "ready";
        } else {
            return res.status(400).json({
                success: false,
                message: `Cannot mark order as ready. Current status: ${order.status}`
            });
        }

        await order.save();

        const io = req.app.get('io');
        if (io) {
            io.emit('orderStatusChanged', {
                orderId: order._id,
                status: order.status
            });
        }

        return res.status(200).json({
            success: true,
            message: `Order marked as ${order.status}`,
            data: order
        });

    } catch (err) {
        console.error("Error marking order as ready:", err);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

const getPlacedOrderCount = async (req, res) => {
    try {
        const count = await Order.countDocuments({ status: { $in: ['placed', 'ready'] } });
        const orders = await Order.find({ status: { $in: ['placed', 'ready'] } })
            .sort({ placedAt: -1 })
            .select('orderType tableNo tokenNo parcelNo items totalPrice placedAt timestamp createdAt _id status')
            .lean();

        res.json({
            success: true, count: count, orders: orders
        });

    } catch (err) {
        console.error('Error fetching placed orders:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const findProducts = async (req, res) => {
    try {
        const { warehouse, brand, category, keyword, page = 1, limit = 20 } = req.query;
        const settings = await Settings.findOne({});
        const menuType = settings?.menuType || 'local';
        const useForeignPrice = menuType === 'foreign';

        const query = {};

        // Warehouse filter
        if (warehouse) {
            query[`warehouse.${warehouse}`] = { $exists: true };
        }

        // Brand filter
        if (brand) {
            query.brand = brand;
        }

        // Category filter
        if (category) {
            query.category = category;
        }

        // Keyword filter (name OR code)
        if (keyword && keyword.trim() !== "") {
            const escapeRegExp = (str) =>
                str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            const safeKeyword = escapeRegExp(keyword.trim());

            query.$or = [
                { name: { $regex: safeKeyword, $options: "i" } },
                { code: safeKeyword }
            ];
        }

        const pageNumber = Math.max(1, parseInt(page));
        const pageSize = Math.max(1, parseInt(limit));
        const skip = (pageNumber - 1) * pageSize;

        // Fetch filtered products ONLY
        const [products, total] = await Promise.all([
            Product.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(pageSize)
                .lean(),
            Product.countDocuments(query)
        ]);

        if (!products.length) {
            return res.status(200).json({
                status: "No products found",
                products: [],
                total,
                page: pageNumber,
                totalPages: Math.ceil(total / pageSize)
            });
        }

        const formattedProducts = products.map(product => {
            const productObj = { ...product };

            productObj.createdAt = productObj.createdAt
                ? productObj.createdAt.toISOString().slice(0, 10)
                : null;

            if (productObj.warehouse && typeof productObj.warehouse === "object") {
                Object.keys(productObj.warehouse).forEach(wName => {
                    const wh = productObj.warehouse[wName];

                    if (useForeignPrice) {
                        if (wh.foreignPrice != null && wh.foreignPrice > 0) {
                            wh.productPrice = wh.foreignPrice;
                        }
                    }

                    if (wh?.variationValues instanceof Map) {
                        const variationsObj = Object.fromEntries(wh.variationValues);

                        Object.keys(variationsObj).forEach(varKey => {
                            const variation = variationsObj[varKey];
                            if (useForeignPrice) {
                                if (variation.foreignPrice != null && variation.foreignPrice > 0) {
                                    variation.productPrice = variation.foreignPrice;
                                }
                            }
                        });

                        wh.variationValues = variationsObj;
                    } else if (wh?.variationValues && typeof wh.variationValues === 'object') {
                        Object.keys(wh.variationValues).forEach(varKey => {
                            const variation = wh.variationValues[varKey];
                            if (useForeignPrice) {
                                if (variation.foreignPrice != null && variation.foreignPrice > 0) {
                                    variation.productPrice = variation.foreignPrice;
                                }
                            }
                        });
                    }
                });
            }

            productObj.image = productObj.image
                ? `${req.protocol}://${req.get("host")}/uploads/product/${path.basename(productObj.image)}`
                : null;

            return productObj;
        });

        return res.status(200).json({
            status: "Products fetched successfully",
            products: formattedProducts,
            total,
            page: pageNumber,
            totalPages: Math.ceil(total / pageSize)
        });

    } catch (error) {
        console.error("Error finding products:", error);
        return res.status(500).json({
            message: "An error occurred while finding products.",
            error: error.message
        });
    }
};


module.exports = { createOrder, deleteOrder, deleteAllOrders, updateOrder, markOrderAsPlaced, markOrderAsReady, placeOrderAndPrintKOT, getPlacedOrderCount, deleteAllPlceOrders, findProducts };
