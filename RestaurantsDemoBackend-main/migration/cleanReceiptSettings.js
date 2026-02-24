// // migration/cleanReceiptSettings.js
// const mongoose = require('mongoose');
// const ReceiptSettings = require('../models/receiptSettingsModel');

// const cleanReceiptSettings = async () => {
//   try {
//     const settings = await ReceiptSettings.find();
    
//     for (let setting of settings) {
//       // Remove unnecessary top-level fields
//       const fieldsToRemove = [
//         'address', 'barcode', 'customer', 'email', 'logo', 
//         'note', 'phone', 'productCode', 'taxDiscountShipping',
//         'template', 'templateSize'
//       ];
      
//       fieldsToRemove.forEach(field => {
//         if (setting[field] !== undefined) {
//           setting[field] = undefined;
//         }
//       });
      
//       await setting.save();
//     }
    
//     console.log('Receipt settings cleaned successfully');
//   } catch (error) {
//     console.error('Migration error:', error);
//   }
// };

// module.exports = cleanReceiptSettings;