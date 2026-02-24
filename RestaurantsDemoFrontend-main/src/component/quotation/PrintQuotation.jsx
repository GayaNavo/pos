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

import React, { forwardRef } from 'react';

const PrintQuotation = forwardRef(({
    selectedCustomer,
    selectedProduct,
    date,
    discount,
    note,
    discountType,
    tax,
    shipping,
    serviceCharge,
    serviceChargeType,
    total,
    orderStatus,
    paymentStatus,
    paymentType,
    currency,
    companyDetails,
    formatWithCustomCommas,
    getPriceRange,
    getQty,
    getDiscount,
    getTax,
    getTaxType
}, ref) => {

    // Get item subtotal for display in table
    // Formula: (price * qty) + (price * qty * taxRate) - (discount * qty) for exclusive tax
    // Discount is applied AFTER tax is added to the price
    const getItemSubtotal = (product) => {
        const productPrice = Number(getPriceRange(product, product.selectedVariation));
        const productQty = product.ptype === "Variation" && product.selectedVariation
            ? product.variationValues?.[product.selectedVariation]?.barcodeQty || 0
            : product.barcodeQty || 0;
        const productDiscount = Number(getDiscount(product, product.selectedVariation));

        // Calculate product tax (tax is on original price)
        const taxType = getTaxType(product, product.selectedVariation) || 'inclusive';
        const taxRate = product.orderTax ? product.orderTax / 100 : getTax(product, product.selectedVariation) / 100;

        if (taxType.toLowerCase() === "exclusive") {
            // Exclusive: (price * qty) + (price * qty * taxRate) - (discount * qty)
            // Tax is added first, then discount is subtracted
            const priceWithTax = (productPrice * productQty) + (productPrice * productQty * taxRate);
            const totalDiscount = productDiscount * productQty;
            return Math.max(priceWithTax - totalDiscount, 0);
        }
        // Inclusive: tax is already in the price, just subtract discount
        return Math.max((productPrice * productQty) - (productDiscount * productQty), 0);
    };

    // Calculate subtotal: sum of item totals (after product discounts) to match table display
    const calculateSubtotal = () => {
        return selectedProduct.reduce((total, product) => {
            return total + getItemSubtotal(product);
        }, 0);
    };

    // Calculate gross subtotal: sum of (price * quantity) for all products (before discounts)
    const calculateGrossSubtotal = () => {
        return selectedProduct.reduce((total, product) => {
            const productPrice = Number(getPriceRange(product, product.selectedVariation));
            const productQty = product.ptype === "Variation" && product.selectedVariation
                ? product.variationValues?.[product.selectedVariation]?.barcodeQty || 0
                : product.barcodeQty || 0;
            return total + (productPrice * productQty);
        }, 0);
    };

    // Calculate total product discount (sum of discounts per product * quantity)
    const calculateProductDiscount = () => {
        return selectedProduct.reduce((total, product) => {
            const productQty = product.ptype === "Variation" && product.selectedVariation
                ? product.variationValues?.[product.selectedVariation]?.barcodeQty || 0
                : product.barcodeQty || 0;
            const productDiscount = Number(getDiscount(product, product.selectedVariation));
            return total + (productDiscount * productQty);
        }, 0);
    };

    // Calculate order-level discount (applied after product discounts)
    const calculateOrderDiscount = () => {
        if (!discount) return 0;
        const subtotalAfterProductDiscount = calculateGrossSubtotal() - calculateProductDiscount();
        return discountType === 'percentage'
            ? (subtotalAfterProductDiscount * parseFloat(discount)) / 100
            : parseFloat(discount);
    };

    // Calculate total discount (product discounts + order discount)
    const calculateTotalDiscount = () => {
        return calculateProductDiscount() + calculateOrderDiscount();
    };

    // Calculate total tax (product taxes + sale level tax) - using sale calculation formula
    // Tax is calculated on original price, not discounted price
    const calculateTotalTax = () => {
        const productTax = selectedProduct.reduce((total, product) => {
            const productPrice = Number(getPriceRange(product, product.selectedVariation));
            const productQty = product.ptype === "Variation" && product.selectedVariation
                ? product.variationValues?.[product.selectedVariation]?.barcodeQty || 0
                : product.barcodeQty || 0;
            const taxType = getTaxType(product, product.selectedVariation) || 'inclusive';
            const taxRate = product.orderTax ? product.orderTax / 100 : getTax(product, product.selectedVariation) / 100;

            // Calculate tax - tax is on original price (same as sale calculation)
            if (taxType.toLowerCase() === "exclusive") {
                // Exclusive: tax is calculated on original price
                return total + (productPrice * productQty * taxRate);
            } else {
                // Inclusive: extract tax from the price (tax = price - price/(1+rate))
                const taxAmount = (productPrice * productQty) - ((productPrice * productQty) / (1 + taxRate));
                return total + taxAmount;
            }
        }, 0);

        // Add sale-level tax
        const saleLevelTax = tax ? parseFloat(tax) : 0;
        return productTax + saleLevelTax;
    };

    // Calculate service charge
    const calculateServiceCharge = () => {
        if (!serviceCharge) return 0;
        const subtotalAfterDiscount = calculateSubtotal() - calculateTotalDiscount();
        return serviceChargeType === 'percentage'
            ? (subtotalAfterDiscount * parseFloat(serviceCharge)) / 100
            : parseFloat(serviceCharge);
    };

    // Calculate discount value (order-level discount amount)
    const calculateDiscountValue = () => {
        if (!discount) return 0;
        const subtotal = calculateSubtotal();
        return discountType === 'percentage'
            ? (subtotal * parseFloat(discount)) / 100
            : parseFloat(discount);
    };

    // Calculate tax value from total (grandTotal) using sale logic:
    // Tax value = grandTotal - (subtotal - discount + shipping + serviceCharge)
    const calculateTaxValue = () => {
        const grandTotal = parseFloat(total) || 0;
        const subtotal = calculateSubtotal();
        const discountValue = calculateDiscountValue();
        const shippingAmount = parseFloat(shipping) || 0;
        const serviceChargeAmount = calculateServiceCharge();

        const subtotalAfterDiscount = subtotal - discountValue;
        const calculatedTaxValue = grandTotal - subtotalAfterDiscount - shippingAmount - serviceChargeAmount;

        // Ensure tax is not negative
        return calculatedTaxValue > 0 ? calculatedTaxValue : 0;
    };

    return (
        <div ref={ref} className="p-2 pb-4 pt-2 bg-white text-gray-800 w-[80mm] font-sans">
            {/* Company Header */}
            <div className="text-center mb-2 border-b border-gray-300 pb-2">
                {companyDetails?.logo && (
                    <img
                        src={companyDetails.logo}
                        className="w-10 h-10 mx-auto mb-1"
                        alt="logo"
                    />
                )}
                <h1 className="text-lg font-bold">{companyDetails?.name || 'Company Name'}</h1>
                <p className="text-xs text-gray-600">{companyDetails?.address || ''}</p>
                {companyDetails?.mobile && <p className="text-xs text-gray-600">{companyDetails.mobile}</p>}
                {companyDetails?.email && <p className="text-xs text-gray-600">{companyDetails.email}</p>}
            </div>

            {/* Quotation Title */}
            <div className="text-center mb-2">
                <h2 className="text-md font-bold">QUOTATION</h2>
                <p className="text-xs">Date: {date}</p>
            </div>

            {/* Customer Details */}
            {selectedCustomer && (
                <div className="mb-2 text-xs border-b border-gray-300 pb-2">
                    <p><strong>Customer:</strong> {Array.isArray(selectedCustomer) ? (selectedCustomer[0]?.name || 'N/A') : (selectedCustomer?.name || 'N/A')}</p>
                    {(Array.isArray(selectedCustomer) ? selectedCustomer[0]?.address : selectedCustomer?.address) && (
                        <p><strong>Address:</strong> {Array.isArray(selectedCustomer) ? selectedCustomer[0].address : selectedCustomer.address}</p>
                    )}
                </div>
            )}

            {/* Product Table */}
            <div className="mb-2">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b border-gray-300">
                            <th className="text-left py-1">Item</th>
                            <th className="text-right py-1">Qty</th>
                            <th className="text-right py-1">Price</th>
                            <th className="text-right py-1">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {selectedProduct && selectedProduct.map((product, index) => {
                            const productPrice = Number(getPriceRange(product, product.selectedVariation));
                            const productQty = product.ptype === "Variation" && product.selectedVariation
                                ? product.variationValues?.[product.selectedVariation]?.barcodeQty || 0
                                : product.barcodeQty || 0;
                            const itemTotal = getItemSubtotal(product);

                            return (
                                <tr key={index} className="border-b border-dashed border-gray-200">
                                    <td className="py-1">
                                        {product.name}
                                        {product.selectedVariation && (
                                            <span className="text-gray-500 text-[10px]">
                                                <br />({product.selectedVariation})
                                            </span>
                                        )}
                                    </td>
                                    <td className="text-right py-1">{productQty}</td>
                                    <td className="text-right py-1">{formatWithCustomCommas(productPrice.toFixed(2))}</td>
                                    <td className="text-right py-1">{formatWithCustomCommas(itemTotal.toFixed(2))}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Summary Section */}
            <div className="border-t border-gray-300 pt-2 text-xs">
                <div className="flex justify-between py-1">
                    <span>Subtotal:</span>
                    <span>{currency} {formatWithCustomCommas(calculateSubtotal().toFixed(2))}</span>
                </div>

                {calculateDiscountValue() > 0 && (
                    <div className="flex justify-between py-1">
                        <span>Discount:</span>
                        <span>- {currency} {formatWithCustomCommas(calculateDiscountValue().toFixed(2))}</span>
                    </div>
                )}

                {calculateTaxValue() > 0 && (
                    <div className="flex justify-between py-1">
                        <span>Tax:</span>
                        <span>{currency} {formatWithCustomCommas(calculateTaxValue().toFixed(2))}</span>
                    </div>
                )}

                {calculateServiceCharge() > 0 && (
                    <div className="flex justify-between py-1">
                        <span>Service Charge:</span>
                        <span>{currency} {formatWithCustomCommas(calculateServiceCharge().toFixed(2))}</span>
                    </div>
                )}

                {shipping && parseFloat(shipping) > 0 && (
                    <div className="flex justify-between py-1">
                        <span>Shipping:</span>
                        <span>{currency} {formatWithCustomCommas(parseFloat(shipping).toFixed(2))}</span>
                    </div>
                )}

                <div className="flex justify-between py-2 font-bold text-sm border-t border-gray-300 mt-1">
                    <span>Total:</span>
                    <span>{currency} {formatWithCustomCommas(parseFloat(total).toFixed(2))}</span>
                </div>
            </div>

            {/* Status Information */}
            <div className="border-t border-gray-300 pt-2 mt-2 text-xs">
                {orderStatus && (
                    <div className="flex justify-between py-1">
                        <span>Order Status:</span>
                        <span className="capitalize">{orderStatus}</span>
                    </div>
                )}
                {paymentStatus && (
                    <div className="flex justify-between py-1">
                        <span>Payment Status:</span>
                        <span className="capitalize">{paymentStatus}</span>
                    </div>
                )}
                {paymentType && (
                    <div className="flex justify-between py-1">
                        <span>Payment Type:</span>
                        <span className="capitalize">{paymentType}</span>
                    </div>
                )}
            </div>

            {/* Quotation Note */}
            {note && note.trim() !== "" && (
                <div className="mt-3 pt-2 border-t border-gray-300 text-xs">
                    <p className="font-semibold mb-1">Note:</p>
                    <p className="text-[10px] whitespace-pre-wrap break-words leading-snug">
                        {note}
                    </p>
                </div>
            )}

            {/* Footer */}
            <div className="mt-4 pt-2 text-center text-xs text-gray-600 border-t border-gray-300">
                <p>Thank you for your business!</p>
                <p className="text-[10px] mt-1">This is a quotation and not a tax invoice</p>
                <p className="text-[10px]">Printed: {new Date().toLocaleString()}</p>
            </div>
        </div>
    );
});

export default PrintQuotation;
