

const mongoose = require('mongoose');

const kotFieldSchema = new mongoose.Schema({
  name: { type: String, required: true },
  label: { type: String, required: true },
  enabled: { type: Boolean, default: true },
  position: { type: Number, required: true }
}, { _id: false });

const kotColumnSchema = new mongoose.Schema({
  name: { type: String, required: true },
  label: { type: String, required: true },
  enabled: { type: Boolean, default: true },
  position: { type: Number, required: true }
}, { _id: false });

const kotSettingsSchema = new mongoose.Schema({
  header: {
    enabled: { type: Boolean, default: true },
    fields: {
      type: [kotFieldSchema],
      default: [
        { name: 'logo', label: 'Logo', enabled: true, position: 1 },
        { name: 'companyName', label: 'Company Name', enabled: true, position: 2 },
        { name: 'saleNumber', label: 'Sale No', enabled: true, position: 3 },
        { name: 'date', label: 'Date', enabled: true, position: 4 },
        { name: 'orderType', label: 'Order Type', enabled: true, position: 5 }
      ]
    }
  },
  body: {
    enabled: { type: Boolean, default: true },
    columns: {
      type: [kotColumnSchema],
      default: [
        { name: 'productName', label: 'Item', enabled: true, position: 1 },
        { name: 'size', label: 'Size', enabled: true, position: 2 },
        { name: 'quantity', label: 'Qty', enabled: true, position: 3 },
        { name: 'subtotal', label: 'Amount', enabled: true, position: 4 }
      ]
    }
  },
  footer: {
    enabled: { type: Boolean, default: true },
    fields: {
      type: [kotFieldSchema],
      default: [
        { name: 'paymentStatus', label: 'Payment Status', enabled: true, position: 1 },
        { name: 'deliveryCharge', label: 'Delivery Charge', enabled: true, position: 2 },
        { name: 'subtotal', label: 'Subtotal', enabled: true, position: 3 },
        { name: 'note', label: 'Note', enabled: true, position: 4 },
        { name: 'thankYou', label: 'Thank You Message', enabled: true, position: 5 }
      ]
    }
  },
  general: {
    paperSize: { type: String, default: '80mm' },
    fontSize: { type: String, default: '13px' },
    fontFamily: { type: String, default: 'Arial, sans-serif' },
    margin: { type: String, default: '10px' }
  },
  logoPath: { type: String, default: '' }
}, {
  timestamps: true
});

const KOTSettings = mongoose.model('KOTSettings', kotSettingsSchema);

module.exports = KOTSettings;
