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

import { useState, useEffect, useRef, useContext } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Loader from '../utill/Loader';
import PaginationDropdown from "../utill/Pagination";
import { toast } from "react-toastify";
import ConfirmationModal from "../common/deleteConfirmationDialog";
import ProductIcon from "../../img/product icon.jpg";
import formatWithCustomCommas from '../utill/NumberFormate';
import { useCurrency } from '../../context/CurrencyContext';
import { UserContext } from "../../context/UserContext";
import { useSidebar } from "../../context/SidebarContext";

function ViewProductsBody() {
  // State variables
  const [productData, setProductData] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [searchedProduct, setSearchedProduct] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [responseMessage, setResponseMessage] = useState("");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);  // State for controlling modal visibility
  const [productToDelete, setProductToDelete] = useState(null);
  const debounceTimeout = useRef(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { currency } = useCurrency()
  const [permissionData, setPermissionData] = useState({});
  const { userData } = useContext(UserContext);
  const { hideSidebar } = useSidebar();

  useEffect(() => {
    if (userData?.permissions) {
      console.log("UserData received in useEffect:", userData);

      setPermissionData(extractPermissions(userData.permissions));
    }
  }, [userData]);


  const fetchUnitData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_BASE_URL}/api/findAllProduct`,
        {
          params: {
            sort: "-createdAt",
            "page[size]": size,  // Ensure correct parameter format
            "page[number]": page, // Ensure correct parameter format
          },
        }
      );

      // Handle the response format with 'products' key
      if (response.data && Array.isArray(response.data.products)) {
        console.log("Product data:", response.data.products);
        setProductData(response.data.products);
        setSearchedProduct(response.data.products);
        setTotalPages(response.data.totalPages || 1); // Default to 1 if undefined
        setKeyword('');
      } else {
        console.error("Unexpected response format:", response.data);
        setProductData([]);
        setSearchedProduct([]);
        setError("Failed to load products. Please try again later.");
      }
    } catch (error) {
      console.error("Fetch product data error:", error);
      setProductData([]);
      setSearchedProduct([]);
      setError("No products found.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (keyword.trim() === '') {
      fetchUnitData();
    }
  }, [keyword, page, size, refreshKey]);

  const handleNextPage = () => {
    if (page < totalPages) setPage((prev) => prev + 1);
  };

  const handlePrevPage = () => {
    if (page > 1) setPage((prev) => prev - 1);
  };

  // Handle delete unit from full list
  const handleDelete = async (_id) => {
    try {
      await axios.delete(
        `${process.env.REACT_APP_BASE_URL}/api/deleteProduct/${_id}`
      );
      setProductData(productData.filter((p) => p._id !== _id));
      toast.success(
        "Product deleted successfully!",
        { autoClose: 2000 },
        { className: "custom-toast" }
      );
      setRefreshKey(prevKey => prevKey + 1);
      fetchUnitData();
    } catch (error) {
      console.error("Delete product error:", error);
      toast.error("Error deleting product!", { autoClose: 2000 });
    }
  };

  const showConfirmationModal = (productId) => {
    setProductToDelete(productId);
    setIsModalOpen(true);
  };

  const searchProduct = async (query) => {
    setLoading(true);
    setError(""); // Clear any previous error messages

    try {
      if (!query.trim()) {
        // If the query is empty, reset to all products
        setSearchedProduct(productData); // Reset to the initial list
        setResponseMessage("");
        return;
      }

      const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/searchProduct`, {
        params: { keyword: query }, // Send the keyword parameter
      });

      if (response.data.products && response.data.products.length > 0) {
        setSearchedProduct(response.data.products);
        setResponseMessage("");
      } else {
        setSearchedProduct([]); // Clear the table
        setError("No products found for the given query."); // Set error message
      }
    } catch (error) {
      console.error("Search product error:", error);
      setSearchedProduct([]); // Clear the table
      setError("No products found for the given query.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
  }, [searchedProduct]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setKeyword(value);

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    debounceTimeout.current = setTimeout(() => {
      if (value.trim() === "") {
        setError("");
        setResponseMessage("");
        setSearchedProduct(productData); // Reset to full list
      } else {
        searchProduct(value); // Call the search API with the entered query
      }
    }, 100); // Adjust debounce delay as needed
  };


  // Handle keydown events
  const handleKeyDown = (e) => {
    const value = e.target.value;

    // If backspace is pressed and the input becomes empty, reset the searchedBaseUnits
    if (e.key === 'Backspace' && value === '') {
      setSearchedProduct([]);
    }
  };

  const getPriceRange = (product) => {
    const prices = [];

    if (product.warehouse) {
      for (const warehouseKey in product.warehouse) {
        const warehouse = product.warehouse[warehouseKey];
        if (warehouse.variationValues) {
          for (const variationKey in warehouse.variationValues) {
            const variation = warehouse.variationValues[variationKey];
            const price = Number(variation.productPrice);
            if (!isNaN(price)) {
              prices.push(price);
            }
          }
        } else {
          const price = Number(warehouse.productPrice);
          if (!isNaN(price)) {
            prices.push(price);
          }
        }
      }
    }

    if (prices.length > 0) {
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);

      // If all prices are the same, return the single price
      if (minPrice === maxPrice) {
        return `${minPrice}`;
      } else {
        return `${minPrice} - ${maxPrice}`;
      }
    }

    // Fallback to single product price if no variations are available
    const singlePrice = Number(product.productPrice);
    if (!isNaN(singlePrice) && singlePrice > 0) {
      return `${singlePrice}`;
    }
    return "Price not available"; // Default case when no price is found
  };

  // Calculate price range (min and max) for products with variations
  const getQty = (product) => {
    const qty = [];

    if (product.warehouse) {
      for (const warehouseKey in product.warehouse) {
        const warehouse = product.warehouse[warehouseKey];
        if (warehouse.variationValues) {
          for (const variationKey in warehouse.variationValues) {
            const variation = warehouse.variationValues[variationKey];
            const quantity = Number(variation.productQty);
            if (!isNaN(quantity)) {
              qty.push(quantity);
            }
          }
        } else {
          const quantity = Number(warehouse.productQty);
          if (!isNaN(quantity)) {
            qty.push(quantity);
          }
        }
      }
    }

    if (qty.length > 0) {
      return qty.reduce((total, current) => total + current, 0);
    }

    // Fallback to single product quantity if no variations are available
    const singleProductQty = Number(product.productQty);
    return !isNaN(singleProductQty) && singleProductQty > 0
      ? singleProductQty
      : 0;
  };

  // Show the popup with selected product
  const handleViewProduct = (product) => {
    // Hide sidebar on tablet views for better popup visibility
    if (window.innerWidth < 1536) {
      hideSidebar();
    }
    setSelectedProduct(product);
    setShowPopup(true);
  };

  // Close the popup
  const closePopup = () => {
    setShowPopup(false);
    setSelectedProduct(null);
  };

  // Render variation details
  const renderWarehouseDetails = (warehouses) => {
    if (!warehouses || Object.keys(warehouses).length === 0) {
      return <p className="text-gray-700 ">No Warehouses</p>;
    }
    return Object.entries(warehouses).map(([warehouseKey, warehouseValue]) => (
      <div className="mt-10">
        <div>
          <h3 className="text-left ml-5 text-gray-800 py-2 px-4 rounded-t-md bg-gray-200 inline-block z-10 relative">
            <p className="text-gray-700">{warehouseValue.warehouseName || warehouseKey}</p>
          </h3>
        </div>
        <div key={warehouseKey} className="ml-5 border p-5 py-4 rounded-tr-md rounded-b-md border-2 border-gray-200 inline-block">
          {warehouseValue.variationValues ? (
            renderVariationDetails(warehouseValue.variationValues)
          ) : (
            renderSingleProductDetails(warehouseValue)
          )}
        </div>
      </div>
    ));
  };

  const renderVariationDetails = (variationValues) => {
    if (!variationValues || Object.keys(variationValues).length === 0) {
      return <p className="text-gray-700 ">No Variations</p>;
    }
    return Object.entries(variationValues).map(([key, value]) => (
      <div key={key} className="mt-5 ">
        <div className="flex text-gray-700">
          <p className="text-left mr-10">
            <p className="text-left mr-10">Variation Type</p>
            <br /> {key}
          </p>
          <p className="text-left mr-10 ">
            <p className="text-left mr-10">Price</p>
            <br /> {currency} {formatWithCustomCommas(value.productPrice)}
          </p>
          <p className="text-left mr-10">
            <p className="text-left mr-10">Quantity</p>
            <br /> {value.productQty}
          </p>
          <div className="text-left mr-10">
            <p className="text-left mr-10">Discount</p>
            <br />{value.discount || 0} %
          </div>
        </div>
      </div>
    ));
  };

  const renderSingleProductDetails = (warehouseValue) => (
    <div className="">
      <div className="flex text-gray-700">
        <p className="text-left mr-10">
          <p className="text-left mr-10">Product Cost</p> <br />
          {currency} {formatWithCustomCommas(warehouseValue.productCost)}
        </p>
        <p className="text-left mr-10">
          <p className="text-left mr-10">Price</p>
          <br />{currency} {formatWithCustomCommas(warehouseValue.productPrice)}
        </p>
        <p className="text-left mr-10">
          <p className="text-left mr-10">Quantity</p>
          <br /> {warehouseValue.productQty}
        </p>
        <p className="text-left mr-10">
          <p className="text-left mr-10">Alert</p>
          <br /> {warehouseValue.stockAlert}
        </p>
        <p className="text-left mr-10">
          <p className="text-left mr-10">Tax</p> <br />
          {warehouseValue.orderTax} %
        </p>
      </div>
    </div>
  );

  const extractPermissions = (permissions) => {
    let extractedPermissions = {};

    Object.keys(permissions).forEach((category) => {
      Object.keys(permissions[category]).forEach((subPermission) => {
        extractedPermissions[subPermission] = permissions[category][subPermission];
      });
    });

    return extractedPermissions;
  };

  return (
    <div className="product-page-container relative background-white absolute top-[80px] min-h-[100vh] p-3 sm:p-5">
      <div className="flex flex-col sm:flex-row justify-between mb-4 gap-3">
        <div className="relative w-full max-w-md">
          <form className="flex items-center">
            <input
              name="keyword"
              type="text"
              placeholder="Search by name or code..."
              className="searchBox w-80 pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:border-transparent"
              value={keyword}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
            />
            <button
              type="submit"
              className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400"
            >
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
            </button>
          </form>
        </div>
        <div className="flex items-center">
          {permissionData.create_product && (
            <div>
              <Link
                to={"/createProduct"}
                className="submit flex-none rounded-md px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 whitespace-nowrap text-center"
              >
                Create Product
              </Link>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-white/80 z-50">
          <Loader />
        </div>
      ) : error ? (
          <div className=" ">
            {error && (
              <p className="text-red-600 px-5 py-2 rounded-md bg-red-100 mt-5 text-center inline-block">
                {error}
              </p>
            )}
          </div>
        ) : searchedProduct.length > 0 ? (
          <div className="overflow-x-auto rounded-xl shadow-sm border border-[#D4AF37]/20">
            <table className="min-w-full bg-white">
              <thead className="bg-[#1F5F3B]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider rounded-tl-xl">
                    Product
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    Brand
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    Unit
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    In Stock
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    Created On
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider rounded-tr-xl">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {searchedProduct.map((p) => (
                  <tr key={p._id} className="hover:bg-[#FFF6E5]/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                        <img
                          src={p.image ? p.image : ProductIcon}
                          alt={p.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#4A2C1D]">
                      {p.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {p.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {p.brand}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-[#1F5F3B]">
                      {currency} {formatWithCustomCommas(getPriceRange(p))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {p.saleUnit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        (p.productQty ? p.productQty : getQty(p)) > 10 
                          ? 'bg-[#4CAF50]/10 text-[#4CAF50]' 
                          : (p.productQty ? p.productQty : getQty(p)) > 0 
                            ? 'bg-[#D4AF37]/10 text-[#D4AF37]' 
                            : 'bg-red-100 text-red-600'
                      }`}>
                        {p.productQty ? p.productQty : getQty(p)} units
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {(p.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        {permissionData.view_product && (
                          <button
                            className="w-8 h-8 rounded-lg bg-[#1F5F3B]/10 text-[#1F5F3B] hover:bg-[#1F5F3B] hover:text-white flex items-center justify-center transition-colors"
                            onClick={() => handleViewProduct(p)}
                          >
                            <i className="fas fa-eye text-sm"></i>
                          </button>
                        )}
                        {permissionData.edit_product && (
                          <Link
                            to={`/editProduct/${p._id}`}
                            className="w-8 h-8 rounded-lg bg-[#4CAF50]/10 text-[#4CAF50] hover:bg-[#4CAF50] hover:text-white flex items-center justify-center transition-colors"
                          >
                            <i className="fas fa-edit text-sm"></i>
                          </Link>
                        )}
                        {permissionData.delete_product && (
                          <button
                            onClick={() => showConfirmationModal(p._id)}
                            className="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors"
                          >
                            <i className="fas fa-trash text-sm"></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
        <div className="overflow-x-auto rounded-xl shadow-sm border border-[#D4AF37]/20">
          <table className="min-w-full bg-white">
            <thead className="bg-[#1F5F3B]">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider rounded-tl-xl">
                  Product
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                  Brand
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                  Unit
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                  In Stock
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                  Created On
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider rounded-tr-xl">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {productData.map((p) => (
                <tr key={p._id} className="hover:bg-[#FFF6E5]/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                      <img
                        src={p.image ? p.image : ProductIcon}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#4A2C1D]">
                    {p.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {p.code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {p.brand}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-[#1F5F3B]">
                    {currency} {formatWithCustomCommas(getPriceRange(p))}
                  </td>
                  <td className="px-7 py-5 whitespace-nowrap text-m text-gray-900 text-left">
                    {p.saleUnit}
                  </td>
                  <td className="px-7 py-5 whitespace-nowrap text-m text-gray-900 text-left">
                    {p.productQty ? p.productQty : getQty(p)}
                  </td>
                  <td className="px-7 py-5 whitespace-nowrap text-m text-gray-900 text-left">
                    {p.createdAt}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    <div className="flex items-center justify-end">
                      {permissionData.view_product && (
                        <button
                          className="text-[#35AF87] hover:text-[#16796E] font-bold py-1 px-2 mr-2 text-lg"
                          onClick={() => handleViewProduct(p)}
                          style={{ background: "transparent" }}
                        >
                          <i className="fas fa-eye mr-1"></i>
                        </button>
                      )}
                      {permissionData.edit_product && (
                        <Link
                          to={`/editProduct/${p._id}`}
                          className="text-blue-500 hover:text-blue-700 font-bold py-1 px-2 mr-2 text-lg"
                          style={{ background: "transparent" }}
                        >
                          <i className="fas fa-edit mr-1"></i>
                        </Link>
                      )}
                      {permissionData.delete_product && (
                        <button
                          onClick={() => showConfirmationModal(p._id)}
                          className="text-red-500 hover:text-red-700 font-bold py-1 px-2 text-lg"
                          style={{ background: "transparent" }}
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}  // Close modal
        onConfirm={() => handleDelete(productToDelete)}  // Confirm delete
        message="Are you sure you want to delete this product?"
      />

      {/* Pagination Controls - Visible only when data is loaded */}
      <div>
        {productData.length > 0 && (
          <PaginationDropdown
            size={size}
            setSize={setSize}
            page={page}
            setPage={setPage}
            totalPages={totalPages}
            handlePrevPage={handlePrevPage}
            handleNextPage={handleNextPage}
          />
        )}
      </div>
      {/* Popup for viewing product details */}
      {showPopup && selectedProduct && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 transition-opacity duration-300 z-50">
          <div className="bg-white p-8 mt-20 rounded-lg max-h-[80vh] overflow-y-auto shadow-2xl w-[95%] sm:w-[96%] lg:w-[85%] xl:w-[60%] text-gray-800 relative animate-fadeIn scroll-container">
            {/* Close Button */}
            <button
              onClick={closePopup}
              className="absolute top-4 right-4 text-gray-600 hover:text-red-500 transition-all"
            >
              <img
                className="w-6 h-6"
                src="https://th.bing.com/th/id/OIP.Ej48Pm2kmEsDdVNyEWkW0AHaHa?rs=1&pid=ImgDetMain"
                alt="close"
              />
            </button>

            {/* Flex Container for Details and Image */}
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Product Details (Left Side) */}
              <div className="flex-1 text-left">
                <div className="border-b pb-4 mb-5 w-full">
                  <h2 className="text-2xl font-bold text-gray-700">
                    Product Details
                  </h2>
                </div>
                <div className="mt-5 space-y-4">
                  <p>
                    <strong className="font-medium font-semibold">Name:</strong>{" "}
                    <span className="text-gray-600">
                      {selectedProduct.name}
                    </span>
                  </p>
                  <p>
                    <strong className="font-medium font-semibold">Code:</strong>{" "}
                    <span className="text-gray-600">
                      {selectedProduct.code}
                    </span>
                  </p>
                  <p>
                    <strong className="font-medium font-semibold">Product Type</strong>{" "}
                    <span className="text-gray-600">
                      {selectedProduct.ptype}
                    </span>
                  </p>
                  <p>
                    <strong className="font-medium font-semibold">Category:</strong>{" "}
                    <span className="text-gray-600">
                      {selectedProduct.category}
                    </span>
                  </p>
                  <p>
                    <strong className="font-medium font-semibold">Is Inventory:</strong>{" "}
                    <span className="text-gray-600">
                      {selectedProduct.isInventory ? "Yes" : "No"}
                    </span>
                  </p>

                  <p>
                    <strong className="font-medium font-semibold">Brand:</strong>{" "}
                    <span className="text-gray-600">
                      {selectedProduct.brand}
                    </span>
                  </p>
                  <p>
                    <strong className="font-medium font-semibold">Price:</strong>{" "}
                    <span className="text-gray-600">
                      {currency} {formatWithCustomCommas(getPriceRange(selectedProduct))}
                    </span>
                  </p>
                  <p>
                    <strong className="font-medium font-semibold">Purchase Unit:</strong>{" "}
                    <span className="text-gray-600">
                      {selectedProduct.purchase}
                    </span>
                  </p>
                  <p>
                    <strong className="font-medium font-semibold">Sale Unit:</strong>{" "}
                    <span className="text-gray-600">
                      {selectedProduct.saleUnit}
                    </span>
                  </p>
                  <p>
                    <strong className="font-medium font-semibold">In Stock:</strong>{" "}
                    <span className="text-gray-600">
                      {selectedProduct.productQty
                        ? selectedProduct.productQty
                        : getQty(selectedProduct)}
                    </span>
                  </p>
                  <p>
                    <strong className="font-medium font-semibold">Created On:</strong>{" "}
                    <span className="text-gray-600">
                      {new Date(selectedProduct.createdAt).toLocaleDateString()}
                    </span>
                  </p>
                </div>
              </div>

              {/* Product Image (Right Side) */}
              {selectedProduct.image && (
                <div className="flex-1 flex items-start mt-16 justify-center">
                  <div className="w-full max-w-[150px] h-[150px] mt-5 bg-gray-100 rounded-lg overflow-hidden shadow">
                    <img
                      src={selectedProduct.image}
                      alt={selectedProduct.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Variation Details */}
            <div className="mt-6 text-left">
              <h3 className="text-lg font-semibold text-gray-800">
                Product Properties
              </h3>
              <div className="mt-3">
                {renderWarehouseDetails(selectedProduct.warehouse)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ViewProductsBody;
