// models/receiptSettingsModel.js
const mongoose = require('mongoose');

const receiptSettingsSchema = new mongoose.Schema({
  // Header Section
  header: {
    enabled: { type: Boolean, default: true },
    fields: [{
      name: { 
        type: String, 
        required: true,
        enum: [
          // Company Info
          'logo', 'companyName', 'companyAddress', 'companyMobile', 'companyEmail', 'whatsappNumber',
          // Sale Info
          'outlet', 'cashier', 'invoiceNumber', 'kot', 'date', 'customer', 'saleNumber'
        ] 
      },
      label: { type: String, required: true },
      enabled: { type: Boolean, default: true },
      position: { type: Number, required: true },
      section: { type: String, default: 'company' },
      icon: { type: String, default: '' }
    }]
  },

  // Body Section - Products Table Columns
  body: {
    enabled: { type: Boolean, default: true },
    columns: [{
      name: { 
        type: String, 
        required: true,
        enum: [
          'productName', 'productCode', 'size', 'price', 'quantity', 'subtotal', 'discount', 'tax'
        ] 
      },
      label: { type: String, required: true },
      enabled: { type: Boolean, default: true },
      position: { type: Number, required: true },
      icon: { type: String, default: '' }
    }]
  },

  // Summary Section
  summary: {
    enabled: { type: Boolean, default: true },
    fields: [{
      name: { 
        type: String, 
        required: true,
        enum: [
          'subtotal', 'discount', 'tax', 'shipping', 'serviceCharge', 'grandTotal', 'paidAmount', 'balance', 'paymentMethods', 'totalItems'
        ] 
      },
      label: { type: String, required: true },
      enabled: { type: Boolean, default: true },
      position: { type: Number, required: true },
      icon: { type: String, default: '' }
    }]
  },

  // Footer Section
  footer: {
    enabled: { type: Boolean, default: true },
    customFields: [{
      id: { type: Number, required: true },
      text: { type: String, required: true },
      enabled: { type: Boolean, default: true },
      position: { type: Number, required: true }
    }],
    showBarcode: { type: Boolean, default: true },
    showSystemBy: { type: Boolean, default: true }
  },

  // General Settings
  general: {
    paperSize: { type: String, default: '80mm' },
    fontSize: { type: String, default: '13px' },
    fontFamily: { type: String, default: 'Arial, sans-serif' },
    margin: { type: String, default: '10px' },
    showSectionHeaders: { type: Boolean, default: true },
    compactMode: { type: Boolean, default: false }
  },

  // Logo path
  logoPath: { type: String, default: '' }

}, {
  timestamps: true
});

// Pre-save middleware to ensure proper field structure
receiptSettingsSchema.pre('save', function(next) {
  if (!this.header.fields || this.header.fields.length === 0) {
    this.header.fields = getDefaultHeaderFields();
  }
  if (!this.body.columns || this.body.columns.length === 0) {
    this.body.columns = getDefaultBodyColumns();
  }
  if (!this.summary.fields || this.summary.fields.length === 0) {
    this.summary.fields = getDefaultSummaryFields();
  }
  if (!this.footer.customFields || this.footer.customFields.length === 0) {
    this.footer.customFields = getDefaultFooterFields();
  }
  next();
});

// Default field configurations
function getDefaultHeaderFields() {
  return [
    // Company Info
    { name: 'logo', label: 'Logo', enabled: true, position: 1, section: 'company' },
    { name: 'companyName', label: 'Company Name', enabled: true, position: 2, section: 'company' },
    { name: 'companyAddress', label: 'Company Address', enabled: true, position: 3, section: 'company' },
    { name: 'companyMobile', label: 'Company Phone', enabled: true, position: 4, section: 'company'},
    { name: 'whatsappNumber', label: 'WhatsApp Number', enabled: false, position: 5, section: 'company' },
    { name: 'companyEmail', label: 'Company Email', enabled: false, position: 6, section: 'company' },
    // Sale Info
    { name: 'outlet', label: 'Outlet', enabled: false, position: 7, section: 'sale' },
    { name: 'cashier', label: 'Cashier', enabled: true, position: 8, section: 'sale' },
    { name: 'invoiceNumber', label: 'Invoice No', enabled: true, position: 9, section: 'sale' },
    { name: 'kot', label: 'KOT', enabled: false, position: 10, section: 'sale' },
    { name: 'date', label: 'Date and Time', enabled: true, position: 11, section: 'sale'},
    { name: 'customer', label: 'Customer', enabled: true, position: 12, section: 'sale' },
    { name: 'saleNumber', label: 'Sale Number', enabled: true, position: 13, section: 'sale' }
  ];
}

function getDefaultBodyColumns() {
  return [
    { name: 'productName', label: 'Product', enabled: true, position: 1 },
    { name: 'productCode', label: 'Code', enabled: false, position: 2},
    { name: 'size', label: 'Size', enabled: true, position: 3},
    { name: 'price', label: 'Price', enabled: true, position: 4 },
    { name: 'quantity', label: 'Qty', enabled: true, position: 5 },
    { name: 'subtotal', label: 'Amount', enabled: true, position: 6 },
    { name: 'discount', label: 'Discount', enabled: false, position: 7 },
    { name: 'tax', label: 'Tax', enabled: false, position: 8 }
  ];
}

function getDefaultSummaryFields() {
  return [
    { name: 'subtotal', label: 'Subtotal', enabled: true, position: 1 },
    { name: 'discount', label: 'Discount', enabled: true, position: 2 },
    { name: 'tax', label: 'Tax', enabled: true, position: 3 },
    { name: 'shipping', label: 'Shipping (Delivery Charge)', enabled: true, position: 4 },
    { name: 'serviceCharge', label: 'Service Charge', enabled: true, position: 5 },
    { name: 'grandTotal', label: 'Grand Total', enabled: true, position: 6 },
    { name: 'paidAmount', label: 'Paid Amount', enabled: true, position: 7 },
    { name: 'balance', label: 'Balance', enabled: true, position: 8 },
    { name: 'paymentMethods', label: 'Payment Methods', enabled: true, position: 9 },
    { name: 'totalItems', label: 'Total Items', enabled: false, position: 10 }
  ];
}

function getDefaultFooterFields() {
  return [
    { id: 1, text: '***DINING TAKEAWAY AND DELIVERY SERVICES ARE AVAILABLE***', enabled: true, position: 1 },
    { id: 2, text: 'THANK YOU, COME AGAIN!', enabled: true, position: 2 }
  ];
}

const ReceiptSettings = mongoose.model('ReceiptSettings', receiptSettingsSchema);
module.exports = ReceiptSettings;