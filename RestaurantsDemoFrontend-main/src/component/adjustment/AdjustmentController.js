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
import { getTax, getPriceRange, getProductCost } from '../sales/SaleController';
import { toast } from "react-toastify";


// HANDLE SAVE ADJUSTMENT
export const handleCreateAdjustment = async (grandTotal, warehouse, selectedProduct, date, setError, setResponseMessage, setProgress, navigate) => {
    setResponseMessage('');
    setError('');
    setProgress(true);

    if (!warehouse) {
        toast.error('Warehouse is required');
        setProgress(false);
        return;
    }

    if (!date) {
        toast.error('Date is required');
        setProgress(false);
        return;
    }

    const hasZeroQty = selectedProduct.some(
        (p) => !(p.barcodeQty > 0)
    );

    if (hasZeroQty) {
        toast.error('Quantity must be greater than 0 for all products');
        setProgress(false);
        return;
    }

    const commonAdjustmentData = {
        date,
        warehouse: warehouse || null,
        grandTotal,
    };

    const productsData = selectedProduct.map(product => {
        const currentID = product._id;
        const ptype = product.ptype;
        const variationValue = product.selectedVariation || product.variationValues[0];
        const AdjustmentType = product.AdjustmentType ? product.AdjustmentType : 'addition';
        const productCost = product.productCost? product.productCost : getProductCost(product, product.selectedVariation);
        const price = getPriceRange(product, product.selectedVariation);
        const quantity = product.barcodeQty || 0;
        const taxRate = product.oderTax ? product.oderTax / 100 : getTax(product, product.selectedVariation) / 100;
        const subtotal = (productCost * quantity);

        return {
            currentID,
            ptype,
            variationValue: variationValue || 'No variations',
            AdjustmentType,
            name: product.name,
            productCost,
            price,
            quantity,
            taxRate,
            subtotal,
        };
    });

    const finalAdjustmentData = {
        ...commonAdjustmentData,
        productsData,
    };
    console.log('Final Adjustment Data:', finalAdjustmentData);
    try {
        await axios.post(`${process.env.REACT_APP_BASE_URL}/api/createAdjustment`, finalAdjustmentData);
        toast.success(
            "Adjustment created successfully!",
            { autoClose: 2000 },
            { className: "custom-toast" }
        );
        setTimeout(() => {
            navigate("/viewAdjustment");
        }, 1000);

    } catch (error) {
        console.error('Error creating adjustment:', error);
        if (error.response) {
            console.error('Error details:', error.response.data);
            toast.error("Error creating an adjustment",
                { autoClose: 2000 },
                { className: "custom-toast" });
        } else if (error.request) {
            console.error('No response received:', error.request);
            toast.error("No response received from server. Please try again later.",
                { autoClose: 2000 },
                { className: "custom-toast" });
        } else {
            console.error('Request setup error:', error.message);
            toast.error(error.message + "An unexpected error occurred.",
                { autoClose: 2000 },
                { className: "custom-toast" });
        }
    } finally {
        setProgress(false); // Hide loading bar
    }
};

// HANDLE UPDATE ADJUSTMENT
export const handleUpdateAdjustment = async (id, refferenceId, grandTotal, warehouse, selectedProduct, adjustmentTypes, date, setError, setResponseMessage, setProgress, navigate) => {
    setResponseMessage('');
    setError('');
    setProgress(true);

    if (!warehouse) {
        toast.success('Warehouse information is required');
        setProgress(false);
        return;
    }

    if (!date) {
        toast.success('Date is required');
        setProgress(false);
        return;
    }
    const hasInvalidQty = selectedProduct.some((product) => {
        const qty = product.quantity ?? product.barcodeQty ?? 0;
        return qty <= 0;
    });

    if (hasInvalidQty) {
        toast.error('Quantity must be greater than 0 for all products');
        setProgress(false);
        return;
    }

    const commonAdjustmentData = {
        id,
        date,
        warehouse: warehouse || null,
        grandTotal,
        refferenceId,
    };

    const productsData = selectedProduct.map((product) => {
        const currentID = product.currentID ? product.currentID : product._id;
        const ptype = product.ptype;
        const variationValue = product.variationValue ? product.variationValue : product.selectedVariation;
        const AdjustmentType = product.AdjustmentType
        const price = product.price ? product.price : getPriceRange(product, product.selectedVariation);
        const productCost = product.productCost ? product.productCost : getProductCost(product, product.selectedVariation);
        const quantity = product.quantity;
        const taxRate = product.oderTax ? product.oderTax : getTax(product, product.selectedVariation) / 100;
        const subtotal = (productCost * quantity);

        return {
            currentID,
            ptype,
            variationValue,
            AdjustmentType,
            name: product.name,
            price,
            productCost,
            quantity,
            taxRate,
            subtotal,
        };
    });

    const finalAdjustmentData = {
        ...commonAdjustmentData,
        productsData,
    };
    try {
        const response = await axios.put(`${process.env.REACT_APP_BASE_URL}/api/updateAdjustment/${id}`, finalAdjustmentData);
        toast.success(
            "Adjustment updated successfully!",
            { autoClose: 2000 },
            { className: "custom-toast" }
        );
        setTimeout(() => {
            navigate("/viewAdjustment");
        }, 1000);
    } catch (error) {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to update adjustment';
        console.error('Error updated Adjustment:', errorMessage);
        toast.error("Error updating an adjustment",
            { autoClose: 2000 },
            { className: "custom-toast" });
    } finally {
        setProgress(false);
    }
};
