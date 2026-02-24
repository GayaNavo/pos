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

import axios from 'axios';

export const fetchProductDataByWarehouse = async (
    warehouse,
    setProductData,
    setSelectedCategoryProducts,
    setSelectedBrandProducts,
    setSearchedProductData,
    setLoading
) => {
    if (!warehouse) {
        console.warn("No warehouse selected, skipping API call.");
        return; // Prevent fetching all products
    }
    
    setLoading(true);
    setSelectedBrandProducts([]);
    setSearchedProductData([]);
    try {
        const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/getProduct`, {
            params: { warehouse },
        });
        if (response.data && Array.isArray(response.data.products)) {
            setSelectedCategoryProducts(response.data.products);
        } else {
            console.error('Unexpected response format:', response.data);
            setSelectedCategoryProducts([]);
        }
    } catch (error) {
        console.error('Error fetching category products:', error);
        setSelectedCategoryProducts([])
    } finally {
        setLoading(false);
    }
    
};
