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

import axios from "axios";
import { getTax, getPriceRange, getDiscount, getProductCost, getTaxType } from '../../component/sales/SaleController';
import { toast } from "react-toastify";
import { generateBillNumber } from "../pos/utils/invoiceNumber";

//HANDLE SAVE PRODUCT
export const handleSaveQuatation = async (grandTotal, orderStatus, paymentStatus, paymentType, shipping, serviceCharge, serviceChargeValue, serviceChargeType, discountType, discount, tax, warehouse, selectedCustomer, selectedProduct, date, note, setResponseMessage, setError, setProgress, statusOfQuatation, navigate) => {
    setProgress(true);
    setResponseMessage('');
    setError('');

    const numberRegex = /^[0-9]*(\.[0-9]+)?$/;
    if (!numberRegex.test(tax)) {
        toast.error('Tax must be a valid number');
        setProgress(false)
        return;
    }
    if (!numberRegex.test(discount)) {
        toast.error('Discount must be a valid number');
        setProgress(false)
        return;
    }
    if (!numberRegex.test(shipping)) {
        toast.error('Shipping must be a valid number');
        setProgress(false)
        return;
    }
    if (!numberRegex.test(serviceCharge)) {
        setError('Service Charge must be a valid number');
        setProgress(false)
        return;
    }
    if (!date) {
        toast.error('Date is required');
        setProgress(false)
        return;
    }
    if (!paymentStatus) {
        toast.error('Payment Status is required');
        setProgress(false)
        return;
    }
    if (!warehouse) {
        toast.error('Warehouse is required');
        setProgress(false)
        return;
    }
    if (!selectedCustomer || !selectedCustomer.name) {
        toast.error('Customer information is required');
        setProgress(false)
        return;
    }
    if (!orderStatus) {
        toast.error('Oder Status is required');
        setProgress(false)
        return;
    }
    if (paymentStatus?.toLowerCase() === 'unpaid') {
        paymentType = '';
    }
    if (paymentStatus?.toLowerCase() === 'paid' && !paymentType) {
        toast.error('Payment Type is required when Payment Status is Paid');
        setProgress(false);
        return;
    }

    const hasZeroQuantity = selectedProduct.some(product => {
        const quantity = product.ptype === "Variation"
            ? (product.variationValues?.[product.selectedVariation]?.barcodeQty ?? product.barcodeQty)
            : product.barcodeQty;
        return quantity === 0 || quantity === "" || !quantity;
    });

    if (hasZeroQuantity) {
        toast.error('Cannot save quotation. All products must have a quantity greater than 0.', {
            autoClose: 2000,
            className: "custom-toast"
        });
        setProgress(false);
        return;
    }

    const totalAmount = Number(grandTotal) || 0;
    const paidAmount = paymentStatus.toLowerCase() === 'paid' ? grandTotal : 0;
    const defaultWarehouse = sessionStorage.getItem('defaultWarehouse') || 'Unknown';

    const commonSaleData = {
        date,
        customer: selectedCustomer.name,
        warehouse: warehouse || null,
        tax,
        discountType,
        discount,
        shipping,
        serviceCharge,
        serviceChargeValue,
        serviceChargeType: serviceChargeType || 'fixed',
        paymentStatus,
        paymentType,
        orderStatus,
        paidAmount,
        grandTotal: totalAmount,
        statusOfQuatation,
        note: note || ''
    };

    // Create products data array
    const productsData = selectedProduct.map(product => {
        const currentID = product._id;
        const ptype = product.ptype;
        const isInventory = product.isInventory;
        const variationValue = product.selectedVariation;
        const price = getPriceRange(product, product.selectedVariation);
        const productCost = getProductCost(product, product.selectedVariation);
        const discount = getDiscount(product, product.selectedVariation) || 0;
        const taxType = getTaxType(product, product.selectedVariation) || 'inclusive';
        const quantity = product.barcodeQty || 0;
        const taxRate = product.orderTax ? product.orderTax / 100 : getTax(product, product.selectedVariation) / 100;
        const discountedPrice = Math.max(price - discount, 0);
        const baseSubtotal = discountedPrice * quantity;
        const taxAmount = taxType.toLowerCase() === "exclusive"
            ? price * quantity * taxRate
            : 0;
        const subtotal = baseSubtotal + taxAmount;
        const warehouseId = product.selectedWarehouseId || product.warehouseId || defaultWarehouse;

        return {
            currentID,
            ptype,
            isInventory,
            variationValue,
            name: product.name,
            price,
            productCost,
            discount,
            quantity,
            taxType,
            taxRate,
            subtotal,
            warehouse: warehouseId,
        };
    });

    // Combine common sale data with products data
    const finalQuatationData = {
        ...commonSaleData,
        productsData,
    };

    console.log('Final Quotation Data:', finalQuatationData);

    try {
        const response = await axios.post(`${process.env.REACT_APP_BASE_URL}/api/createQuatation`, finalQuatationData);
        console.log('Response:', response.data);
        toast.success(
            'Quotation created successfully!',
            { autoClose: 2000 },
            { className: "custom-toast" }
        );
        navigate('/viewQuotation');
        return true; // Return success
    } catch (error) {
        console.error('Error creating Quatation:', error);

        if (error.response) {
            // Server responded with a status outside the 2xx range
            toast.error(
                'Server error' || 'Unknown error',
                { autoClose: 2000 },
                { className: "custom-toast" }
            );
        } else if (error.request) {
            // Request was made but no response received
            toast.error(
                'No response from server. Please check your network connection.',
                { autoClose: 2000 },
                { className: "custom-toast" }
            );
        } else {
            // Something else happened
            toast.error(
                `Unexpected error: ${error.message}`,
                { autoClose: 2000 },
                { className: "custom-toast" }
            );
        }
        return false; // Return failure
    } finally {
        setProgress(false);
    }
};

