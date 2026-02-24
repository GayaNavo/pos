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

export const fetchCategoryData = async (category, setSelectedCategoryProducts, setSelectedBrandProducts,setSearchedProductData, setLoading) => {
    setLoading(true);
    setSelectedBrandProducts([]); 
    setSearchedProductData([]); // Clear brand products when a category is selected
    try {
        console.log(`Fetching category data for catId: ${category}`);
        const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/getProduct`, {
            params: { category}
        });
        if (response.data && response.data.products && Array.isArray(response.data.products)) {
            //console.log(response.data.products);
            setSelectedCategoryProducts(response.data.products);
        } else {
            console.error('Unexpected response format:', response.data);
            setSelectedCategoryProducts([]);
        }
    } catch (error) {
        console.error('Error fetching category products:', error);
        setSelectedCategoryProducts([]);
    } finally {
        setLoading(false);
    }
};
