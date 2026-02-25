/*
 * Copyright (c) 2025 Ideazone (Pvt) Ltd
 * Proprietary and Confidential
 *
 * This source code is part of a proprietary Point-of-Sale (POS) system developed by Ideazone (Pvt) Ltd.
 * Use of this code is governed by a license agreement and an NDA.
 * Unauthorized use, modification, distribution, or reverse engineering is strictly prohibited.
 *
 * Contact info@ideazone.lk for more information.
 */

const express = require('express');
const router = express.Router();
const multer = require('multer'); 
const path = require('path');
const fs = require('fs');
const { uploadLogo } = require('../middleware/multerMiddleware'); //

const adminController = require('../controllers/userController/adminController');

const currencyController = require('../controllers/currencyController/currencyController');
const customersController = require('../controllers/customerController/customerController');

const purchaseReturnController = require('../controllers/purchaseController/purchaseReturnController');
const sendPurchaseReturnToSupplier = require('../controllers/saleReturnController/saleReturnSendToSupplier');
const purchaseController = require('../controllers/purchaseController/purchaseController');
const quatationController = require('../controllers/quatationController/quatationController');
const saleController = require('../controllers/saleController/saleController');
const saleReturnController = require('../controllers/saleReturnController/saleReturnController');
const permissionsController = require('../controllers/permissionsController/permissionsController');
const posController = require('../controllers/posController/posController');
const settingsController = require('../controllers/settingsController/settingsController');
const mailsettingsController = require('../controllers/settingsController/mailSettingsController');
const receiptettingsController = require('../controllers/settingsController/receiptSettingsController');
const prefixSettingsController = require('../controllers/settingsController/prefixSettingsController');
const suplierController = require('../controllers/suplierController/suplierController');
const transferController = require('../controllers/transferController/transferController');
const userController = require('../controllers/userController/userController');
const loginController = require('../controllers/userController/loginController'); 
const otpController = require('../controllers/userController/veryfyResetOTP');
const {sendResetCode} = require('../controllers/userController/forgetPasswordcontroller');
const warehouseController = require('../controllers/wherehouseController/warehouseController');
const productControll = require('../controllers/productController/productController');
const brandsControll = require('../controllers/productController/brandController');
const categoryController= require('../controllers/productController/categoryController');
const unitControll = require('../controllers/productController/unitController');
const productVariationController = require('../controllers/productController/variationController');
const cashController = require('../controllers/posController/cashController');
const bakerySaleController = require('../controllers/bakerySaleController/bakerySaleController');
const {verifyPermission} = require('../middleware/roleAuthMiddleware');
const OffersController = require('../controllers/OffersController/OffersController')
const staffRefreshmentsController = require('../controllers/staffRefreshmentsController/staffRefreshmentsController');
const orderController = require('../controllers/orderController/orderController');

const {
  createOrUpdateKOTSettings,
  uploadKOTLogo,
  removeKOTLogo,
  upload: kotUpload
} = require('../controllers/settingsController/kotSettingsController');

const {
  createOrUpdateBOTSettings,
  uploadBOTLogo,
  removeBOTLogo,
  upload: botUpload
} = require('../controllers/settingsController/botSettingsController');


//MULTER MIDDLEWARE
const baseUploadDir = path.resolve(__dirname, '../uploads');

