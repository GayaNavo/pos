

const express = require('express');
const router = express.Router();

const {
    currencyController,
    customersController,
    purchaseReturnController,
    purchaseController,
    quatationController,
    saleController,
    saleReturnController,
    permissionsController,
    posController,
    suplierController,
    transferController,
    userController,
    warehouseController,
    productController,
    brandsController,
    categoryController,
    unitController,
    productVariationController,
    cashController,
    OffersController,
    orderController
} = require('../controllers/index');

// Routes


router.delete('/deleteHeldProduct/:id', posController.deleteHeldProduct);

router.delete('/closeRegister/:id', cashController.closeRegister);



router.delete('/deleteCurrency/:id',currencyController.deleteCurrency);

router.delete('/DeleteCustomer/:id',customersController.DeleteCustomer);

router.delete('/DeletePurchaseReturn/:id' , purchaseReturnController.deletePurchaseReturn);

router.delete('/deleteProductFromPurchaseReturn', purchaseReturnController.removeProductFromPurchaseReturn);

router.delete('/deletePurchase/:id', purchaseController.deletePurchase);

router.delete('/DeleteQuatation/:id',quatationController.DeleteQuatation);

router.delete('/deleteRole/:id',permissionsController.DeleteRole);

router.delete('/DeleteSaleReturn/:id',saleReturnController.deleteSaleReturn);

router.delete('/DeleteSale/:id',saleController.deleteSale);

router.delete('/deletePayment/:id', saleController.deletePaymentOfSale);

router.delete('/deletePurchasePayment/:id', purchaseController.deletePaymentOfPurchase);

router.delete('/deleteProductFromSale',saleController.deleteProductFromSale);

router.delete('/DeleteSuplier/:id',suplierController.DeleteSuplier);

router.delete('/deleteTransfer/:id', transferController.deleteTransfer);

router.delete('/DeleteUser/:id', userController.deleteUser);

router.delete('/DeleteWarehouse/:id',warehouseController.DeleteWarehouse);



router.delete('/deleteProductFromPurchase', purchaseController.deleteProductFromPurchase);

router.delete('/deleteProductFromQuatation', quatationController.deleteProductFromQuatation);

router.delete('/deleteProductFromSale',saleController.deleteProductFromSale);

router.delete('/deleteProduct/:id', productController.deleteProduct);

// router.delete('/deleteBaseUnit/:id', baseUnitController.deleteBaseUnit);

router.delete('/deleteBrand/:id', brandsController.deleteProductBrand);

router.delete('/deleteCategory/:id', categoryController.deleteCategory);

router.delete('/deleteUnit/:id', unitController.deleteProductUnit);

router.delete('/deleteVariation/:id', productVariationController.deleteProductVariation);

router.delete('/deleteOffer/:id', OffersController.deleteOffer);

router.delete('/DeleteZBill/:id', posController.deleteZReading);

router.delete('/orders/:id', orderController.deleteOrder);

router.delete('/deleteAllOrder', orderController.deleteAllOrders);

router.delete('/deleteAllPlacedOrder', orderController.deleteAllPlceOrders);

module.exports = router;

