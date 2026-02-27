

// models/heldProduct.js
const mongoose = require('mongoose');

const heldProductSchema = new mongoose.Schema({
    currentID: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: String, required: true },
    productCost: { type: Number, required: true },
    ptype: { type: String, required: true },
    discount: { type: Number },
    specialDiscount: { type: Number },
    variation: { type: String },
    quantity: { type: Number, required: true },
    stockQty: { type: Number },
    isInventory: { type: Boolean, required: true },
    tax: { type: Number },
    taxRate: { type: String },
    taxType: { type: String },
    subtotal: { type: Number, required: true },
    productProfit: { type: Number, required: true, default: 0 },
    offcialProduct: { type: Boolean, required: true },
    warehouse: { type: String, required: true },
    kotPrinted: { type: Boolean, default: false },
});

const heldProductsSchema = new mongoose.Schema({
    orderType: { type: String, enum: ['dinein', 'takeaway'], required: true },
    tableNo: { type: String },
    tokenNo: { type: String },
    products: [heldProductSchema],
    kotNote: { type: String }
});

const HeldProducts = mongoose.model('HoldProducts', heldProductsSchema);
module.exports = HeldProducts;