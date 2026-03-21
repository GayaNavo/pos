
const express = require('express');
const router = express.Router();

const {authenticateToken} = require('../middleware/authMiddleware');
const { uploadProduct, uploadBrand, uploadCategory, uploadUser } = require('../middleware/multerMiddleware');
const adminController = require('../controllers/userController/adminController');

const currencyController = require('../controllers/currencyController/currencyController');
const customersController = require('../controllers/customerController/customerController');

const purchaseReturnController = require('../controllers/purchaseController/purchaseReturnController');
const reportController = require('../controllers/reportController/reportController');
const customerReportController = require('../controllers/reportController/customerReportController');
const suplierReportController = require('../controllers/reportController/suplierReportController');
const stokeReportController = require('../controllers/reportController/stokeReportController');
const registerReportController = require('../controllers/reportController/registerReportController');
const purchaseController = require('../controllers/purchaseController/purchaseController');
const quatationController = require('../controllers/quatationController/quatationController');
const saleController = require('../controllers/saleController/saleController');
const saleReturnController = require('../controllers/saleReturnController/saleReturnController');
const permissionsController = require('../controllers/permissionsController/permissionsController');
const posController = require('../controllers/posController/posController');
const settingsController = require('../controllers/settingsController/settingsController');
const mailsettingsController = require('../controllers/settingsController/mailSettingsController');
const receiptettingsController = require('../controllers/settingsController/receiptSettingsController');

const suplierController = require('../controllers/suplierController/suplierController');
const transferController = require('../controllers/transferController/transferController');
const userController = require('../controllers/userController/userController');
const loginController = require('../controllers/userController/loginController'); 
const {sendResetCode} = require('../controllers/userController/forgetPasswordcontroller');
const changePasswordController = require('../controllers/userController/changePasswordController');
const warehouseController = require('../controllers/wherehouseController/warehouseController');
const productControll = require('../controllers/productController/productController');
const brandsControll = require('../controllers/productController/brandController');
const categoryController= require('../controllers/productController/categoryController');
const unitControll = require('../controllers/productController/unitController');
const productVariationController = require('../controllers/productController/variationController');
const staffRefreshmentsController  = require('../controllers/staffRefreshmentsController/staffRefreshmentsController');
const OffersController = require('../controllers/OffersController/OffersController');
const orderController = require('../controllers/orderController/orderController');

// Routes

router.put('/updateProductQty', posController.updateProductQuantities);



router.put('/updateCurrency/:id', currencyController.updateCurrency);

router.put('/editCustomerProfileByAdmin' , customersController.UpdateCustomer);

router.put('/updatePurchaseReturn/:id' ,purchaseReturnController.updatePurchaseReturn);

router.put('/updatePuchase/:id' ,purchaseController.updatePurchase);

router.put('/updateQuatation/:id',quatationController.updateQuatation);

router.put('/updatePermissions', permissionsController.updatePermissions);

router.put('/updateSale/:id' , saleController.updateSale);

router.put('/editSuplierProfileByAdmin' , suplierController.UpdateSuplier);

router.put('/updateTransfer/:id' , transferController.updateTransfer);

router.put('/changepassword/:id', changePasswordController.changePassword);

router.put('/editWarehouseByAdmin' , warehouseController.UpdateWarehouse);

router.put('/updateProduct/:id', uploadProduct.single('image'), productControll.updateProduct);

router.put('/updateBrand/:id', uploadBrand.single('logo'), brandsControll.updateProductBrands); 

router.put('/updateCategory/:id', uploadCategory.single('logo'), categoryController.updateCategory);

router.put('/updateUnit/:id', unitControll.updateProductUnit);

router.put('/updateProductVariation/:id',productVariationController.updateProductVariation);

router.put('/updateUser', uploadUser.single('profileImage'), userController.updateUser);

router.put('/updateUserStatus/:id', userController.updateUserStatus);

router.put('/updateStaffRefreshment/:id', staffRefreshmentsController.editStaffRefreshmentRecord);

router.put('/editOffer/:id', OffersController.updateOffer);

router.put('/updateOrder/:id', orderController.updateOrder);

module.exports = router;













