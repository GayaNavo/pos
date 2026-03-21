

import axios from "axios";

export const fetchCategoryData = async (category, setSelectedCategoryProducts, setSelectedBrandProducts,setSearchedProductData, setLoading, warehouse = null) => {
    setLoading(true);
    setSelectedBrandProducts([]); 
    setSearchedProductData([]); // Clear brand products when a category is selected
    try {
        console.log(`Fetching category data for catId: ${category}`);
        const params = { category };
        if (warehouse) {
            params.warehouse = warehouse;
        }
        const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/getProduct`, {
            params
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
