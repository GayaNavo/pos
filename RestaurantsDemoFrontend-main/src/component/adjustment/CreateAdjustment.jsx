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

import React, { useState, useEffect } from "react";
import axios from "axios";
import { handleProductSelect, handleProductSearch, handleWarehouseChange, handleVariationChange, getQty, handleDelete, getProductCost, handleRemoveVariation } from "../sales/SaleController";
import { handleCreateAdjustment } from "./AdjustmentController";
import "../../styles/role.css";
import { Link, useNavigate } from "react-router-dom";
import { fetchProductDataByWarehouse } from "../pos/utils/fetchByWarehose";
import Decrease from "../../img/down-arrow (1).png";
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import formatWithCustomCommas from '../utill/NumberFormate';
import { useCurrency } from '../../context/CurrencyContext';

function CreateAdjustmentBody() {
    // State management
    const { currency } = useCurrency()
    const [warehouseData, setWarehouseData] = useState([]);
    const [warehouse, setWarehouse] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState([]);
    const [date, setDate] = useState("");
    const [selectedCategoryProducts, setSelectedCategoryProducts] = useState([]);
    const [selectedBrandProducts, setSelectedBrandProducts] = useState([]);
    const [productBillingHandling, setSearchedProductData] = useState([]);
    const [productData, setProductData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [progress, setProgress] = useState(false);
    const [responseMessage, setResponseMessage] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        const fetchAllWarehouses = async () => {
            try {
                const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/fetchWarehouses`);
                setWarehouseData(response.data.warehouses || []);
            } catch (error) {
                console.error('Failed to fetch all warehouses:', error);
            }
        };
        fetchAllWarehouses();
    }, []);

    useEffect(() => {
        const today = new Date();
        const formattedDate = today.toISOString().split('T')[0];
        setDate(formattedDate);
    }, []);

    const calculateTotal = () => {
        const productTotal = selectedProduct.reduce((total, product) => {
            const productCost = Number(
                getProductCost(product, product.selectedVariation)
            );
            const productQty = product.barcodeQty || 0;
            const subTotal =
                productCost * productQty;
            return total + subTotal;
        }, 0);
        const grandTotal = productTotal;
        return grandTotal;
    };

    const handleTypeChange = (index, AdjustmentType) => {
        setSelectedProduct((prevProducts) =>
            prevProducts.map((product, i) => {
                if (i === index) {
                    return {
                        ...product,
                        AdjustmentType: AdjustmentType,
                    };
                }
                return product;
            })
        );
    };

    // HANDLE QUANTITY CHANGING
    const handleQtyChange = (index, selectedVariation, setSelectedProduct, change) => {
        setSelectedProduct((prevProducts) => {
            return prevProducts.map((product, i) => {
                if (i === index) {
                    if (product.variationValues && selectedVariation) {
                        const variation = product.variationValues[selectedVariation];
                        const currentQty = variation?.barcodeQty;

                        let updatedQty;
                        if (currentQty === '' || currentQty === null || currentQty === undefined) {
                            updatedQty = 0 + change;
                        } else {
                            updatedQty = currentQty + change;
                        }
                        updatedQty = Math.max(1, updatedQty);

                        return {
                            ...product,
                            barcodeQty: updatedQty,
                            variationValues: {
                                ...product.variationValues,
                                [selectedVariation]: {
                                    ...variation,
                                    barcodeQty: updatedQty
                                }
                            }
                        };
                    }
                    else {
                        const currentQty = product.barcodeQty;
                        let updatedQty;
                        if (currentQty === '' || currentQty === null || currentQty === undefined) {
                            updatedQty = 0 + change;
                        } else {
                            updatedQty = currentQty + change;
                        }
                        updatedQty = Math.max(1, updatedQty);

                        return { ...product, barcodeQty: updatedQty };
                    }
                }
                return product;
            });
        });
    };

    const handleQtyInputChange = (index, selectedVariation, setSelectedProduct, value) => {
        setSelectedProduct((prevProducts) =>
            prevProducts.map((product, i) => {
                if (i === index) {
                    if (value === '') {
                        if (product.variationValues && selectedVariation) {
                            const variation = product.variationValues[selectedVariation];
                            return {
                                ...product,
                                barcodeQty: '',
                                variationValues: {
                                    ...product.variationValues,
                                    [selectedVariation]: {
                                        ...variation,
                                        barcodeQty: '',
                                    },
                                },
                            };
                        } else {
                            return { ...product, barcodeQty: '' };
                        }
                    }

                    const parsedValue = parseInt(value, 10);
                    if (isNaN(parsedValue)) return product;

                    const num = Math.max(1, parsedValue);

                    if (product.variationValues && selectedVariation) {
                        const variation = product.variationValues[selectedVariation];
                        return {
                            ...product,
                            barcodeQty: num,
                            variationValues: {
                                ...product.variationValues,
                                [selectedVariation]: {
                                    ...variation,
                                    barcodeQty: num,
                                },
                            },
                        };
                    } else {
                        return { ...product, barcodeQty: num };
                    }
                }
                return product;
            })
        );
    };

    return (
        <div className="background-white relative left-0 w-full sm:left-[220px] sm:w-[calc(100%-220px)] 2xl:left-[18%] 2xl:w-[82%] min-h-[100vh] p-5">
            {progress && (
  <Box className="fullscreen-loader">
    <CircularProgress size={70} thickness={5} />
  </Box>
            )}
            <div className="flex flex-col sm:flex-row mt-20 justify-between items-start sm:items-center gap-3">
                <div>
                    <h2 className="text-lightgray-300  m-0 p-0 text-2xl">
                        Create Adjustment
                    </h2>
                </div>
                <div className="w-full sm:w-auto">
                    <Link
                        className='px-4 py-1.5 border border-[#35AF87] text-[#35AF87] rounded-md transition-colors duration-300 hover:bg-[#35AF87] hover:text-white inline-block text-center w-full sm:w-auto'
                        to={"/viewAdjustment"}
                    >
                        Back
                    </Link>
                </div>
            </div>
            <div className="bg-white mt-[20px] w-full rounded-2xl px-4 sm:px-8 shadow-md pb-28 ">
                <div className="flex  flex-1 flex-col px-2 py-12 lg:px-8">
                    <form>
                        <div className="flex flex-col sm:flex-row w-full gap-5">
                            {" "}
                            {/* warehouse*/}
                            <div className="flex-1">
                                {" "}
                                {/* Use flex-1 to allow the field to take full width */}
                                <label className="block text-sm font-medium leading-6 text-gray-900 text-left">
                                    Select warehouse <span className='text-red-500'>*</span>
                                </label>
                                <select
                                    id="warehouse"
                                    name="warehouse"
                                    value={warehouse}
                                    required
                                    disabled={selectedProduct.length > 0}
                                    onChange={(e) =>
                                        handleWarehouseChange(
                                            e,
                                            setWarehouse,
                                            fetchProductDataByWarehouse,
                                            setProductData,
                                            setSelectedCategoryProducts,
                                            setSelectedBrandProducts,
                                            setSearchedProductData,
                                            setLoading
                                        )
                                    }
                                    className="searchBox w-full pl-10 pr-2 py-2.5 border border-gray-300 rounded-md shadow-sm focus:border-transparent"
                                >
                                    <option value="">Select a warehouse</option>
                                    {warehouseData.map((wh) => (
                                        <option key={wh.name} value={wh.name}>
                                            {wh.name}
                                        </option>
                                    ))}
                                </select>
                                {error.username && (
                                    <p className="text-red-500">
                                        {error.username}
                                    </p>
                                )}
                            </div>
                            {/*Date*/}
                            <div className="flex-1 ">
                                {" "}
                                {/* Use flex-1 here as well */}
                                <label className="block text-sm font-medium leading-6 text-gray-900 text-left">
                                    Date <span className='text-red-500'>*</span>
                                </label>
                                <input
                                    id="date"
                                    name="date"
                                    type="date"
                                    required
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    autoComplete="given-name"
                                    className="block w-full rounded-md border- pl-5 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                />
                            </div>
                        </div>
                    </form>

                    <div className="flex-1 mt-5 relative">
                        {/* Input Field */}
                        <label className="block text-sm font-medium leading-6 text-gray-900 text-left">
                            Product :{" "} <span className='text-red-500'>*</span>
                        </label>
                        <input
                            id="text"
                            name="text"
                            type="text"
                            required
                            disabled={!warehouse}
                            value={searchTerm}
                            onChange={(e) =>
                                handleProductSearch(
                                    e,
                                    setSearchTerm,
                                    setFilteredProducts,
                                    warehouse
                                )
                            }
                            placeholder={searchTerm ? "" : "        Search..."}
                            className="block w-full rounded-md border-0 py-2.5 pl-10 pr-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                        />
                        {filteredProducts.length > 0 && (
                            <ul className="absolute left-0 z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1">
                                {filteredProducts.map((product) => (
                                    <li
                                        key={product._id}
                                        onClick={() =>
                                            handleProductSelect(
                                                product,
                                                setSelectedProduct,
                                                setSearchTerm,
                                                setFilteredProducts
                                            )
                                        }
                                        className="cursor-pointer hover:bg-gray-100 text-left  px-4 py-2"
                                    >
                                        {product.name}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="mt-10 min-w-full bg-white border border-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Name
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Stock Qty
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Adjusting Qty
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Product Cost
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Type
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Variation
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Action
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedProduct.map((product, index) => (
                                    <tr key={index}>
                                        <td className="px-6 py-4 whitespace-nowrap text-left  text-sm text-gray-500">
                                            {product.name}
                                        </td>

                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <p className="rounded-[5px] text-center p-[6px] bg-green-100 text-green-600 font-semibold">
                                                {product.productQty || getQty(product, product.selectedVariation)}
                                            </p>
                                        </td>

                                        <td className="px-6 py-4 whitespace-nowrap text-left text-sm text-gray-500">
                                            <div className="flex items-center">
                                                {/* Decrement button */}
                                                <button
                                                    onClick={() =>
                                                        handleQtyChange(index, product.selectedVariation, setSelectedProduct, -1)
                                                    }
                                                    className="px-2 py-2 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                                                >
                                                    <img className="w-[17px] h-[17px]" src={Decrease} alt="decrease" />
                                                </button>

                                                {/* Editable input */}
                                                <input
                                                    type="number"
                                                    value={
                                                        product.ptype === "Variation"
                                                            ? product.variationValues?.[product.selectedVariation]?.barcodeQty ?? ''
                                                            : product.barcodeQty ?? ''
                                                    }
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (val === '') {
                                                            handleQtyInputChange(index, product.selectedVariation, setSelectedProduct, '');
                                                        } else {
                                                            handleQtyInputChange(index, product.selectedVariation, setSelectedProduct, val);
                                                        }
                                                    }}
                                                    className="mx-2 w-16 py-[6px] text-center border rounded outline-none border-gray-300 focus:ring-1 focus:ring-gray-300"
                                                    min="0"
                                                />

                                                {/* Increment button */}
                                                <button
                                                    onClick={() =>
                                                        handleQtyChange(index, product.selectedVariation, setSelectedProduct, 1)
                                                    }
                                                    className="px-2 py-2 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                                                >
                                                    <img
                                                        className="w-[17px] h-[17px] transform rotate-180"
                                                        src={Decrease}
                                                        alt="increase"
                                                    />
                                                </button>
                                            </div>
                                        </td>

                                        {/* Product Price */}
                                        <td className="px-6 py-4 whitespace-nowrap text-left text-sm text-gray-500">
                                            {currency}{" "}
                                            {formatWithCustomCommas(getProductCost(
                                                product,
                                                product.selectedVariation
                                            ))}
                                        </td>

                                        {/* Product adajustment type */}
                                        <td className="px-6 py-4 whitespace-nowrap text-left text-sm text-gray-500">
                                            <select
                                                required
                                                value={product.selectedType}
                                                onChange={(e) =>
                                                    handleTypeChange(
                                                        index,
                                                        e.target.value
                                                    )
                                                }
                                                className="block w-full border py-2 border-gray-300 rounded-md shadow-sm focus:border-transparent"
                                            >
                                                <option value="addition">
                                                    Addition
                                                </option>
                                                <option value="subtraction">
                                                    Subtraction
                                                </option>
                                            </select>
                                        </td>

                                        <td className="px-6 py-4 text-left whitespace-nowrap text-sm text-gray-500">
                                            {product.ptype === "Variation" && product.variationValues ? (
                                                <div className="flex items-center justify-left gap-2">
                                                    {/* Current Variation Display */}
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-3 py-2 bg-blue-100 text-blue-700 rounded-md text-sm font-medium">
                                                            {product.selectedVariation}
                                                        </span>
                                                    </div>

                                                    {/* Add New Variation Dropdown */}
                                                    {Object.keys(product.variationValues).length > (product.addedVariations || []).length && (
                                                        <select
                                                            onChange={(e) => {
                                                                if (e.target.value) {
                                                                    handleVariationChange(index, e.target.value, setSelectedProduct);
                                                                    e.target.value = ""; // Reset dropdown
                                                                }
                                                            }}
                                                            className="w-[130px] border py-1.5 px-2 border-gray-300 rounded-md shadow-sm outline-none border-gray-300 focus:ring-1 focus:ring-gray-300 transition-colors"
                                                            defaultValue=""
                                                        >
                                                            <option value="" disabled>+ Add More</option>
                                                            {Object.keys(product.variationValues)
                                                                .filter(variationKey => !(product.addedVariations || []).includes(variationKey))
                                                                .map((variationKey) => (
                                                                    <option key={variationKey} value={variationKey}>
                                                                        {variationKey}
                                                                    </option>
                                                                ))}
                                                        </select>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 italic">No Variations</span>
                                            )}
                                        </td>

                                        {/* Delete Action */}
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-left text-gray-500">
                                            <button
                                                onClick={() => {
                                                    // If it's a variation product and there are multiple variations added, use remove function
                                                    if (product.ptype === 'Variation' && (product.addedVariations || []).length > 1) {
                                                        handleRemoveVariation(index, setSelectedProduct);
                                                    } else {
                                                        // Otherwise use the regular delete
                                                        handleDelete(index, selectedProduct, setSelectedProduct);
                                                    }
                                                }}
                                                className="text-red-500 hover:text-red-700 font-bold py-1 px-2 transition-colors"
                                                title="Remove product"
                                            >
                                                <i className="fas fa-trash mr-1"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-4 text-right text-lg font-semibold">
                        Total: {currency} {formatWithCustomCommas(calculateTotal().toFixed(2))}
                    </div>
                    <button
                        onClick={() =>
                            handleCreateAdjustment(
                                calculateTotal().toFixed(2),
                                warehouse,
                                selectedProduct,
                                date,
                                setError,
                                setResponseMessage,
                                setProgress,
                                navigate
                            )
                        }
                        className="mt-5 submit  w-[200px] text-white rounded py-2 px-4"
                    >
                        Save Adjustment
                    </button>
                </div>
                {/* Error and Response Messages */}
                <div className="mt-5">
                    <div className="relative">
                        {/* Reserve space for messages */}
                        <div className="absolute top-0 left-0 w-full">
                            {error && (
                                <p className="text-red-600 px-5 py-2 rounded-md bg-red-100 text-center mx-auto max-w-sm">
                                    {error}
                                </p>
                            )}
                            {responseMessage && (
                                <p className="text-color px-5 py-2 rounded-md bg-green-100 text-center mx-auto max-w-sm">
                                    {responseMessage}
                                </p>
                            )}
                        </div>
                        {/* Reserve empty space to maintain layout */}
                        <div className="h-[50px]"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
export default CreateAdjustmentBody;