export const handleSaveAndPrintQuatation = async (grandTotal, orderStatus, paymentStatus, paymentType, shipping, serviceCharge, serviceChargeType, discountType, discount, tax, warehouse, selectedCustomer, selectedProduct, date, note, setResponseMessage, setError, setProgress, statusOfQuatation) => {
    setProgress(true);
    setResponseMessage('');
    setError('');

    const numberRegex = /^[0-9]*(\.[0-9]+)?$/;
    if (!numberRegex.test(tax)) {
        toast.error('Tax must be a valid number');
        setProgress(false)
        return false;
    }
    if (!numberRegex.test(discount)) {
        toast.error('Discount must be a valid number');
        setProgress(false)
        return false;
    }
    if (!numberRegex.test(shipping)) {
        toast.error('Shipping must be a valid number');
        setProgress(false)
        return false;
    }
    if (!numberRegex.test(serviceCharge)) {
        setError('Service Charge must be a valid number');
        setProgress(false)
        return false;
    }
    if (!date) {
        toast.error('Date is required');
        setProgress(false)
        return false;
    }
    if (!paymentStatus) {
        toast.error('Payment Status is required');
        setProgress(false)
        return false;
    }
    if (!warehouse) {
        toast.error('Warehouse is required');
        setProgress(false)
        return false;
    }
    if (!selectedCustomer || !selectedCustomer.name) {
        toast.error('Customer information is required');
        setProgress(false)
        return false;
    }
    if (!orderStatus) {
        toast.error('Oder Status is required');
        setProgress(false)
        return false;
    }
    if (paymentStatus?.toLowerCase() === 'unpaid') {
        paymentType = '';
    }
    if (paymentStatus?.toLowerCase() === 'paid' && !paymentType) {
        toast.error('Payment Type is required when Payment Status is Paid');
        setProgress(false);
        return false;
    }

    const hasZeroQuantity = selectedProduct.some(product => {
        const quantity = product.ptype === "Variation"
            ? (product.variationValues?.[product.selectedVariation]?.barcodeQty ?? product.barcodeQty)
            : product.barcodeQty;
        return quantity === 0 || quantity === "" || !quantity;
    });

    if (hasZeroQuantity) {
        toast.error('Cannot save quotation. All products must have a quantity greater than 0.', {
            autoClose: 2000,
            className: "custom-toast"
        });
        setProgress(false);
        return false;
    }

    const totalAmount = Number(grandTotal) || 0;
    const paidAmount = paymentStatus.toLowerCase() === 'paid' ? grandTotal : 0;
    const defaultWarehouse = sessionStorage.getItem('defaultWarehouse') || 'Unknown';

    const commonSaleData = {
        date,
        customer: selectedCustomer.name,
        warehouse: warehouse || null,
        tax,
        discountType,
        discount,
        shipping,
        serviceCharge,
        serviceChargeType: serviceChargeType || 'fixed',
        paymentStatus,
        paymentType,
        orderStatus,
        paidAmount,
        note,
        grandTotal: totalAmount,
        statusOfQuatation
    };

    // Create products data array
    const productsData = selectedProduct.map(product => {
        const currentID = product._id;
        const ptype = product.ptype;
        const isInventory = product.isInventory;
        const variationValue = product.selectedVariation;
        const price = getPriceRange(product, product.selectedVariation);
        const productCost = getProductCost(product, product.selectedVariation);
        const discount = getDiscount(product, product.selectedVariation) || 0;
        const taxType = getTaxType(product, product.selectedVariation) || 'inclusive';
        const quantity = product.barcodeQty || 0;
        const taxRate = product.orderTax ? product.orderTax / 100 : getTax(product, product.selectedVariation) / 100;
        const discountedPrice = Math.max(price - discount, 0);
        const baseSubtotal = discountedPrice * quantity;
        const taxAmount = taxType.toLowerCase() === "exclusive"
            ? price * quantity * taxRate
            : 0;
        const subtotal = baseSubtotal + taxAmount;
        const warehouseId = product.selectedWarehouseId || product.warehouseId || defaultWarehouse;

        return {
            currentID,
            ptype,
            isInventory,
            variationValue,
            name: product.name,
            price,
            productCost,
            discount,
            quantity,
            taxType,
            taxRate,
            subtotal,
            warehouse: warehouseId,
        };
    });

    // Combine common sale data with products data
    const finalQuatationData = {
        ...commonSaleData,
        productsData,
    };

    try {
        const response = await axios.post(`${process.env.REACT_APP_BASE_URL}/api/createQuatation`, finalQuatationData);
        console.log('Response:', response.data);
        toast.success(
            'Quotation saved successfully!',
            { autoClose: 2000 },
            { className: "custom-toast" }
        );
        setProgress(false);
        return true; // Return success for printing
    } catch (error) {
        console.error('Error creating Quatation:', error);

        if (error.response) {
            toast.error(
                'Server error' || 'Unknown error',
                { autoClose: 2000 },
                { className: "custom-toast" }
            );
        } else if (error.request) {
            toast.error(
                'No response from server. Please check your network connection.',
                { autoClose: 2000 },
                { className: "custom-toast" }
            );
        } else {
            toast.error(
                `Unexpected error: ${error.message}`,
                { autoClose: 2000 },
                { className: "custom-toast" }
            );
        }
        setProgress(false);
        return false; // Return failure
    }
};

