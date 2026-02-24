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
import { debounce } from 'lodash';
import { fetchAllData } from './fetchAllData';
export const handleFindProductBySearch = (e, setProductKeyword, handleProductSubmit) => {
    const keyword = e.target.value;
    setProductKeyword(keyword);
    handleProductSubmit(keyword);
};

export const determineSearchTypeOfProduct = (keyword) => {
    if (/^[A-Za-z0-9\-]+$/.test(keyword)) {
        return 'code';
    }
    return 'name';
};

export const handleProductSubmit = async (Productkeyword, setLoading, setSearchedProductData) => {
    setLoading(true);
    try {
        const searchType = determineSearchTypeOfProduct(Productkeyword);
        const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/findproductByCode`, {
            params: { keyword: Productkeyword, searchType }
        });

        if (response.data && response.data.product) {
            setSearchedProductData([response.data.product]);
        } else {
            console.log('No product found for the given keyword');
            setSearchedProductData([]);
        }
    } catch (error) {
        console.error('Find product error:', error);
        setSearchedProductData([]);
    } finally {
        setLoading(false);
        console.log('Search completed. Loading state:', setLoading);
    }
};
