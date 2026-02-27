

const KOTSettings = require('../../models/kotSettingsModel');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for KOT logo uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/kot-logos');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'kot-logo-' + uniqueSuffix + path.extname(file.originalname));
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

// Create or update KOT settings
const createOrUpdateKOTSettings = async (req, res) => {
  try {
    let settings = await KOTSettings.findOne();
    
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
      settings = await KOTSettings.create(req.body);
    }
    
    res.json({ message: 'KOT settings saved successfully', settings });
  } catch (error) {
    console.error('Error saving KOT settings:', error);
    res.status(500).json({ message: 'Error saving KOT settings', error: error.message });
  }
};

// Get KOT settings
const getKOTSettings = async (req, res) => {
  try {
    let settings = await KOTSettings.findOne();
    
    if (!settings) {
      // Create default settings with all fields
      settings = await KOTSettings.create({});
    }
    
    // Add full logo URL to the response
    const settingsObj = settings.toObject();
    if (settingsObj.logoPath) {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      settingsObj.logoUrl = `${baseUrl}/api/kot-logo/${path.basename(settingsObj.logoPath)}`;
    }
    
    res.json(settingsObj);
  } catch (error) {
    console.error('Error fetching KOT settings:', error);
    res.status(500).json({ message: 'Error fetching KOT settings', error: error.message });
  }
};

// Upload KOT logo
const uploadKOTLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded', status: 'unsuccess' });
    }
    
    // Check if we already have this logo by comparing file content
    const existingKOTSettings = await KOTSettings.findOne();
    
    if (existingKOTSettings && existingKOTSettings.logoPath) {
      const existingLogoPath = path.resolve(__dirname, '../../uploads', existingKOTSettings.logoPath);
      
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
          const logoUrl = `${baseUrl}/api/kot-logo/${existingKOTSettings.logoPath.split('/').pop()}`;
          
          return res.json({
            message: 'Logo already exists',
            logoPath: existingKOTSettings.logoPath,
            logoUrl: logoUrl,
            status: 'success'
          });
        }
      }
    }
    
    // Update KOT settings with logo path
    let kotSettings = await KOTSettings.findOne();
    if (!kotSettings) {
      kotSettings = new KOTSettings();
    }
    
    // Store relative path for easier access
    kotSettings.logoPath = `kot-logos/${req.file.filename}`;
    await kotSettings.save();
    
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const logoUrl = `${baseUrl}/api/kot-logo/${req.file.filename}`;
    
    res.json({
      message: 'Logo uploaded successfully',
      logoPath: kotSettings.logoPath,
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

// Remove KOT logo
const removeKOTLogo = async (req, res) => {
  try {
    let kotSettings = await KOTSettings.findOne();
    
    if (!kotSettings || !kotSettings.logoPath) {
      return res.status(400).json({ message: 'No logo found to remove', status: 'unsuccess' });
    }
    
    // Delete the logo file from server
    const logoPath = path.resolve(__dirname, '../../uploads', kotSettings.logoPath);
    if (fs.existsSync(logoPath)) {
      fs.unlinkSync(logoPath);
    }
    
    // Remove logo path from settings
    kotSettings.logoPath = '';
    await kotSettings.save();
    
    res.json({ message: 'Logo removed successfully', status: 'success' });
  } catch (error) {
    console.error('Error removing logo:', error);
    res.status(500).json({ message: 'Error removing logo', status: 'unsuccess' });
  }
};

module.exports = {
  createOrUpdateKOTSettings,
  getKOTSettings,
  uploadKOTLogo,
  removeKOTLogo,
  upload
};
