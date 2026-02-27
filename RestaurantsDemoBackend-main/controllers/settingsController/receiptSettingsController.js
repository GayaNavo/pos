

const ReceiptSettings = require('../../models/receiptSettingsModel');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// receiptSettingsController.js - Update the createOrUpdateReceiptSettings function
const createOrUpdateReceiptSettings = async (req, res) => {
  try {
    let settings = await ReceiptSettings.findOne();
    
    if (settings) {
      // Update existing settings - preserve logoPath if not provided in update
      const updateData = { ...req.body };
      
      // Only update logoPath if explicitly provided in the request
      if (!updateData.logoPath && settings.logoPath) {
        updateData.logoPath = settings.logoPath;
      }
      
      // Merge settings properly
      settings.header = { ...settings.header, ...updateData.header };
      settings.body = { ...settings.body, ...updateData.body };
      settings.summary = { ...settings.summary, ...updateData.summary };
      settings.footer = { ...settings.footer, ...updateData.footer };
      settings.general = { ...settings.general, ...updateData.general };
      settings.logoPath = updateData.logoPath || settings.logoPath;
      
      // Fix position conflicts - ensure serviceCharge comes before grandTotal
      if (settings.summary && settings.summary.fields) {
        const serviceChargeField = settings.summary.fields.find(f => f.name === 'serviceCharge');
        const grandTotalField = settings.summary.fields.find(f => f.name === 'grandTotal');
        
        if (serviceChargeField && grandTotalField && serviceChargeField.position >= grandTotalField.position) {
          serviceChargeField.position = 5;
          grandTotalField.position = 6;
          settings.summary.fields.forEach(field => {
            if (field.name === 'paidAmount') field.position = 7;
            if (field.name === 'balance') field.position = 8;
            if (field.name === 'paymentMethods') field.position = 9;
            if (field.name === 'totalItems') field.position = 10;
          });
        }
      }
      
      await settings.save();
    } else {
      // Create new settings
      settings = await ReceiptSettings.create(req.body);
      
      // Fix position conflicts for new settings
      if (settings.summary && settings.summary.fields) {
        const serviceChargeField = settings.summary.fields.find(f => f.name === 'serviceCharge');
        const grandTotalField = settings.summary.fields.find(f => f.name === 'grandTotal');
        
        if (serviceChargeField && grandTotalField && serviceChargeField.position >= grandTotalField.position) {
          serviceChargeField.position = 5;
          grandTotalField.position = 6;
          settings.summary.fields.forEach(field => {
            if (field.name === 'paidAmount') field.position = 7;
            if (field.name === 'balance') field.position = 8;
            if (field.name === 'paymentMethods') field.position = 9;
            if (field.name === 'totalItems') field.position = 10;
          });
          await settings.save();
        }
      }
    }
    
    res.json({ 
      message: 'Receipt settings saved successfully', 
      settings 
    });
  } catch (error) {
    console.error('Error saving receipt settings:', error);
    res.status(500).json({ message: 'Error saving receipt settings', error: error.message });
  }
};

// Update getReceiptSettings to include logo URL
const getReceiptSettings = async (req, res) => {
  try {
    let settings = await ReceiptSettings.findOne();
    
    if (!settings) {
      // Create default settings with all fields
      settings = await ReceiptSettings.create({});
    }
    
    // Fix position conflicts when fetching settings
    let needsSave = false;
    if (settings.summary && settings.summary.fields) {
      const serviceChargeField = settings.summary.fields.find(f => f.name === 'serviceCharge');
      const grandTotalField = settings.summary.fields.find(f => f.name === 'grandTotal');
      
      if (serviceChargeField && grandTotalField && serviceChargeField.position >= grandTotalField.position) {
        serviceChargeField.position = 5;
        grandTotalField.position = 6;
        settings.summary.fields.forEach(field => {
          if (field.name === 'paidAmount') field.position = 7;
          if (field.name === 'balance') field.position = 8;
          if (field.name === 'paymentMethods') field.position = 9;
          if (field.name === 'totalItems') field.position = 10;
        });
        needsSave = true;
      }
    }
    
    if (needsSave) {
      await settings.save();
      console.log('✅ Fixed service charge position in receipt settings');
    }
    
    // Add full logo URL to the response
    const settingsObj = settings.toObject();
    if (settingsObj.logoPath) {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      settingsObj.logoUrl = `${baseUrl}/api/receipt-logo/${path.basename(settingsObj.logoPath)}`;
    }
    
    res.json(settingsObj);
  } catch (error) {
    console.error('Error fetching receipt settings:', error);
    res.status(500).json({ message: 'Error fetching receipt settings', error: error.message });
  }
};

const uploadReceiptLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded', status: 'unsuccess' });
    }

    // Check if we already have this logo (by comparing file content)
    const existingReceiptSettings = await ReceiptSettings.findOne();
    
    if (existingReceiptSettings && existingReceiptSettings.logoPath) {
      const existingLogoPath = path.resolve(__dirname, '../../uploads', existingReceiptSettings.logoPath);
      
      // Check if file exists and compare with new file
      if (fs.existsSync(existingLogoPath)) {
        const existingFileStats = fs.statSync(existingLogoPath);
        const newFileStats = fs.statSync(req.file.path);
        
        // If files are the same size, consider them duplicates
        if (existingFileStats.size === newFileStats.size) {
          // Delete the newly uploaded duplicate file
          fs.unlinkSync(req.file.path);
          
          // Return existing logo info
          const baseUrl = `${req.protocol}://${req.get('host')}`;
          const logoUrl = `${baseUrl}/api/receipt-logo/${existingReceiptSettings.logoPath.split('/').pop()}`;
          
          return res.json({ 
            message: 'Logo already exists', 
            logoPath: existingReceiptSettings.logoPath,
            logoUrl: logoUrl,
            status: 'success' 
          });
        }
      }
    }

    // Update receipt settings with logo path
    let receiptSettings = await ReceiptSettings.findOne();
    if (!receiptSettings) {
      receiptSettings = new ReceiptSettings();
    }
    
    // Store relative path for easier access
    receiptSettings.logoPath = `receipt-logos/${req.file.filename}`;
    await receiptSettings.save();

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const logoUrl = `${baseUrl}/api/receipt-logo/${req.file.filename}`;

    res.json({ 
      message: 'Logo uploaded successfully', 
      logoPath: receiptSettings.logoPath,
      logoUrl: logoUrl,
      status: 'success' 
    });
  } catch (error) {
    console.error('Error uploading logo:', error);
    
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ message: 'Error uploading logo', status: 'unsuccess' });
  }
};
// Remove receipt logo
const removeReceiptLogo = async (req, res) => {
  try {
    let receiptSettings = await ReceiptSettings.findOne();
    
    if (!receiptSettings || !receiptSettings.logoPath) {
      return res.status(400).json({ message: 'No logo found to remove', status: 'unsuccess' });
    }

    // Delete the logo file from server
    const logoPath = path.resolve(__dirname, '../../uploads', receiptSettings.logoPath);
    if (fs.existsSync(logoPath)) {
      fs.unlinkSync(logoPath);
    }

    // Remove logo path from settings
    receiptSettings.logoPath = '';
    await receiptSettings.save();

    res.json({ 
      message: 'Logo removed successfully', 
      status: 'success' 
    });
  } catch (error) {
    console.error('Error removing logo:', error);
    res.status(500).json({ message: 'Error removing logo', status: 'unsuccess' });
  }
};

module.exports ={createOrUpdateReceiptSettings,getReceiptSettings,uploadReceiptLogo,removeReceiptLogo}