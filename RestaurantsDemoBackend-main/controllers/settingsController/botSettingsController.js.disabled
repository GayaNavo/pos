

const BOTSettings = require('../../models/botSettingsModel');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for BOT logo uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/bot-logos');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'bot-logo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif|svg/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  }
});

// Create or update BOT settings
const createOrUpdateBOTSettings = async (req, res) => {
  try {
    let settings = await BOTSettings.findOne();
    
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
      settings.footer = { ...settings.footer, ...updateData.footer };
      settings.general = { ...settings.general, ...updateData.general };
      settings.logoPath = updateData.logoPath || settings.logoPath;
      
      await settings.save();
    } else {
      // Create new settings
      settings = await BOTSettings.create(req.body);
    }
    
    res.json({ message: 'BOT settings saved successfully', settings });
  } catch (error) {
    console.error('Error saving BOT settings:', error);
    res.status(500).json({ message: 'Error saving BOT settings', error: error.message });
  }
};

// Get BOT settings
const getBOTSettings = async (req, res) => {
  try {
    let settings = await BOTSettings.findOne();
    
    if (!settings) {
      // Create default settings with all fields
      settings = await BOTSettings.create({});
    }
    
    // Add full logo URL to the response
    const settingsObj = settings.toObject();
    if (settingsObj.logoPath) {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      settingsObj.logoUrl = `${baseUrl}/api/bot-logo/${path.basename(settingsObj.logoPath)}`;
    }
    
    res.json(settingsObj);
  } catch (error) {
    console.error('Error fetching BOT settings:', error);
    res.status(500).json({ message: 'Error fetching BOT settings', error: error.message });
  }
};

// Upload BOT logo
const uploadBOTLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded', status: 'unsuccess' });
    }
    
    // Check if we already have this logo by comparing file content
    const existingBOTSettings = await BOTSettings.findOne();
    
    if (existingBOTSettings && existingBOTSettings.logoPath) {
      const existingLogoPath = path.resolve(__dirname, '../../uploads', existingBOTSettings.logoPath);
      
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
          const logoUrl = `${baseUrl}/api/bot-logo/${existingBOTSettings.logoPath.split('/').pop()}`;
          
          return res.json({
            message: 'Logo already exists',
            logoPath: existingBOTSettings.logoPath,
            logoUrl: logoUrl,
            status: 'success'
          });
        }
      }
    }
    
    // Update BOT settings with logo path
    let botSettings = await BOTSettings.findOne();
    if (!botSettings) {
      botSettings = new BOTSettings();
    }
    
    // Store relative path for easier access
    botSettings.logoPath = `bot-logos/${req.file.filename}`;
    await botSettings.save();
    
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const logoUrl = `${baseUrl}/api/bot-logo/${req.file.filename}`;
    
    res.json({
      message: 'Logo uploaded successfully',
      logoPath: botSettings.logoPath,
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

// Remove BOT logo
const removeBOTLogo = async (req, res) => {
  try {
    let botSettings = await BOTSettings.findOne();
    
    if (!botSettings || !botSettings.logoPath) {
      return res.status(400).json({ message: 'No logo found to remove', status: 'unsuccess' });
    }
    
    // Delete the logo file from server
    const logoPath = path.resolve(__dirname, '../../uploads', botSettings.logoPath);
    if (fs.existsSync(logoPath)) {
      fs.unlinkSync(logoPath);
    }
    
    // Remove logo path from settings
    botSettings.logoPath = '';
    await botSettings.save();
    
    res.json({ message: 'Logo removed successfully', status: 'success' });
  } catch (error) {
    console.error('Error removing logo:', error);
    res.status(500).json({ message: 'Error removing logo', status: 'unsuccess' });
  }
};

module.exports = {
  createOrUpdateBOTSettings,
  getBOTSettings,
  uploadBOTLogo,
  removeBOTLogo,
  upload
};
