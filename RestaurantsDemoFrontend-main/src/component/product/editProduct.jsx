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

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import '../../styles/role.css';
import { Link, useParams, useNavigate } from 'react-router-dom';
import Loader from '../utill/Loader';
import { CameraIcon } from '@heroicons/react/24/outline';
import imageCompression from "browser-image-compression";
import { toast } from 'react-toastify';
import { useCurrency } from '../../context/CurrencyContext';
import { searchCategory, searchBrands, searchSupplier } from "./productFunctions";

function EditProductBody() {
    const { id } = useParams();
    const [variation, setVariation] = useState('');
    const [variationType, setVariationTypes] = useState([]);
    const [selectedVariationTypes, setSelectedVariationTypes] = useState([]);
    const [variationValues, setVariationValues] = useState({});
    const [showSections, setShowSections] = useState({});
    const [image, setImage] = useState([]);
    const [error, setError] = useState('');
    const [responseMessage, setResponseMessage] = useState('');
    const [productData, setProductData] = useState([]);
    const [suplierData, setSuplierData] = useState([]);
    const [selectedWarehouse, setSelectedWarehouse] = useState([]);
    const [warehouseValues, setWarehouseValues] = useState({});
    const [warehouseData, setWherehouseData] = useState([]);
    const [brandData, setBrandData] = useState([]);
    const [categoryData, setCategoryData] = useState([]);
    const [unitData, setUnitData] = useState([]);
    const [variationData, setVariationData] = useState([]);
    const [progress, setProgress] = useState(false);
    const { currency } = useCurrency();
    const navigate = useNavigate();
    const [previewImage, setPreviewImage] = useState(null);
    const inputRef = useRef(null);
    const [isFormValid, setIsFormValid] = useState(false);
    const debounceTimeout = useRef(null);

    const fetchData = async (url, setData, transformData) => {
        try {
            const response = await axios.get(url);
            const data = transformData ? transformData(response.data) : response.data;
            setData(data);
        } catch (error) {
            console.error(`Fetch data error from ${url}:`, error);
            setData([]);
        } finally {
            setProgress(false);
        }
    };

    useEffect(() => {
        if (productData?.image) {
            setPreviewImage(`${process.env.REACT_APP_BASE_URL}${productData.image}`);
        }
    }, [productData]);

    useEffect(() => {
        setProgress(true);
        fetchData(`${process.env.REACT_APP_BASE_URL}/api/fetchWarehouses`, setWherehouseData, (data) => data.warehouses || []);
        fetchData(`${process.env.REACT_APP_BASE_URL}/api/findAllUnit`, setUnitData, (data) => data.units || []);
        fetchData(`${process.env.REACT_APP_BASE_URL}/api/findAllVariations`, setVariationData, (data) => data.variations || []);
        fetchData(
            `${process.env.REACT_APP_BASE_URL}/api/findProductForUpdate/${id}`,
            setProductData,
            (data) => {
                return data.product || [];
            }
        );
    }, []);

    const handleCategoryInput = (e) => {
        const value = e.target.value;
        setProductData({ ...productData, category: value });

        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }
        debounceTimeout.current = setTimeout(() => {
            if (value.trim() === '') {
                setError('');
                setResponseMessage('');
                setCategoryData([]);
            } else {
                searchCategory(value, setProgress, setError, setCategoryData, setResponseMessage, categoryData);
            }
        }, 100);
    };

    const handleBrandInput = (e) => {
        const value = e.target.value;
        setProductData({ ...productData, brand: value });

        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }
        debounceTimeout.current = setTimeout(() => {
            if (value.trim() === '') {
                setError('');
                setResponseMessage('');
                setBrandData([]);
            } else {
                searchBrands(value, setProgress, setError, setBrandData, setResponseMessage, brandData);
            }
        }, 100);
    };

    const handleSupplierInput = (e) => {
        const value = e.target.value;
        setProductData({ ...productData, supplier: value });

        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }
        debounceTimeout.current = setTimeout(() => {
            if (value.trim() === '') {
                setError('');
                setResponseMessage('');
                setSuplierData([]);
            } else {
                searchSupplier(value, setProgress, setError, setSuplierData, setResponseMessage, suplierData);
            }
        }, 100);
    };

    const handleKeyDown = (e) => {
        const value = e.target.value;
        if (e.key === "Backspace" && value === '') {
            setCategoryData([]);
        }
    };

    const extractProductDetailsFromWarehouse = (productData) => {
        if (!productData || !productData.warehouse) {
            console.warn("Product data or warehouse is missing!");
            return {};
        }
        const { ptype, warehouse } = productData;
        let extractedData = {};

        if (ptype === "Single") {
            Object.entries(warehouse).forEach(([warehouseName, warehouseDetails]) => {
                if (typeof warehouseDetails === "object" && warehouseDetails !== null) {
                    const { warehouseName: _, ...productDetails } = warehouseDetails;
                    extractedData[warehouseName] = { ...productDetails };
                }
            });
        } else if (ptype === "Variation") {
            Object.entries(warehouse).forEach(([warehouseName, warehouseDetails]) => {
                let formattedWarehouse = {
                    variationValues: {}
                };
                if (warehouseDetails.variationValues) {
                    Object.entries(warehouseDetails.variationValues).forEach(([variationType, variationDetails]) => {
                        formattedWarehouse.variationValues[variationType] = {
                            variationType,
                            ...variationDetails
                        };
                    });
                }
                extractedData[warehouseName] = formattedWarehouse;
            });
        }
        return extractedData;
    };

    useEffect(() => {
        const processedProductData = extractProductDetailsFromWarehouse(productData);
        const allVariationTypes = [];
        Object.entries(processedProductData).forEach(([warehouseName, warehouseDetails]) => {
            if (warehouseDetails?.variationValues) {
                Object.keys(warehouseDetails.variationValues).forEach((variationType) => {
                    if (!allVariationTypes.includes(variationType)) {
                        allVariationTypes.push(variationType);
                    }
                });
            }
        });
        setVariationValues(productData.variationValues || {});
        setVariationTypes(allVariationTypes);
        setSelectedVariationTypes(allVariationTypes);
        setWarehouseValues(processedProductData);
        setSelectedWarehouse(Object.keys(processedProductData));
        setShowSections(Object.keys(processedProductData).reduce((acc, wh) => ({ ...acc, [wh]: true }), {}));
    }, [productData]);

    const handleVariationProductInputChange = (warehouseName, variationType, field, value) => {
        setWarehouseValues((prevValues) => {
            const updatedWarehouse = { ...prevValues[warehouseName] };

            if (!updatedWarehouse.variationValues) {
                updatedWarehouse.variationValues = {};
            }
            if (!updatedWarehouse.variationValues[variationType]) {
                updatedWarehouse.variationValues[variationType] = {};
            }

            const numberFields = ["productPrice", "productCost", "profitMargin"];
            updatedWarehouse.variationValues[variationType][field] =
                value === "" ? "" : (numberFields.includes(field) ? Number(value) : value);

            const pp = updatedWarehouse.variationValues[variationType].productPrice;
            const pc = updatedWarehouse.variationValues[variationType].productCost;

            // Only calculate if BOTH are filled and valid, otherwise CLEAR profit margin
            if (pp !== "" && pc !== "" && !isNaN(pp) && !isNaN(pc) && Number(pp) > 0 && Number(pc) >= 0) {
                const profitMargin = ((Number(pp) - Number(pc)) * 100) / Number(pp);
                updatedWarehouse.variationValues[variationType].profitMargin = Number(
                    profitMargin.toFixed(2)
                );
            } else {
                updatedWarehouse.variationValues[variationType].profitMargin = "";
            }

            return {
                ...prevValues,
                [warehouseName]: updatedWarehouse,
            };
        });
    };

    const handleAddVariationType = (e) => {
        const selectedOption = e.target.value;
        if (selectedOption && !selectedVariationTypes.includes(selectedOption)) {
            setSelectedVariationTypes([...selectedVariationTypes, selectedOption]);
            setShowSections({
                ...showSections,
                [selectedOption]: true,
            });
        }
        e.target.value = '';
    };

    const handleRemoveVariationType = (event, typeToRemove) => {
        event.preventDefault();
        setSelectedVariationTypes((prevSelected) =>
            prevSelected.filter((type) => type !== typeToRemove)
        );
        setShowSections((prevShowSections) => {
            const { [typeToRemove]: removed, ...rest } = prevShowSections;
            return rest;
        });
        setWarehouseValues((prevValues) => {
            const updatedValues = { ...prevValues };
            Object.keys(updatedValues).forEach((warehouseName) => {
                if (updatedValues[warehouseName].variationValues) {
                    const { [typeToRemove]: removed, ...rest } = updatedValues[warehouseName].variationValues;
                    updatedValues[warehouseName].variationValues = rest;
                }
            });
            return updatedValues;
        });
    };

    const handleVariationChange = (e) => {
        const selectedVariation = e.target.value || productData.variation;
        setVariation(selectedVariation);
        setProductData((prevData) => ({ ...prevData, variation: selectedVariation }));
        setVariationTypes([]);
        setVariationValues({});

        const selectedData = variationData.find((varn) => varn.variationName === selectedVariation);
        let newVariationTypes = selectedData?.variationType || [];

        const existingVariationTypes = new Set();
        Object.values(warehouseValues).forEach((warehouse) => {
            Object.keys(warehouse.variationValues || {}).forEach((variationType) => {
                existingVariationTypes.add(variationType);
            });
        });

        const uniqueVariations = new Set([...newVariationTypes].filter(type => !existingVariationTypes.has(type)));
        setVariationTypes([...uniqueVariations]);
        setSelectedVariationTypes([...uniqueVariations]);
    };

    const handleAddWarehouse = (event) => {
        const selectedWarehouseName = event.target.value;
        if (selectedWarehouseName && !warehouseValues[selectedWarehouseName]) {
            const newWarehouseData = {
                stockAlert: '',
                orderTax: '',
                productCost: '',
                taxType: 'Exclusive',
                productPrice: '',
                foreignPrice: '',
                productQty: '',
                variationValues: {},
            };
            setWarehouseValues((prevValues) => ({
                ...prevValues,
                [selectedWarehouseName]: newWarehouseData,
            }));
            setSelectedWarehouse((prevSelected) => [...prevSelected, selectedWarehouseName]);
            setShowSections((prevShowSections) => ({
                ...prevShowSections,
                [selectedWarehouseName]: true,
            }));
        }
    };

    const handleSingleProductInputChange = (warehouseName, field, value) => {
        setWarehouseValues((prevValues) => {
            const updatedWarehouse = {
                ...prevValues[warehouseName],
                [field]: value === "" ? "" : (
                    field === "productPrice" ||
                        field === "productCost" ||
                        field === "profitMargin"
                        ? Number(value)
                        : value
                ),
            };

            const pp = updatedWarehouse.productPrice;
            const pc = updatedWarehouse.productCost;

            // Only calculate if BOTH are filled and valid, otherwise CLEAR profit margin
            if (pp !== "" && pc !== "" && !isNaN(pp) && !isNaN(pc) && Number(pp) > 0 && Number(pc) >= 0) {
                const profitMargin = ((Number(pp) - Number(pc)) * 100) / Number(pp);
                updatedWarehouse.profitMargin = Number(profitMargin.toFixed(2));
            } else {
                updatedWarehouse.profitMargin = "";
            }

            return {
                ...prevValues,
                [warehouseName]: updatedWarehouse,
            };
        });
    };

    const handleRemoveWarehouse = (event, warehouseName) => {
        event.preventDefault();
        setSelectedWarehouse((prevSelected) =>
            prevSelected.filter((name) => name !== warehouseName)
        );
        setShowSections((prevShowSections) => {
            const { [warehouseName]: removed, ...rest } = prevShowSections;
            return rest;
        });
        setWarehouseValues((prevData) => {
            const { [warehouseName]: removed, ...rest } = prevData;
            return rest;
        });
    };

    const handleImageChange = async (e) => {
        const file = e.target.files[0];

        if (!file) {
            toast.error("No file selected.");
            return;
        }
        if (file.type !== "image/jpeg" || !file.name.toLowerCase().endsWith(".jpg")) {
            toast.error("Only JPG files are allowed. Please upload a valid JPG file.");
            inputRef.current.value = "";
            return;
        }
        const maxFileSizeMB = 4;
        if (file.size / 1024 / 1024 > maxFileSizeMB) {
            toast.error(`File size exceeds ${maxFileSizeMB} MB. Please upload a smaller file.`);
            inputRef.current.value = "";
            return;
        }
        const options = {
            maxSizeMB: 0.02,
            maxWidthOrHeight: 800,
            useWebWorker: true,
        };

        try {
            const image = await imageCompression.getDataUrlFromFile(file);
            const img = new Image();
            img.src = image;

            await new Promise((resolve, reject) => {
                img.onload = () => {
                    const width = img.width;
                    const height = img.height;
                    const tolerance = 100;

                    if (Math.abs(width - height) > tolerance) {
                        toast.error("Image must be approximately square (1:1 ratio within 100px tolerance). Please upload an appropriate image.");
                        inputRef.current.value = "";
                        reject();
                        return;
                    } else {
                        resolve();
                    }
                };
                img.onerror = () => {
                    toast.error("Error loading image. Please try again.");
                    inputRef.current.value = "";
                    reject();
                    return;
                };
            });

            const compressedBlob = await imageCompression(file, options);
            const compressedFile = new File([compressedBlob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
                type: "image/jpeg",
            });

            setImage(compressedFile);
            setError("");
        } catch (error) {
            console.error("Compression Error:", error);
        }
    };

    useEffect(() => {
        const defaultVariation = productData.variation;
        setVariation(defaultVariation);

        const selectedData = variationData.find(varn => varn.variationName === defaultVariation);
        if (selectedData && Array.isArray(selectedData.variationType)) {
            setVariationTypes(selectedData.variationType);
        } else {
            setVariationTypes([]);
        }
    }, [productData.variation, variationData]);

    useEffect(() => {
        const isNumericValid = (val, { allowZero = true, mustBePositive = false } = {}) => {
            if (val === "" || val === null || val === undefined) return false;
            const n = Number(val);
            if (Number.isNaN(n)) return false;
            if (mustBePositive) return n > 0;
            return allowZero ? n >= 0 : n > 0;
        };

        const validateSingleWarehouse = (warehouseName) => {
            const w = warehouseValues[warehouseName];
            if (!w) return false;

            if (!isNumericValid(w.productPrice, { mustBePositive: true })) return false;
            if (!isNumericValid(w.productCost, { allowZero: true })) return false;

            //  Check inventory-specific fields
            if (productData.isInventory) {
                if (!isNumericValid(w.productQty, { allowZero: true })) return false;
                if (!isNumericValid(w.stockAlert, { allowZero: true })) return false;
            }

            return true;
        };

        const validateVariationWarehouse = (warehouseName) => {
            const variations = warehouseValues[warehouseName]?.variationValues;
            if (!variations) return false;

            const variationKeys = Object.keys(variations);
            if (variationKeys.length === 0) return false;

            return variationKeys.every((key) => {
                const v = variations[key];
                if (!v) return false;

                if (!isNumericValid(v.productPrice, { mustBePositive: true })) return false;
                if (!isNumericValid(v.productCost, { allowZero: true })) return false;

                //  Inventory validation for variations
                if (productData.isInventory) {
                    if (!isNumericValid(v.productQty, { allowZero: true })) return false;
                    if (!isNumericValid(v.stockAlert, { allowZero: true })) return false;
                }

                return true;
            });
        };

        // Validate warehouse-level details
        const areDetailsValid =
            selectedWarehouse.length > 0 &&
            selectedWarehouse.every((warehouseName) => {
                if (productData.ptype === "Single") return validateSingleWarehouse(warehouseName);
                if (productData.ptype === "Variation") return validateVariationWarehouse(warehouseName);
                return false;
            });

        //  Validate main product fields
        const isMainFieldsValid =
            Boolean(productData.name && productData.name.trim()) &&
            Boolean(productData.code && productData.code.trim()) &&
            Boolean(productData.brand && productData.brand.trim()) &&
            Boolean(productData.category && productData.category.trim()) &&
            Boolean(productData.supplier && productData.supplier.trim()) &&
            Boolean(productData.ptype && productData.ptype.trim()) &&
            Boolean(productData.saleUnit && productData.saleUnit.trim()) &&
            selectedWarehouse.length > 0;

        const isValid = isMainFieldsValid && areDetailsValid;
        setIsFormValid(isValid);
    }, [
        productData,
        warehouseValues,
        selectedWarehouse,
    ]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('')
        setResponseMessage('')
        setProgress(true);

        const formattedWarehouses = Object.entries(warehouseValues).reduce(
            (acc, [warehouseName, warehouseData]) => {
                if (productData.ptype === "Single") {
                    acc[warehouseName] = { ...warehouseData };
                } else if (productData.ptype === "Variation") {
                    acc[warehouseName] = {
                        variationValues: { ...warehouseData.variationValues }
                    };
                }
                return acc;
            },
            {}
        );
        const formData = new FormData();
        formData.append('image', image);
        formData.append('name', productData.name);
        formData.append('code', productData.code);
        formData.append('isInventory', productData.isInventory);
        formData.append('brand', productData.brand);
        formData.append('ptype', productData.ptype);
        formData.append('category', productData.category);
        formData.append('saleUnit', productData.saleUnit);
        formData.append('supplier', productData.supplier);
        formData.append('note', productData.note);
        formData.append("variation", variation);
        formData.append("warehouse", JSON.stringify(formattedWarehouses));
        formData.append("variationValues", JSON.stringify(variationValues));
        formData.append("variationType", JSON.stringify(variationType));

        selectedVariationTypes.forEach((type) => {
            formData.append("variationType", JSON.stringify(variationType));;
            const value = variationValues[type];
            if (value) {
                Object.entries(value).forEach(([field, fieldValue]) => {
                    formData.append(`variationValues[${type}][${field}]`, fieldValue);
                });
            }
        });

        try {
            for (const [key, value] of formData.entries()) {
                try {
                    const parsedValue = JSON.parse(value);
                    console.log(`${key}:`, parsedValue);
                } catch (error) {
                    console.log(`${key}:`, value);
                }
            }
            const response = await axios.put(`${process.env.REACT_APP_BASE_URL}/api/updateProduct/${id}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response.status === 200) {
                toast.success(
                    response.data.message,
                    { autoClose: 2000 },
                    { className: "custom-toast" }
                );
                navigate('/viewProducts');
            } else {
                toast.error(response.data.message || 'An error occurred while updating the product.', { autoClose: 2000 }, { className: "custom-toast" });
                console.error('Product update failed', response.data.message);
            }

        } catch (error) {
            if (error.response) {
                toast.error(error.response.data.message || 'Server error occurred while updating the product.', { autoClose: 2000 }, { className: "custom-toast" });
                console.error('Error response:', error.response);
            } else if (error.request) {
                toast.error('Network error: No response from the server.', { autoClose: 2000 }, { className: "custom-toast" });
                console.error('Error request:', error.request);
            } else {
                toast.error('An unexpected error occurred ', { autoClose: 2000 }, { className: "custom-toast" });
                console.error('Unexpected error:', error.message);
            }
        }
        finally {
            setProgress(false);
        }
    };

    const handleClear = () => {
        setError(''); setResponseMessage(''); setProductData([])
    };

    return (
        <div className='product-page-container background-white absolute top-[80px] min-h-full p-3 sm:p-5'>
            <div className='flex justify-between items-center'>
                {progress && (
                    <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-white/80 z-50">
                        <Loader />
                    </div>
                )}
                <div>
                    <h2 className="text-lightgray-300  m-0 p-0 text-2xl">Edit Product</h2>
                </div>
                <div>
                    <Link className='px-4 py-1.5 border border-[#35AF87] text-[#35AF87] rounded-md transition-colors duration-300 hover:bg-[#35AF87] hover:text-white' to={'/viewProducts'}>Back</Link>
                </div>
            </div>
            <div className="bg-white mt-[20px] w-full min-h-full rounded-2xl px-8 shadow-md">
                <form className='pb-10' onSubmit={handleSubmit} encType="multipart/form-data">
                    <div className="flex min-h-full flex-1 flex-col px-2 py-10 lg:px-8">
                        {/* Container for the three sub-divs */}
                        <div className="flex flex-1 flex-col lg:flex-row space-y-4 lg:space-y-0 lg:space-x-4 mt-2">
                            {/* First Sub-Div============================================================================================================================================= */}
                            <div className="flex-1">
                                {/* name*/}
                                <div className="mt-2">
                                    <label className="block text-sm font-medium leading-6 text-gray-900 text-left">
                                        Product name <span className="mt-1 text-xs text-gray-500 text-left">(Max 40 characters)</span> <span className='text-red-500'>*</span>
                                    </label>
                                    <div className="mt-2">
                                        <input
                                            id="name"
                                            name="name"
                                            value={productData.name || ''}
                                            type="text"
                                            maxLength={40}
                                            required
                                            placeholder="Enter name "
                                            onChange={(e) => setProductData({ ...productData, name: e.target.value })}
                                            className="block w-[90%]  rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                        />
                                    </div>
                                </div>

                                {/* Category */}
                                <div className="mt-7">
                                    <div className="flex-1 mb-4 lg:mb-0">
                                        <div className="mt-5">
                                            <label className="block text-sm font-medium leading-6 text-gray-900 text-left">
                                                Category <span className='text-red-500'>*</span>
                                            </label>

                                            <div className="relative w-full max-w-md mt-2">
                                                <input
                                                    onChange={handleCategoryInput}
                                                    onKeyDown={handleKeyDown}
                                                    id="category"
                                                    name="category"
                                                    type="text"
                                                    placeholder="Search by category name..."
                                                    className="block w-[90%] pl-10  rounded-md border-0 py-[8.5px] px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                                    value={productData.category}
                                                />
                                                <p className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400">
                                                    <svg
                                                        className="h-5 w-5"
                                                        fill="currentColor"
                                                        viewBox="0 0 20 20"
                                                        xmlns="http://www.w3.org/2000/svg"
                                                    >
                                                        <path
                                                            fillRule="evenodd"
                                                            d="M9 3a6 6 0 100 12A6 6 0 009 3zm0-1a7 7 0 110 14A7 7 0 019 2z"
                                                            clipRule="evenodd"
                                                        />
                                                        <path
                                                            fillRule="evenodd"
                                                            d="M12.9 12.9a1 1 0 011.41 0l3 3a1 1 0 01-1.41 1.41l-3-3a1 1 0 010-1.41z"
                                                            clipRule="evenodd"
                                                        />
                                                    </svg>
                                                </p>
                                                {categoryData.length > 0 && (
                                                    <div className="absolute w-[90%] max-w-[312px] mt-2 z-10 shadow-md">
                                                        <ul className="searchBox w-full text-left shadow-sm focus:border-transparent bg-white rounded-md max-h-60 overflow-y-auto">
                                                            {categoryData.map((ct, index) => (
                                                                <li
                                                                    key={index}
                                                                    className="p-2 cursor-pointer hover:bg-gray-100"
                                                                    onClick={() => {
                                                                        setProductData({ ...productData, category: ct.category });
                                                                        setCategoryData([]);
                                                                    }}
                                                                >
                                                                    {ct.category}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Sale Unit */}
                                <div className="mt-7">
                                    <label className="block text-sm font-medium leading-6 text-gray-900 text-left">Sale Unit <span className='text-red-500'>*</span></label>
                                    <div className="mt-2">
                                        <select
                                            id="sale_unit"
                                            name="saleuUnit"
                                            value={productData.saleUnit}
                                            required
                                            onChange={(e) => setProductData({ ...productData, saleUnit: e.target.value })}
                                            className="block w-[90%]  rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                        >
                                            <option value="">Select a sale unit</option>
                                            {Array.isArray(unitData) && unitData.map((u) => (
                                                <option key={u.unitName} value={u.unitName}>{u.unitName}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="mt-7">
                                    <label className="block text-sm font-medium leading-6 text-gray-900 text-left">
                                        Note
                                    </label>
                                    <div className="mt-[6px]">
                                        <input
                                            id="note"
                                            name="note"
                                            type="text"
                                            value={productData.note}
                                            placeholder="note"
                                            onChange={(e) => setProductData({ ...productData, note: e.target.value })}
                                            className="block w-[90%]  rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* second Sub-Div=============================================================================================================================================*/}

                            <div className="flex-1">
                                {/*code*/}
                                <div className="mt-2">
                                    <label className="block text-sm font-medium leading-6 text-gray-900 text-left">
                                        Product code <span className='text-red-500'>*</span>
                                    </label>
                                    <div className="mt-2">
                                        <input
                                            id="code"
                                            name="code"
                                            type="text"
                                            value={productData.code}
                                            required
                                            onChange={(e) => setProductData({ ...productData, code: e.target.value })}
                                            placeholder="Enter code"
                                            className="block w-[90%]  rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                        />
                                    </div>
                                </div>

                                {/* Brand */}
                                <div className="mt-7">
                                    <div className="flex-1 mb-4 lg:mb-0">
                                        <div className="mt-5">
                                            <label className="block text-sm font-medium leading-6 text-gray-900 text-left">
                                                Brand <span className='text-red-500'>*</span>
                                            </label>

                                            <div className="relative w-full max-w-md mt-2">
                                                <input
                                                    onChange={handleBrandInput}
                                                    onKeyDown={handleKeyDown}
                                                    id="brand"
                                                    name="brand"
                                                    type="text"
                                                    placeholder="Search by brand name..."
                                                    className="block w-[90%] pl-10  rounded-md border-0 py-[8.5px] px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                                    value={productData.brand}
                                                />
                                                <p className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400">
                                                    <svg
                                                        className="h-5 w-5"
                                                        fill="currentColor"
                                                        viewBox="0 0 20 20"
                                                        xmlns="http://www.w3.org/2000/svg"
                                                    >
                                                        <path
                                                            fillRule="evenodd"
                                                            d="M9 3a6 6 0 100 12A6 6 0 009 3zm0-1a7 7 0 110 14A7 7 0 019 2z"
                                                            clipRule="evenodd"
                                                        />
                                                        <path
                                                            fillRule="evenodd"
                                                            d="M12.9 12.9a1 1 0 011.41 0l3 3a1 1 0 01-1.41 1.41l-3-3a1 1 0 010-1.41z"
                                                            clipRule="evenodd"
                                                        />
                                                    </svg>
                                                </p>
                                                {brandData.length > 0 && (
                                                    <div className="absolute w-[90%] max-w-[312px] mt-2 z-10 shadow-md">
                                                        <ul className="searchBox w-full text-left shadow-sm focus:border-transparent bg-white rounded-md max-h-60 overflow-y-auto">
                                                            {brandData.map((brand, index) => (
                                                                <li
                                                                    key={index}
                                                                    className="p-2 cursor-pointer hover:bg-gray-100"
                                                                    onClick={() => {
                                                                        setProductData({ ...productData, brand: brand.brandName });
                                                                        setBrandData([]);
                                                                    }}
                                                                >
                                                                    {brand.brandName}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Product type */}
                                <div className="mt-7">
                                    <label className="block text-sm font-medium leading-6 text-gray-900 text-left">Product type <span className='text-red-500'>*</span></label>
                                    <div className="mt-2">
                                        <select
                                            id="ptype"
                                            name="ptype"
                                            required
                                            value={productData.ptype}
                                            onChange={(e) => setProductData({ ...productData, ptype: e.target.value })}
                                            className="block w-[90%]  rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                        >
                                            <option value="">Select a type</option>
                                            <option>Single</option>
                                            <option>Variation</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="lg:w-[30%] w-full mt-14">
                                    <input
                                        id="image"
                                        name="image"
                                        type="file"
                                        ref={inputRef}
                                        onChange={handleImageChange}
                                        className="hidden"
                                        accept="image/*"
                                    />

                                    {/* Image Preview with ONLY camera icon in top-right */}
                                    {previewImage && (
                                        <div className="relative w-full mb-4 inline-block">
                                            <img
                                                src={productData.image ? productData.image : previewImage}
                                                alt="Product preview"
                                                className="w-28 h-28 object-cover rounded-md"
                                            />
                                            {/* Pure Camera Icon - Top Right, no text */}
                                            <label
                                                htmlFor="image"
                                                className="absolute top-1 right-1 cursor-pointer bg-[#16796E] hover:bg-[#1A5B63] rounded-full p-1 shadow-lg transition-colors"
                                            >
                                                <CameraIcon className="h-5 w-5 text-white" />
                                            </label>
                                        </div>
                                    )}

                                    {/* Add Image button when no image */}
                                    {!previewImage && (
                                        <label
                                            htmlFor="image"
                                            className="inline-flex w-full justify-center items-center gap-2 rounded-md bg-[#16796E] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1A5B63] cursor-pointer"
                                        >
                                            <CameraIcon className="h-5 w-5" />
                                            Add Image
                                        </label>
                                    )}
                                </div>
                            </div>

                            {/* Third Sub-Div=============================================================================================================================================*/}

                            <div className="flex-1">
                                <div className="flex-1 w-full">
                                    <div className="mt-2 w-[90%]">
                                        <label className="block text-left text-sm font-medium leading-6 text-gray-900">
                                            Is Inventory <span className="text-red-500">*</span>
                                        </label>
                                        <div className="mt-2 flex space-x-10 border w-full items-center p-2 rounded-md">

                                            {/* Yes Checkbox */}
                                            <label className="inline-flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={productData.isInventory === true}
                                                    className="h-5 w-5 rounded border-gray-300 accent-[#16796E] focus:ring-[#16796E]"
                                                />
                                                <span className="ml-2 text-gray-700">Yes</span>
                                            </label>

                                            {/* No Checkbox */}
                                            <label className="inline-flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={productData.isInventory === false}
                                                    className="h-5 w-5 rounded border-gray-300 accent-[#16796E] focus:ring-[#16796E]"
                                                />
                                                <span className="ml-2 text-gray-700">No</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Supplier */}
                                <div className="mt-7">
                                    <div className="flex-1 mb-4 lg:mb-0">
                                        <div className="mt-5">
                                            <label className="block text-sm font-medium leading-6 text-gray-900 text-left">
                                                Supplier <span className='text-red-500'>*</span>
                                            </label>

                                            <div className="relative w-full max-w-md mt-2">
                                                <input
                                                    onChange={handleSupplierInput}
                                                    onKeyDown={handleKeyDown}
                                                    id="supplier"
                                                    name="supplier"
                                                    type="text"
                                                    placeholder="Search by supplier name..."
                                                    className="block w-[90%] pl-10  rounded-md border-0 py-[8.5px] px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                                    value={productData.supplier}
                                                />
                                                <p className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400">
                                                    <svg
                                                        className="h-5 w-5"
                                                        fill="currentColor"
                                                        viewBox="0 0 20 20"
                                                        xmlns="http://www.w3.org/2000/svg"
                                                    >
                                                        <path
                                                            fillRule="evenodd"
                                                            d="M9 3a6 6 0 100 12A6 6 0 009 3zm0-1a7 7 0 110 14A7 7 0 019 2z"
                                                            clipRule="evenodd"
                                                        />
                                                        <path
                                                            fillRule="evenodd"
                                                            d="M12.9 12.9a1 1 0 011.41 0l3 3a1 1 0 01-1.41 1.41l-3-3a1 1 0 010-1.41z"
                                                            clipRule="evenodd"
                                                        />
                                                    </svg>
                                                </p>
                                                {suplierData.length > 0 && (
                                                    <div className="absolute w-[90%] max-w-[312px] mt-2 z-10 shadow-md">
                                                        <ul className="searchBox w-full text-left shadow-sm focus:border-transparent bg-white rounded-md max-h-60 overflow-y-auto">
                                                            {suplierData.map((sp, index) => (
                                                                <li
                                                                    key={index}
                                                                    className="p-2 cursor-pointer hover:bg-gray-100"
                                                                    onClick={() => {
                                                                        setProductData({ ...productData, supplier: sp.name });
                                                                        setSuplierData([]);
                                                                    }}
                                                                >
                                                                    {sp.name}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-7">
                                    <label className="block text-sm font-medium leading-6 text-gray-900 text-left">
                                        Variation
                                    </label>
                                    <div className="mt-2">
                                        <select
                                            id="variation"
                                            name="variation"
                                            value={productData.variation}
                                            onChange={handleVariationChange}
                                            className={`block w-[90%] rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6`}
                                            disabled
                                        >
                                            <option value="">Select a variation</option>
                                            {variationData.map((varn) => (
                                                <option key={varn.variationName} value={varn.variationName}>
                                                    {varn.variationName}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                            </div>
                        </div>


                        {/**VARIATION MANAGE SECTION========================================================================================================== */}

                        <hr className="mt-10" />
                        <h2 className="mt-10">Manage single / variations properties</h2>

                        {/* Warehouse */}
                        <div className="mt-7">
                            <label className="block text-sm font-medium leading-6 text-gray-900 text-left">Warehouse <span className='text-red-500'>*</span></label>
                            <div className="mt-2">
                                <select
                                    id="warehouse"
                                    name="warehouse"
                                    onChange={handleAddWarehouse}
                                    className="block w-[29%] rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                >
                                    <option value="">Select a warehouse</option>
                                    {warehouseData.map((wh) => (
                                        <option key={wh.name} value={wh.name}>{wh.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex flex-wrap mt-3 gap-2">
                            {selectedWarehouse &&
                                selectedWarehouse.map((type, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center px-3 py-1 bg-gray-200 rounded-full text-sm"
                                    >
                                        {type}
                                        <button
                                            className="ml-2 text-red-500"
                                            onClick={(event) => handleRemoveWarehouse(event, type)}
                                        >
                                            &#x2715;
                                        </button>
                                    </div>
                                ))}
                        </div>

                        {variation && productData.ptype !== 'Single' && (
                            <div className="mt-14">
                                <label className="block text-sm font-medium leading-6 text-gray-900 text-left">
                                    Select Variation Types
                                </label>
                                <div className="mt-2">
                                    <select
                                        id="variationSelect"
                                        onChange={handleAddVariationType}
                                        className="block w-[29%] rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                    >
                                        <option value="">Select Types</option>
                                        {variationType
                                            .filter((type) => !selectedVariationTypes.includes(type))
                                            .map((type, index) => (
                                                <option key={index} value={type}>
                                                    {type}
                                                </option>
                                            ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Display selected types as chips */}
                        {variation && productData.ptype !== 'Single' && (
                            <div className="flex flex-wrap mt-3 gap-2">
                                {selectedVariationTypes.map((type, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center px-3 py-1 bg-gray-200 rounded-full text-sm"
                                    >
                                        {type}
                                        <button
                                            className="ml-2 text-red-500"
                                            onClick={(e) => handleRemoveVariationType(e, type)}
                                        >
                                            &#x2715;
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/*CREATE VARIATION PROPERTIES============================================================================================================================*/}

                        {productData && productData.ptype === "Single" ? (
                            Object.keys(warehouseValues).length > 0 ? (
                                Object.entries(warehouseValues).map(([warehouseName, warehouse], index) => (
                                    <li key={index} className="border-2 p-5 text-left mt-20 rounded-xl list-none">
                                        <button
                                            className="mr-4 text-gray-500 size-4 text-xl stroke-8"
                                            onClick={(event) => handleRemoveWarehouse(event, warehouseName)}
                                        >
                                            &#x2715;
                                        </button>
                                        {warehouseName}
                                        <div className='p-6'>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div className="flex flex-col space-y-5">
                                                    <div>
                                                        <label className="block text-sm text-left font-medium leading-6 text-gray-900">
                                                            Stock Alert {productData.isInventory && (<span className="text-red-500">*</span>)}
                                                        </label>
                                                        <input
                                                            value={warehouse.stockAlert || ''}
                                                            type="number"
                                                            name='stockAlert'
                                                            placeholder="Stock Alert"
                                                            disabled={!productData.isInventory}
                                                            onChange={(e) => handleSingleProductInputChange(warehouseName, 'stockAlert', e.target.value)}
                                                            className="block w-[100%] rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400  focus:outline-none sm:text-sm"
                                                        />
                                                    </div>
                                                    <div className='relative'>
                                                        <label className="block text-sm font-medium text-left leading-6 text-gray-900">
                                                            Order Tax
                                                        </label>
                                                        <div className="relative">
                                                            <input
                                                                value={warehouse.orderTax || ''}
                                                                type="number"
                                                                name='orderTax'
                                                                placeholder="Order Tax"
                                                                onChange={(e) => handleSingleProductInputChange(warehouseName, 'orderTax', e.target.value)}
                                                                className="block w-[100%] rounded-md border-0 py-2.5 px-3 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400  focus:outline-none sm:text-sm"
                                                            />
                                                            <span className="absolute rounded-r-[4px] w-[44px] justify-center m-[1px] bg-gray-100 text-gray-500 inset-y-0 right-0 pr-3 flex items-center px-2 ">
                                                                %
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm text-left font-medium leading-6 text-gray-900">
                                                            Discount
                                                        </label>
                                                        <div className="relative">
                                                            <input
                                                                value={warehouse.discount || ''}
                                                                type="number"
                                                                name='discount'
                                                                placeholder="Discount"
                                                                onChange={(e) => handleSingleProductInputChange(warehouseName, 'discount', e.target.value)}
                                                                className="block w-[100%] rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400  focus:outline-none sm:text-sm"
                                                            />
                                                            <span className="m-[1px] absolute top-0 bottom-0 right-0 flex items-center px-2 bg-gray-100 text-gray-500 rounded-r-[5px]">
                                                                {currency}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col space-y-5">
                                                    <div>
                                                        <label className="block text-sm font-medium text-left leading-6 text-gray-900">
                                                            Product Cost <span className="text-red-500">*</span>
                                                        </label>
                                                        <div className="relative">
                                                            <input
                                                                value={warehouse.productCost || ''}
                                                                type="number"
                                                                name="productCost"
                                                                placeholder="Product Cost"
                                                                onChange={(e) => handleSingleProductInputChange(warehouseName, 'productCost', e.target.value)}
                                                                className="block w-full rounded-md border-0 py-2.5 px-3 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400  focus:outline-none sm:text-sm"
                                                            />
                                                            <span className="absolute inset-y-0 right-0 pl-2 pr-2 m-[1px] flex items-center bg-gray-100 text-gray-500 rounded-r-md">
                                                                {currency}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-left leading-6 text-gray-900">
                                                            Tax Type
                                                        </label>
                                                        <select
                                                            className="block w-[100%] rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400  focus:outline-none sm:text-sm"
                                                            name='taxType'
                                                            onChange={(e) => handleSingleProductInputChange(warehouseName, 'taxType', e.target.value)}
                                                            value={warehouse.taxType}
                                                        >
                                                            <option>Exclusive</option>
                                                            <option>Inclusive</option>
                                                        </select>
                                                    </div>


                                                    <div>
                                                        <label className="block text-sm font-medium text-left leading-6 text-gray-900">
                                                            Add Product Quantity {productData.isInventory && (<span className="text-red-500">*</span>)}
                                                        </label>
                                                        <input
                                                            value={warehouse.productQty || ''}
                                                            name='productQty'
                                                            type="number"
                                                            placeholder="Add Product Quantity"
                                                            onChange={(e) => handleSingleProductInputChange(warehouseName, 'productQty', e.target.value)}
                                                            className="block w-[100%] rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400  focus:outline-none sm:text-sm"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex flex-col space-y-5">
                                                    <div>
                                                        <label className="block text-sm font-medium text-left leading-6 text-gray-900">
                                                            Product Price <span className='text-red-500'>*</span>
                                                        </label>
                                                        <div className="relative">
                                                            <input
                                                                value={warehouse.productPrice || ''}
                                                                name="productPrice"
                                                                type="number"
                                                                placeholder="Product Price"
                                                                onChange={(e) => handleSingleProductInputChange(warehouseName, 'productPrice', e.target.value)}
                                                                className="block w-[100%] rounded-md border-0 py-2.5 px-3 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:outline-none sm:text-sm"
                                                            />
                                                            <span className="absolute inset-y-0 right-0 pl-2 pr-2 m-[1px] flex items-center bg-gray-100 text-gray-500 rounded-r-md">
                                                                {currency}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-left leading-6 text-gray-900">
                                                            Foreign Price
                                                        </label>
                                                        <div className="relative">
                                                            <input
                                                                value={warehouse.foreignPrice || ''}
                                                                name="foreignPrice"
                                                                type="number"
                                                                placeholder="Foreign Price"
                                                                onChange={(e) => handleSingleProductInputChange(warehouseName, 'foreignPrice', e.target.value)}
                                                                className="block w-[100%] rounded-md border-0 py-2.5 px-3 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:outline-none sm:text-sm"
                                                            />
                                                            <span className="absolute inset-y-0 right-0 pl-2 pr-2 m-[1px] flex items-center bg-gray-100 text-gray-500 rounded-r-md">
                                                                {currency}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                ))
                            ) : (
                                <p className="text-gray-500 mt-5">No warehouses added yet.</p>
                            )
                        ) : null}

                        {productData && productData.ptype === "Variation" ? (
                            Object.keys(warehouseValues).length > 0 ? (
                                Object.entries(warehouseValues).map(([warehouseName, warehouse], index) => {
                                    const variationKeys = new Set([
                                        ...Object.keys(warehouse.variationValues || {}),
                                        ...selectedVariationTypes.filter(type => !(warehouse.variationValues && warehouse.variationValues[type])),
                                    ]);

                                    return (
                                        <li key={index} className="border-2 p-5 text-left mt-20 rounded-xl list-none pb-12">
                                            <button
                                                className="mr-4 text-gray-500 size-4 text-xl stroke-8"
                                                onClick={(event) => handleRemoveWarehouse(event, warehouseName)}
                                            >
                                                &#x2715;
                                            </button>
                                            {warehouseName}
                                            <ul>
                                                {variationKeys.size > 0 ? (
                                                    Array.from(variationKeys).map((variationType, vIndex) => {
                                                        const variationDetails = warehouse.variationValues?.[variationType] || {};

                                                        return (
                                                            <li key={vIndex} className="text-left space-y-10 pt-5 pl-5 pr-2 mb-2 rounded-xl">
                                                                <div className="pt-3 pl-3 pr-3 rounded-lg">
                                                                    <h3 className="text-left text-gray-700 mb-4">
                                                                        Properties of: {variationType}
                                                                    </h3>

                                                                    <div className="flex space-x-4 items-center w-full">
                                                                        <div className="relative w-full">
                                                                            <label className="block text-sm font-medium leading-6 text-gray-900 text-left">
                                                                                Variation Type <span className="text-red-500">*</span>
                                                                            </label>
                                                                            <input
                                                                                value={variationDetails?.variationType ? variationDetails?.variationType : variationType}
                                                                                type="text"
                                                                                placeholder="Variation Type"
                                                                                onChange={(e) => handleVariationProductInputChange(warehouseName, variationType, 'variationType', e.target.value)}
                                                                                className="block w-[90%] rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                                                            />
                                                                        </div>

                                                                        <div className="relative w-full">
                                                                            <label className="block text-sm font-medium leading-6 text-gray-900 text-left">
                                                                                Product Cost <span className="text-red-500">*</span>
                                                                            </label>
                                                                            <div className="relative">
                                                                                <input
                                                                                    value={variationDetails?.productCost || ''}
                                                                                    type="number"
                                                                                    placeholder="Product Cost"
                                                                                    onChange={(e) => handleVariationProductInputChange(warehouseName, variationType, 'productCost', e.target.value)}
                                                                                    className="block w-[90%] rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                                                                />
                                                                                <span className="m-[1px] mr-[10.6%] absolute top-0 bottom-0 right-0 flex items-center px-2 bg-gray-100 text-gray-500 rounded-r-[5px]">
                                                                                    {currency}
                                                                                </span>
                                                                            </div>
                                                                        </div>

                                                                        <div className="relative w-full">
                                                                            <label className="block text-sm font-medium leading-6 text-gray-900 text-left">
                                                                                Product Price <span className="text-red-500">*</span>
                                                                            </label>
                                                                            <div className="relative">
                                                                                <input
                                                                                    type="number"
                                                                                    value={variationDetails?.productPrice || ''}
                                                                                    placeholder="Product Price"
                                                                                    onChange={(e) => handleVariationProductInputChange(warehouseName, variationType, 'productPrice', e.target.value)}
                                                                                    className="block w-[90%] rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                                                                />
                                                                                <span className="m-[1px] mr-[10.6%] absolute top-0 bottom-0 right-0 flex items-center px-2 bg-gray-100 text-gray-500 rounded-r-[5px]">
                                                                                    {currency}
                                                                                </span>
                                                                            </div>
                                                                        </div>

                                                                        <div className="relative w-full">
                                                                            <label className="block text-sm font-medium leading-6 text-gray-900 text-left">
                                                                                Product Qty {productData.isInventory && (<span className="text-red-500">*</span>)}
                                                                            </label>
                                                                            <input
                                                                                value={variationDetails?.productQty || ''}
                                                                                type="number"
                                                                                placeholder="Product Quantity"
                                                                                onChange={(e) => handleVariationProductInputChange(warehouseName, variationType, 'productQty', e.target.value)}
                                                                                className="block w-[90%] rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                                                            />
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex space-x-4 items-center mt-5 w-full">
                                                                        <div className="relative w-full">
                                                                            <label className="block text-sm text-left font-medium leading-6 text-gray-900">
                                                                                Discount
                                                                            </label>
                                                                            <div className="relative w-[90%]">
                                                                                <input
                                                                                    value={variationDetails?.discount || ''}
                                                                                    type="number"
                                                                                    name='discount'
                                                                                    placeholder="Discount"
                                                                                    onChange={(e) => handleVariationProductInputChange(warehouseName, variationType, 'discount', e.target.value)}
                                                                                    className="block w-[100%] rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                                                                />
                                                                                <span className="m-[1px] absolute top-0 bottom-0 right-0 flex items-center px-2 bg-gray-100 text-gray-500 rounded-r-[5px]">
                                                                                    {currency}
                                                                                </span>
                                                                            </div>
                                                                        </div>

                                                                        <div className="relative w-full">
                                                                            <label className="block text-sm font-medium leading-6 text-gray-900 text-left">
                                                                                Product Tax <span className="text-red-500">*</span>
                                                                            </label>
                                                                            <div className="relative">
                                                                                <input
                                                                                    type="number"
                                                                                    value={variationDetails?.orderTax || ''}
                                                                                    placeholder="Order Tax"
                                                                                    onChange={(e) => handleVariationProductInputChange(warehouseName, variationType, 'orderTax', e.target.value)}
                                                                                    className="block w-[90%] rounded-md border-0 py-2.5 px-3 pr-12 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                                                                />
                                                                                <span className="absolute m-[1px] mr-[10.6%] top-0 bottom-0 right-0 flex items-center justify-center w-[42px] bg-gray-100 text-gray-500 rounded-r-[5px]">
                                                                                    %
                                                                                </span>
                                                                            </div>
                                                                        </div>

                                                                        <div className="relative w-full">
                                                                            <label className="block text-sm font-medium leading-6 text-gray-900 text-left">
                                                                                Tax Type <span className="text-red-500">*</span>
                                                                            </label>
                                                                            <select
                                                                                value={variationDetails?.taxType || ''}
                                                                                onChange={(e) => handleVariationProductInputChange(warehouseName, variationType, 'taxType', e.target.value)}
                                                                                className="block w-[90%] rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                                                            >
                                                                                <option value="" disabled>Select Tax Type</option>
                                                                                <option>Exclusive</option>
                                                                                <option>Inclusive</option>
                                                                            </select>
                                                                        </div>

                                                                        <div className="relative w-full">
                                                                            <label className="block text-sm font-medium leading-6 text-gray-900 text-left">
                                                                                Stock Alert {productData.isInventory && (<span className="text-red-500">*</span>)}
                                                                            </label>
                                                                            <input
                                                                                type="number"
                                                                                value={variationDetails?.stockAlert || ''}
                                                                                placeholder="Stock Alert"
                                                                                disabled={!productData.isInventory}
                                                                                onChange={(e) => handleVariationProductInputChange(warehouseName, variationType, 'stockAlert', e.target.value)}
                                                                                className="block w-[90%] rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                                                            />
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex space-x-1 items-center mt-5 w-full">
                                                                        <div className="relative w-1/4">
                                                                            <label className="block text-sm text-left font-medium leading-6 text-gray-900">
                                                                                Foreign Price
                                                                            </label>
                                                                            <div className="relative w-[86%]">
                                                                                <input
                                                                                    value={variationDetails?.foreignPrice || ''}
                                                                                    type="number"
                                                                                    name='foreignPrice'
                                                                                    placeholder="0.00"
                                                                                    onChange={(e) => handleVariationProductInputChange(warehouseName, variationType, 'foreignPrice', e.target.value)}
                                                                                    className="block w-[100%] rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                                                                />
                                                                                <span className="m-[1px] w-[44px] justify-center absolute top-0 bottom-0 right-0 flex items-center px-2 bg-gray-100 text-gray-500 rounded-r-[5px]">
                                                                                    {currency}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </li>
                                                        );
                                                    })
                                                ) : (
                                                    <p className="text-gray-500"></p>
                                                )}
                                            </ul>
                                        </li>
                                    );
                                })
                            ) : (
                                <p className="text-gray-500 mt-5">No warehouses added yet.</p>
                            )
                        ) : null}

                        {/*SAVE AND CLEAR BUTTONS==============================================================================================================================*/}
                        <div className="flex justify-start mt-10">
                            <div className="mt-20">
                                <button
                                    type="submit"
                                    disabled={!isFormValid}
                                    className={`rounded-md px-4 py-3.5 h-[48px] text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 w-[171px] text-center ${isFormValid ? 'button-bg-color button-hover-color' : 'bg-[#35af8787] cursor-not-allowed'
                                        }`}
                                >
                                    save product
                                </button>
                                <button
                                    type="button"
                                    className="inline-flex ml-2 justify-center rounded-md bg-gray-600 py-3.5 px-4 text-sm font-medium text-white shadow-sm hover:bg-gray-500 focus:outline-none focus:ring-2 w-[170px] focus:ring-gray-500 focus:ring-offset-2"
                                    onClick={handleClear}
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
                {/* Error and Response Messages */}
                <div className='pb-28'>
                    {error && (
                        <p className="text-red-600 px-5 py-2 rounded-md bg-red-100 mt-5 text-center inline-block">
                            {error}
                        </p>
                    )}
                    {responseMessage && (
                        <p className="text-color px-5 py-2 rounded-md bg-green-100 mt-5 text-center inline-block">
                            {responseMessage}
                        </p>
                    )}
                </div>
            </div >
        </div >
    );
}
export default EditProductBody;