// Ensure the base uploads folder exists
if (!fs.existsSync(baseUploadDir)) {
    fs.mkdirSync(baseUploadDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let subFolder;
        if (req.originalUrl.includes('/createProduct')) {
            subFolder = 'product';
        } else if (req.originalUrl.includes('/createBrand')) {
            subFolder = 'brand';
        } else if (req.originalUrl.includes('/createCategory')) {
            subFolder = 'category';
      } else {
            subFolder = 'others'; 
        }

        const uploadDir = path.join(baseUploadDir, subFolder);
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        cb(null, uploadDir); 
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}_${file.originalname}`); 
    }
});

// File filter for image validation
const fileFilter = (req, file, cb) => {
  // Define allowed image types
  const allowedMimes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Initialize multer
const upload = multer({ 
  storage,
  fileFilter
});

const receiptLogoStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(baseUploadDir, 'receipt-logos');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'receipt-logo-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadReceiptLogo = multer({
    storage: receiptLogoStorage,
    limits: {
        fileSize: 2 * 1024 * 1024 
    },
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});


router.post('/cashHandIn', cashController.cashHandIn);

router.post('/holdProducts',posController.holdProducts);

router.post('/getingHoldProductsQty', posController.getProductsByIds);



router.post('/initialRunning', adminController.initialRunning);

router.post('/createCurrency', currencyController.createCurrency);

router.post('/createCustomer', customersController.createCustomer);

router.post('/walkInCustomer', customersController.walkInCustomer);

router.post('/importCustomers', customersController.ImportCustomer);

router.post('/returnPurchase', purchaseReturnController.returnPurchase);

router.post('/returnPurchaseToSupplier', sendPurchaseReturnToSupplier.sendPurchaseReturnToSupplier);

router.post('/createPurchase', purchaseController.createPurchase);

router.post('/createQuatation',quatationController.createQuatation);

router.post('/createPermissions', permissionsController.createPermissions);

router.post('/returnSale',saleReturnController.returnSale);

router.post('/createOffer', OffersController.CreateOffer);

router.post('/getDiscountAccess', posController.getAdminPasswordForDiscount);

//POS SALE
router.post('/createSale',saleController.createSale);

//END OF THE DAY BACKERY SALE
router.post('/createLastSale', bakerySaleController.createBackerySale);

router.post('/createNonPosSale',saleController.createNonPosSale);

router.post('/payingForSale', saleController.payingForSale);

router.post('/payingForPurchase', purchaseController.payingForPurchase);

router.post('/createOrUpdateSettings',uploadLogo.single("logo"), settingsController.createOrUpdateSettings);

router.post('/uploadReceiptLogo', uploadReceiptLogo.single('logo'), receiptettingsController.uploadReceiptLogo);

// NEW ROUTE: Remove receipt logo
router.post('/removeReceiptLogo', receiptettingsController.removeReceiptLogo);

// Add this route to serve receipt logo files
router.get('/receipt-logo/:filename', (req, res) => {
    const { filename } = req.params;
    const logoPath = path.join(baseUploadDir, 'receipt-logos', filename);

    if (fs.existsSync(logoPath)) {
        res.sendFile(logoPath);
    } else {
        res.status(404).json({ message: 'Logo not found' });
    }
});

router.post('/createOrUpdateMailSettings', mailsettingsController.createOrUpdateMailSettings);

router.post('/createOrUpdateReceiptSettings', receiptettingsController.createOrUpdateReceiptSettings);

router.post('/createOrUpdatePrefixSettings', prefixSettingsController.createOrUpdatePrefixSettings);

router.post('/importSuplier', suplierController.ImportSuplier);

router.post('/createSuplier', suplierController.createSuplier);

router.post('/createTransfer', transferController.createTransfer);

router.post('/addUser', userController.addUser);

router.post('/createWherehouse', warehouseController.createWarehouse);

router.post('/login', loginController.loginUser);

router.post('/forgetpassword',sendResetCode );

router.post('/verifyOtp', otpController.verifyResetOTP);

router.post('/createProduct', upload.single('image'), productControll.createProduct);

router.post('/createBrand', upload.single('logo'), brandsControll.createProductBrands);

router.post('/findOneBrand', brandsControll.findBrand); 

router.post('/createCategory',upload.single('logo'), categoryController.createCategory);

router.post('/findOneCategory', categoryController.findCategory);

router.post('/createUnit', unitControll.createProductUnit);

router.post('/findUnit', unitControll.findUnit);

router.post('/createVariation', productVariationController.createProductVariation);

router.post('/findVariation', productVariationController.findVariation);

router.post('/createStaffRefreshments', staffRefreshmentsController.createStaffRefreshment);

router.post('/saveZreadingBill', posController.saveZReading);

router.post('/requestOrder', orderController.createOrder);

router.post('/placeOrderAndPrintKOT', orderController.placeOrderAndPrintKOT);

router.post('/markOrderAsReady', orderController.markOrderAsReady);

// KOT Settings routes
router.post('/createOrUpdateKOTSettings', createOrUpdateKOTSettings);
router.post('/uploadKOTLogo', kotUpload.single('logo'), uploadKOTLogo);
router.post('/removeKOTLogo', removeKOTLogo);

// BOT Settings routes
router.post('/createOrUpdateBOTSettings', createOrUpdateBOTSettings);
router.post('/uploadBOTLogo', botUpload.single('logo'), uploadBOTLogo);
router.post('/removeBOTLogo', removeBOTLogo);

module.exports = router;
