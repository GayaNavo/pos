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
import { getProductCost, handleProductSearch, handleWarehouseChange } from "../sales/SaleController";
import { handleUpdateAdjustment } from "./AdjustmentController";
import "../../styles/role.css";
import { Link, useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import { fetchProductDataByWarehouse } from "../pos/utils/fetchByWarehose";
import Decrease from "../../img/down-arrow (1).png";
import Loader from '../utill/Loader';
import formatWithCustomCommas from '../utill/NumberFormate';
import { useCurrency } from '../../context/CurrencyContext';
import { toast } from "react-toastify";

function EditAdjustmentBody() {
  const { currency } = useCurrency()
  const [warehouse, setWarehouse] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState([]);
  const [selectedCategoryProducts, setSelectedCategoryProducts] = useState([]);
  const [selectedBrandProducts, setSelectedBrandProducts] = useState([]);
  const [productBillingHandling, setSearchedProductData] = useState([]);
  const [productData, setProductData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [responseMessage, setResponseMessage] = useState('');
  const [saleProduct, setSaleProduct] = useState({});
  const [saleReturProductData, setSaleReturProductData] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [progress, setProgress] = useState(false);
  const { id } = useParams();
  const [adjustmentTypes, setAdjustmentTypes] = useState('');
  const [total, setTotal] = useState(0);
  const navigate = useNavigate();

  // Fetch adjustment by ID
  useEffect(() => {
    const findSaleById = async () => {
      try {
        setProgress(true);
        const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/findAdjustmentById/${id}`);
        const fetchedProductsQty = response.data.productsData || [];
        const initializedProductsQty = fetchedProductsQty.map((pq) => ({
          ...pq,
          quantity: pq.quantity || Object.keys(pq.quantity)[0]
        }));
        setSaleReturProductData(initializedProductsQty);
        setSaleProduct(response.data);
        setSelectedProduct(response.data.productsData || []);
      } catch (error) {
        console.error("Error fetching sale by ID:", error);
        const errorMessage = error.response?.data?.message || "An error occurred while fetching sale details.";
        alert(errorMessage);
      } finally {
        setProgress(false);
      }
    };

    if (id) {
      findSaleById();
    }
  }, [id]);

  const getTax = (product, selectedVariation) => {
    if (product.variationValues && selectedVariation && product.variationValues[selectedVariation]) {
      const variationTax = Number(product.variationValues[selectedVariation].orderTax);
      return !isNaN(variationTax) ? variationTax : 0;
    }
    return 0;
  };

  const getQty = (product, selectedVariation) => {
    if (product.variationValues && selectedVariation) {
      const variationQty = Number(product.variationValues[selectedVariation]?.productQty);
      return !isNaN(variationQty) && variationQty > 0 ? variationQty : 0;
    }
    const singleProductQty = Number(product.productQty);
    return !isNaN(singleProductQty) && singleProductQty > 0 ? singleProductQty : 0;
  };

  const handleProductSelect = (product) => {
    setSaleReturProductData((prevProducts) => {
      const isVariationProduct = product.ptype === 'Variation' && product.variationValues;
      const isSingleProduct = product.ptype === 'Single';
      const variationKeys = isVariationProduct ? Object.keys(product.variationValues) : [];
      const selectedVariation = isVariationProduct ? variationKeys[0] : null;
      const isDuplicate = prevProducts.some((p) => {
        if (isVariationProduct) {
          return (
            p.name === product.name &&
            p.ptype === 'Variation' &&
            p.selectedVariation === selectedVariation
          );
        } else if (isSingleProduct) {
          return p.name === product.name && p.ptype === 'Single';
        }
        return false;
      });

      if (isDuplicate) {
        const type = isVariationProduct
          ? `Variation (${selectedVariation})`
          : `Product (${product.name})`;
        toast.error(`${type} is already in the list.`);
        return prevProducts;
      }

      const newProduct = {
        ...product,
        selectedVariation: isVariationProduct ? selectedVariation : 'No variations',
        barcodeFormat: product.barcode || '',
        quantity: 1,
        productCost: getProductCost(product, selectedVariation) || product.productCost || 0,
        oderTax: getTax(product, selectedVariation) / 100 ? getTax(product, selectedVariation) / 100 : product.oderTax / 100 ? product.oderTax / 100 : 0,
        source: 'frontend',
      };
      return [...prevProducts, newProduct];
    });
    setSearchTerm('');
    setFilteredProducts([]);
  };

  useEffect(() => {
    const newTotal = calculateTotal();
    setTotal(newTotal);
  }, [saleReturProductData]);

  const calculateTotal = () => {
    try {
      const productTotal = saleReturProductData.reduce((total, product) => {
        const cost = Number(product.productCost || getProductCost(product, product.selectedVariation));
        const qty = Number(product.quantity) || 0;

        if (qty <= 0) return total;

        return total + cost * qty;
      }, 0);

      return productTotal.toFixed(2);
    } catch (error) {
      console.error("Error calculating total:", error);
      toast.error("Failed to calculate total.");
      return "0.00";
    }
  };

  useEffect(() => {
    try {
      if (saleProduct.date) {
        const formattedDate = new Date(saleProduct.date).toISOString().slice(0, 10);
        setSelectedDate(formattedDate);
      }
    } catch (error) {
      console.error("Error formatting date:", error);
      toast.error("An error occurred while processing the date.");
    }
  }, [saleProduct.date]);

  useEffect(() => {
    try {
      saleReturProductData.forEach((product) => {
        if (product.AdjustmentType) {
          setAdjustmentTypes(product.AdjustmentType);
        }
      });
    } catch (error) {
      console.error("Error setting adjustment types:", error);
      toast.error("An error occurred while processing adjustment types.");
    }
  }, [saleReturProductData]);

  const handleTypeChange = (index, value) => {
    setSaleReturProductData((prevData) =>
      prevData.map((item, i) =>
        i === index
          ? { ...item, AdjustmentType: value }
          : item
      )
    );
  };

  const handleVariationChange = (index, variation) => {
    setSaleReturProductData((prevProducts) =>
      prevProducts.map((product, i) => {
        if (i === index) {
          const productWithSameVariation = prevProducts.find(
            (p, j) => j !== index && p._id === product._id && p.selectedVariation === variation
          );

          if (productWithSameVariation) {
            toast.error(`The variation "${variation}" is already added.`);
            return product;
          }
          const selectedVariationDetails = product.variationValues[variation] || {};
          const updatedPrice = selectedVariationDetails.productPrice || product.productPrice;
          const updatedTax = selectedVariationDetails.orderTax || product.oderTax;
          const updatedQty = selectedVariationDetails.productQty || 1;
          const adjustedQty = Math.min(product.quantity || 1, updatedQty);

          if (adjustedQty < product.quantity) {
            toast.error(`Purchase quantity adjusted to the available stock (${updatedQty}) for the "${variation}" variation.`);
          }

          return {
            ...product,
            selectedVariation: variation,
            productPrice: updatedPrice,
            oderTax: updatedTax,
            productQty: updatedQty,
            quantity: adjustedQty > 0 ? adjustedQty : 1,
          };
        }
        return product;
      })
    );
  };

  const handleQtyChange = (index, delta) => {
    setSaleReturProductData((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;

        const currentQty = item.quantity;
        let newQty;
        if (currentQty === '' || currentQty === null || currentQty === undefined) {
          newQty = 0 + delta;
        } else {
          newQty = currentQty + delta;
        }

        newQty = Math.max(1, newQty);

        const productCost = item.productCost || 0;
        const newSubtotal = productCost * newQty;

        return {
          ...item,
          quantity: newQty,
          subtotal: newSubtotal.toFixed(2),
        };
      })
    );
  };

  const handleQtyInputChange = (index, value) => {
    setSaleReturProductData((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;

        if (value === '') {
          return {
            ...item,
            quantity: '',
            subtotal: '0.00',
          };
        }

        const parsedValue = parseInt(value, 10);
        if (isNaN(parsedValue)) return item;

        const qty = Math.max(1, parsedValue);

        if (item.ptype === "Variation" && item.selectedVariation) {
          const selectedVariation = item.variationValues?.[item.selectedVariation];
          if (selectedVariation) {
          }
        }

        const productCost = item.productCost || 0;
        const newSubtotal = productCost * qty;

        return {
          ...item,
          quantity: qty,
          subtotal: newSubtotal.toFixed(2),
        };
      })
    );
  };

  const handleDeleteProduct = (index) => {
    setSaleReturProductData(prevData => {
      const updatedData = prevData.filter((_, i) => i !== index);
      return updatedData;
    });
  };

  useEffect(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const formattedDate = `${yyyy}-${mm}-${dd}`;
    setSelectedDate(formattedDate);
  }, []);

  const handleDateChange = (event) => {
    setSelectedDate(event.target.value);
  };

  return (
    <div className="background-white relative left-0 w-full sm:left-[220px] sm:w-[calc(100%-220px)] 2xl:left-[18%] 2xl:w-[82%] min-h-[100vh] p-5">
      {progress && (
        <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-white/80 z-50">
          <Loader />
        </div>
      )}
      <div className="flex flex-col sm:flex-row mt-20 justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-lightgray-300 m-0 p-0 text-2xl">
            Edit Adjustment
          </h2>
        </div>
        <div className="w-full sm:w-auto">
          <Link
            className="px-4 py-1.5 border border-[#35AF87] text-[#35AF87] rounded-md transition-colors duration-300 hover:bg-[#35AF87] hover:text-white inline-block text-center w-full sm:w-auto"
            to={"/viewAdjustment"}
          >
            Back
          </Link>
        </div>
      </div>

      <div className="bg-white mt-[20px] w-full rounded-2xl px-4 sm:px-8 shadow-md pb-14">
        <div className="flex  flex-1 flex-col px-2 py-12 lg:px-8">
          <form>
            <div className="flex flex-col sm:flex-row w-full gap-5">
              {" "}
              <div className="flex-1">
                {" "}
                {/* Use flex-1 to allow the field to take full width */}
                <label className="block text-sm font-medium leading-6 text-gray-900 text-left">
                  Select warehouse <span className='text-red-500'>*</span>
                </label>
                <select
                  id="warehouse"
                  name="warehouse"
                  value={saleProduct.warehouse}
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
                  className="searchBox w-full pl-10 pr-2 py-2 border border-gray-300 rounded-md shadow-sm focus:border-transparent"
                >
                  <option value="">{saleProduct.warehouse}</option>
                </select>
                {error.username && (
                  <p className="text-red-500">{error.username}</p>
                )}
              </div>
              {/* Date */}
              <div className="flex-1">
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
                  disabled
                  value={selectedDate}
                  onChange={handleDateChange}
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
              value={searchTerm}
              onChange={(e) =>
                handleProductSearch(
                  e,
                  setSearchTerm,
                  setFilteredProducts,
                  saleProduct.warehouse
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
                        setFilteredProducts,
                        setSaleReturProductData
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
            <table className="mt-10 min-w-full bg-white border rounded-md border-gray-200">
              <thead className="rounded-md bg-gray-50">
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
                    Variation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Action
                  </th>
                </tr>
              </thead>
              {saleReturProductData.length > 0 && (
                <tbody>
                  {saleReturProductData.map((product, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 text-left whitespace-nowrap text-sm text-gray-500">
                        {product.name}
                      </td>

                      <td className="px-6 py-4  text-left whitespace-nowrap text-sm ">
                        <p className="rounded-[5px] text-center p-[6px] bg-green-100 text-green-500">
                          {product.productQty || getQty(product, product.selectedVariation)}
                        </p>
                      </td>

                      <td className="px-6 py-4 text-left whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          {/* Decrement */}
                          <button
                            onClick={() => handleQtyChange(index, -1)}
                            className="px-2 py-2 bg-gray-100 rounded hover:bg-gray-200"
                          >
                            <img className="w-[16px] h-[16px]" src={Decrease} alt="decrease" />
                          </button>

                          {/* Quantity input */}
                          <input
                            type="number"
                            min="1"
                            value={product.quantity ?? ''}
                            onChange={(e) =>
                              handleQtyInputChange(index, e.target.value)
                            }
                            className="mx-2 w-16 text-center border border-gray-300 rounded-md py-1 focus:outline-none focus:ring-2 focus:ring-gray-500"
                          />

                          {/* Increment */}
                          <button
                            onClick={() => handleQtyChange(index, 1)}
                            className="px-2 py-2 bg-gray-100 rounded hover:bg-gray-200"
                          >
                            <img className="w-[16px] h-[16px] transform rotate-180" src={Decrease} alt="increase" />
                          </button>
                        </div>
                      </td>

                      {/* Product Price */}
                      <td className="px-6 py-4 text-left whitespace-nowrap text-sm text-gray-500">
                        {currency} {formatWithCustomCommas(product.productCost || getProductCost(product, product.selectedVariation))}
                      </td>

                      <td className="px-6 py-4 text-left whitespace-nowrap text-sm text-gray-500">
                        {product.variationValues && Object.keys(product.variationValues).length > 0 ? (
                          <select
                            value={product.selectedVariation}
                            disabled
                            onChange={(e) => handleVariationChange(index, e.target.value)}
                            className="block w-full border py-2 border-gray-300 rounded-md shadow-sm focus:border-transparent"
                          >
                            {Object.keys(product.variationValues).map((variationKey) => (
                              <option key={variationKey} value={variationKey}>
                                {variationKey}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span>No Variations</span>
                        )}
                      </td>

                      {/* Product adjustment type */}
                      <td className="px-6 py-4 text-left whitespace-nowrap text-sm text-gray-500">
                        <select
                          value={product.AdjustmentType}
                          onChange={(e) => handleTypeChange(index, e.target.value)}
                          className="block w-full border py-2 border-gray-300 rounded-md shadow-sm focus:border-transparent"
                        >
                          <option value="addition">Addition</option>
                          <option value="subtraction">Subtraction</option>
                        </select>
                      </td>

                      {/* Delete Action */}
                      <td className="px-6 py-4 text-left whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => handleDeleteProduct(index)}
                          className="text-red-600 hover:text-red-900 p-2 rounded"
                        >
                          <i className="fas fa-trash mr-1"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          </div>

          <div className="mt-4 text-right text-lg font-semibold">
            Total: {currency} {calculateTotal()}
          </div>
          <button
            onClick={() => {
              if (saleReturProductData.length === 0) {
                setError(
                  "Products list cannot be empty. Please add at least one product before updating."
                );
                return;
              }
              handleUpdateAdjustment(
                saleProduct._id,
                saleProduct.referenceId,
                calculateTotal(),
                saleProduct.warehouse,
                saleReturProductData,
                adjustmentTypes,
                selectedDate,
                setError,
                setResponseMessage,
                setProgress,
                navigate
              );
            }}
            className="mt-5 submit w-[200px] text-white rounded py-2 px-4"
          >
            Update & Save
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

export default EditAdjustmentBody;