export const handleUpdateQuatation = async (id, grandTotal, orderStatus, paymentStatus, paidAmount, paymentType, shipping, serviceCharge, serviceChargeValue, serviceChargeType, discountType, discount, tax, warehouse, selectedCustomer, note, productData, setError, setResponseMessage, setProgress, navigate) => {
    setProgress(true);
    setError('');
    setResponseMessage('');

    if (!Array.isArray(productData)) {
        toast.error('Invalid Quatation data format. Expected an array.');
        return;
    }
    if (paymentStatus.toLowerCase() === 'paid' && (!paymentType || paymentType === '')) {
        toast.error('Please select a Payment Type for a paid quotation.');
        setProgress(false);
        return;
    }

    const hasZeroQuantity = productData.some(product => {
        const quantity = product.ptype === "Variation"
            ? (product.variationValues?.[product.selectedVariation]?.quantity ?? product.quantity)
            : product.quantity;
        return quantity === 0 || quantity === "" || !quantity;
    });

    if (hasZeroQuantity) {
        toast.error('Cannot update quotation. All products must have a quantity greater than 0.', {
            autoClose: 2000,
            className: "custom-toast"
        });
        setProgress(false);
        return;
    }

    const totalAmount = Number(grandTotal) || 0;
    const PaidAmount = paymentStatus.toLowerCase() === 'paid' ? grandTotal : 0;

    const commonSaleData = {
        selectedCustomer,
        warehouse: warehouse || null,
        tax,
        discountType,
        discount,
        shipping,
        serviceCharge,
        serviceChargeValue,
        note: note || '',
        serviceChargeType: serviceChargeType || 'fixed',
        paymentStatus,
        paymentType: paymentStatus.toLowerCase() === 'unpaid' ? '' : paymentType,
        orderStatus,
        paidAmount: PaidAmount,
        grandTotal: totalAmount,
    };

    // Create products data array
    const productsData = productData.map(product => {
        const currentID = product.currentID;
        const variationValue = product.variationValue;
        const isInventory = product.isInventory;
        const price = product.price;
        const productCost = product.productCost;
        const discount = product.discount;
        const ptype = product.ptype;
        const quantity = product.quantity || 0;
        const taxRate = product.taxRate
        const taxType = product.taxType || 'inclusive';
        const subtotal = product.subtotal;
        const warehouseId = product.warehouse;

        return {
            currentID,
            variationValue,
            isInventory,
            name: product.name,
            ptype,
            price,
            productCost,
            discount,
            quantity,
            taxType,
            taxRate,
            subtotal,
            warehouse: warehouseId,
        };
    });

    const updatedQuatationData = {
        ...commonSaleData,
        productsData,
    };
    console.log(updatedQuatationData)
    try {
        const response = await axios.put(`${process.env.REACT_APP_BASE_URL}/api/updateQuatation/${id}`, updatedQuatationData);
        console.log('Response:', response.data);
        toast.success(
            'Quotation updated successfully!',
            { autoClose: 2000 },
            { className: "custom-toast" }
        );
        navigate('/viewQuotation');
    } catch (error) {
        console.error('Error updating Quatation:', error);

        if (error.response) {
            toast.error(
                `Server error' || 'Unknown error'}`,
                { autoClose: 2000 },
                { className: "custom-toast" }
            );
        } else if (error.request) {
            toast.error(
                'No response from the server. Please check your network connection.',
                { autoClose: 2000 },
                { className: "custom-toast" }
            );
        } else {
            toast.error(
                `Unexpected error: ${error.message}`,
                { autoClose: 2000 },
                { className: "custom-toast" }
            );
        }
    } finally {
        setProgress(false);
    }
};

