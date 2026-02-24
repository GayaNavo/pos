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

import React, { useState } from 'react';
import popSound from '../../../../src/audio/b.mp3';
import { useCurrency } from '../../../context/CurrencyContext';

const ProductVariationModal = ({
    selectedProduct,
    setSelectVariation,
    productBillingHandling,
    setProductBillingHandling,
    setProductKeyword,
    inputRef
}) => {
    const [selectedVariations, setSelectedVariations] = useState([]);
    const { currency } = useCurrency();

    const playSound = () => {
        const audio = new Audio(popSound);
        audio.play().catch(error => {
            console.error('Audio play failed:', error);
        });
    };

    // Safety check
    if (!selectedProduct || !selectedProduct.variationValues || typeof selectedProduct.variationValues !== 'object') {
        console.error("Invalid selectedProduct:", selectedProduct);
        return null;
    }

    const toggleVariation = (variationName) => {
        setSelectedVariations(prev =>
            prev.includes(variationName)
                ? prev.filter(v => v !== variationName)
                : [...prev, variationName]
        );
    };

    const handleAddToCart = () => {
        if (selectedVariations.length === 0) {
            alert('Please select at least one variation.');
            return;
        }

        const newEntries = [];
        let hasError = false;

        selectedVariations.forEach(variationName => {
            const variationDetails = selectedProduct.variationValues[variationName];

            if (!variationDetails) {
                alert(`Invalid variation: ${variationName}`);
                hasError = true;
                return;
            }

            // Inventory check
            if (selectedProduct.isInventory && variationDetails.productQty <= 0) {
                alert(`Variation "${variationName}" is out of stock.`);
                hasError = true;
                return;
            }

            // Prevent duplicates in cart
            const alreadyInCart = productBillingHandling.some(
                p => p.name === selectedProduct.name && p.selectedVariation === variationName
            );

            if (alreadyInCart) {
                alert(`Variation "${variationName}" is already in the cart.`);
                hasError = true;
                return;
            }

            newEntries.push({
                ...selectedProduct,
                price: variationDetails.productPrice,
                qty: 1,
                stokeQty: variationDetails.productQty,
                code: variationDetails.code,
                orderTax: variationDetails.orderTax,
                productCost: variationDetails.productCost,
                stockAlert: variationDetails.stockAlert,
                ptype: 'Variation',
                selectedVariation: variationName,
            });
        });

        if (hasError) return;

        playSound();

        setProductBillingHandling(prev => {
            const filtered = prev.filter(p => !(p.name === selectedProduct.name && p.ptype === 'Base'));
            return [...filtered, ...newEntries];
        });

        // Close modal and reset
        setSelectVariation(false);
        setSelectedVariations([]);
        setProductKeyword('');
        if (inputRef?.current) inputRef.current.focus();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white w-[800px] h-[720px] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-[#1A5B63] to-[#145a54] text-white p-6">
                    <h2 className="text-2xl font-bold">
                        Select Variations for <span className="text-white">{selectedProduct.name}</span>
                    </h2>
                    <p className="mt-2 text-lg opacity-90">
                        Variation Type: <strong>{selectedProduct.variation}</strong>
                    </p>
                </div>

                {/* Main Content - Split View */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Left: Available Variations (Scrollable List) */}
                    <div className="w-1/2 border-r border-gray-200 overflow-y-auto p-6 bg-gray-50">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">
                            Available {selectedProduct.variation}s
                        </h3>
                        <div className="space-y-3">
                            {Object.entries(selectedProduct.variationValues)
                                .filter(([_, data]) => data.productQty >= 0)
                                .map(([variationName, variationData]) => {
                                    const isDisabled = selectedProduct.isInventory && variationData.productQty <= 0;
                                    const isSelected = selectedVariations.includes(variationName);

                                    return (
                                        <div
                                            key={variationName}
                                            onClick={() => !isDisabled && toggleVariation(variationName)}
                                            className={`
                                                group relative p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer
                                                ${isSelected
                                                    ? 'bg-[#1A5B63] text-white border-[#145a54] shadow-lg'
                                                    : 'bg-white border-gray-300 hover:border-[#145a54] hover:shadow-md'
                                                }
                                                ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                                            `}
                                        >
                                            <div className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleVariation(variationName)}
                                                    disabled={isDisabled}
                                                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                                <div className="ml-4 flex-1">
                                                    <p className={`font-semibold ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                                                        {variationName}
                                                    </p>
                                                    <p className={`text-sm mt-1 ${isSelected ? 'text-blue-100' : 'text-gray-600'}`}>
                                                        {currency} {variationData.productPrice?.toLocaleString()} • {variationData.productQty} in stock
                                                        {isDisabled && " (Out of Stock)"}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>

                    {/* Right: Selected Variations Details */}
                    <div className="w-1/2 overflow-y-auto p-6 bg-white">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                            <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Selected Variations ({selectedVariations.length})
                        </h3>

                        {selectedVariations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-96 text-center text-gray-400">
                                <div className="bg-gray-200 border-2 border-dashed rounded-2xl w-32 h-32 mb-6" />
                                <p className="text-lg font-medium">No variations selected yet</p>
                                <p className="text-sm mt-2">Click on any variation from the left to add it here</p>
                            </div>
                        ) : (
                            <div className="space-y-5">
                                {selectedVariations.map((variationName) => {
                                    const details = selectedProduct.variationValues[variationName];
                                    const isLowStock = selectedProduct.isInventory && details.productQty <= (details.stockAlert || 5);

                                    return (
                                        <div
                                            key={variationName}
                                            className="relative bg-gradient-to-br from-gray-50 to-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden group"
                                        >
                                            <div className="p-6">
                                                <div className="flex justify-between items-start mb-4">
                                                    <h4 className="text-xl font-bold text-gray-900">{variationName}</h4>
                                                    {isLowStock && (
                                                        <span className="px-3 py-1 text-xs font-bold text-orange-700 bg-orange-100 rounded-full">
                                                            Low Stock
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Details Grid */}
                                                <div className="grid grid-cols-2 gap-4 text-sm text-left">
                                                    <div>
                                                        <span className="text-gray-500 text-left">Price:</span>
                                                        <p className="font-bold text-lg text-gray-900">
                                                            {currency} {details.productPrice?.toLocaleString() || '0'}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500">Available:</span>
                                                        <p className={`font-bold text-lg ${isLowStock ? 'text-orange-600' : 'text-green-600'}`}>
                                                            {details.productQty} in stock
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500">Code:</span>
                                                        <p className="font-medium text-gray-800">{details.code || '-'}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500">Tax:</span>
                                                        <p className="font-medium text-gray-800">{details.orderTax || 0}%</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500">Discount:</span>
                                                        <p className="font-medium text-gray-800">{details.discount || 0}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500">Cost Price:</span>
                                                        <p className="font-medium text-gray-800">
                                                            {currency} {details.productCost?.toLocaleString() || '0'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {details.stockAlert > 0 && (
                                                    <div className="mt-4 pt-4 border-t border-gray-200">
                                                        <p className="text-xs text-gray-500">
                                                            Alert when stock ≤ {details.stockAlert}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Remove Button (appears on hover) */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleVariation(variationName);
                                                }}
                                                className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-red-100 hover:bg-red-200 text-red-600 p-2 rounded-full"
                                                title="Remove variation"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end space-x-4">
                    <button
                        onClick={() => {
                            setSelectVariation(false);
                            setSelectedVariations([]);
                        }}
                        className="px-8 py-3 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-xl transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleAddToCart}
                        disabled={selectedVariations.length === 0}
                        className="px-8 py-3 bg-[#1A5B63] hover:bg-[#145a54] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition flex items-center"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Add Selected to Cart ({selectedVariations.length})
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductVariationModal;