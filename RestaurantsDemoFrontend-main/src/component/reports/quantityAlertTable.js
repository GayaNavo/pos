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

import React from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { useCurrency } from '../../context/CurrencyContext';
import formatWithCustomCommas from '../utill/NumberFormate';
import ProductIcon from "../../img/product icon.jpg";
import { handleExportPdf } from '../utill/ExportingPDF';

const QuantityAlertTable = ({ combinedProductData, loading, error,}) => {
    const { currency } = useCurrency();

     // Get price range for a product
     const getPriceRange = (product) => {
        if (product.variationValues) {
            const prices = Object.values(product.variationValues)
                .map(variation => Number(variation.productPrice))
                .filter(price => !isNaN(price));
            if (prices.length > 0) {
                const minPrice = Math.min(...prices);
                const maxPrice = Math.max(...prices);
                return minPrice === maxPrice ? `${minPrice}` : `${minPrice} - ${maxPrice}`;
            }
        }
        const singlePrice = Number(product.productPrice);
        return !isNaN(singlePrice) && singlePrice > 0 ? `${singlePrice}` : 'Price not available';
    };

    // Calculate total quantity for a product
    const getQty = (product) => {
        if (product.ptype === 'Variation' && product.variationValues) {
            const qty = Object.values(product.variationValues)
                .map(variation => Number(variation.productQty))
                .filter(qty => !isNaN(qty));
            return qty.length > 0 ? qty.reduce((total, current) => total + current, 0) : 0;
        } else {
            const singleProductQty = Number(product.productQty);
            return !isNaN(singleProductQty) && singleProductQty > 0 ? singleProductQty : 0;
        }
    };

    // Determine if a product is low in stock
    const isLowStock = (product) => {
        const stockQty = getQty(product);
        const stockAlert = Number(product.stockAlert);
        return !isNaN(stockAlert) && stockQty < stockAlert;
    };

    // Filter and sort products with low stock
    const lowStockProducts = combinedProductData
        .filter((product) => isLowStock(product))
        .sort((a, b) => getQty(a) - getQty(b)); 
        

    return (
        <>
            {loading ? (
  <Box className="fullscreen-loader">
    <CircularProgress size={70} thickness={5} />
  </Box>
            ) : lowStockProducts.length > 0 ? (
                <div className="overflow-x-auto pt-6 pb-4">
                    <table className="min-w-full bg-white">
                        <thead>
                            <tr className="bg-gray-50 border border-gray-300 rounded-lg">
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">PRODUCT</th>
                                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">NAME</th>
                                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">CATEGORY</th>
                                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">CODE</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">IN STOCK</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {lowStockProducts.map((p, index) => {
                                const stockQty = p.productQty || getQty(p);
                                return (
                                    <tr key={`${p._id}-${index}`} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg">
                                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                                </svg>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium text-center">{p.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-center">{p.brand || 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-center">{p.code}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-[#A8E6CF] text-[#2D8A7E]">
                                                    {stockQty}
                                                </span>
                                                <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-[#87CEEB] text-[#1E5F8C]">
                                                    {p.saleUnit}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="text-center text-gray-700 mt-5">No products with low stock</p>
            )}
            {error && <p className="text-green-500 mt-5 text-center">{error}</p>}
        </>
    );
};

export default QuantityAlertTable;
