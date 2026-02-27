

import { useEffect } from "react";

function ProductFilters({ setFilters, setLoading }) {
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const pageSize = 10000;
            const pageNumber = 1;
            try {
                const [brandResponse, warehouseResponse, categoryResponse] = await Promise.all([
                    fetch(`${process.env.REACT_APP_BASE_URL}/api/fetchBrands?page[size]=${pageSize}&page[number]=${pageNumber}`),
                    fetch(`${process.env.REACT_APP_BASE_URL}/api/fetchWarehouses?page[size]=${pageSize}&page[number]=${pageNumber}`),
                    fetch(`${process.env.REACT_APP_BASE_URL}/api/fetchCategories?page[size]=${pageSize}&page[number]=${pageNumber}`),
                ]);

                // Parse JSON responses
                const brands = await brandResponse.json();
                const warehouses = await warehouseResponse.json();
                const categories = await categoryResponse.json();

                // Update filters
                setFilters({
                    brands: Array.isArray(brands.data) ? brands.data : [],
                    warehouses: Array.isArray(warehouses?.warehouses) ? warehouses.warehouses : [],
                    categories: Array.isArray(categories?.data) ? categories.data : [],
                });
            } catch (error) {
                console.error("Error fetching data:", error);
                setFilters({
                    brands: [],
                    warehouses: [],
                    categories: [],
                });
            } finally {
                setLoading(false); // Stop loading
            }
        };

        fetchData();
    }, []);

    return null
}
export default ProductFilters;
