

const mongoose = require("mongoose");

// Helper: Auto-fix invalid taxType from frontend
const sanitizeTaxType = (value) => {
    if (!value || value === "0" || value === 0 || value === "null" || value === null || value === undefined || value === "") {
        return "none";
    }
    if (value === "1" || value === 1) return "Inclusive";
    if (value === "2" || value === 2) return "Exclusive";
    if (["Inclusive", "Exclusive", "none"].includes(value)) {
        return value;
    }
    return "none"; // final fallback
};

const ItemSchema = new mongoose.Schema({
    id: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    ptype: { type: String },
    offcialProduct: { type: Boolean, default: true },
    stokeQty: { type: Number },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    productCost: { type: Number },
    tax: { type: Number, default: 0 },
    
    // THIS IS THE FIXED FIELD — NO MORE ERRORS!
    taxType: {
        type: String,
        enum: ["Inclusive", "Exclusive", "none"],
        default: "none",
        set: sanitizeTaxType
    },

    discount: { type: Number, default: 0 },
    isInventory: { type: Boolean, default: false },
    warehouse: { type: String },
    variations: { type: mongoose.Schema.Types.Mixed },
    variationType: { type: String, default: null },
    variationValue: { type: String },
    subtotal: { type: Number, required: true }
});

const OrderSchema = new mongoose.Schema({
    tableNo: { type: String },
    tokenNo: { type: String }, 
    parcelNo: { type: String },
    orderType: { type: String, enum: ["dine-in", "takeaway", "delivery"], default: "dine-in" },
    items: { type: [ItemSchema], required: true },
    totalPrice: { type: Number, required: true },
    kotNote: { type: String },
    timestamp: { type: Date, default: Date.now },
    status: { 
        type: String, 
        enum: ["pending","placed", "ready", "completed", "cancelled"], 
        default: "pending" 
    }
});

// Optional: Index for faster queries
OrderSchema.index({ status: 1, timestamp: -1 });

module.exports = mongoose.model("Order", OrderSchema);