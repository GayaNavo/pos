// Centralized controller imports - reduces duplication across route files

// User controllers
const adminController = require('../controllers/userController/adminController');
const userController = require('../controllers/userController/userController');
const loginController = require('../controllers/userController/loginController');

// Product controllers
const productController = require('../controllers/productController/productController');
const brandsController = require('../controllers/productController/brandController');
const categoryController = require('../controllers/productController/categoryController');
const unitController = require('../controllers/productController/unitController');
const productVariationController = require('../controllers/productController/variationController');
const barcodeController = require('../controllers/productController/barcodeController');

// Sales & Purchases
const saleController = require('../controllers/saleController/saleController');
const saleReturnController = require('../controllers/saleReturnController/saleReturnController');
const purchaseController = require('../controllers/purchaseController/purchaseController');
const purchaseReturnController = require('../controllers/purchaseController/purchaseReturnController');
const quatationController = require('../controllers/quatationController/quatationController');
const bakerySaleController = require('../controllers/bakerySaleController/bakerySaleController');

// POS
const posController = require('../controllers/posController/posController');
const cashController = require('../controllers/posController/cashController');

// Settings
const settingsController = require('../controllers/settingsController/settingsController');
const mailsettingsController = require('../controllers/settingsController/mailSettingsController');
const receiptettingsController = require('../controllers/settingsController/receiptSettingsController');
const {
    getKOTSettings,
    createOrUpdateKOTSettings,
    uploadKOTLogo,
    removeKOTLogo,
    upload: kotUpload
} = require('../controllers/settingsController/kotSettingsController');

// Reports
const reportController = require('../controllers/reportController/reportController');
const customerReportController = require('../controllers/reportController/customerReportController');
const suplierReportController = require('../controllers/reportController/suplierReportController');
const stokeReportController = require('../controllers/reportController/stokeReportController');
const registerReportController = require('../controllers/reportController/registerReportController');

// Other controllers
const currencyController = require('../controllers/currencyController/currencyController');
const customersController = require('../controllers/customerController/customerController');
const suplierController = require('../controllers/suplierController/suplierController');
const warehouseController = require('../controllers/wherehouseController/warehouseController');
const transferController = require('../controllers/transferController/transferController');
const permissionsController = require('../controllers/permissionsController/permissionsController');
const OffersController = require('../controllers/OffersController/OffersController');
const staffRefreshmentsController = require('../controllers/staffRefreshmentsController/staffRefreshmentsController');
const orderController = require('../controllers/orderController/orderController');
const analyticsController = require('../controllers/analyticsController/analyticsController');
const saleReturnSendToSupplier = require('../controllers/saleReturnController/saleReturnSendToSupplier');

module.exports = {
    // User
    adminController,
    userController,
    loginController,
    
    // Product
    productController,
    brandsController,
    categoryController,
    unitController,
    productVariationController,
    barcodeController,
    
    // Sales & Purchases
    saleController,
    saleReturnController,
    purchaseController,
    purchaseReturnController,
    quatationController,
    bakerySaleController,
    
    // POS
    posController,
    cashController,
    
    // Settings
    settingsController,
    mailsettingsController,
    receiptettingsController,
    getKOTSettings,
    createOrUpdateKOTSettings,
    uploadKOTLogo,
    removeKOTLogo,
    kotUpload,
    
    // Reports
    reportController,
    customerReportController,
    suplierReportController,
    stokeReportController,
    registerReportController,
    
    // Other
    currencyController,
    customersController,
    suplierController,
    warehouseController,
    transferController,
    permissionsController,
    OffersController,
    staffRefreshmentsController,
    orderController,
    analyticsController,
    saleReturnSendToSupplier
};
