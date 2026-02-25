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
import { handleProductSelect, handleProductSearch, handleSuplierSearch, handleSuplierSelect, handleVariationChange, getQty, getBaseCost, handleDelete, handleQtyChange, handleSave, handleWarehouseChangeProduct, handleRemoveVariation } from '../../component/purchase/PurchaseController'
import '../../styles/role.css';
import { Link, useNavigate } from 'react-router-dom';
import { fetchProductDataByWarehouse } from '../pos/utils/fetchByWarehose';
import Decrease from '../../img/down-arrow (1).png';
import Loader from '../utill/Loader';
import formatWithCustomCommas from '../utill/NumberFormate';
import { toast } from 'react-toastify';
import { useCurrency } from '../../context/CurrencyContext';
import imageCompression from 'browser-image-compression';
import { FaTimes, FaPlus } from "react-icons/fa";

function CreatePurchaseBody() {
  const { currency } = useCurrency()
  const [warehouseData, setWarehouseData] = useState([]);
  const [warehouse, setWarehouse] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchSuplier, setSearchSuplier] = useState('');
  const [filteredSuplier, setFilteredSuplier] = useState([])
  const [selectedSuplier, setSelectedSuplier] = useState([])
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState([]);
  const [date, setDate] = useState('')
  const [invoiceNumber, setInvoice] = useState('');
  const [selectedCategoryProducts, setSelectedCategoryProducts] = useState([]);
  const [selectedBrandProducts, setSelectedBrandProducts] = useState([]);
  const [productBillingHandling, setSearchedProductData] = useState([]);
  const [productData, setProductData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(false);
  const [discountType, setDiscountType] = useState('');
  const [discountSymbole, setDiscountSymbole] = useState(currency);
  const [discount, setDiscount] = useState('')
  const [shipping, setShipping] = useState('')
  const [tax, setTax] = useState('')
  const [error, setError] = useState('');
  const [responseMessage, setResponseMessage] = useState('');
  const [brandData, setBrandData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const debounceTimeout = useRef(null);
  const [suplierData, setSuplierData] = useState([]);
  const [unitData, setUnitData] = useState([]);
  const [orderStatus, setOrderStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [paymentType, setPaymentType] = useState('');
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [name, setProductName] = useState("");
  const [code, setCode] = useState('');
  const [category, setCategory] = useState("");
  const [brand, setBrands] = useState("");
  const [barcode, setBarcode] = useState("");
  const [supplier, setSuplier] = useState("");
  const [saleUnit, setSaleUnit] = useState("");
  const [purchase, setPurchaseUnit] = useState("");
  const [status, setStatus] = useState("");
  const [quantityLimit, setQL] = useState("");
  const [variation, setVariation] = useState("");
  const [variationType, setVariationTypes] = useState([]);
  const [variationValues, setVariationValues] = useState({});
  const [formattedWarehouses, setFormattedWarehouses] = useState({});
  const [ptype, setType] = useState("");
  const [note, setNote] = useState("");
  const [image, setImage] = useState([]);
  const navigate = useNavigate()
  const inputRef = useRef(null);
  const [variationData, setVariationData] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState([]);
  const [isInventory, setIsInventory] = useState(false);
  const [warehouseValues, setWarehouseValues] = useState({});
  const [showSections, setShowSections] = useState({});
  const [selectedVariationTypes, setSelectedVariationTypes] = useState([]);
  const [warehouseVariationValues, setWarehouseVariationValues] = useState([]);

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
      const productCost = Number(getBaseCost(product, product.selectedVariation));
      const productQty = product.barcodeQty || 0;
      const subTotal = (productCost * productQty);
      return total + subTotal;
    }, 0);

    let discountValue = 0;
    if (discountType === 'fixed') {
      discountValue = Number(discount);
    } else if (discountType === 'percentage') {
      discountValue = (productTotal * Number(discount)) / 100;
    }

    const shippingValue = Number(shipping);
    const globalTaxRate = Number(tax) / 100;
    const globalTax = productTotal * globalTaxRate;
    const grandTotal = productTotal - discountValue + shippingValue + globalTax;
    return grandTotal;
  };

  const handleDiscountType = (e) => {
    setDiscountType(e.target.value)
  }

  const handleDiscount = (e) => {
    if (!discountType) {
      alert('Please select a discount type first.');
      return;
    }
    const value = e.target.value;
    if (discountType === 'percentage') {
      const numericValue = parseFloat(value);
      if (numericValue < 1 || numericValue > 100) {
        alert('Please enter a percentage value between 1 and 100.');
        return;
      }
    }
    setDiscount(value);
  };

  useEffect(() => {
    if (discountType === 'fixed') {
      return setDiscountSymbole(currency);
    }
    if (discountType === 'percentage') {
      return setDiscountSymbole('%');
    }
  }, [discountType]);

  const handleTax = (e) => {
    setTax(e.target.value)
  }

  const handleShippng = (e) => {
    setShipping(e.target.value)
  }

  const togglePopup = () => {
    setIsPopupOpen(!isPopupOpen);
  }

  const handleClose = () => {
    setIsPopupOpen(!isPopupOpen);
  };

  const handleImageChange = async (e, setError) => {
    const file = e.target.files[0];

    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type) || 
        !/\.(jpe?g|png)$/i.test(file.name)) {
      setError("Only JPG and PNG files are allowed. Please upload a valid image file.");
      alert("Only JPG and PNG files are allowed. Please upload a valid image file.");
      inputRef.current.value = ""; // Clear the input field
      return;
    }

    // Check file size (max 4MB)
    const maxFileSizeMB = 4;
    if (file.size / 1024 / 1024 > maxFileSizeMB) {
      alert(`File size exceeds ${maxFileSizeMB} MB. Please upload a smaller file.`);
      inputRef.current.value = ""; // Clear the input field
      return;
    }

    // Compression options
    const options = {
      maxSizeMB: 0.02, // Target size (20KB in MB)
      maxWidthOrHeight: 800, // Reduce dimensions to help with compression
      useWebWorker: true, // Enable Web Worker for efficiency
    };

    try {
      // Ensure image is approximately square (1:1 ratio within a 100px tolerance)
      const image = await imageCompression.getDataUrlFromFile(file);
      const img = new Image();
      img.src = image;

      await new Promise((resolve, reject) => {
        img.onload = () => {
          const width = img.width;
          const height = img.height;
          const tolerance = 100; // Allow 100px variance

          if (Math.abs(width - height) > tolerance) {
            alert("Image must be approximately square (1:1 ratio within 100px tolerance). Please upload an appropriate image.");
            inputRef.current.value = "";
            reject();
            return;
          } else {
            resolve();
          }
        };
        img.onerror = () => {
          inputRef.current.value = "";
          reject();
          return;
        };
      });

      const compressedBlob = await imageCompression(file, options);
      // Determine the correct extension and type based on original file
      const fileExtension = file.type === 'image/png' ? '.png' : '.jpg';
      const fileType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const compressedFile = new File([compressedBlob], file.name.replace(/\.[^/.]+$/, fileExtension), {
        type: fileType,
      });

      // Update state with the compressed image only if all validations pass
      setImage(compressedFile);
      setError("");
    } catch (error) {
      console.error("Compression Error:", error);
    }
  };

  const searchCategory = async (query) => {
    setProgress(true);
    setError('');
    try {
      if (!query.trim()) {
        setCategoryData(categoryData);
        setResponseMessage('');
        return;
      }

      const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/searchCategory`, {
        params: { category: query },
      });
      if (response.data.foundCategory && response.data.foundCategory.length > 0) {
        setCategoryData(response.data.foundCategory);
        setResponseMessage('');
      } else {
        setCategoryData([]);
        setError('No categories found for the given query.');
      }
    } catch (error) {
      console.error('Find base unit error:', error);
      setCategoryData([]);
      setError('No categories found for the given name.');
    } finally {
      setProgress(false);
    }
  };

  const handleCategoryInput = (e) => {
    const value = e.target.value;
    setCategory(value);

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    debounceTimeout.current = setTimeout(() => {
      if (value.trim() === '') {
        setError('');
        setResponseMessage('');
        setCategoryData(categoryData);
      } else {
        searchCategory(value);
      }
    }, 100);
  };

  const handleKeyDown = (e) => {
    const value = e.target.value;
    if (e.key === "Backspace" && value === '') {
      searchCategory([]);
    }
  };

  const handleAddWarehouse = (e) => {
    const selectedOption = e.target.value;
    if (selectedOption && !selectedWarehouse.includes(selectedOption)) {
      setSelectedWarehouse([...selectedWarehouse, selectedOption]);
      setShowSections({
        ...showSections,
        [selectedOption]: true,
      });

      setWarehouseValues((prevValues) => ({
        ...prevValues,
        [selectedOption]: {
          productPrice: 0,
          productCost: 0,
          discount: 0,
          orderTax: 0,
          profitMargin: 0,
          productQty: 0,
          stockAlert: 0,
          taxType: 'Exclusive'
        },
      }));
    }
    e.target.value = "";
  };

  const handleRemoveWarehouse = (typeToRemove) => {
    setSelectedWarehouse(
      selectedWarehouse.filter((type) => type !== typeToRemove)
    );
    setShowSections({
      ...showSections,
      [typeToRemove]: false,
    });
  };

  const handleWarehouseValueChange = (warehouseName, field, value) => {
    setWarehouseValues(prev => {
      const currentWarehouse = prev[warehouseName] || {
        productPrice: 0,
        productCost: 0,
        discount: 0,
        orderTax: 0,
        profitMargin: 0,
        productQty: 0,
        stockAlert: 0,
        taxType: 'Exclusive'
      };

      const updatedWarehouse = {
        ...currentWarehouse,
        [field]: ['productPrice', 'productCost', 'discount', 'orderTax', 'profitMargin', 'productQty', 'stockAlert'].includes(field)
          ? Number(value)
          : value
      };

      const pp = updatedWarehouse.productPrice;
      const pc = updatedWarehouse.productCost;

      if (pp > 0 && pc >= 0) {
        const profitMargin = ((pp - pc) * 100) / pp;
        updatedWarehouse.profitMargin = Number(profitMargin.toFixed(2));
      }

      return {
        ...prev,
        [warehouseName]: updatedWarehouse
      };
    });
  };

  const handleVariationValueChange = (type, field, value) => {
    setVariationValues((prevValues) => {
      // Initialize variation if it doesn't exist with proper defaults
      const currentVariation = prevValues[type] || {
        productPrice: 0,
        productCost: 0,
        discount: 0,
        orderTax: 0,
        profitMargin: 0,
        productQty: 0,
        stockAlert: 0,
        taxType: 'Exclusive' // Default tax type
      };

      const updatedVariation = {
        ...currentVariation,
        [field]: isNaN(value) ? value : Number(value),
      };

      const pp = updatedVariation.productPrice;
      const pc = updatedVariation.productCost;

      if (pp > 0 && pc >= 0) {
        const profitMargin = ((pp - pc) * 100) / pp;
        updatedVariation.profitMargin = Number(profitMargin.toFixed(2));
      }

      return {
        ...prevValues,
        [type]: updatedVariation,
      };
    });
  };

  const handleAddVariationType = (e) => {
    const selectedOption = e.target.value;

    if (!selectedWarehouse || selectedWarehouse.length === 0) {
      return;
    }

    if (selectedOption && !selectedVariationTypes.includes(selectedOption)) {
      setSelectedVariationTypes((prevTypes) => [...prevTypes, selectedOption]);
      setShowSections((prevSections) => ({
        ...prevSections,
        [selectedOption]: true,
      }));

      setVariationValues(prev => ({
        ...prev,
        [selectedOption]: {
          productPrice: 0,
          productCost: 0,
          discount: 0,
          orderTax: 0,
          profitMargin: 0,
          productQty: 0,
          stockAlert: 0,
          taxType: 'Exclusive'
        }
      }));

      setWarehouseVariationValues((prevValues) => {
        const newValues = { ...prevValues };

        selectedWarehouse.forEach((warehouse) => {
          if (!newValues[warehouse]) {
            newValues[warehouse] = {};
          }

          if (!newValues[warehouse][selectedOption]) {
            newValues[warehouse][selectedOption] = {
              productPrice: 0,
              productCost: 0,
              discount: 0,
              orderTax: 0,
              profitMargin: 0,
              productQty: 0,
              stockAlert: 0,
              taxType: 'Exclusive'
            };
          }
        });

        return newValues;
      });
    } else if (selectedVariationTypes.includes(selectedOption)) {
      console.log("Variation type is already selected.");
    }

    e.target.value = "";
  };

  const handleRemoveVariationType = (typeToRemove) => {
    setSelectedVariationTypes(
      selectedVariationTypes.filter((type) => type !== typeToRemove)
    );
    setShowSections({
      ...showSections,
      [typeToRemove]: false,
    });
  };

  const handleInputChange = (type, value) => {
    setVariationValues((prev) => ({ ...prev, [type]: value }));
  };

  const handleClear = () => {
    setProductName("");
    setBrands("");
    setCategory("");
    setNote("");
    setSaleUnit("");
    setPurchaseUnit("");
    setQL("");
    setType("");
    setStatus("");
    setSuplier("");
    setWarehouse([]);
    setVariation("");
    setBarcode("");
    setError("");
    setResponseMessage("");
    setVariationValues({});
    setSelectedVariationTypes([]);
    setShowSections({});
    setImage([]);
    inputRef.current.value = "";
  };

  useEffect(() => {
    console.log(warehouseVariationValues)
  }, [warehouseVariationValues])

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
    setProgress(true);
    fetchData(
      `${process.env.REACT_APP_BASE_URL}/api/fetchSupplier`, setSuplierData, (data) => data.suppliers || []
    );
    fetchData(
      `${process.env.REACT_APP_BASE_URL}/api/findBrand`, setBrandData, (data) => data.brands || []
    );
    fetchData(
      `${process.env.REACT_APP_BASE_URL}/api/findAllUnit`, setUnitData, (data) => data.units || []
    );
    fetchData(
      `${process.env.REACT_APP_BASE_URL}/api/findAllVariations`, setVariationData, (data) => data.variations || []
    );
  }, []);

  useEffect(() => {
    const formatted = Object.entries(warehouseValues).reduce(
      (acc, [warehouseName, wherehouseData]) => {
        const variations = Object.entries(variationValues).reduce(
          (varAcc, [variationName, variationData]) => {
            varAcc[variationName] = variationData;
            return varAcc;
          },
          {}
        );
        acc[warehouseName] = { ...wherehouseData, ...variations };
        return acc;
      },
      {}
    );
    setFormattedWarehouses(formatted);
  }, [warehouseValues, variationValues]);

  const handleCreateProduct = async (event) => {
    event.preventDefault();
    setError("");
    setResponseMessage("");
    setProgress(true);
    if (!isInventory) {
      if (ptype === "Single") {
        const updatedWarehouses = { ...warehouseValues };
        Object.keys(updatedWarehouses).forEach((warehouse) => {
          updatedWarehouses[warehouse].productQty = 0;
        });
        setWarehouseValues(updatedWarehouses);
      }

      if (ptype === "Variation") {
        const updatedVariationWarehouses = { ...warehouseVariationValues };
        Object.keys(updatedVariationWarehouses).forEach((warehouse) => {
          const variations = updatedVariationWarehouses[warehouse];
          Object.keys(variations).forEach((variation) => {
            variations[variation].productQty = 0;
          });
        });
        setWarehouseVariationValues(updatedVariationWarehouses);
      }
    }

    try {
      // Ensure warehouseValues is an object
      const formData = new FormData();
      formData.append("name", name);
      formData.append("code", code);
      formData.append("isInventory", isInventory);
      if (image) {
        formData.append("image", image);
      }
      formData.append("brand", brand);
      formData.append("ptype", ptype);
      formData.append("category", category);
      formData.append("saleUnit", saleUnit);
      formData.append("supplier", supplier);
      formData.append("status", status);
      formData.append("note", note);
      formData.append("purchase", purchase);
      formData.append("quantityLimit", quantityLimit);
      formData.append("barcode", barcode);
      formData.append("variation", variation);
      formData.append("warehouse", JSON.stringify(formattedWarehouses));
      formData.append("variationValues", JSON.stringify(variationValues));
      formData.append("variationType", JSON.stringify(variationType));

      // Debugging: Log form data
      for (const [key, value] of formData.entries()) {
        try {
          const parsedValue = JSON.parse(value);
          console.log(`${key}:`, parsedValue);
        } catch (error) {
          console.log(`${key}:`, value);
        }
      }

      const response = await axios.post(`${process.env.REACT_APP_BASE_URL}/api/createProduct`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success("Product created successfully!", { autoClose: 2000 });
      setTimeout(() => {
        window.location.href = '/createPurchase';
      }, 1000);
    } catch (error) {
      if (error.response) {
        const { message } = error.response.data;
        if (message) {
          toast.error(message, { autoClose: 2000 });
        } else {
          toast.error("Product not added", { autoClose: 2000 });
        }
      } else {
        toast.error(
          "An error occurred while creating the product. Please try again.",
          { autoClose: 2000 }
        );
      }
      console.error("Product creation failed:", error);
    } finally {
      setProgress(false);
    }
  };

  const handleVariationChangeProduct = (e) => {
    const selectedVariation = e.target.value;
    setVariation(selectedVariation);
    setVariationValues({});

    const selectedData = variationData.find(
      (varn) => varn.variationName === selectedVariation
    );

    if (selectedData && Array.isArray(selectedData.variationType)) {
      setVariationTypes(selectedData.variationType);
    } else {
      setVariationTypes([]);
    }
  };

  useEffect(() => {
    if (paymentStatus === 'unpaid') {
      setPaymentType('');
    }
  }, [paymentStatus]);

  const handlePaymentStatusChange = (e) => {
    const newStatus = e.target.value;
    setPaymentStatus(newStatus);
    if (newStatus === 'unpaid') {
      setPaymentType('');
    }
  };

  return (
    <div className='background-white relative left-0 w-full sm:left-[220px] sm:w-[calc(100%-220px)] 2xl:left-[18%] 2xl:w-[82%] min-h-[100vh] p-5'>
      {progress && (
        <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-white/80 z-50">
          <Loader />
        </div>
      )}
      <div className='flex flex-col sm:flex-row mt-20 justify-between items-start sm:items-center gap-3'>
        <div>
          <h2 className="text-lightgray-300  m-0 p-0 text-2xl">Create Purchase</h2>
        </div>
        <div>
          <Link className='px-4 py-1.5 border border-[#35AF87] text-[#35AF87] rounded-md transition-colors duration-300 hover:bg-[#35AF87] hover:text-white' to={'/viewPurchase'}>Back</Link>
        </div>
      </div>
      <div className="bg-white mt-[20px] min-h-[100vh] w-full rounded-2xl px-8 shadow-md pb-10">
        <div className="flex  flex-1 flex-col px-2 py-12 lg:px-8">
          <form >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"> {/* Add space between inputs if needed */}
              {/* warehouse*/}
              <div className="w-full"> {/* Use flex-1 to allow the field to take full width */}
                <label className="block text-sm font-medium leading-6 text-gray-900 text-left whitespace-nowrap mb-1">Select warehouse <span className='text-red-500'>*</span></label>
                <select
                  id="warehouse"
                  name="warehouse"
                  required
                  value={warehouse}
                  disabled={selectedProduct.length > 0}
                  onChange={(e) => handleWarehouseChangeProduct(e, setWarehouse, fetchProductDataByWarehouse, setProductData, setSelectedCategoryProducts, setSelectedBrandProducts, setSearchedProductData, setLoading)}
                  className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                >
                  <option value="">Select a warehouse</option>
                  {warehouseData.map((wh) => (
                    <option key={wh.name} value={wh.name}>
                      {wh.name}
                    </option>
                  ))}
                </select>
                {error.username && <p className="text-red-500">{error.username}</p>}
              </div>

              {/* suplier */}
              <div className="w-full relative">
                <label className="block text-sm font-medium leading-6 text-gray-900 text-left whitespace-nowrap mb-1">Supplier <span className='text-red-500'>*</span></label>
                <input
                  id="supplier"
                  name="supplier"
                  value={searchSuplier}
                  required
                  onChange={(e) => handleSuplierSearch(e, setSearchSuplier, setFilteredSuplier)}
                  placeholder="Search Supplier..."
                  className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                />
                {/* Dropdown for filtered suppliers */}
                {filteredSuplier.length > 0 && (
                  <ul className="absolute z-10 mt-1 w-[344px] bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredSuplier.map((suplier) => (
                      <li
                        key={suplier._id}
                        onClick={() => handleSuplierSelect(suplier, setSelectedSuplier, setSearchSuplier, setFilteredSuplier)}
                        className="cursor-pointer hover:bg-gray-100 px-4 py-2"
                      >
                        {suplier.name} {/* Display the supplier name */}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/*Supplier Invoice Number*/}
              <div className="w-full"> {/* Use flex-1 here as well */}
                <label className="block text-sm font-medium leading-6 text-gray-900 text-left whitespace-nowrap mb-1">Supplier Invoice No </label>
                <input
                  id="invoiceNumber"
                  name="invoiceNumber"
                  type="invoiceNumber"
                  value={invoiceNumber}
                  onChange={(e) => setInvoice(e.target.value)}
                  placeholder="Enter purchase number..."
                  className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                />
              </div>

              {/*Date*/}
              <div className="w-full"> {/* Use flex-1 here as well */}
                <label className="block text-sm font-medium leading-6 text-gray-900 text-left whitespace-nowrap mb-1">Date <span className='text-red-500'>*</span></label>
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
            <label className="block text-sm font-medium leading-6 text-gray-900 text-left mr-2">Search Products</label>
            <div className="flex items-center w-full">
              {/* Input Field */}
              <input
                id="text"
                name="text"
                type="text"
                required
                disabled={!warehouse}
                value={searchTerm}
                onChange={(e) => handleProductSearch(e, setSearchTerm, setFilteredProducts, warehouse)}
                placeholder={searchTerm ? "" : "        Search..."}
                className="block w-[100%] rounded-l-md border-0 py-2.5 pl-10 pr-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
              />

              {/* Product Create Shortcut Icon */}

              <button
                type="button"
                onClick={togglePopup}
                className="ml-0 px-4 py-2 h-[44px]  bg-gray-400 hover:bg-gray-400 rounded-r-md border-0"
                aria-label="Add Product"
              >
                <FaPlus className="text-white" size={18} /> {/* Plus Icon */}
              </button>
            </div>

            {/* Dropdown for filtered products */}
            {filteredProducts.length > 0 && (
              <ul className="absolute left-0 z-10 w-[100%] bg-white border border-gray-300 rounded-md shadow-lg mt-1">
                {filteredProducts.map((product) => (
                  <li
                    key={product._id}
                    onClick={() => handleProductSelect(product, setSelectedProduct, setSearchTerm, setFilteredProducts)}
                    className="cursor-pointer hover:bg-gray-100 text-left px-4 py-2"
                  >
                    {product.name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="overflow-x-auto">
            {selectedProduct.length > 0 && (
              <table className="mt-10 min-w-full bg-white border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock Qty</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchase Qty</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product Cost</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sub Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variation</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {selectedProduct.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-8 text-center text-sm text-gray-500">
                        No products added yet. Search and select products to add them here.
                      </td>
                    </tr>
                  ) : (
                    selectedProduct.map((product, index) => (
                      <tr key={`${product._id}-${product.selectedVariation}-${index}`} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-left whitespace-nowrap text-sm text-gray-900 font-medium">
                          {product.name}
                        </td>

                        <td className="px-6 py-4 text-left whitespace-nowrap text-sm">
                          <p className='rounded-[5px] text-center p-[6px] bg-green-100 text-green-600 font-semibold'>
                            {product.productQty || getQty(product, product.selectedVariation)}
                          </p>
                        </td>

                        <td className="px-6 py-4 text-left whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <button
                              onClick={() => handleQtyChange(index, product.selectedVariation, setSelectedProduct, -1)}
                              className="px-2 py-2 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                            >
                              <img className='w-[16px] h-[16px]' src={Decrease} alt='decrease' />
                            </button>

                            <input
                              type="number"
                              value={
                                product.ptype === "Variation"
                                  ? product.variationValues[product.selectedVariation]?.barcodeQty ?? ""
                                  : product.barcodeQty ?? ""
                              }
                              onChange={(e) => {
                                const val = e.target.value;
                                handleQtyChange(
                                  index,
                                  product.selectedVariation,
                                  setSelectedProduct,
                                  val === "" ? "" : parseInt(val, 10),
                                  true
                                );
                              }}
                              className="mx-2 w-16 py-[6px] text-center border rounded outline-none border-gray-300 focus:ring-1 focus:ring-gray-300"
                              min="0"
                            />

                            <button
                              onClick={() => handleQtyChange(index, product.selectedVariation, setSelectedProduct, 1)}
                              className="px-2 py-2 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                            >
                              <img className='w-[16px] h-[16px] transform rotate-180' src={Decrease} alt='increase' />
                            </button>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-left whitespace-nowrap text-sm text-gray-700 font-medium">
                          {currency} {' '}{getBaseCost(product, product.selectedVariation)}
                        </td>

                        <td className="px-6 py-4 text-left whitespace-nowrap text-sm text-gray-700 font-semibold">
                          {currency} {' '} {
                            (() => {
                              const productCost = getBaseCost(product, product.selectedVariation);
                              const quantity = product.variationValues?.[product.selectedVariation]?.barcodeQty || product.barcodeQty || 0;
                              const subtotal = (productCost * quantity);
                              return formatWithCustomCommas(subtotal);
                            })()
                          }
                        </td>

                        <td className="px-6 py-4 text-left whitespace-nowrap text-sm text-gray-500">
                          {product.ptype === 'Variation' && product.variationValues ? (
                            <div className="flex items-center justify-left gap-2">
                              {/* Current Variation Display */}
                              <span className="px-3 py-2 bg-blue-100 text-blue-700 rounded-md text-sm font-medium">
                                {product.selectedVariation}
                              </span>

                              {/* Add New Variation Dropdown */}
                              {Object.keys(product.variationValues).length > (product.addedVariations || []).length && (
                                <select
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      handleVariationChange(index, e.target.value, setSelectedProduct);
                                      e.target.value = "";
                                    }
                                  }}
                                  className="w-[130px] border py-1.5 px-2 border-gray-300 rounded-md shadow-sm outline-none border-gray-300 focus:ring-1 focus:ring-gray-300 transition-colors"
                                  defaultValue=""
                                >
                                  <option value="" disabled>+ Add more</option>
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

                        <td className="px-6 py-4 text-left whitespace-nowrap text-sm text-gray-500">
                          <button
                            onClick={() => {
                              if (product.ptype === 'Variation' && (product.addedVariations || []).length > 1) {
                                handleRemoveVariation(index, setSelectedProduct);
                              } else {
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
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          <div className="">
            {/* DISCOUNT, SHIPPING AND TAX INPUT */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 mt-60">
              <div className="relative">
                <label className="block text-left text-sm font-medium text-gray-700">Discount Type:</label>
                <select
                  onChange={handleDiscountType}
                  value={discountType}
                  required
                  className="block w-full rounded-md text-left border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                >
                  <option value=''>Discount type</option>
                  <option value='fixed'>Fixed</option>
                  <option value='percentage'>Percentage</option>
                </select>
              </div>
              <div className='relative'>
                <label className="block text-left text-sm font-medium text-gray-700">Discount:</label>
                <input
                  onChange={handleDiscount}
                  value={discount}
                  type="text"
                  required
                  placeholder="Discount"
                  className='block w-full rounded-md border-0 py-2.5 px-2 pr-10 text-gray-900 shadow-sm ring-1 ring-gray-400 placeholder:text-gray-400 focus:ring-gray-400 focus:outline-none sm:text-sm' />
                <span className="absolute inset-y-0 right-0 flex items-end mb-2 pr-3 text-gray-500">
                  {discountSymbole}
                </span>
              </div>
              <div className="relative">
                <label className="block text-left text-sm font-medium text-gray-700">Tax:</label>
                <input
                  onChange={handleTax}
                  value={tax}
                  required
                  type="text"
                  placeholder="Tax"
                  className="block w-full rounded-md border-0 py-2.5 px-2 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm"
                />
                <span className="absolute inset-y-0 right-0 flex items-end mb-2 pr-3 text-gray-500">
                  %
                </span>
              </div>
              <div className='relative'>
                <label className="block text-left text-sm font-medium text-gray-700">Shipping:</label>
                <input
                  onChange={handleShippng}
                  value={shipping}
                  type="text"
                  required
                  placeholder="Shipping"
                  className='block w-full rounded-md border-0 py-2.5 px-2 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm' />
                <span className="absolute inset-y-0 right-0 flex items-end mb-2 pr-3 text-gray-500">
                  {currency}
                </span>
              </div>
            </div>

            {/* Order, Payment Status, and Payment Type Selects */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
              <div>
                <label className="block text-left text-sm font-medium text-gray-700">Order Type: <span className='text-red-500'>*</span></label>
                <select
                  value={orderStatus}
                  onChange={(e) => setOrderStatus(e.target.value)}
                  required
                  className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                >
                  <option value="">Select Order Status</option>
                  <option value="pending">Received</option>
                  <option value="ordered">Ordered</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              {/* Payment Status Select */}
              <div>
                <label className="block text-left text-sm font-medium text-gray-700">Payment Status: <span className='text-red-500'>*</span></label>
                <select
                  value={paymentStatus}
                  onChange={handlePaymentStatusChange}
                  required
                  className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                >
                  <option value="">Select Payment Status</option>
                  <option value="paid">Paid</option>
                  <option value="unpaid">Unpaid</option>
                </select>
              </div>

              {/* Payment Type Select */}
              <div>
                <label className="block text-left text-sm font-medium text-gray-700">Payment Type: <span className='text-red-500'>*</span></label>
                <select
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value)}
                  required
                  disabled={paymentStatus === "unpaid"}
                  className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                >
                  <option value="">Select Payment Type</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="check">Check</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>
            </div>
          </div>
          <div className="mt-4 text-right text-lg font-semibold">
            Total: {currency} {formatWithCustomCommas(calculateTotal())}
          </div>
          <button onClick={() => handleSave(
            calculateTotal().toFixed(2), orderStatus, paymentStatus, paymentType, shipping, discountType, discount, tax, warehouse, selectedSuplier, selectedProduct, invoiceNumber, date, setError, setResponseMessage, setProgress, navigate)} className="mt-5 submit  w-[200px] text-white rounded py-2 px-4">
            Save Purchase
          </button>

          {/* Error and Response Messages */}
          <div className="mt-20">
          </div>
        </div>

        {isPopupOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white w-[1200px] max-h-[80vh] overflow-y-auto scroll-container h-[62cdb0px] overflow-auto p-8 pt-4 rounded-md shadow-lg mt-28 mb-10" data-aos="fade-down">
              <form onSubmit={handleCreateProduct}>
                {/* Your form fields */}

                <div className="flex justify-between items-center w-full mb-4 mt-4">
                  <h2 className="text-gray-700 text-2xl font-semibold">Create Product</h2>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="text-gray-500 hover:text-red-500 transition duration-200"
                  >
                    <FaTimes size={24} />
                  </button>
                </div>

                {/* Container for the three sub-divs */}
                <div className="flex flex-col lg:flex-row lg:space-x-8 justify-between mt-2">
                  {/* First Sub-Div ============================================================================== */}
                  <div className="flex flex-col lg:flex-row lg:space-x-8 w-full">
                    {/* Product Name */}
                    <div className="flex-1 w-full">
                      <div className="mt-2">
                        <label className="block text-sm font-medium leading-6 text-gray-900 text-left">
                          Product name <span className="mt-1 text-xs text-gray-500 text-left">(Max 40 characters)</span> <span className='text-red-500'>*</span>
                        </label>
                        <div className="mt-2">
                          <input
                            id="name"
                            name="name"
                            type="text"
                            required
                            placeholder="Enter name"
                            maxLength={40}
                            onChange={(e) => setProductName(e.target.value)}
                            className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Product Code */}
                    <div className="flex-1">
                      <div className="mt-2">
                        <label className="block text-sm font-medium leading-6 text-gray-900 text-left">
                          Product code <span className='text-red-500'>*</span>
                        </label>
                        <div className="mt-2">
                          <input
                            id="code"
                            name="code"
                            type="text"
                            required
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="Enter code"
                            value={code}
                            className="block w-full lg:w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Images */}
                    <div className="flex-1 w-full">
                      <div className="mt-2">
                        <label className="block text-sm font-medium leading-6 text-gray-900 text-left">
                          Images
                        </label>
                        <div className="mt-2">
                          <input
                            id="image"
                            name="image"
                            type="file"
                            ref={inputRef}
                            onChange={handleImageChange}
                            className="block w-full rounded-md border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col lg:flex-row lg:space-x-4 mt-4">
                  {/* Second Sub-Div ============================================================================== */}
                  <div className="flex flex-col lg:flex-row lg:space-x-8 w-full">
                    {/* Category */}
                    <div className="flex-1 w-full mb-4 lg:mb-0">
                      <div className="mt-5">
                        <label className="block text-sm font-medium leading-6 text-gray-900 text-left">
                          Category <span className='text-red-500'>*</span>
                        </label>

                        <div className="relative w-full mt-2">
                          <form
                            className="flex items-center"
                            onSubmit={(e) => {
                              e.preventDefault();
                              searchCategory(category);
                            }}
                          >
                            <input
                              onChange={handleCategoryInput}
                              onKeyDown={handleKeyDown}
                              id="category"
                              name="category"
                              type="text"
                              placeholder="Search by category name..."
                              className="searchBox w-full pl-10 pr-4 py-[7.5px] border border-gray-300 rounded-md shadow-sm focus:border-transparent"
                              value={category}
                            />
                            <button type="submit" className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
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
                          </form>{categoryData.length > 0 && (
                            <div className="absolute w-full mt-2 z-10 shadow-md">
                              <ul className="searchBox w-full text-left shadow-sm focus:border-transparent bg-white rounded-md max-h-60 overflow-y-auto">
                                {categoryData.map((ct, index) => (
                                  <li
                                    key={index}
                                    className="p-2 cursor-pointer hover:bg-gray-100"
                                    onClick={() => {
                                      setCategory(ct.category);
                                      setCategoryData([]); // Clear categoryData to close the selection tab
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

                    {/* Brand */}
                    <div className="flex-1 w-full mb-4 lg:mb-0">
                      <div className="mt-5">
                        <label className="block text-sm font-medium leading-6 text-gray-900 text-left">
                          Brand <span className='text-red-500'>*</span>
                        </label>
                        <div className="mt-2">
                          <select
                            id="brand"
                            name="brand"
                            required
                            value={brand}
                            onChange={(e) => setBrands(e.target.value)}
                            className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                          >
                            <option value="">Select a brand</option>
                            {Array.isArray(brandData) &&
                              brandData.map((br) => (
                                <option key={br.brandName} value={br.brandName}>
                                  {br.brandName}
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Supplier */}
                    <div className="flex-1 w-full">
                      <div className="mt-5">
                        <label className="block text-sm font-medium leading-6 text-gray-900 text-left">
                          Supplier <span className='text-red-500'>*</span>
                        </label>
                        <div className="mt-2">
                          <select
                            id="supplier"
                            name="supplier"
                            required
                            value={supplier}
                            onChange={(e) => setSuplier(e.target.value)}
                            className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                          >
                            <option value="">Select a supplier</option>
                            {suplierData.map((s) => (
                              <option key={s.name} value={s.name}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col lg:flex-row lg:space-x-4 mt-5">
                  {/* Third Sub-Div ============================================================================== */}
                  <div className="flex flex-col lg:flex-row lg:space-x-8 w-full">
                    {/* Barcode */}
                    <div className="flex-1 w-full mb-4 lg:mb-0">
                      <div className="mt-5">
                        <label className="block text-sm font-medium leading-6 text-gray-900 text-left">
                          Barcode type <span className='text-red-500'>*</span>
                        </label>
                        <div className="mt-2">
                          <select
                            id="barcode"
                            name="barcode"
                            required
                            value={barcode}
                            onChange={(e) => setBarcode(e.target.value)}
                            className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                          >
                            <option value="">Select a barcode</option>
                            <option value="code128">Code 128</option>
                            <option value="code39">Code 39</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 w-full mb-4 lg:mb-0">
                      <div className="mt-5">
                        <label className="block text-sm font-medium leading-6 text-gray-900 text-left">
                          Purchase Unit <span className='text-red-500'>*</span>
                        </label>
                        <div className="mt-2">
                          <select
                            id="purchase_unit"
                            name="purchase_unit"
                            value={purchase}
                            required
                            onChange={(e) => setPurchaseUnit(e.target.value)}
                            className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                          >
                            <option value="">Select a purchase unit</option>
                            {Array.isArray(unitData) &&
                              unitData.map((u) => (
                                <option key={u.unitName} value={u.unitName}>
                                  {u.unitName}
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex-1 w-full mb-4 lg:mb-0">
                      <div className="mt-5">
                        <label className="block text-sm font-medium leading-6 text-gray-900 text-left">
                          Status <span className='text-red-500'>*</span>
                        </label>
                        <div className="mt-2">
                          <select
                            id="status"
                            name="status"
                            required
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                          >
                            <option value="">Select a status</option>
                            <option value="Received">Received</option>
                            <option value="Pending">Pending</option>
                            <option value="Ordered">Ordered</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col lg:flex-row lg:space-x-4 mt-5">
                  {/* Fourth Sub-Div ============================================================================== */}
                  <div className="flex flex-col lg:flex-row lg:space-x-8 w-full">
                    {/* Base Unit */}
                    {/* <div className="flex-1 w-full mb-4 lg:mb-0"> */}
                    {/* <div className="mt-5">
                    <label className="block text-sm font-medium leading-6 text-gray-900 text-left">
                      Base unit <span className='text-red-500'>*</span>
                    </label>
                    <div className="mt-2">
                      <select
                        id="unit"
                        name="unit"
                        required
                        value={unit}
                        onChange={handleBaseUnitChange}
                        className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                      >
                        <option value="">Select a base unit</option>
                        {Array.isArray(unitData) &&
                          unitData.map((bu) => (
                            <option key={bu.baseUnit} value={bu.baseUnit}>
                              {bu.baseUnit}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div> */}
                    {/* </div> */}

                    {/* Sale Unit */}
                    <div className="flex-1 w-full mb-4 lg:mb-0">
                      <div className="mt-5">
                        <label className="block text-sm font-medium leading-6 text-gray-900 text-left">
                          Sale Unit <span className='text-red-500'>*</span>
                        </label>
                        <div className="mt-2">
                          <select
                            id="sale_unit"
                            name="sale_unit"
                            value={saleUnit}
                            required
                            onChange={(e) => setSaleUnit(e.target.value)}
                            className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                          >
                            <option value="">Select a sale unit</option>
                            {Array.isArray(unitData) &&
                              unitData.map((u) => (
                                <option key={u.unitName} value={u.unitName}>
                                  {u.unitName}
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Quantity Limitation */}
                    <div className="flex-1 w-full mb-4 lg:mb-0">
                      <div className="mt-5">
                        <label className="block text-sm font-medium leading-6 text-gray-900 text-left">
                          Quantity Limitation <span className='text-red-500'>*</span>
                        </label>
                        <div className="mt-2">
                          <input
                            id="QuantityLimitation"
                            name="QuantityLimitation"
                            type="text"
                            required
                            onChange={(e) => setQL(e.target.value)}
                            placeholder="Quantity Limitation"
                            className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col lg:flex-row lg:space-x-4 mt-5">
                  {/* Fifth Sub-Div ============================================================================== */}
                  <div className="flex flex-col lg:flex-row lg:space-x-8 w-full">
                    {/* Note */}
                    <div className="flex-1 w-full mb-4 lg:mb-0">
                      <div className="mt-5">
                        <label className="block text-sm font-medium leading-6 text-gray-900 text-left">
                          Note
                        </label>
                        <div className="mt-[8px]">
                          <input
                            id="note"
                            name="note"
                            placeholder="note"
                            onChange={(e) => setNote(e.target.value)}
                            className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Product Type */}
                    <div className="flex-1 w-full mb-4 lg:mb-0">
                      <div className="mt-5">
                        <label className="block text-sm font-medium leading-6 text-gray-900 text-left">
                          Product type <span className='text-red-500'>*</span>
                        </label>
                        <div className="mt-2">
                          <select
                            id="ptype"
                            name="ptype"
                            required
                            value={ptype}
                            onChange={(e) => setType(e.target.value)}
                            className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                          >
                            <option value="">Select a type</option>
                            <option>Single</option>
                            <option>Variation</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Variation Dropdown */}
                    <div className="flex-1 w-full mb-4 lg:mb-0">
                      <div className="mt-5">
                        <label className="block text-sm font-medium leading-6 text-gray-900 text-left">
                          Variation
                        </label>
                        <div className="mt-2">
                          <select
                            id="variation"
                            name="variation"
                            value={variation}
                            onChange={handleVariationChangeProduct}
                            className={`block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6 ${ptype !== "Variation" ? "opacity-50 pointer-events-none" : ""}`}
                            disabled={ptype !== "Variation"}
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
                </div>

                {/* Warehouse */}
                <div className="flex flex-col lg:flex-row w-full gap-4 mt-10">
                  {/* Warehouse Field */}
                  <div className="w-full lg:w-1/2 pr-4">
                    <label className="block text-sm font-medium leading-6 text-gray-900 text-left">
                      Warehouse<span className="text-red-500">*</span>
                    </label>
                    <div className="mt-2">
                      <select
                        id="warehouse"
                        name="warehouse"
                        value={selectedWarehouse}
                        onChange={handleAddWarehouse}
                        className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                      >
                        <option value="">Select a warehouse</option>
                        {warehouseData.map((wh) => (
                          <option key={wh.name} value={wh.name}>
                            {wh.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Is Inventory Field */}
                  <div className="w-full lg:w-1/2">
                    <label className="block text-left text-sm font-medium leading-6 text-gray-900">
                      Is Inventory<span className="text-red-500">*</span>
                    </label>
                    <div className="mt-2 flex space-x-10 border items-center p-2 rounded-md">
                      {/* Yes */}
                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          id="yes"
                          checked={isInventory === true}
                          onChange={() => setIsInventory(true)}
                          className="h-5 w-5 rounded border-gray-300 accent-[#16796E] focus:ring-[#16796E]"
                        />
                        <span className="ml-2 text-gray-700">Yes</span>
                      </label>

                      {/* No */}
                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          id="no"
                          checked={isInventory === false}
                          onChange={() => setIsInventory(false)}
                          className="h-5 w-5 rounded border-gray-300 accent-[#16796E] focus:ring-[#16796E]"
                        />
                        <span className="ml-2 text-gray-700">No</span>
                      </label>
                    </div>
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
                          onClick={() => handleRemoveWarehouse(type)}
                        >
                          &#x2715;
                        </button>
                      </div>
                    ))}
                </div>

                {/**VARIATION MANAGE SECTION========================================================================================================== */}

                <hr className="mt-16" />


                {/*CREATE VARIATION PROPERTIES============================================================================================================================*/}
                {/**This is the variation property manage section one by one */}
                {selectedWarehouse.map((type, index) => (
                  <div className="border-2 boder-200- mt-20 rounded-lg p-5 text-gray-700 text-left bold" key={index}>
                    <button
                      className="mr-4 text-gray-500 size-4 text-xl stroke-8"
                      onClick={() => handleRemoveWarehouse(type)}
                    >
                      &#x2715;
                    </button>

                    Product Details For {type}

                    {/* Multi-select variation types with chips */}
                    {variation && ptype !== "Single" && (
                      <div className="mt-8">
                        <label className="block text-sm font-medium leading-6 text-gray-900 text-left">
                          Select Variation Types <span className="text-red-500">*</span>
                        </label>
                        <div className="mt-2">
                          <select
                            onChange={handleAddVariationType}
                            className="block w-[31%] rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                          >
                            <option value="">Select Types</option>
                            {variationType.map((type, index) => (
                              <option key={index} value={type}>
                                {type}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Display selected types as chips */}
                    <div className="flex flex-wrap mt-3 gap-2">
                      {ptype === "Variation" &&
                        selectedVariationTypes.map((type, index) => (
                          <div
                            key={index}
                            className="flex items-center px-3 py-1 bg-gray-200 rounded-full text-sm"
                          >
                            {type}
                            <button
                              className="ml-2 text-red-500"
                              onClick={() => handleRemoveVariationType(type)}
                            >
                              &#x2715;
                            </button>
                          </div>
                        ))}
                    </div>
                    {ptype === "Variation" &&
                      selectedVariationTypes.map(
                        (type) =>
                          showSections[type] && (
                            <div className="mt-12 variationPropertyManaging" key={type}>
                              <h3 className="text-md mb-4 mt-5 text-gray-700">
                                {type} Properties
                              </h3>
                              <div className="p-[15px] rounded-md">
                                <div className="flex space-x-4 mb-5">
                                  <div className="flex-1">
                                    <div>
                                      <label className="block text-sm font-medium leading-6 text-gray-900 text-left">
                                        Variation Type <span className="text-red-500">*</span>
                                      </label>
                                      <input
                                        value={type}
                                        type="text"
                                        placeholder={`${type} Type`}
                                        onChange={(e) =>
                                          handleInputChange(type, e.target.value)
                                        }
                                        className="block w-[90%] rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400  focus:outline-none sm:text-sm sm:leading-6"
                                      />
                                    </div>

                                    <div>
                                      <label className="block  mt-5 text-sm font-medium leading-6 text-gray-900 text-left">
                                        Tax Type
                                      </label>
                                      <select
                                        value={variationValues[type]?.taxType || 'Exclusive'}
                                        onChange={(e) =>
                                          handleVariationValueChange(
                                            type,
                                            "taxType",
                                            e.target.value
                                          )
                                        }
                                        className="block  w-[90%]  rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                      >
                                        <option value="Exclusive">Exclusive</option>
                                        <option value="Inclusive">Inclusive</option>
                                      </select>
                                    </div>

                                    {isInventory && (
                                      <div>
                                        <label className="block text-sm mt-5 font-medium leading-6 text-gray-900 text-left">
                                          Product Quantity <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                          type="number"
                                          placeholder="Add Product Quantity"
                                          onChange={(e) =>
                                            handleVariationValueChange(
                                              type,
                                              "productQty",
                                              e.target.value
                                            )
                                          }
                                          className="block w-[90%]  rounded-md border-0 py-2.5 px-3 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                        />
                                      </div>)}
                                  </div>

                                  <div className="flex-1">
                                    <label className="block text-sm font-medium leading-6 text-gray-900 text-left">
                                      Product Cost <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                      <input
                                        type="number"
                                        placeholder="Product Cost"
                                        onChange={(e) =>
                                          handleVariationValueChange(
                                            type,
                                            "productCost",
                                            e.target.value
                                          )
                                        }
                                        className="block w-[90%]  rounded-md border-0 py-2.5 px-3 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400  focus:outline-none sm:text-sm sm:leading-6"
                                      />
                                      <span className="absolute mr-[10.6%] rounded-r-[5px] bg-gray-100 text-gray-500 mt-[1px] mb-[1px] inset-y-0 right-0 pr-3 flex items-center px-2 ">
                                        {currency}
                                      </span>
                                    </div>
                                    <label className="block mt-5 text-sm font-medium leading-6 text-gray-900 text-left">
                                      Order Tax
                                    </label>
                                    <div className="relative">
                                      <input
                                        type="number"
                                        placeholder="Order Tax"
                                        onChange={(e) =>
                                          handleVariationValueChange(
                                            type,
                                            "orderTax",
                                            e.target.value
                                          )
                                        }
                                        className="block w-[90%]  rounded-md border-0 py-2.5 px-3 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                      />
                                      <span className="absolute mr-[10.6%] w-[47px] pl-4 text-center rounded-r-[5px] bg-gray-100 text-gray-500 mt-[1px] mb-[1px] inset-y-0 right-0 pr-3 flex items-center px-2 ">
                                        %
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex-1">
                                    <label className="block text-sm font-medium leading-6 text-gray-900 text-left">
                                      Product Price <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                      <input
                                        type="number"
                                        placeholder="Product Price"
                                        onChange={(e) =>
                                          handleVariationValueChange(
                                            type,
                                            "productPrice",
                                            e.target.value
                                          )
                                        }
                                        className="block w-[90%]  rounded-md border-0 py-2.5 px-3 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                      />
                                      <span className="absolute mr-[10.6%] rounded-r-[5px] bg-gray-100 text-gray-500 mt-[1px] mb-[1px]  inset-y-0 right-0 pr-3 flex items-center px-2 ">
                                        {currency}
                                      </span>
                                    </div>
                                    <div>
                                      <label className="block mt-5 text-sm font-medium leading-6 text-gray-900 text-left">
                                        Stock Alert <span className="text-red-500">*</span>
                                      </label>
                                      <input
                                        type="number"
                                        placeholder="Stock Alert"
                                        onChange={(e) =>
                                          handleVariationValueChange(type, "stockAlert", e.target.value)
                                        }
                                        disabled={!isInventory}
                                        className={`block w-[90%] rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ${isInventory
                                          ? "ring-gray-400"
                                          : "ring-gray-200 bg-gray-100 cursor-not-allowed"
                                          } placeholder:text-gray-400 focus:outline-none sm:text-sm sm:leading-6`}
                                      />
                                    </div>

                                    <div>
                                    </div>
                                  </div>

                                  <div className="flex-1">
                                    <div>
                                      <label className="block text-sm font-medium leading-6 text-gray-900 text-left">
                                        Profit Margin
                                      </label>
                                      <div className="relative">
                                        <input
                                          type="number"
                                          placeholder="0.00"
                                          value={variationValues[type]?.profitMargin || ''}
                                          onChange={(e) =>
                                            handleVariationValueChange(type, "profitMargin", e.target.value)
                                          }
                                          className="block w-[90%]  rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                        />
                                        <span className="absolute mr-[10.6%] w-[44px] justify-center rounded-r-[5px] bg-gray-100 text-gray-500 mt-[1px] mb-[1px] inset-y-0 right-0 pr-3 flex items-center px-2 ">
                                          %
                                        </span>
                                      </div>
                                    </div>

                                    <div className='mt-5'>
                                      <label className="block text-sm font-medium leading-6 text-gray-900 text-left">
                                        Discount
                                      </label>
                                      <div className="relative">
                                        <input
                                          type="number"
                                          placeholder="Discount"
                                          onChange={(e) =>
                                            handleVariationValueChange(type, "discount", e.target.value)
                                          }
                                          className="block w-[90%]  rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                        />
                                        <span className="absolute mr-[10.6%] rounded-r-[5px] bg-gray-100 text-gray-500 mt-[1px] mb-[1px] inset-y-0 right-0 pr-3 flex items-center px-2 ">
                                          {currency}
                                        </span>
                                      </div>
                                    </div>

                                  </div>
                                </div>
                                <p className="mt-1 text-xs text-gray-400 text-left">
                                  Ensure to Number input fields keep with valid number
                                </p>
                              </div>
                            </div>
                          )
                      )}

                    {/**SINGLE PRODUCT VARIATION PROPERTIES */}
                    {ptype === "Single" && (
                      <div className="mt-8">
                        {selectedWarehouse.length > 0 ? (
                          selectedWarehouse.map((warehouseName) => (
                            <div key={warehouseName} className="border-2 p-5 text-left mt-4 rounded-xl mb-6">
                              <div className="flex justify-between items-start mb-4">
                                <h3 className="text-md text-gray-700">{warehouseName}</h3>
                                <button
                                  type="button"
                                  className="mr-4 text-gray-500 size-4 text-xl stroke-8"
                                  onClick={(event) => handleRemoveWarehouse(event, warehouseName)}
                                >
                                  &#x2715;
                                </button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* Column 1 */}
                                <div className="space-y-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Product Cost <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                      <input
                                        type="number"
                                        value={warehouseValues[warehouseName]?.productCost || ""}
                                        onChange={(e) => handleWarehouseValueChange(warehouseName, 'productCost', e.target.value)}
                                        className="block w-[100%] rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400  focus:outline-none sm:text-sm"
                                        placeholder="0.00"
                                      />
                                      <span className="m-[1px] absolute top-0 bottom-0 right-0 flex items-center px-2 bg-gray-100 text-gray-500 rounded-r-[5px]">
                                        {currency}
                                      </span>
                                    </div>
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Stock Alert
                                    </label>
                                    <input
                                      type="number"
                                      value={warehouseValues[warehouseName]?.stockAlert || ""}
                                      onChange={(e) => handleWarehouseValueChange(warehouseName, 'stockAlert', e.target.value)}
                                      disabled={!isInventory}
                                      className="block w-[100%] rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400  focus:outline-none sm:text-sm"
                                      placeholder="0"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Discount
                                    </label>
                                    <div className="relative">
                                      <input
                                        type="number"
                                        value={warehouseValues[warehouseName]?.discount || ""}
                                        onChange={(e) => handleWarehouseValueChange(warehouseName, 'discount', e.target.value)}
                                        className="block w-[100%] rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400  focus:outline-none sm:text-sm"
                                        placeholder="0.00"
                                      />
                                      <span className="m-[1px] absolute top-0 bottom-0 right-0 flex items-center px-2 bg-gray-100 text-gray-500 rounded-r-[5px]">
                                        {currency}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Column 2 */}
                                <div className="space-y-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Product Price <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                      <input
                                        type="number"
                                        value={warehouseValues[warehouseName]?.productPrice || ""}
                                        onChange={(e) => handleWarehouseValueChange(warehouseName, 'productPrice', e.target.value)}
                                        className="block w-[100%] rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400  focus:outline-none sm:text-sm"
                                        placeholder="0.00"
                                      />
                                      <span className="m-[1px] absolute top-0 bottom-0 right-0 flex items-center px-2 bg-gray-100 text-gray-500 rounded-r-[5px]">
                                        {currency}
                                      </span>
                                    </div>
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Order Tax (%)
                                    </label>
                                    <div className="relative">
                                      <input
                                        type="number"
                                        value={warehouseValues[warehouseName]?.orderTax || ""}
                                        onChange={(e) => handleWarehouseValueChange(warehouseName, 'orderTax', e.target.value)}
                                        className="block w-[100%] rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400  focus:outline-none sm:text-sm"
                                        placeholder="0"
                                      />
                                      <span className="absolute rounded-r-[4px] w-[44px] justify-center m-[1px] bg-gray-100 text-gray-500 inset-y-0 right-0 pr-3 flex items-center px-2 ">
                                        %
                                      </span>
                                    </div>
                                  </div>

                                  {isInventory && (
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Quantity <span className="text-red-500">*</span>
                                      </label>
                                      <input
                                        type="number"
                                        value={warehouseValues[warehouseName]?.productQty || ""}
                                        onChange={(e) =>
                                          handleWarehouseValueChange(warehouseName, 'productQty', e.target.value)
                                        }
                                        className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:outline-none sm:text-sm"
                                        placeholder="0"
                                      />
                                    </div>
                                  )}
                                </div>

                                {/* Column 3 */}
                                <div className="space-y-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Profit Margin
                                    </label>
                                    <div className="relative">
                                      <input
                                        type="number"
                                        value={warehouseValues[warehouseName]?.profitMargin || ""}
                                        onChange={(e) => handleWarehouseValueChange(warehouseName, 'profitMargin', e.target.value)}
                                        className="block w-[100%] rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400  focus:outline-none sm:text-sm"
                                        placeholder="0.00"
                                      />
                                      <span className="m-[1px] w-[44px] justify-center absolute top-0 bottom-0 right-0 flex items-center px-2 bg-gray-100 text-gray-500 rounded-r-[5px]">
                                        %
                                      </span>
                                    </div>
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Tax Type
                                    </label>
                                    <select
                                      value={warehouseValues[warehouseName]?.taxType || "Exclusive"}
                                      onChange={(e) => handleWarehouseValueChange(warehouseName, 'taxType', e.target.value)}
                                      className="block w-[100%] rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400  focus:outline-none sm:text-sm"
                                    >
                                      <option value="Exclusive">Exclusive</option>
                                      <option value="Inclusive">Inclusive</option>
                                    </select>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                            <p className="text-gray-500 text-center">
                              No warehouses added yet. Select warehouses above to add pricing and inventory details.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/*SAVE AND CLEAR BUTTONS==============================================================================================================================*/}
                <div className="flex justify-start mt-10">
                  <div className="mt-20">
                    <button
                      type="submit"
                      // disabled={!isFormValid}
                      className="rounded-md px-4 py-3.5 h-[48px] text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 w-[171px] text-center button-bg-color button-hover-color"
                    >
                      Save Product
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
              </form>


              {/* Error and Response Messages */}
              <div className="mt-10">
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
        )}
      </div>
    </div>
  );
}
export default CreatePurchaseBody;