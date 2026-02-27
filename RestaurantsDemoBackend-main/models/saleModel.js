

const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    currentID: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: String, required: true },
    productCost: { type: Number, required: true },
    ptype: { type: String, required: true },
    productCode: { type: String },
    discount: { type: Number },
    specialDiscount: { type: Number },
    variationValue: { type: String },
    quantity: { type: Number, required: true },
    stockQty: { type: Number },
    isInventory: { type: Boolean, required: true },
    taxRate: { type: Number },
    taxType: { type: String },
    subtotal: { type: Number, required: true },
    offcialProduct: { type: Boolean, required: true },
    productProfit: { type: Number, required: true, default: 0 },
    warehouse: { type: String, required: true },
});

const saleSchema = new mongoose.Schema({
    refferenceId: { type: String, required: true, unique: true },
    customer: { type: String },
    date: { type: Date, default: Date.now },
    discountType: { type: String },
    discount: { type: String },
    discountValue: { type: Number },
    grandTotal: { type: Number, required: true },
    pureProfit: { type: Number, required: true, default: 0 },
    orderStatus: { type: String, required: true },
    paymentStatus: { type: String, required: true },
    paymentType: [
        {
            type: { type: String, required: true },
            amount: { type: Number, required: true }
        }
    ],
    paidAmount: { type: Number, default: 0 },
    productsData: { type: [productSchema], required: true },
    shipping: { type: String },
    serviceCharge: { type: String },
    serviceChargeValue: { type: Number, default: 0 },
    serviceChargeType: { type: String, default: 'fixed' },
    tax: { type: String },
    warehouse: { type: String, required: true, default: null },
    offerPercentage: { type: Number, default: 0 },
    cashierUsername: { type: String, default: "unknown" },
    saleType: { type: String, enum: ['POS', 'Non-POS'], required: true },
    invoiceNumber: { type: String, default: null },
    daySaleNumber: { type: Number, required: false },
    returnStatus: { type: Boolean, required: true, default: false },
    cashRegisterKey: { type: String },
    cashRegisterID: { type: String },
    note: { type: String },
    cashBalance: { type: Number, default: 0 },
    orderType: { type: String, enum: ['Normal', 'PickMe', 'Uber'], default: 'Normal' },
},
    { timestamps: true }
);

const Sale = mongoose.model('sale', saleSchema);

module.exports = Sale;