//HANDLE SAVE PRODUCT
export const handleCreateSale = async (id, grandTotal, profit, orderStatus, paymentStatus, paymentType, amounts, shipping, serviceCharge, serviceChargeValue, serviceChargeType, discountType, discount, discountValue, tax, warehouse, selectedCustomer, quatationProductData, preFix, setInvoiceNumber, setError, setResponseMessage, setProgress, navigate) => {
    setProgress(true);
    setError('');
    setResponseMessage('');

    const invoiceNumber = generateBillNumber();
    setInvoiceNumber(invoiceNumber);

    let refferenceId = '';
    if (preFix) {
        refferenceId = `${preFix}_${Math.floor(1000 + Math.random() * 9000)}`;
    } else {
        refferenceId = `SL_${Math.floor(1000 + Math.random() * 9000)}`;
    }
    if (!refferenceId || typeof refferenceId !== 'string' || refferenceId.trim() === '') {
        throw new Error('Invalid reference ID. It must be a non-empty string.');
    }

    if (!Array.isArray(quatationProductData) || quatationProductData.length === 0) {
        setError('At least one product is required to create a sale');
        setProgress(false);
        return;
    }

    const invalidProducts = quatationProductData.filter(product => {
        const qty = product.quantity;
        return qty === '' || qty === 0 || qty === null || qty === undefined || qty < 1;
    });

    if (invalidProducts.length > 0) {
        toast.error('All products must have a quantity of at least 1. Please check the product quantities.');
        setProgress(false);
        return;
    }

    const numberRegex = /^[0-9]*(\.[0-9]+)?$/;
    if (!numberRegex.test(tax)) {
        toast.error('Tax must be a valid number');
        setProgress(false);
        return;
    }
    if (!numberRegex.test(discount)) {
        toast.error('Discount must be a valid number');
        setProgress(false);
        return;
    }
    if (!numberRegex.test(shipping)) {
        toast.error('Shipping must be a valid number');
        setProgress(false);
        return;
    }
    if (!selectedCustomer) {
        toast.error('Customer information is required');
        setProgress(false);
        return;
    }
    if (!paymentStatus) {
        toast.error('Payment Status is required');
        setProgress(false);
        return;
    }
    if (!warehouse) {
        toast.error('Warehouse is required');
        setProgress(false);
        return;
    }

    const totalAmount = Number(grandTotal) || 0;
    const paidAmount = Object.values(amounts).reduce((sum, value) => sum + (Number(value) || 0), 0);
    const defaultWarehouse = sessionStorage.getItem('defaultWarehouse') || 'Unknown';

    const paymentTypesArray = Object.keys(paymentType)
        .filter((type) => paymentType[type] && Number(amounts[type]) > 0)
        .map((type) => ({ type, amount: Number(amounts[type]) }));

    const balance = totalAmount - paidAmount;
    const normalizedPaymentStatus = paymentStatus?.toLowerCase();

    // If payment status is "paid" and balance is greater than 0, prevent submission
    if (normalizedPaymentStatus === 'paid' && balance > 0) {
        setError("Payment status is 'Paid', but there's still a balance remaining. Please adjust the payment amount.");
        setProgress(false);
        return;
    }

    const commonSaleData = {
        id,
        refferenceId,
        customer: selectedCustomer,
        warehouse: warehouse || null,
        tax,
        discountType,
        discount,
        discountValue,
        shipping,
        serviceCharge,
        serviceChargeValue,
        serviceChargeType,
        paymentStatus,
        paymentType: paymentTypesArray,
        orderStatus,
        paidAmount,
        grandTotal: totalAmount,
        pureProfit: profit,
        saleType: 'Non-POS',
        invoiceNumber
    };

    // Create products data array
    const productsData = (Array.isArray(quatationProductData) ? quatationProductData : []).map(product => {
        const currentID = product.currentID;
        const ptype = product.ptype;
        const isInventory = product.isInventory;
        const variationValue = product.variationValue;
        const price = product.price;
        const productCost = product.productCost;
        const quantity = product.quantity || 0;
        const taxType = product.taxType || 'inclusive';
        const taxRate = product.taxRate;
        const discount = product.discount;
        const discountedPrice = Math.max(price - discount, 0);
        const baseSubtotal = discountedPrice * quantity;
        const taxAmount = price * quantity * taxRate;
        const subtotal =
            taxType?.toLowerCase() === "exclusive"
                ? baseSubtotal + taxAmount
                : baseSubtotal;
        const productProfit = (((price - discount) * quantity) - (productCost * quantity)) || 0;
        const warehouseId = product.warehouse || defaultWarehouse;
        const offcialProduct = product.offcialProduct !== undefined ? product.offcialProduct : true;

        return {
            currentID,
            ptype,
            isInventory,
            variationValue,
            name: product.name,
            price,
            productCost,
            quantity,
            discount,
            taxRate,
            taxType,
            subtotal,
            productProfit,
            offcialProduct,
            warehouse: warehouseId,
        };
    });
    // Combine common sale data with products data
    const finalSaleData = {
        ...commonSaleData,
        productsData,
    };

    console.log('Final Sale Data:', finalSaleData);
    try {
        const endpoint = '/api/createNonPosSale';
        await axios.post(`${process.env.REACT_APP_BASE_URL}${endpoint}`, finalSaleData);
        toast.success(
            'Sale created successfully!',
            { autoClose: 2000 },
            { className: "custom-toast" }
        );

        // Update the statusOfQuatation in the corresponding Quatation
        try {
            await axios.put(`${process.env.REACT_APP_BASE_URL}/api/updateQuatation/${id}`, {
                statusOfQuatation: true
            });
        } catch (updateError) {
            console.error('Error updating quotation status:', updateError);
            setError('Sale created, but failed to update quotation status.');
        }

        navigate('/viewQuotation');
    } catch (error) {
        console.error('Error creating sale:', error);
        if (error.response) {
            console.error('Error details:', error.response.data);
            setError(error.response.data.message || 'An error occurred on the server');
        } else if (error.request) {
            console.error('No response received:', error.request);
            setError('No response received from server. Please try again later.');
        } else {
            console.error('Request setup error:', error.message);
            setError(error.message || 'An unexpected error occurred.');
        }
        setProgress(false);
    } finally {
        setProgress(false);
    }
};
