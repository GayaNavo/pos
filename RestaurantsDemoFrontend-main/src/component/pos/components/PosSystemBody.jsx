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

import { useState, useEffect, useRef, useContext, useCallback } from 'react';
import ProductFilters from './ProductFilters';
import CryptoJS from 'crypto-js';
import { useCurrency } from '../../../context/CurrencyContext';
import { Link } from 'react-router-dom';
import '../../../styles/role.css';
import 'react-loading-skeleton/dist/skeleton.css'
import '../../../styles/tempory.css'
import '../utils/fetchDefaultData';
import io from 'socket.io-client';
import formatWithCustomCommas from '../../utill/NumberFormate';
import Menu from '../../../img/held POS 1.png';
import pro from '../../../img/Main Close POS 1.png';
import Full from '../../../img/Full Screen POS 1.png';
import Cal from '../../../img/Cal POS 1.png';
import Back from '../../../img/Back POS 1.png';
import Plced_Order from '../../../img/shopping-bag.png';
import SL_R from '../../../img/saleReturn.png';
import User from '../../../img/add-user (1).png';
import Box from '@mui/material/Box';
import Skeleton from 'react-loading-skeleton'
import BillingSection from './posBillCalculation';
import popSound from '../../../../src/audio/b.mp3';
import axios from 'axios';
import CircularProgress from '@mui/material/CircularProgress';
import Calculator from './posCalCulator';
import ProductVariationModal from './productVariationEdit';
import { handleProductSubmit } from '../utils/searchProduct';
import { getHeldProducts, handleDeleteHoldProduct } from '../utils/holdProductControll';
import { fetchCategoryData } from '../utils/fetchByCategory';
import { fetchBrandData } from '../utils/fetchByBrand';
import { fetchAllData } from '../utils/fetchAllData';
import { handleFullScreen } from '../utils/fullScreenView';
import { handlePopupOpen } from '../utils/registerHandling';
import { fetchProductDataByWarehouse } from '../utils/fetchByWarehose';
import { getPriceRange, getQty, getTax, getDiscount, getProductCost, getTaxHandler } from '../utils/qtyAndPriceCalculation';
import { X, Calculator as GripHorizontal, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from 'react-toastify';
import { UserContext } from '../../../context/UserContext';
import Draggable from 'react-draggable';
import { silentPrint } from '../utils/silentPrint';

function PosSystemBody({ defaultWarehouse }) {
    const ProductIcon = 'https://cdn0.iconfinder.com/data/icons/creative-concept-1/128/PACKAGING_DESIGN-512.png';
    const { userData } = useContext(UserContext);
    const [filters, setFilters] = useState({ brands: [], warehouses: [], categories: [] });
    const [warehouse, setWarehouse] = useState(sessionStorage.getItem("defaultWarehouse") || "");
    const [productData, setProductData] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState('')
    const [searchCustomerResults, setSearchCustomerResults] = useState([]);
    const [searchedProductData, setSearchedProductData] = useState([]);
    const [keyword, setKeyword] = useState('');
    const [Productkeyword, setProductKeyword] = useState('');
    const [selectedBrandProducts, setSelectedBrandProducts] = useState([]);
    const [selectedCategoryProducts, setSelectedCategoryProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingCir, setLoadingCir] = useState(false);
    const [progress, setProgress] = useState(false);
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [productBillingHandling, setProductBillingHandling] = useState([])
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectVariation, setSelectVariation] = useState(false);
    const [showCalculator, setShowCalculator] = useState(false);
    const [isHoldList, setIsHoldList] = useState(false)
    const [heldProducts, setHeldProducts] = useState([])
    const [isExitingPopupOpen, setIsExitingPopupOpen] = useState(false);
    const [isPopUpRegisterReport, setIsPopUpRegisterReport] = useState(false);
    const [registerData, setRegisterData] = useState({ openTime: '', username: '', name: '', cashHandIn: 0, totalBalance: 0 });
    const [errorMessage, setErrorMessage] = useState('');
    const [error, setError] = useState('')
    const [reloadStatus, setReloadStatus] = useState(false);
    const [heldProductReloading, setHeldProductReloading] = useState(false)
    const inputRef = useRef(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [walkInCustomerName, setWalkInCustomerName] = useState('');
    const [walkInCustomerAddress, setWalkInCustomerAddress] = useState('');
    const [walkInCustomerMobile, setWalkInCustomerMobile] = useState('');
    const [success, setSuccess] = useState('');
    const [selectedBrand, setSelectedBrand] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [permissionData, setPermissionData] = useState([]);
    const [cashierTotalSale, setCashierTotalSale] = useState(0);
    const [openTime, setOpenTime] = useState('');
    const cashierUsername = sessionStorage.getItem('cashierUsername');
    const [cashierName, setCashierName] = useState('Unknown Cashier');
    const [totalBalance, setTotalAmount] = useState(0);
    const cashRegisterID = sessionStorage.getItem('cashRegisterID')
    const [totalSaleAmount, setTotalSale] = useState(0);
    const [cashHandIn, setCashHandIn] = useState(0);
    const [cardPaymentAmount, setCardPaymentAmount] = useState(0);
    const [cashPaymentAmount, setCashPaymentAmount] = useState(0);
    const [bankTransferPaymentAmount, setBankTransferPaymentAmount] = useState(0);
    const [regDataFetching, setFetchRegData] = useState(false);
    const [totalDiscountAmount, setTotalDiscountAmount] = useState(0);
    const [inputs, setInputs] = useState({ amount20: 0, amount50: 0, amount100: 0, amount500: 0, amount1000: 0, amount5000: 0, amount1: 0, amount2: 0, amount5: 0, amount10: 0, });
    const [ProductNameOrCode, setProductNameOrCode] = useState('');
    const [refreshKey, setRefreshKey] = useState(Date.now())
    const startLoading = () => setLoadingCir(true);
    const stopLoading = () => setLoadingCir(false);
    const [searchMode, setSearchMode] = useState('code');
    const [showPlacedOrdersModal, setShowPlacedOrdersModal] = useState(false);
    const [placedOrders, setPlacedOrders] = useState([]);
    const [liveOrderCount, setLiveOrderCount] = useState(0);
    const [orderId, setOrderId] = useState(null);
    const [menuType, setMenuType] = useState("");
    const isForeign = menuType === "foreign";
    const [isOpen, setIsOpen] = useState(false);
    const [searchedProductDataByName, setSearchedProductDataByName] = useState([]);
    const [showAddProductModal, setShowAddProductModal] = useState(false);
    const [palcedStatus, setPalcedStatus] = useState(false);
    const [dualScreenMode, setDualScreenMode] = useState(false);
    const customerWindowRef = useRef(null);
    const [showAllBrandsModal, setShowAllBrandsModal] = useState(false);
    const [showAllCategoriesModal, setShowAllCategoriesModal] = useState(false);
    const { currency } = useCurrency();

    //COMBINE ALL DATA FETCHING TYPE INTO ONE STATE
    const combinedProductData =
        selectedCategoryProducts.length > 0
            ? selectedCategoryProducts
            : selectedBrandProducts.length > 0
                ? selectedBrandProducts
                : productData.length > 0
                    ? productData
                    : [];

    const navigate = useNavigate();

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, [searchMode]);

    const fetchLiveOrderCount = async () => {
        try {
            const response = await axios.get(
                `${process.env.REACT_APP_BASE_URL}/api/getPlacedOrders`
            );
            if (response.data.success) {
                setLiveOrderCount(response.data.count);
            }
            if (response.data.success) {
                setPlacedOrders(response.data.orders);
            }
        } catch (error) {
            console.error('Failed to fetch live order count:', error);
        }
    };

    useEffect(() => {
        fetchLiveOrderCount();

        const socket = io(process.env.REACT_APP_BASE_URL);
        const handleRefresh = () => fetchLiveOrderCount();

        socket.on('newOrder', handleRefresh);
        socket.on('orderPlaced', handleRefresh);
        socket.on('orderUpdated', handleRefresh);
        socket.on('orderDeleted', handleRefresh);
        socket.on('allOrdersDeleted', handleRefresh);
        socket.on('orderStatusChanged', handleRefresh);

        const pollInterval = setInterval(fetchLiveOrderCount, 60000);

        return () => {
            clearInterval(pollInterval);
            socket.off('newOrder', handleRefresh);
            socket.off('orderPlaced', handleRefresh);
            socket.off('orderUpdated', handleRefresh);
            socket.off('orderDeleted', handleRefresh);
            socket.off('allOrdersDeleted', handleRefresh);
            socket.off('orderStatusChanged', handleRefresh);
            socket.disconnect();
        };
    }, [reloadStatus]);

    useEffect(() => {
        if (userData) {
            const permissions = userData?.permissions || {};
            const warehousePermissions = Object.values(permissions?.managePOS?.warehouses || {}).reduce((acc, warehouse) => {
                if (warehouse.warehouseName) {
                    acc[warehouse.warehouseName] = warehouse;
                }
                return acc;
            }, {});

            const hasAnyPermission = (permissionKey) => {
                const subPermissions = permissions[permissionKey] || {};
                return Object.values(subPermissions).some(Boolean);
            };

            setPermissionData({
                ...Object.keys(permissions).reduce((acc, key) => {
                    acc[key] = hasAnyPermission(key);
                    return acc;
                }, {}),
                warehousePermissions,
            });
        }
    }, [userData]);

    useEffect(() => {
        if (reloadStatus && !warehouse) {
            fetchAllData(setProductData, setSelectedCategoryProducts, setSelectedBrandProducts, setSearchedProductData, setProgress, setError);
            setReloadStatus(false);
        }
    }, [reloadStatus]);

    const refreshAllReports = useCallback(() => {
        setRefreshKey(Date.now());
    }, []);

    useEffect(() => {
        if (!warehouse) {
            fetchAllData(setProductData, setSelectedCategoryProducts, setSelectedBrandProducts, setSearchedProductData, setProgress, setError);
        }
    }, [warehouse]);

    const handleWarehouseChange = (e) => {
        const selectedWarehouse = e.target.value;
        setWarehouse(selectedWarehouse);
        if (selectedWarehouse) {
            fetchProductDataByWarehouse(
                selectedWarehouse,
                setProductData,
                setSelectedCategoryProducts,
                setSelectedBrandProducts,
                setSearchedProductData,
                setLoading
            );
        } else {
            setProductData([]);
        }
    };

    useEffect(() => {
        if (productData.length > 0) {
        }
    }, [productData]);

    const canSelectProduct = (productWarehouseName) => {

        if (!productWarehouseName) {
            return false;
        }
        const warehouseEntry = permissionData?.warehousePermissions?.[warehouse] || {};

        if (!warehouseEntry) {
            return false;
        }
        const isSelectable = !!(warehouseEntry.access && warehouseEntry.create_sale_from_pos);

        if (isSelectable) {
        } else {
        }
        return isSelectable;
    };

    const playSound = () => {
        const audio = new Audio(popSound);
        audio.play().catch(error => {
            console.error('Audio play failed:', error);
        });
    };

    useEffect(() => {
    }, [productBillingHandling]);

    const toggleCalculator = () => {
        setShowCalculator((prev) => !prev);
    };

    useEffect(() => {
        const fetchSystemSettings = async () => {
            try {
                const { data } = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/getSettings`);
                setDualScreenMode(data.dualScreenMode || false);
                setMenuType(data.menuType || "");
            } catch (error) {
                console.error("Error fetching system settings in POS:", error);
            }
        };
        fetchSystemSettings();
    }, []);

    useEffect(() => {
        if (dualScreenMode) {
            if (!customerWindowRef.current || customerWindowRef.current.closed) {
                customerWindowRef.current = window.open('/customer-display', 'CustomerDisplay', 'width=1100,height=800,left=150,top=150,resizable=yes,scrollbars=yes,menubar=no,toolbar=no,location=no,status=no');
            }
        } else {
            if (customerWindowRef.current && !customerWindowRef.current.closed) {
                customerWindowRef.current.close();
                customerWindowRef.current = null;
            }
        }
    }, [dualScreenMode]);

    useEffect(() => {
        return () => {
            if (customerWindowRef.current && !customerWindowRef.current.closed) {
                customerWindowRef.current.close();
            }
        };
    }, []);

    const handleOpenCustomerDisplay = () => {
        if (!customerWindowRef.current || customerWindowRef.current.closed) {
            customerWindowRef.current = window.open('/customer-display', 'CustomerDisplay', 'width=1100,height=800,left=150,top=150,resizable=yes,scrollbars=yes,menubar=no,toolbar=no,location=no,status=no');
            toast.success("Customer display opened");
        } else {
            customerWindowRef.current.focus();
            toast.info("Customer display is already open");
        }
    };

    useEffect(() => {
        const savedWarehouse = sessionStorage.getItem("defaultWarehouse");
        if (savedWarehouse) {
            setWarehouse(savedWarehouse);
            fetchProductDataByWarehouse(
                savedWarehouse,
                setProductData,
                setSelectedCategoryProducts,
                setSelectedBrandProducts,
                setSearchedProductData,
                setLoading
            );
        }
    }, []);

    useEffect(() => {
        getHeldProducts(setHeldProducts);
        setHeldProductReloading(false);
    }, [heldProductReloading]);

    useEffect(() => {
        if (searchedProductData.length > 0) {
            searchedProductData.forEach((product) => {
                if (!product.warehouse || Object.keys(product.warehouse).length === 0) {
                    console.error("Product is missing warehouse data:", product);
                    toast.error("This product is missing warehouse data and cannot be added.");
                    return;
                }

                handleAddingProduct({
                    id: product._id,
                    name: product.name,
                    price: getPriceRange(product),
                    productCost: getProductCost(product),
                    offcialProduct: product.offcialProduct ? product.offcialProduct : true,
                    stokeQty: product.productQty || getQty(product),
                    tax: product.oderTax ? product.oderTax : getTax(product),
                    taxType: getTaxHandler(product),
                    discount: getDiscount(product),
                    ptype: product.ptype,
                    isInventory: product.isInventory,
                    warehouse: product.warehouse,
                    variation: product.variation,
                    variationType: product.variationType,
                    variationValues: product.variationValues,
                });
            });
        }
    }, [searchedProductData]);;

    const handleAddingProduct = (product) => {
        setProductBillingHandling((prevBilling) => {
            ;
            const selectedWarehouse = warehouse || sessionStorage.getItem("defaultWarehouse");
            const defaultWarehouse = sessionStorage.getItem("defaultWarehouse");

            if (!selectedWarehouse) {
                toast.error("No warehouse selected.");
                return prevBilling;
            }

            if (!product.isInventory && product.ptype === "Single") {
                const existing = prevBilling.find(p => p.id === product.id);
                if (existing) {
                    return prevBilling.map(p =>
                        p.id === product.id ? { ...p, qty: p.qty + 1 } : p
                    );
                }
                return [...prevBilling, { ...product, qty: 1 }];
            }
            if (selectedWarehouse !== defaultWarehouse) {
                toast.error("You can only add products from the default warehouse.");
                return prevBilling;
            }

            if (!product.warehouse || Object.keys(product.warehouse).length === 0) {
                toast.error("Product data is missing warehouse details.");
                return prevBilling;
            }

            const warehouseKey = Object.keys(product.warehouse).find(
                key => key.toLowerCase() === selectedWarehouse.toLowerCase()
            );

            if (!warehouseKey) {
                toast.error(`Warehouse '${selectedWarehouse}' does not exist for this product.`);
                return prevBilling;
            }

            const warehouseData = product.warehouse[warehouseKey];
            if (!warehouseData) {
                toast.error(`No data found for warehouse '${warehouseKey}'.`);
                return prevBilling;
            }

            if (product.ptype === "Single") {
                const existingProduct = prevBilling.find(
                    (p) => p.id === product.id && p.warehouse === selectedWarehouse
                );

                if (existingProduct) {
                    if (product.isInventory && existingProduct.qty + 1 > warehouseData.productQty) {
                        toast.error("Cannot add more than available stock.");
                        return prevBilling;
                    }
                    return prevBilling.map((p) =>
                        p.id === product.id && p.warehouse === selectedWarehouse
                            ? { ...p, qty: p.qty + 1 }
                            : p
                    );
                } else {
                    if (product.isInventory && warehouseData.productQty <= 0) {
                        toast.error("This product is out of stock.");
                        return prevBilling;
                    }
                    return [...prevBilling, {
                        ...product,
                        qty: 1,
                        warehouse: selectedWarehouse
                    }];
                }
            }

            else if (product.ptype === "Variation") {
                const variationValues = warehouseData.variationValues || {};

                if (!Object.keys(variationValues).length) {
                    toast.error("No variations found for this product.");
                    return prevBilling;
                }

                if (product.isInventory) {
                    const hasStock = Object.values(variationValues).some(v => v.productQty > 0);
                    if (!hasStock) {
                        toast.error("All variations are out of stock.");
                        return prevBilling;
                    }
                }
                setSelectVariation(true);
                setSelectedProduct({
                    ...product,
                    warehouse: selectedWarehouse,
                    variationValues,
                    warehouseName: warehouseKey
                });
                return prevBilling;
            }

            return prevBilling;
        });

        setTimeout(() => {
            setProductKeyword("");
            if (inputRef.current) inputRef.current.focus();
        }, 0);
        inputRef.current.focus();
    };

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, [Productkeyword]);

    const getQtyForSelectedWarehouse = (product, selectedWarehouse) => {
        if (product.warehouse && typeof product.warehouse === 'object' && selectedWarehouse) {
            const selectedWarehouseData = product.warehouse[selectedWarehouse];
            if (selectedWarehouseData) {
                if (selectedWarehouseData.variationValues) {
                    const quantities = Object.values(selectedWarehouseData.variationValues)
                        .map(variation => {
                            const qty = Number(variation.productQty);
                            return qty;
                        })
                        .filter(qty => !isNaN(qty));
                    return quantities.length > 0 ? quantities.reduce((total, current) => total + current, 0) : 0;
                } else {
                    return Number(selectedWarehouseData.productQty) || 0;
                }
            } else {
                console.log("No data found for selected warehouse");
            }
        } else {
            console.log("Invalid warehouse or product data");
        }

        // Return 0 if no warehouse data is found for the selected warehouse or if selectedWarehouse is invalid
        return 0;
    };

    const handleHoldOpen = () => {
        setIsHoldList(!isHoldList);
    };

    const handlePrintHeldBill = async (heldOrderId) => {
        try {
            const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/printHeldOrderBill/${heldOrderId}`);
            if (response.data.html) {
                // Try silent printing first
                try {
                    await silentPrint("http://localhost:4000/print", response.data.html);
                    console.log("✅ Bill from held orders printed silently");
                    return; // Stop if silent print succeeds
                } catch (silentErr) {
                    console.warn("⚠️ Silent print failed, falling back to browser:", silentErr.message);
                }

                // Fallback to iframe printing if agent fails
                const iframe = document.createElement('iframe');
                iframe.style.display = 'none';
                document.body.appendChild(iframe);

                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                iframeDoc.open();
                iframeDoc.write(response.data.html);
                iframeDoc.close();

                setTimeout(() => {
                    iframe.contentWindow.focus();
                    iframe.contentWindow.print();
                    setTimeout(() => document.body.removeChild(iframe), 1000);
                }, 500);
            }
        } catch (error) {
            console.error("Error printing held order bill:", error);
            toast.error("Failed to print bill");
        }
    };

    const handleFindUser = (e) => {
        setKeyword(e.target.value);
    };

    const determineSearchType = (keyword) => {
        if (/^\d+$/.test(keyword)) {
            return 'mobile';
        } else if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(keyword)) {
            return 'username';
        } else {
            return 'name';
        }
    };

    useEffect(() => {
        if (!keyword.trim()) {
            setSearchCustomerResults([]);
            return;
        }
        const delayDebounce = setTimeout(async () => {
            try {
                const searchType = determineSearchType(keyword);
                const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/searchCustomer`, {
                    params: { keyword, searchType },
                });
                setSearchCustomerResults(response.data.customers || []);
            } catch (error) {
                console.error("Find customer error:", error);
            }
        }, 300);

        return () => clearTimeout(delayDebounce);
    }, [keyword]);

    const handleWalkInCustomerSubmit = async (e) => {
        e.preventDefault();

        if (!walkInCustomerName.trim()) {
            toast.error('Customer name is required.');
            return;
        }
        if (!walkInCustomerMobile.trim() || !/^0\d{9}$/.test(walkInCustomerMobile)) {
            toast.error('Mobile is required and must follow the format 0XXXXXXXXX.');
            return;
        }

        try {
            const response = await axios.post(
                `${process.env.REACT_APP_BASE_URL}/api/walkInCustomer`,
                {
                    name: walkInCustomerName.trim(),
                    address: walkInCustomerAddress.trim(),
                    mobile: walkInCustomerMobile.trim(),
                }
            );

            const message = response.data?.message || "Customer created successfully!";
            toast.success(message, { autoClose: 2000, className: "custom-toast" });

            setWalkInCustomerName('');
            setWalkInCustomerAddress('');
            setWalkInCustomerMobile('');
            setError('');
            setSuccess(message);
            setIsModalOpen(false);

        } catch (error) {
            const errorMessage = error.response?.data?.message || 'An error occurred while creating the customer.';
            toast.error(errorMessage, { autoClose: 2000, className: "custom-toast" });
            console.error('Walk-in customer error:', error);
            setError(errorMessage);
        }
    };

    const handleEditHoldProduct = async (heldProduct) => {
        try {
            const productGroups = {};

            heldProduct.products.forEach(product => {
                const key = product.ptype === 'Variation'
                    ? `${product.currentID}-${product.variation}`
                    : product.currentID;

                if (!productGroups[key]) {
                    productGroups[key] = {
                        ...product,
                        quantity: 0,
                        groupedProducts: []
                    };
                }

                productGroups[key].quantity += product.quantity;
                productGroups[key].groupedProducts.push(product);
            });

            const productsToAdd = Object.values(productGroups).map(group => {
                const baseProduct = group.groupedProducts[0];
                const baseDetails = baseProduct.baseProductDetails || {};

                let productPrice = baseProduct.price;
                let productQty = baseDetails.productQty || null;

                if (baseProduct.variation && baseProduct.variationValues) {
                    const selectedVariation = baseProduct.variationValues[baseProduct.variation];
                    if (selectedVariation) {
                        productPrice = selectedVariation.productPrice || productPrice;
                        productQty = selectedVariation.productQty || productQty;
                    }
                }

                return {
                    holdProductID: baseProduct._id,
                    id: baseProduct.currentID,
                    name: baseProduct.name,
                    isInventory: baseProduct.isInventory,
                    tax: baseProduct.tax || 0,
                    taxType: baseProduct.taxType || 'none',
                    productCost: baseProduct.productCost,
                    price: baseProduct.price || productPrice,
                    stokeQty: baseProduct.stokeQty || productQty || 0,
                    qty: group.quantity || 0,
                    discount: baseProduct.discount || 0,
                    warehouse: baseProduct.warehouse,
                    specialDiscount: baseProduct.specialDiscount || 0,
                    ptype: baseProduct.ptype || 'Single',
                    offcialProduct: baseProduct.offcialProduct,
                    selectedVariation: baseProduct.variation ? baseProduct.variation : null,
                    variationValues: baseProduct.variationValues
                        ? { ...baseProduct.variationValues }
                        : undefined,
                    kotPrinted: baseProduct.kotPrinted || false, // Preserve KOT printed status
                    originalQty: group.quantity || 0, // Track original quantity for comparison
                };
            });

            // Filter out duplicates that might already be in productBillingHandling
            const uniqueProductsToAdd = productsToAdd.filter(newProduct => {
                return !productBillingHandling.some(existingProduct => {
                    return existingProduct.id === newProduct.id &&
                        existingProduct.selectedVariation === newProduct.selectedVariation;
                });
            });
            setProductBillingHandling(uniqueProductsToAdd);
            handleDeleteHoldProduct(heldProduct._id, heldProducts, setHeldProducts);
            setIsHoldList(false);

        } catch (error) {
            console.error('Error fetching products by IDs:', error);
        }
    };

    const handlePopupClose = () => {
        setIsPopupOpen(false);
    };

    const handleExitingPopupClose = () => {
        setIsExitingPopupOpen(false);
    }

    const handleRegisterReportOpen = async () => {
        if (!cashierUsername) {
            setErrorMessage('Cashier username is not set.');
            return;
        }
        setIsPopUpRegisterReport(true);
        setErrorMessage(null);

        try {
            const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/findRegisterData/${cashierUsername}`);

            if (response.data && response.data.data) {
                const register = response.data.data;
                setRegisterData([register]);
                setCashHandIn(register.cashHandIn || 0);
                setCashierName(register.name || 'Unknown Cashier');
                setTotalAmount(register.totalBalance || 0);
                setOpenTime(register.openTime || '');
            } else {
                console.error('Unexpected response format or empty data:', response.data);
                setRegisterData([]);
                setErrorMessage('No register data found for this user.');
            }
        } catch (err) {
            console.error('Error fetching report data:', err);
            setErrorMessage('Failed to fetch report data');
            setRegisterData([]);
        }
        finally {
            stopLoading();
            refreshAllReports();
        }
    };

    const handleRegisterReportClose = () => {
        setIsPopUpRegisterReport(false)
    }

    const handlePOSClose = async () => {
        const cashRegisterID = sessionStorage.getItem('cashRegisterID');
        if (!cashRegisterID) return;

        try {
            const transformedInputs = Object.entries(inputs)
                .map(([key, value]) => ({
                    denomination: parseInt(key.replace('amount', ''), 10),
                    quantity: value,
                    amount: parseInt(key.replace('amount', ''), 10) * value
                }))
                .filter(item => item.quantity > 0);

            const now = new Date();
            const closedTime = now.toISOString();

            const transactionData = {
                cashierUsername,
                cashRegisterID,
                cashierName: cashierName || 'Unknown Cashier',
                openedTime: openTime,
                cardPaymentAmount: cardPaymentAmount || 0,
                cashPaymentAmount: cashPaymentAmount || 0,
                bankTransferPaymentAmount: bankTransferPaymentAmount || 0,
                totalDiscountAmount: totalDiscountAmount || 0,
                totalAmount: totalBalance - cashHandIn,
                grandTotal: totalSaleAmount,
                cashHandIn: cashHandIn || 0,
                inputs: transformedInputs,
                cashVariance: parseFloat((Math.max(0, (cashPaymentAmount + cashHandIn) - calculateTotal()))),
                closedTime
            };

            //1. First save transaction data
            await axios.post(`${process.env.REACT_APP_BASE_URL}/api/saveZreadingBill`, transactionData, {
                headers: { 'Content-Type': 'application/json' }
            });

            // 2. Close the register after successful save
            await axios.delete(`${process.env.REACT_APP_BASE_URL}/api/closeRegister/${cashRegisterID}`);

            //Cleanup
            toast.success('POS close successfully!', { autoClose: 2000 }, { className: "custom-toast" });
            sessionStorage.removeItem('cashRegisterID');
            sessionStorage.removeItem('cashierUsername');
            sessionStorage.removeItem('name');
            setIsPopupOpen(false);
            navigate('/dashboard');

        } catch (error) {
            console.error('POS Closure Error:', error);
            const errorContext = error.config?.url?.includes('saveZreadingBill')
                ? 'Failed to save transaction data'
                : 'Failed to close register';

            setErrorMessage(error.response?.data?.message || `${errorContext}: ${error.message}`);
            toast.error('Error closing POS!', { autoClose: 2000 }, { className: "custom-toast" });

            if (error.config?.url?.includes('closeRegister')) {
                sessionStorage.removeItem('cashRegisterID');
                sessionStorage.removeItem('cashierUsername');
            }
        }
    };

    const handleExitingFromPos = () => {
        setIsExitingPopupOpen(false);
        navigate('/dashboard');
    };

    let username = '';
    const encryptedCashierUsername = sessionStorage.getItem('cashierUsername');
    if (encryptedCashierUsername) {
        try {
            const userKey = CryptoJS.AES.decrypt(encryptedCashierUsername, 'ldunstvd');
            username = userKey.toString(CryptoJS.enc.Utf8);

            if (!username) {
                //console.error('Decryption successful, but username is empty.');
            }
        } catch (error) {
            console.error('Error decrypting username:', error);
        }
    } else {
        console.error('No cashierUsername found in sessionStorage.');
    }

    const handleHorizontalScroll = (e, containerId) => {
        e.preventDefault();
        const container = document.getElementById(containerId);
        if (container) {
            container.scrollBy({
                left: e.deltaY,
            });
        }
    };

    useEffect(() => {
        const fetchReportData = async () => {
            startLoading();
            try {
                let url = `${process.env.REACT_APP_BASE_URL}/api/getZReportData/${cashRegisterID}`;
                const response = await axios.get(url);
                const sales = response.data.data.sales;

                const { totalDiscountAmount } = sales.reduce((totals, sale) => {
                    if (sale && sale.productsData) {
                        let saleSubtotal = 0;
                        let productDiscounts = 0;
                        if (sale.pureProfit !== undefined) {
                            totals.totalProfitAmount += parseFloat(sale.pureProfit) || 0;
                        }

                        sale.productsData.forEach(product => {
                            const quantity = parseFloat(product.quantity || 0);
                            const price = parseFloat(product.price || 0);
                            const discount = parseFloat(product.discount || 0);
                            const specialDiscount = parseFloat(product.specialDiscount || 0);
                            const taxRate = parseFloat(product.taxRate || 0);

                            productDiscounts += ((specialDiscount) * quantity);
                            const netPrice = (((price - discount - specialDiscount) * quantity) + (price * quantity * taxRate));
                            saleSubtotal += netPrice;
                        });

                        let saleDiscount = 0;
                        if (sale.discount) {
                            const discountValue = parseFloat(sale.discount);
                            saleDiscount = sale.discountType === 'percentage'
                                ? saleSubtotal * (discountValue / 100)
                                : discountValue;
                        }
                        const offerDiscount = saleSubtotal * (parseFloat(sale.offerPercentage || 0) / 100);

                        totals.grandTotal += saleSubtotal;
                        totals.totalDiscountAmount += productDiscounts + saleDiscount + offerDiscount;
                    }
                    return totals;
                }, {
                    grandTotal: 0,
                    totalDiscountAmount: 0,
                    totalProfitAmount: 0
                });

                setTotalDiscountAmount(totalDiscountAmount);
            } catch (error) {
                console.error('Error fetching report data:', error);
                setError('Failed to fetch report data');
            }
            finally {
                setLoading(false);
                setLoadingCir(false)
            }
        };

        fetchReportData();
    }, [regDataFetching, refreshKey]);

    useEffect(() => {
        const fetchReportData = async () => {
            setLoading(true);
            try {
                let url = `${process.env.REACT_APP_BASE_URL}/api/getZReportData/${cashRegisterID}`;
                const response = await axios.get(url);
                const sales = response.data.data.sales;

                let cardTotal = 0;
                let cashTotal = 0;
                let bankTransferTotal = 0;

                sales.forEach(sale => {
                    sale.paymentType?.forEach(payment => {
                        switch (payment.type) {
                            case 'card':
                                cardTotal += payment.amount;
                                break;
                            case 'cash':
                                cashTotal += payment.amount;
                                break;
                            case 'bank_transfer':
                                bankTransferTotal += payment.amount;
                                break;
                            default:
                                cashTotal += payment.amount;
                                break;
                        }
                    });
                });

                const totalCashBalance = sales.reduce(
                    (sum, sale) => sum + (sale.cashBalance || 0), 0
                );
                cashTotal += totalCashBalance;

                const cashierTotalSale = cashTotal + cardTotal + bankTransferTotal;
                setCardPaymentAmount(cardTotal);
                setCashPaymentAmount(cashTotal);
                setBankTransferPaymentAmount(bankTransferTotal);
                setCashierTotalSale(cashierTotalSale);

            } catch (error) {
                console.error('Error fetching report data:', error);
                setError('Failed to fetch report data');
            } finally {
                setLoading(false);
            }
        };

        fetchReportData();
    }, [regDataFetching, refreshKey]);

    useEffect(() => {
        const fetchReportData = async () => {
            setLoading(true);
            try {
                const response = await axios.get(
                    `${process.env.REACT_APP_BASE_URL}/api/getTodayReportData/${warehouse}`
                );
                const posSales = response.data.data.sales.filter(sale => sale.saleType === 'POS');
                const totalSaleAmount = posSales.reduce(
                    (total, sale) => total + parseFloat(sale.grandTotal || 0),
                    0
                );
                setTotalSale(totalSaleAmount);

            } catch (error) {
                console.error('Error fetching report data:', error);
                setError('Failed to fetch report data');
            } finally {
                setLoading(false);
            }
        };

        fetchReportData();
    }, [warehouse, registerData, refreshKey]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setInputs({
            ...inputs,
            [name]: value
        });
    };

    const calculateTotal = () => {
        const total =
            (inputs.amount20 * 20) +
            (inputs.amount50 * 50) +
            (inputs.amount100 * 100) +
            (inputs.amount500 * 500) +
            (inputs.amount1000 * 1000) +
            (inputs.amount5000 * 5000) +
            (inputs.amount1 * 1) +
            (inputs.amount2 * 2) +
            (inputs.amount5 * 5) +
            (inputs.amount10 * 10);
        return total;
    };

    const handleRealTimeSearch = async (searchTerm) => {
        if (searchTerm.trim() === "") {
            setSearchedProductDataByName([]);
            try {
                const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/findProductByName`, {
                    params: {
                        keyword: "*", // Fetch all
                        warehouse: warehouse
                    },
                });
                setSearchedProductDataByName(response.data.products || []);
            } catch (error) {
                console.error("Error fetching products:", error);
            }
            return;
        }
        setLoading(true);
        try {
            const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/findProductByName`, {
                params: {
                    keyword: searchTerm,
                    warehouse: warehouse
                },
            });
            setSearchedProductDataByName(response.data.products || []);
        } catch (error) {
            console.error("Error searching products:", error);
            setSearchedProductDataByName([]);
        } finally {
            setLoading(false);
        }
    };

    const debounce = (func, delay) => {
        let timer;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => func.apply(this, args), delay);
        };
    };

    const debouncedSearch = debounce(handleRealTimeSearch, 300);

    const handleInputNameChange = (e) => {
        const value = e.target.value;
        setProductNameOrCode(value);
        if (value.trim() === "") {
            setSearchedProductDataByName([]);
        } else {
            debouncedSearch(value);
        }
    };

    useEffect(() => {
    }, [searchedProductData, combinedProductData]);

    const closeAddProductModal = () => {
        setShowAddProductModal(false);
    };

    const handleQuickAdd = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const name = formData.get("name")?.toString().trim();
        const cost = formData.get("cost")?.toString().trim() || "0";
        const price = formData.get("price")?.toString().trim();

        if (!name || !price) {
            toast.error("Product name and price are required");
            return;
        }

        const quickProduct = {
            id: `quick_${Date.now()}`,
            name: name,
            offcialProduct: false,
            productCost: parseFloat(cost) || 0,
            warehouse: sessionStorage.getItem("defaultWarehouse"),
            price: parseFloat(price),
            ptype: "Single",
            isInventory: false,
        };
        handleAddingProduct(quickProduct);

        closeAddProductModal();
    };

    const handleLoadPlacedOrder = async (order) => {
        const productsToAdd = order.items.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            productCost: item.productCost || 0,
            qty: item.quantity,
            tax: item.tax || 0,
            taxType: item.taxType || 'none',
            discount: item.discount || 0,
            specialDiscount: item.specialDiscount || 0,
            ptype: item.ptype || 'Single',
            isInventory: item.isInventory || false,
            warehouse: item.warehouse || warehouse,
            offcialProduct: item.offcialProduct || true,
            variationValue: item.variationValue,
            kotPrinted: item.kotPrinted || false,
        }));
        setProductBillingHandling(productsToAdd);
        setOrderId(order._id);
        setShowPlacedOrdersModal(false);
        toast.success('Order loaded to cart!');
    };

    const handleDeleteSinglePlacedOrder = async (orderId) => {
        try {
            await axios.delete(`${process.env.REACT_APP_BASE_URL}/api/orders/${orderId}`);
            toast.success('Order deleted');
            fetchLiveOrderCount();
            const socket = io(process.env.REACT_APP_BASE_URL);
            socket.emit('orderCompleted', orderId);
        } catch (err) {
            toast.error('Failed to delete order');
        }
    };

    const handleDeleteAllPlacedOrders = async () => {
        try {
            await axios.delete(`${process.env.REACT_APP_BASE_URL}/api/deleteAllPlacedOrder`);
            toast.success('All placed orders deleted');
            setLiveOrderCount([]);
            setLiveOrderCount(0);
            fetchLiveOrderCount();
            const socket = io(process.env.REACT_APP_BASE_URL);
            socket.emit('allOrdersDeleted');
        } catch (err) {
            toast.error('Failed to delete all orders');
        }
    };

    const refreshPlacedOrders = async () => {
        try {
            const response = await axios.get(
                `${process.env.REACT_APP_BASE_URL}/api/getPlacedOrders`
            );

            if (response.data.success) {
                setPlacedOrders(response.data.orders || []);
                setLiveOrderCount(response.data.count || 0);
            }
        } catch (error) {
            console.error("Failed to refresh placed orders:", error);
        }
    };

    useEffect(() => {
        refreshPlacedOrders();
        setPalcedStatus(false);
    }, [palcedStatus]);


    useEffect(() => {
        fetchAllData(setProductData, setSelectedCategoryProducts, setSelectedBrandProducts, setSearchedProductData, setProgress, setError);
    }, [menuType]);

    useEffect(() => {
        if (!menuType) return;
        const updateMenuType = async () => {
            try {
                await axios.post(`${process.env.REACT_APP_BASE_URL}/api/createOrUpdateSettings`,
                    { menuType }
                );
            } catch (error) {
                console.error('Error saving data:', error);
                if (error.response) {
                    if (error.response.data && error.response.data.message) {
                        toast.error(
                            error.response.data.message,
                            { autoClose: 2000 },
                            { className: "custom-toast" }
                        );

                    } else {
                        toast.error(
                            `Server responded with status: ${error.response.status}`,
                            { autoClose: 2000 },
                            { className: "custom-toast" }
                        );
                    }
                } else if (error.request) {
                    toast.error(
                        'No response from the server. Please check your internet connection.',
                        { autoClose: 2000 },
                        { className: "custom-toast" }
                    );
                } else {
                    toast.error(
                        'An unexpected error occurred while setting up the request.',
                        { autoClose: 2000 },
                        { className: "custom-toast" }
                    );
                }
            }
        };

        updateMenuType();
    }, [menuType]);

    return (
        <div className="bg-[#FFF6E5] absolute w-full h-screen p-2 overflow-hidden">
            {/* HEADER SECTION */}
            <div className="flex flex-col md:flex-row md:items-start xl:flex-row justify-between gap-2 xl:gap-0 w-full h-auto xl:h-[80px]">
                <div className="flex flex-col xl:flex-row justify-start xl:justify-between w-full md:w-[45%] lg:w-[42%] xl:w-[34.9%] bg-white h-auto xl:h-[80px] rounded-[15px] p-2 lg:p-2 xl:p-0 gap-2 xl:gap-0 shadow-sm border border-[#D4AF37]/20">

                    <div className="w-full xl:w-1/2 h-auto xl:h-[82px] flex items-center relative xl:pb-[2px] xl:mt-0">
                        <form className="flex items-center relative w-full" onSubmit={(e) => e.preventDefault()}>
                            <input
                                name="keyword"
                                type="text"
                                placeholder="Find Customer"
                                className="searchBox w-full xl:w-[100%] px-4 py-3 md:py-4 pl-10 xl:m-2 xl:py-5 xl:px-4 border border-gray-300 rounded-[10px] shadow-sm focus:border-transparent"
                                value={keyword}
                                onChange={handleFindUser}
                            />
                            <button type="submit" className="absolute inset-y-0 left-0 pl-6 flex items-center text-gray-400">
                                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                    <path fillRule="evenodd" d="M9 3a6 6 0 100 12A6 6 0 009 3zm0-1a7 7 0 110 14A7 7 0 019 2z" clipRule="evenodd" />
                                    <path fillRule="evenodd" d="M12.9 12.9a1 1 0 011.41 0l3 3a1 1 0 01-1.41 1.41l-3-3a1 1 0 010-1.41z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </form>
                        {keyword && searchCustomerResults.length > 0 && (
                            <div className="absolute top-[90px] w-[94%] mr-2 z-50 text-left left-[7px] py-2 bg-white border border-gray-300 rounded-lg shadow-md max-h-[350px] overflow-y-auto">
                                <ul>
                                    {searchCustomerResults.map((customer, index) => (
                                        <li
                                            key={index}
                                            className="p-2 cursor-pointer hover:bg-gray-100 flex justify-between"
                                            onClick={() => {
                                                setSelectedCustomer(customer.name);
                                                setKeyword('');
                                            }}
                                        >
                                            <span>{customer.name}</span>
                                            <span className="text-gray-500">{customer.mobile}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div>
                            {/* Button to open modal */}
                            <button
                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-300"
                                onClick={() => setIsModalOpen(true)}
                            >
                                <img
                                    className="w-[20px] h-[20px] hover:scale-110 transition-transform duration-300"
                                    src={User}
                                    alt="add user"
                                />
                            </button>

                            {/* Modal for Walk-In Customer */}
                            {isModalOpen && (
                                <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex justify-center items-center backdrop-blur-sm z-[1000]">
                                    <div className="bg-white w-[350px] sm:w-[400px] p-6 rounded-2xl shadow-2xl transform scale-100 opacity-0 animate-fadeIn">
                                        <div className="flex items-center justify-center mb-6">
                                            <h2 className="text-2xl font-semibold text-gray-700 text-center">
                                                Add Customer
                                            </h2>
                                        </div>

                                        <form onSubmit={handleWalkInCustomerSubmit}>
                                            {/* Customer Name */}
                                            <div className="relative mb-4">
                                                <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
                                                    Customer Name <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Enter customer name"
                                                    value={walkInCustomerName}
                                                    onChange={(e) => {
                                                        setWalkInCustomerName(e.target.value);
                                                        setError("");
                                                        if (!e.target.value.trim()) {
                                                            setError("Customer name is required.");
                                                        }
                                                    }}
                                                    className={`w-full border p-3 pl-10 rounded-lg shadow-sm focus:outline-none focus:ring-2 ${!walkInCustomerName.trim() && error
                                                        ? "border-red-500 focus:ring-red-400"
                                                        : "border-gray-300 focus:ring-[#35AF87]"
                                                        }`}
                                                />
                                                <span className="absolute left-3 top-10 text-gray-400">
                                                    <i className="fas fa-user"></i>
                                                </span>
                                            </div>

                                            {/* Mobile */}
                                            <div className="relative mb-6">
                                                <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
                                                    Mobile <span className="text-red-500">*</span>
                                                </label>

                                                <input
                                                    type="text"
                                                    placeholder="Enter Mobile: 0XXXXXXXXX"
                                                    value={walkInCustomerMobile}
                                                    onChange={(e) => {
                                                        let value = e.target.value;
                                                        if (!/^\d*$/.test(value)) return;
                                                        if (value.length === 1 && value !== "0") return;
                                                        if (value.length > 10) return;

                                                        setWalkInCustomerMobile(value);
                                                    }}
                                                    className="w-full border border-gray-300 p-3 pl-10 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#35AF87]"
                                                    required
                                                    title="Enter a valid mobile number starting with 0 and containing 10 digits."
                                                />
                                                <p className="text-gray-500 text-left text-xs mt-1">
                                                    Must start with 0 and be exactly 10 digits
                                                </p>
                                                <span className="absolute left-3 top-10 text-gray-400">
                                                    <i className="fas fa-phone-alt"></i>
                                                </span>

                                                <span className="absolute left-3 top-10 text-gray-400">
                                                    <i className="fas fa-phone-alt"></i>
                                                </span>
                                                {error && !/^0\d{9}$/.test(walkInCustomerMobile) && (
                                                    <p className="text-red-500 text-sm mt-1 text-left">{error}</p>
                                                )}
                                            </div>

                                            {/* Address */}
                                            <div className="relative mb-4">
                                                <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
                                                    Address
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Enter Address"
                                                    value={walkInCustomerAddress}
                                                    onChange={(e) => setWalkInCustomerAddress(e.target.value)}
                                                    className="w-full border border-gray-300 p-3 pl-10 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#35AF87]"
                                                />
                                                <span className="absolute left-3 top-10 text-gray-400">
                                                    <i className="fas fa-id-card"></i>
                                                </span>
                                            </div>

                                            {/* Buttons */}
                                            <div className="flex justify-between">
                                                <button
                                                    type="submit"
                                                    className="submit w-1/2 text-white px-4 py-2 rounded-lg shadow-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                >
                                                    Create
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIsModalOpen(false);
                                                        setWalkInCustomerName("");
                                                        setWalkInCustomerAddress("");
                                                        setWalkInCustomerMobile("");
                                                        setError("");
                                                    }}
                                                    className="bg-gray-500 w-1/2 ml-2 text-white px-4 py-2 rounded-lg shadow-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>

                    <div className="w-full xl:w-1/2 h-auto xl:h-[82px] flex items-center xl:pb-[2px] relative rounded-[15px] xl:mr-1 mt-6 xl:mt-0 pb-2 xl:pb-0">
                        <form className="w-full">
                            <select
                                id="warehouse"
                                name="warehouse"
                                value={warehouse}
                                onChange={handleWarehouseChange}
                                className="searchBox w-full xl:w-[97%] pl-4 pr-2 py-3 md:py-4 xl:py-5 border border-gray-300 rounded-[10px] shadow-sm focus:border-transparent"
                            >
                                <option value="">Select a warehouse</option>
                                {filters.warehouses.map((wh) => (
                                    <option key={wh.name} value={wh.name}>
                                        {wh.name}
                                    </option>
                                ))}
                            </select>
                        </form>
                    </div>
                </div>

                <div className="w-full md:w-[54%] lg:w-[57%] xl:w-[65%] xl:ml-2 rounded-[15px] relative h-auto xl:h-[80px] bg-white flex flex-col xl:flex-row items-start xl:items-center p-2 xl:p-0">
                    {/* Product Search - Two Inputs with Toggle Switch */}
                    <div className="flex items-center gap-3 w-full xl:flex-1 mb-2 xl:mb-0">
                        <div className="flex flex-col items-center flex-shrink-0">
                            <button
                                type="button"
                                onClick={() => {
                                    const newMode = searchMode === 'code' ? 'name' : 'code';
                                    setSearchMode(newMode);
                                    setProductKeyword('');
                                    setProductNameOrCode('');
                                    setSearchedProductDataByName([]);
                                    setTimeout(() => inputRef.current?.focus(), 0);
                                }}
                                title={searchMode === 'code' ? 'Switch to name/code search' : 'Switch to barcode scan'}
                                className="xl:ml-2 relative inline-flex flex-col h-14 w-8 md:h-16 md:w-10 items-center justify-between rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[#1A5B63] focus:ring-offset-2"
                                style={{ backgroundColor: searchMode === 'code' ? '#1A5B63' : '#9ca3af' }}
                            >
                                {/* Sliding Knob */}
                                <span
                                    className={`absolute h-6 w-6 md:h-7 md:w-7 rounded-full bg-white shadow-lg transition-all duration-300 ease-in-out ${searchMode === 'code' ? 'top-1' : 'bottom-1'
                                        }`}
                                />
                            </button>
                        </div>

                        <div className="flex-1 max-w-xl xl:mr-4">
                            {searchMode === 'code' && (
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (Productkeyword.trim()) {
                                            handleProductSubmit(
                                                Productkeyword,
                                                setLoading,
                                                setSearchedProductData,
                                                setProductData,
                                                setSelectedCategoryProducts,
                                                setSelectedBrandProducts,
                                                setError
                                            );
                                            setProductKeyword('');
                                            setTimeout(() => inputRef.current?.focus(), 0);
                                        }
                                    }}
                                    className="w-full"
                                >
                                    <div className="relative w-full lg:w-full xl:w-[200px] 2xl:w-[300px]">
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            placeholder="Scan barcode here..."
                                            value={Productkeyword}
                                            onChange={(e) => setProductKeyword(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    if (Productkeyword.trim()) {
                                                        handleProductSubmit(
                                                            Productkeyword,
                                                            setLoading,
                                                            setSearchedProductData,
                                                            setProductData,
                                                            setSelectedCategoryProducts,
                                                            setSelectedBrandProducts,
                                                            setError
                                                        );
                                                        setProductKeyword('');
                                                        setTimeout(() => inputRef.current?.focus(), 0);
                                                    }
                                                }
                                            }}
                                            className="w-full pl-12 pr-6 py-3 md:py-4 xl:py-5 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A5B63] focus:border-transparent transition-all"
                                            autoFocus
                                        />
                                        {/* Barcode Icon */}
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                        </div>
                                    </div>
                                </form>
                            )}

                            {/* Name/Code Search Input (Visible in 'name' mode) */}
                            {searchMode === 'name' && (
                                <form onSubmit={(e) => e.preventDefault()} className="w-full">
                                    <div className="relative w-full lg:w-full xl:w-[200px] 2xl:w-[300px]">
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            placeholder="Search by name or code..."
                                            value={ProductNameOrCode}
                                            onChange={handleInputNameChange}
                                            className="w-full pl-12 pr-6 py-3 md:py-4 xl:py-5 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A5B63] focus:border-transparent transition-all"
                                            autoFocus
                                        />
                                        {/* Search Icon */}
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                        </div>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1 xl:gap-5 h-auto xl:h-[78px] w-full xl:w-auto justify-start xl:justify-end overflow-x-auto xl:overflow-x-visible overflow-y-hidden mt-2 xl:mt-0" style={{ scrollbarWidth: 'thin' }}>
                        <div className="relative p-1 md:p-2 xl:p-2 m-1 md:m-2 xl:m-2 w-[55px] h-[55px] md:w-[60px] md:h-[60px] xl:w-[65px] xl:h-[65px] border bg-[#44BC8D] rounded-[10px] flex items-center justify-center flex-shrink-0">
                            <button onClick={() => handleHoldOpen(setIsHoldList)}>
                                <img className="w-[35px] h-[35px] md:w-[40px] md:h-[40px] xl:w-[45px] xl:h-[45px]" src={Menu} alt="" />
                            </button>

                            {/* Notification Badge */}
                            {heldProducts && heldProducts.length > 0 && (
                                <span className="absolute top-[-8px] right-[-8px] bg-red-400 text-white text-xs rounded-full w-6 h-6 p-2 flex items-center justify-center">
                                    {heldProducts.length}
                                </span>
                            )}
                        </div>

                        {/* Popup for Hold list */}
                        {isHoldList && (
                            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                                <div className="bg-white w-[760px] max-h-[90vh] overflow-y-auto p-8 rounded-2xl shadow-2xl transform transition-all duration-300 ease-out">
                                    <h2 className="text-2xl font-bold text-gray-700 mb-6">Held Orders</h2>

                                    {/* No held products message */}
                                    {heldProducts && heldProducts.length === 0 ? (
                                        <div className="text-center text-gray-500 py-20">
                                            <p>No held products available.</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm mb-8">
                                            <table className="w-full table-auto border-collapse">
                                                <thead>
                                                    <tr className="bg-gray-50 border-b border-gray-200">
                                                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Order Type</th>
                                                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">No</th>
                                                        <th className="px-8 py-4 text-left text-sm font-semibold text-gray-700">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {heldProducts.map((product) => {
                                                        // DETERMINE DISPLAY TEXT — CLEAN & PROFESSIONAL
                                                        let orderTypeLabel = "";
                                                        let referenceNo = "";

                                                        if (product.orderType === "dine-in" || "dinein") {
                                                            orderTypeLabel = "Dine In";
                                                            referenceNo = product.tableNo ? `Table ${product.tableNo}` : "—";
                                                        }
                                                        else if (product.orderType === "takeaway") {
                                                            orderTypeLabel = "Take Away";
                                                            referenceNo = product.tokenNo ? `Token ${product.tokenNo}` : "—";
                                                        }
                                                        else if (product.orderType === "delivery") {
                                                            orderTypeLabel = "Delivery";
                                                            referenceNo = product.parcelNo ? `Parcel ${product.parcelNo}` : "—";
                                                        }

                                                        return (
                                                            <tr key={product._id} className="hover:bg-gray-50 transition-colors">
                                                                <td className="px-6 py-4 text-left font-medium text-gray-900">
                                                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold
                                                ${product.orderType === "dine-in" ? "bg-blue-100 text-blue-800" :
                                                                            product.orderType === "takeaway" ? "bg-green-100 text-green-800" :
                                                                                "bg-purple-100 text-purple-800"}`}
                                                                    >
                                                                        {orderTypeLabel}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4 text-left font-medium text-gray-800">
                                                                    <span className="font-bold text-lg">{product.tableNo || referenceNo}</span>
                                                                </td>
                                                                <td className="px-6 py-4 flex gap-2">
                                                                    <button
                                                                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-3 rounded-lg transition-all"
                                                                        onClick={() => handleEditHoldProduct(product)}
                                                                        title="Edit Order"
                                                                    >
                                                                        <i className="fas fa-edit text-lg"></i>
                                                                    </button>
                                                                    <button
                                                                        className="text-green-600 hover:text-green-800 hover:bg-green-50 p-3 rounded-lg transition-all"
                                                                        onClick={() => handlePrintHeldBill(product._id)}
                                                                        title="Print Bill"
                                                                    >
                                                                        <i className="fas fa-print text-lg"></i>
                                                                    </button>
                                                                    <button
                                                                        className="text-red-600 hover:text-red-800 hover:bg-red-50 p-3 rounded-lg transition-all"
                                                                        onClick={() => handleDeleteHoldProduct(product._id, heldProducts, setHeldProducts)}
                                                                        title="Delete Order"
                                                                    >
                                                                        <i className="fas fa-trash text-lg"></i>
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {/* Close Button */}
                                    <div className="flex justify-end mt-4">
                                        <button
                                            className="px-6 py-3 bg-white outline-none border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                                            onClick={() => handleHoldOpen(setIsHoldList)}
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="p-1 md:p-2 xl:p-2 m-1 md:m-2 xl:m-2 w-[55px] h-[55px] md:w-[60px] md:h-[60px] xl:w-[65px] xl:h-[65px] border bg-[#44BC8D] rounded-[10px] flex items-center justify-center flex-shrink-0">
                            <button onClick={() => handlePopupOpen(setIsPopupOpen)}>
                                <img className="w-[35px] h-[35px] md:w-[40px] md:h-[40px] xl:w-[45px] xl:h-[45px]" src={pro} alt="" />
                            </button>
                        </div>

                        <div className="relative p-1 md:p-2 xl:p-2 m-1 md:m-2 xl:m-2 w-[55px] h-[55px] md:w-[60px] md:h-[60px] xl:w-[65px] xl:h-[65px] border bg-[#44BC8D] rounded-[10px] flex items-center justify-center hover:bg-[#3aa577] transition-all shadow-md group flex-shrink-0">
                            <button
                                onClick={() => setShowPlacedOrdersModal(true)}
                                className="relative"
                            >
                                <img className="w-[35px] h-[35px] md:w-[40px] md:h-[40px] xl:w-[45px] xl:h-[45px]" src={Plced_Order} alt="Placed Orders" />

                                {/* Badge */}
                                {liveOrderCount > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center shadow-lg animate-pulse">
                                        {liveOrderCount > 99 ? '99+' : liveOrderCount}
                                    </span>
                                )}
                            </button>

                            {/* Tooltip */}
                            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-3 py-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                Placed Orders ({liveOrderCount})
                            </div>

                            {/*PLACED ORDERS MODAL*/}
                            {showPlacedOrdersModal && (
                                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                                    <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden">
                                        {/* Header */}
                                        <div className="bg-gradient-to-r from-[#44BC8D] to-[#1A5B63] text-white p-6">
                                            <div className="flex justify-between items-center">
                                                <h2 className="text-2xl font-bold">Placed Orders ({placedOrders.length})</h2>
                                                <button
                                                    onClick={() => setShowPlacedOrdersModal(false)}
                                                    className="text-white hover:bg-white/20 p-2 rounded-full transition"
                                                >
                                                    <X className="w-6 h-6" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Body */}
                                        <div className="p-6 overflow-y-auto max-h-[68vh]">
                                            {placedOrders.length === 0 ? (
                                                <p className="text-center text-gray-500 py-10">No placed orders</p>
                                            ) : (
                                                <div className="space-y-4">
                                                    {placedOrders.map((order) => {
                                                        const ref = order.orderType === 'dine-in'
                                                            ? `Table ${order.tableNo}`
                                                            : order.orderType === 'takeaway'
                                                                ? `Token ${order.tokenNo}`
                                                                : `Parcel ${order.parcelNo}`;

                                                        return (
                                                            <div key={order._id} className={`rounded-xl p-5 border transition ${
                                                                order.status === 'ready'
                                                                    ? 'bg-orange-50 border-orange-300 shadow-md'
                                                                    : 'bg-gray-50 border-gray-200 hover:shadow-md'
                                                            }`}>
                                                                <div className="flex justify-between items-start mb-3">
                                                                    <div>
                                                                        <div className="flex items-center gap-2">
                                                                            <h3 className="font-bold text-lg">{ref}</h3>
                                                                            {order.status === 'ready' && (
                                                                                <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                                                                    🍳 Ready
                                                                                </span>
                                                                            )}
                                                                        </div>

                                                                        <p className="text-sm font-medium mt-1 text-gray-600">
                                                                            {order.items.length} item(s) • {currency} {formatWithCustomCommas(order.totalPrice)}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                {/* Item List */}
                                                                <div className="mt-4 bg-white/50 rounded-lg p-3 border border-gray-100">
                                                                    <div className="space-y-3">
                                                                        {order.items.map((item, idx) => (
                                                                            <div key={idx} className="flex justify-between items-start text-sm">
                                                                                <div className="flex gap-3">
                                                                                    <span className="flex-shrink-0 bg-[#E8F5F1] text-[#1A5B63] font-bold px-2 py-0.5 rounded text-xs min-w-[28px] h-fit text-center">
                                                                                        {item.quantity}
                                                                                    </span>
                                                                                    <div>
                                                                                        <p className="font-semibold text-gray-800 leading-tight">{item.name}</p>
                                                                                        {item.variationValue && (
                                                                                            <p className="text-[11px] text-[#35AF87] font-medium mt-0.5">
                                                                                                {item.variationValue}
                                                                                            </p>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                                <span className="text-gray-700 font-medium whitespace-nowrap ml-4">
                                                                                    {currency} {formatWithCustomCommas(item.subtotal || (item.price * item.quantity))}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100">
                                                                    <div className="text-xs text-gray-400 font-medium">
                                                                        Placed at: {(() => {
                                                                            const dateVal = order.placedAt || order.createdAt || order.timestamp;
                                                                            const dateObj = dateVal ? new Date(dateVal) : new Date();
                                                                            return isNaN(dateObj.getTime())
                                                                                ? "Recently"
                                                                                : dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                                                        })()}
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        {/* Load to Cart */}
                                                                        <button
                                                                            onClick={() => handleLoadPlacedOrder(order)}
                                                                            className="text-[#1A5B63] px-4 py-2 rounded-lg text-sm font-medium transition"
                                                                        >
                                                                            <i className="fas fa-cart-plus text-xl"></i>
                                                                        </button>

                                                                        {/* Delete Single */}
                                                                        <button
                                                                            onClick={() => handleDeleteSinglePlacedOrder(order._id)}
                                                                            className="text-red-600 px-4 py-2 rounded-lg text-sm font-medium transition"
                                                                        >
                                                                            <i className="fas fa-trash text-lg"></i>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        {/* Footer */}
                                        {placedOrders.length > 0 && (
                                            <div className="border-t bg-gray-50 p-4 mb-2 flex justify-between">
                                                <button
                                                    onClick={handleDeleteAllPlacedOrders}
                                                    className="hover:bg-[#1A5B63] hover:text-white text-[#1A5B63] border-2 border-[#1A5B63] px-6 py-3 rounded-3xl font-semibold transition"
                                                >
                                                    Clear All Orders
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-1 md:p-2 xl:p-2 m-1 md:m-2 xl:m-2 w-[55px] h-[55px] md:w-[60px] md:h-[60px] xl:w-[65px] xl:h-[65px] border bg-[#1A5B63] rounded-[10px] flex items-center justify-center flex-shrink-0">
                            <Link to={'/viewSale'}>
                                <img className="w-[35px] h-[35px] md:w-[40px] md:h-[40px] xl:w-[45px] xl:h-[45px]" src={SL_R} alt="" />
                            </Link>
                        </div>

                        {/* Popup for POS Close */}
                        {isPopupOpen && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                                <div className="bg-white w-[400px] h-[260px] p-8 rounded-xl shadow-lg flex flex-col justify-between">
                                    <div className="text-center">
                                        <h2 className="text-2xl text-gray-800 font-bold mb-2">Closing POS</h2>
                                        <p className="text-gray-800 text-base pt-6">Are you sure you want to close the register?</p>
                                    </div>

                                    <div className="flex justify-center space-x-4 mt-8">

                                        <button
                                            className="px-4 py-2 button-bg-color text-white rounded-md"
                                            onClick={() => {
                                                console.log('POS closed');
                                                handleRegisterReportOpen(setIsPopUpRegisterReport, setIsPopupOpen);
                                            }}
                                        >
                                            Confirm
                                        </button>
                                        <button
                                            className="px-5 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition"
                                            onClick={() => handlePopupClose(setIsPopupOpen)}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Popup Register report*/}
                        {isPopUpRegisterReport && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-2 sm:p-4">
                                <div className="bg-white w-[95%] max-h-[95vh]
                                sm:w-[90%] md:w-[85%] lg:w-[80%] xl:w-[75%] 2xl:w-[70%]
                                p-3 sm:p-4 md:p-5 lg:p-6 rounded-md shadow-lg overflow-y-auto scroll-container">
                                    <h2 className="text-base sm:text-lg md:text-xl text-gray-800 font-semibold mb-3 sm:mb-4">Register Report</h2>
                                    {loading ? (
                                        <p>Loading</p>
                                    ) : registerData.length > 0 ? (
                                        <div className="px-2 sm:px-4 md:px-6 pt-2 pb-1 overflow-x-auto">
                                            <table className="min-w-full bg-white border border-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="align-top px-2 sm:px-4 md:px-6 lg:px-7 py-2 md:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Open Time</th>
                                                        <th className="align-top px-2 sm:px-4 md:px-6 lg:px-7 py-2 md:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Cashier</th>
                                                        <th className="align-top px-2 sm:px-4 md:px-6 lg:px-7 py-2 md:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Cash hand in</th>
                                                        <th className="align-top px-2 sm:px-4 md:px-6 lg:px-7 py-2 md:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Your Sale <br /><p className='text-[10px]'>(Without Cash Hand)</p>
                                                        </th>
                                                        <th className="align-top px-7 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Today Total Sale <br /><p className='text-[10px]'>(Without Cash Hand)</p>
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {registerData.map((reg) => (
                                                        <tr key={reg._id}>
                                                            <td className="px-7 py-5 text-left whitespace-nowrap text-m text-gray-900">
                                                                <p className="rounded-[5px] text-center p-[6px] bg-red-100 text-red-500">
                                                                    {reg.openTime}
                                                                </p>
                                                            </td>
                                                            <td className="px-7 py-5 text-left whitespace-nowrap text-m text-gray-900">{reg.name}</td>
                                                            <td className="px-4 py-5 text-left whitespace-nowrap text-m text-gray-900">
                                                                <p className="rounded-[5px] text-center py-[6px] bg-blue-100 text-blue-500">
                                                                    {currency} {formatWithCustomCommas(reg.cashHandIn)}
                                                                </p>
                                                            </td>
                                                            <td className="px-7 py-5 text-left whitespace-nowrap text-m text-gray-900">
                                                                <p className="rounded-[5px] text-center py-[6px] bg-green-100 text-green-500">
                                                                    {currency} {formatWithCustomCommas(cashierTotalSale)}
                                                                </p>
                                                            </td>
                                                            <td className="px-7 py-5 text-left whitespace-nowrap text-m text-gray-900">
                                                                <p className="rounded-[5px] text-center py-[6px] bg-green-100 text-green-500">
                                                                    {currency} {formatWithCustomCommas(totalSaleAmount)}
                                                                </p>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) :
                                        null}
                                    <div className="overflow-x-auto px-2 sm:px-4 md:px-6 pt-2 pb-4">
                                        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4'>
                                            <div className="flex-1">
                                                <label className="block text-xs sm:text-sm font-medium leading-6 text-gray-900 text-left">Total Discount : </label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={formatWithCustomCommas(totalDiscountAmount || 0)}
                                                        className="w-full border border-gray-300 p-2 sm:p-3 pl-10 sm:pl-12 md:pl-14 text-sm sm:text-base rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#35AF87]"
                                                    />
                                                    <span className="absolute rounded-l-lg left-[1px] px-2 sm:px-3 py-2.5 sm:py-3 md:py-4 bg-gray-100 top-1/2 transform -translate-y-1/2 text-xs sm:text-sm">{currency}</span>
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-xs sm:text-sm font-medium leading-6 text-gray-900 text-left">Cash : </label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={formatWithCustomCommas(cashPaymentAmount || 0)}
                                                        className="w-full border border-gray-300 p-2 sm:p-3 pl-10 sm:pl-12 md:pl-14 text-sm sm:text-base rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#35AF87]"
                                                    />
                                                    <span className="absolute rounded-l-lg left-[1px] px-2 sm:px-3 py-2.5 sm:py-3 md:py-4 bg-gray-100 top-1/2 transform -translate-y-1/2 text-xs sm:text-sm">{currency}</span>
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-xs sm:text-sm font-medium leading-6 text-gray-900 text-left">Card : </label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={formatWithCustomCommas(cardPaymentAmount || 0)}
                                                        className="w-full border border-gray-300 p-2 sm:p-3 pl-10 sm:pl-12 md:pl-14 text-sm sm:text-base rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#35AF87]"
                                                    />
                                                    <span className="absolute rounded-l-lg left-[1px] px-2 sm:px-3 py-2.5 sm:py-3 md:py-4 bg-gray-100 top-1/2 transform -translate-y-1/2 text-xs sm:text-sm">{currency}</span>
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-xs sm:text-sm font-medium leading-6 text-gray-900 text-left">Bank Transfer : </label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={formatWithCustomCommas(bankTransferPaymentAmount || 0)}
                                                        className="w-full border  border-gray-300 p-2 sm:p-3 pl-10 sm:pl-12 md:pl-14 text-sm sm:text-base rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#35AF87]"
                                                    />
                                                    <span className="absolute rounded-l-lg left-[1px] px-2 sm:px-3 py-2.5 sm:py-3 md:py-4 bg-gray-100 top-1/2 transform -translate-y-1/2 text-xs sm:text-sm">{currency}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="justify-left sw-4/4 overflow-x-auto px-2 sm:px-4 md:px-6 pt-2 pb-4">
                                        <h1 className='text-left pb-2 text-sm sm:text-base font-semibold'>Handle Cash Balancing</h1>
                                        <div className='flex flex-col lg:flex-row bg-opacity-50 bg-gray-100 px-2 sm:px-4 md:px-6 pt-2 pb-4 rounded-xl gap-3 md:gap-4'>
                                            <div className='flex w-full lg:w-[40%]'>
                                                <div className='gap flex flex-col flex-1'>
                                                    <div className="flex items-center justify-between mt-1">
                                                        <label className="mr-2 text-xs sm:text-sm">20 x </label>
                                                        <input
                                                            type="number"
                                                            name="amount20"
                                                            value={inputs.amount20}
                                                            onChange={handleInputChange}
                                                            className="w-[70px] sm:w-[80px] md:w-[100px] border border-gray-300 px-2 sm:px-3 py-1 text-sm sm:text-base rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#35AF87]"
                                                        />
                                                    </div>
                                                    <div className="flex items-center justify-between mt-1">
                                                        <label className="mr-2 text-xs sm:text-sm">50 x </label>
                                                        <input
                                                            type="number"
                                                            name="amount50"
                                                            value={inputs.amount50}
                                                            onChange={handleInputChange}
                                                            className="w-[70px] sm:w-[80px] md:w-[100px] border border-gray-300 px-2 sm:px-3 py-1 text-sm sm:text-base rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#35AF87]"
                                                        />
                                                    </div>
                                                    <div className="flex items-center justify-between mt-1">
                                                        <label className="mr-2 text-xs sm:text-sm">100 x </label>
                                                        <input
                                                            type="number"
                                                            name="amount100"
                                                            value={inputs.amount100}
                                                            onChange={handleInputChange}
                                                            className="w-[70px] sm:w-[80px] md:w-[100px] border border-gray-300 px-2 sm:px-3 py-1 text-sm sm:text-base rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#35AF87]"
                                                        />
                                                    </div>
                                                    <div className="flex items-center justify-between mt-1">
                                                        <label className="mr-2 text-xs sm:text-sm">500 x </label>
                                                        <input
                                                            type="number"
                                                            name="amount500"
                                                            value={inputs.amount500}
                                                            onChange={handleInputChange}
                                                            className="w-[70px] sm:w-[80px] md:w-[100px] border border-gray-300 px-2 sm:px-3 py-1 text-sm sm:text-base rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#35AF87]"
                                                        />
                                                    </div>
                                                    <div className="flex items-center justify-between mt-1">
                                                        <label className="mr-2 text-xs sm:text-sm">1000 x </label>
                                                        <input
                                                            type="number"
                                                            name="amount1000"
                                                            value={inputs.amount1000}
                                                            onChange={handleInputChange}
                                                            className="w-[70px] sm:w-[80px] md:w-[100px] border border-gray-300 px-2 sm:px-3 py-1 text-sm sm:text-base rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#35AF87]"
                                                        />
                                                    </div>
                                                    <div className="flex items-center justify-between mt-1">
                                                        <label className="mr-2 text-xs sm:text-sm">5000 x </label>
                                                        <input
                                                            type="number"
                                                            name="amount5000"
                                                            value={inputs.amount5000}
                                                            onChange={handleInputChange}
                                                            className="w-[70px] sm:w-[80px] md:w-[100px] border border-gray-300 px-2 sm:px-3 py-1 text-sm sm:text-base rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#35AF87]"
                                                        />
                                                    </div>
                                                </div>

                                                <div className='ml-3 sm:ml-4 md:ml-5 gap flex flex-col flex-1'>
                                                    <div className="flex items-center justify-between mt-1">
                                                        <label className="mr-2 text-xs sm:text-sm">1 x </label>
                                                        <input
                                                            type="number"
                                                            name="amount1"
                                                            value={inputs.amount1}
                                                            onChange={handleInputChange}
                                                            className="w-[70px] sm:w-[80px] md:w-[100px] border border-gray-300 px-2 sm:px-3 py-1 text-sm sm:text-base rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#35AF87]"
                                                        />
                                                    </div>
                                                    <div className="flex items-center justify-between mt-1">
                                                        <label className="mr-2 text-xs sm:text-sm">2 x </label>
                                                        <input
                                                            type="number"
                                                            name="amount2"
                                                            value={inputs.amount2}
                                                            onChange={handleInputChange}
                                                            className="w-[70px] sm:w-[80px] md:w-[100px] border border-gray-300 px-2 sm:px-3 py-1 text-sm sm:text-base rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#35AF87]"
                                                        />
                                                    </div>
                                                    <div className="flex items-center justify-between mt-1">
                                                        <label className="mr-2 text-xs sm:text-sm">5 x </label>
                                                        <input
                                                            type="number"
                                                            name="amount5"
                                                            value={inputs.amount5}
                                                            onChange={handleInputChange}
                                                            className="w-[70px] sm:w-[80px] md:w-[100px] border border-gray-300 px-2 sm:px-3 py-1 text-sm sm:text-base rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#35AF87]"
                                                        />
                                                    </div>
                                                    <div className="flex items-center justify-between mt-1">
                                                        <label className="mr-2 text-xs sm:text-sm">10 x </label>
                                                        <input
                                                            type="number"
                                                            name="amount10"
                                                            value={inputs.amount10}
                                                            onChange={handleInputChange}
                                                            className="w-[70px] sm:w-[80px] md:w-[100px] border border-gray-300 px-2 sm:px-3 py-1 text-sm sm:text-base rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#35AF87]"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className='ml-0 lg:ml-6 xl:ml-10 justify-end gap mt-3 lg:mt-0'>
                                                <div className='flex flex-col justify-end relative'>
                                                    <label className="mb-2 text-left text-xs sm:text-sm">Total Cash</label>
                                                    <div className="relative w-full sm:w-[150px] md:w-[170px]">
                                                        <span className={`absolute rounded-l-lg left-2 top-1/2 transform -translate-y-1/2 text-xs sm:text-sm ${calculateTotal() === 0 ? 'text-red-500' : 'text-gray-500'
                                                            }`}>
                                                            {currency}
                                                        </span>
                                                        <input
                                                            type="text"
                                                            value={formatWithCustomCommas(calculateTotal())}
                                                            readOnly
                                                            className={`w-full border-2 px-2 sm:px-3 py-2 pl-8 sm:pl-10 text-sm sm:text-base rounded-lg shadow-sm focus:outline-none focus:ring-1 ${calculateTotal() === 0
                                                                ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                                                                : 'border-gray-300 focus:ring-[#35AF87] focus:border-[#35AF87]'
                                                                } transition-colors duration-200`}
                                                        />
                                                    </div>
                                                    {calculateTotal() === 0 && (
                                                        <p className="text-red-500 text-left text-xs mt-1 font-medium">No cash detected</p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className='ml-0 lg:ml-3 xl:ml-4 mt-3 lg:mt-0'>
                                                <div className={`flex flex-col justify-end relative`}>
                                                    <label className="mb-2 text-left text-xs sm:text-sm">Cash Variance</label>
                                                    <div className="relative w-full sm:w-[150px] md:w-[170px]">
                                                        <span className="absolute rounded-l-lg left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs sm:text-sm">{currency}</span>
                                                        <input
                                                            type="text"
                                                            value={formatWithCustomCommas(Math.max(0, (cashPaymentAmount + cashHandIn) - calculateTotal()))}
                                                            readOnly
                                                            className="w-full border border-gray-300 px-2 sm:px-3 py-2 pl-8 sm:pl-10 text-sm sm:text-base rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#35AF87]"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className='ml-0 lg:ml-3 xl:ml-4 mt-3 lg:mt-0 hidden xl:block'>
                                                <div className="p-2 m-2 w-[55px] h-[55px] md:w-[60px] md:h-[60px] lg:w-[65px] lg:h-[63px] pb-2 border bg-[#1A5B63] rounded-[10px] flex items-center justify-center">
                                                    <button onClick={toggleCalculator}>
                                                        <img className="w-[35px] h-[35px] md:w-[40px] md:h-[40px] lg:w-[45px] lg:h-[45px]" src={Cal} alt="Calculator" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-0 mt-3 sm:mt-4 ml-0 sm:ml-3 md:ml-5">
                                        <button
                                            className="px-3 sm:px-4 py-2 sm:py-3 mr-0 sm:mr-2 bg-gray-500 text-white rounded-md text-sm sm:text-base"
                                            onClick={() => handleRegisterReportClose(setIsPopupOpen)}
                                        >
                                            Cancel
                                        </button>

                                        <button
                                            className="px-3 sm:px-4 py-2 sm:py-3 button-bg-color text-white rounded-md text-sm sm:text-base"
                                            onClick={async () => {
                                                console.log('POS closed');
                                                try {
                                                    await handlePOSClose();
                                                } catch (error) {
                                                    console.error('Failed to fetch Z records:', error);
                                                }
                                            }}
                                        >
                                            Close the POS
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="p-1 md:p-2 xl:p-2 m-1 md:m-2 xl:m-2 w-[55px] h-[55px] md:w-[60px] md:h-[60px] xl:w-[65px] xl:h-[65px] border bg-[#1A5B63] rounded-[10px] flex items-center justify-center flex-shrink-0">
                            <button className='' onClick={handleFullScreen}>
                                <img className="w-[35px] h-[35px] md:w-[40px] md:h-[40px] xl:w-[45px] xl:h-[45px]" src={Full} alt="" />
                            </button>
                        </div>


                        <div className="p-1 md:p-2 xl:p-2 m-1 md:m-2 xl:m-2 w-[55px] h-[55px] md:w-[60px] md:h-[60px] xl:w-[65px] xl:h-[65px] border bg-[#1A5B63] rounded-[10px] flex items-center justify-center flex-shrink-0">
                            <button onClick={toggleCalculator}>
                                <img className="w-[35px] h-[35px] md:w-[40px] md:h-[40px] xl:w-[45px] xl:h-[45px]" src={Cal} alt="Calculator" />
                            </button>
                        </div>


                        <div className="p-1 md:p-2 xl:p-2 m-1 md:m-2 xl:m-2 w-[55px] h-[55px] md:w-[60px] md:h-[60px] xl:w-[65px] xl:h-[65px] border bg-[#1A5B63] rounded-[10px] flex items-center justify-center flex-shrink-0">
                            <button onClick={() => setIsExitingPopupOpen(true)} className="focus:outline-none">
                                <img className="w-[35px] h-[35px] md:w-[40px] md:h-[40px] xl:w-[45px] xl:h-[45px]" src={Back} alt="Back" />
                            </button>
                        </div>
                        {/* The Popup modal */}
                        {isExitingPopupOpen && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                                <div className="bg-white w-[400px] h-[260px] p-8 rounded-xl shadow-lg flex flex-col justify-between">
                                    <div className="text-center" >
                                        <h2 className="text-2xl text-gray-800 font-bold mb-2">Exiting POS</h2>
                                        <p className="text-gray-800 text-base pt-6">Do you want to exit without closing the POS?</p>
                                    </div>
                                    <div className="flex justify-center space-x-4 mt-8">

                                        {/* Confirm button */}
                                        <button
                                            className="px-4 py-2 button-bg-color text-white rounded-md"
                                            onClick={handleExitingFromPos}
                                        >
                                            Confirm
                                        </button>
                                        {/* Cancel button */}
                                        <button
                                            className="px-4 py-2 mr-2 bg-gray-500 text-white rounded-md"
                                            onClick={() => handleExitingPopupClose(setIsExitingPopupOpen)}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* MAIN BODY SECTION */}
            <div className="flex justify-between mt-2 w-full h-[calc(100vh-100px)]">
                <div className="w-full md:w-[45%] lg:w-[42%] xl:w-[35%] h-full rounded-[15px] bg-white p-2">
                    <div>
                        <BillingSection
                            productBillingHandling={productBillingHandling}
                            setProductBillingHandling={setProductBillingHandling}
                            handleDeleteHoldProduct={handleDeleteHoldProduct}
                            setProductData={setProductData}
                            selectedCustomer={selectedCustomer}
                            setSelectedCustomer={setSelectedCustomer}
                            warehouse={warehouse}
                            setReloadStatus={setReloadStatus}
                            reloadStatus={reloadStatus}
                            setHeldProductReloading={setHeldProductReloading}
                            setSelectedCategoryProducts={setSelectedCategoryProducts}
                            setSelectedBrandProducts={setSelectedBrandProducts}
                            setSearchedProductData={setSearchedProductData}
                            setError={setError}
                            setFetchRegData={setFetchRegData}
                            setOrderId={setOrderId}
                            orderId={orderId}
                            setPalcedStatus={setPalcedStatus}
                            palcedStatus={palcedStatus}
                            handleOpenCustomerDisplay={handleOpenCustomerDisplay}
                        />
                    </div>
                </div>

                <div className="w-full md:w-[54%] lg:w-[57%] xl:w-[64.8%] ml-0 md:ml-2 rounded-[15px] h-full bg-white flex flex-col relative">
                    {/* Brands selection section */}
                    <div className="flex-shrink-0">
                        <ProductFilters setFilters={setFilters} setLoading={setLoading} />
                    </div>
                    <div className='flex-shrink-0'>
                        <div className="absolute right-8 bottom-10">
                            {/* Three Dots Button */}
                            {/* <button
                                onClick={() => setIsOpen(!isOpen)}
                                className="flex items-center justify-center outline-none w-12 h-12 bg-white rounded-full shadow-[0_13px_30px_rgba(0,0,0,0.40)] hover:shadow-[0_15px_35px_rgba(0,0,0,0.50)]
                                transition-all duration-200 focus:outline-none"
                                aria-label="More options"
                            >
                                <div className="flex flex-col space-y-1">
                                    <span className="block w-1 h-1 bg-gray-700 rounded-full"></span>
                                    <span className="block w-1 h-1 bg-gray-700 rounded-full"></span>
                                    <span className="block w-1 h-1 bg-gray-700 rounded-full"></span>
                                </div>
                            </button> */}


                            {/* Popup Menu */}
                            {isOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setIsOpen(false)}
                                    />

                                    <div className="absolute bottom-16 right-0 z-50 w-32 h-52 bg-white rounded-md shadow-2xl flex flex-col items-center justify-center">
                                        {/* Your Toggle Switch */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setMenuType(isForeign ? "local" : "foreign");
                                                setIsOpen(false);
                                            }}
                                            className={`relative inline-flex h-7 w-12 rounded-full transition-colors ${isForeign ? "bg-[#35AF87]" : "bg-gray-300"
                                                }`}
                                        >
                                            <span
                                                className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow-md transition-transform ${isForeign ? "translate-x-5" : "translate-x-0"
                                                    }`}
                                            />
                                        </button>
                                        <p className="mt-4 text-sm text-gray-600">
                                            {isForeign ? "Foreign" : "Local"}
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                        {/* Brands selection section */}
                        <div id="brands-scroll-container" className="flex space-x-2 overflow-x-scroll scrollbar-hide smooth-scroll my-2 mx-2" onWheel={(e) => handleHorizontalScroll(e, 'brands-scroll-container')}>
                            <div className="flex space-x-2">
                                {/* All Brands Button */}
                                <button
                                    onClick={() => {
                                        setSelectedBrand(null);
                                        if (warehouse) {
                                            fetchProductDataByWarehouse(
                                                warehouse,
                                                setProductData,
                                                setSelectedCategoryProducts,
                                                setSelectedBrandProducts,
                                                setSearchedProductData,
                                                setLoading
                                            );
                                        }
                                    }}
                                    className={`p-2.5 rounded-lg px-4 flex-shrink-0 flex flex-col items-center justify-center transition-colors ${selectedBrand === null ? 'custom text-white' : 'bg-gray-200 text-gray-900'
                                        }`}
                                >
                                    <h3 className="text-center text-m font-medium">All Brands</h3>
                                </button>


                                {loading ? (
                                    <Box className="fullscreen-loader">
                                        {/* <CircularProgress size={70} thickness={5} /> */}
                                    </Box>
                                ) : (
                                    <>
                                        {filters.brands.slice(0, 5).map((b) => (
                                            <button
                                                key={b._id}
                                                onClick={() => {
                                                    setSelectedBrand(b.brandName); // Update selected brand
                                                    fetchBrandData(b.brandName, setSelectedBrandProducts, setSelectedCategoryProducts, setSearchedProductData, setProgress);
                                                }}
                                                className={`flex-shrink-0 border border-gray-200 rounded-lg px-4 flex flex-col items-center justify-center hover:shadow-md ${selectedBrand === b.brandName ? 'custom text-white' : 'bg-gray-200 text-gray-900'
                                                    }`}
                                            >
                                                <h3 className="text-center text-m font-medium">{b.brandName}</h3>
                                            </button>
                                        ))}
                                        {filters.brands.length > 5 && (
                                            <button
                                                onClick={() => setShowAllBrandsModal(true)}
                                                className="p-2.5 rounded-lg px-4 flex-shrink-0 flex flex-col items-center justify-center transition-colors bg-gray-200 text-gray-900 hover:bg-gray-300"
                                            >
                                                <h3 className="text-center text-m font-medium">More</h3>
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Category selection section */}
                        <div
                            id="categories-scroll-container" className="flex space-x-2 overflow-x-scroll scrollbar-hide smooth-scroll mx-2 my-4 pt-1"
                            onWheel={(e) => handleHorizontalScroll(e, 'categories-scroll-container')}
                        >
                            <div className="flex space-x-4 w-[200px]">
                                {/* All Category Button */}
                                <button onClick={() => {
                                    setSelectedCategory(null);
                                    if (warehouse) {
                                        fetchProductDataByWarehouse(
                                            warehouse,
                                            setProductData,
                                            setSelectedCategoryProducts,
                                            setSelectedBrandProducts,
                                            setSearchedProductData,
                                            setLoading
                                        );
                                    }
                                }}
                                    className={`p-2.5 rounded-lg px-4 flex-shrink-0 flex flex-col items-center justify-center transition-colors ${selectedCategory === null ? 'custom text-white' : 'bg-gray-200 text-gray-900'
                                        }`}>
                                    <h3 className="text-center text-m font-medium">All Categories</h3>
                                </button>
                                {loading ? (
                                    <Box className="fullscreen-loader">
                                        <CircularProgress size={70} thickness={5} />
                                    </Box>
                                ) : (
                                    <>
                                        {filters.categories.slice(0, 5).map((c) => (
                                            <button
                                                key={c._id}
                                                onClick={() => {
                                                    setSelectedCategory(c.category);
                                                    fetchCategoryData(c.category, setSelectedCategoryProducts, setSelectedBrandProducts, setSearchedProductData, setProgress);
                                                }}
                                                className={`flex-shrink-0 border border-gray-200 rounded-lg px-4 flex flex-col items-center justify-center hover:shadow-md ${selectedCategory === c.category ? 'custom text-white' : 'bg-gray-200 text-gray-900'
                                                    }`}
                                            >
                                                <h3 className="text-center text-m font-medium">{c.category}</h3>
                                            </button>
                                        ))}
                                        {filters.categories.length > 5 && (
                                            <button
                                                onClick={() => setShowAllCategoriesModal(true)}
                                                className="p-2.5 rounded-lg px-4 flex-shrink-0 flex flex-col items-center justify-center transition-colors bg-gray-200 text-gray-900 hover:bg-gray-300"
                                            >
                                                <h3 className="text-center text-m font-medium">More</h3>
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>


                    {/* Product data display section */}
                    {progress ? (
                        <div className="grid gap-y-2 gap-x-1 sm:gap-y-3 sm:gap-x-2 md:gap-y-4 md:gap-x-2 lg:gap-y-4 lg:gap-x-3 xl:gap-y-4 xl:gap-x-4 px-[10px] bg-white"
                            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(176px, 1fr))' }}>
                            <Box className="fullscreen-loader">
                                {/* <CircularProgress size={70} thickness={5} /> */}
                            </Box>
                            {Array(20).fill().map((_, index) => (
                                <div key={index} className="w-[176px] rounded-[15px]">
                                    <Skeleton height={176} width={176} className="rounded-[15px]" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex-1 min-h-0 overflow-y-auto scroll-container pb-20 bg-white">
                            <div
                                className={`
                            grid px-2 bg-white gap-y-4 gap-x-0
                            sm:grid-cols-5 
                            md:grid-cols-5 
                            lg:grid-cols-6 
                            xl:grid-cols-7
                            `}
                                style={{ gridTemplateColumns: `repeat(auto-fill, minmax(175px, 0.75fr))` }}
                            >
                                {/* FIRST ITEM: Add New Product Button */}

                                <div
                                    className="w-[176px] h-[176px] relative border border-blue-300 rounded-lg shadow-md hover:shadow-lg flex flex-col items-center justify-center cursor-pointer group"
                                    onClick={() => setShowAddProductModal(true)}
                                >

                                    <div className="absolute inset-0 bg-white bg-opacity-60 rounded-lg pointer-events-none"></div>


                                    <div className="relative w-14 h-14 rounded-full bg-blue-100 group-hover:bg-blue-500 flex items-center justify-center 
                                    transition-all duration-300 group-hover:scale-110">
                                        <Plus className="w-7 h-7 text-blue-600 group-hover:text-white transition-colors duration-300" />
                                    </div>

                                    <p className="relative text-sm font-medium text-gray-700 group-hover:text-blue-700 mt-3 transition-colors duration-300">
                                        Add Product
                                    </p>

                                    <p className="relative text-xs text-gray-500 group-hover:text-blue-600 mt-1 transition-colors duration-300">
                                        Click to create
                                    </p>
                                </div>



                                {/* THEN YOUR PRODUCTS LIST */}
                                {(searchedProductDataByName.length > 0 ? searchedProductDataByName : combinedProductData).map((p) => {
                                    const warehouseName = p.warehouse ? Object.keys(p.warehouse)[0] : null;
                                    const warehouseData = warehouseName ? p.warehouse[warehouseName] : null;
                                    const isSelectable = canSelectProduct(warehouseName);
                                    const productQtyForSelectedWarehouse = getQtyForSelectedWarehouse(p, warehouse);

                                    return (
                                        <div
                                            key={p._id}
                                            className={`shadow-md hover:shadow-lg w-[176px] h-[176px] border border-gray-200  rounded-lg p-4 flex flex-col items-center 
                                        ${isSelectable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                                            onClick={isSelectable ? () => {
                                                playSound();
                                                handleAddingProduct({
                                                    id: p._id,
                                                    name: p.name,
                                                    price: getPriceRange(p),
                                                    productCost: getProductCost(p),
                                                    offcialProduct: true,
                                                    stokeQty: warehouseData ? warehouseData.productQty || getQty(p) : 0,
                                                    tax: getTax(p),
                                                    taxType: getTaxHandler(p),
                                                    discount: getDiscount(p),
                                                    ptype: p.ptype,
                                                    isInventory: p.isInventory,
                                                    warehouse: p.warehouse || {},
                                                    variation: p.variation,
                                                    variationType: p.variationType || "Unknown",
                                                    variationValues: warehouseData ? warehouseData.variationValues || {} : {},
                                                });
                                            } : undefined}
                                        >
                                            <img
                                                src={p.image || ProductIcon}
                                                alt={p.name}
                                                className="w-[62px] h-[62px] object-cover rounded-md mt-1"
                                            />
                                            <h3 className="mt-1 text-center text-m font-medium text-gray-900 text-[13px]">
                                                {p.name}
                                            </h3>
                                            <p className="text-center text-xs text-gray-600">{p.code}</p>
                                            <div className="flex space-between items-center text-left mt-[2px]">
                                                <p className="bg-[#1F5F3B] mr-1 text-left px-1 py-[1.5px] rounded-[5px] text-center text-[11px] text-white">
                                                    {productQtyForSelectedWarehouse + ' ' + p.saleUnit}
                                                </p>
                                                <p className="bg-[#4CAF50] px-2 py-[1.5px] rounded-[5px] text-center text-[11px] text-white">
                                                    {currency + ' ' + formatWithCustomCommas(getPriceRange(p))}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                    )}

                    {/* VARIATION */}
                    <div>
                        {selectVariation && (
                            <ProductVariationModal
                                selectedProduct={selectedProduct}
                                setSelectVariation={setSelectVariation}
                                productBillingHandling={productBillingHandling}
                                setProductBillingHandling={setProductBillingHandling}
                                setProductKeyword={setProductKeyword}
                                inputRef={inputRef}
                            />
                        )}
                    </div>

                    {showCalculator && (
                        <>
                            <div
                                className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-40"
                                onClick={toggleCalculator}
                            />

                            {/* Draggable Calculator */}
                            <Draggable handle=".drag-handle" cancel=".no-drag">
                                <div className="fixed top-4 right-8 z-50 w-[500px] md:w-[500px] select-none">

                                    {/* Main Container */}
                                    <div className="rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-b from-[#E6F4F1] to-[#A7D4C2]">

                                        {/* Header (Drag Handle) */}
                                        <div className="drag-handle flex items-center justify-between bg-gradient-to-r from-[#1F5F3B] to-[#4CAF50] text-white px-4 py-2 cursor-move">
                                            <div className="flex items-center gap-2 text-sm font-semibold tracking-wide">
                                                <GripHorizontal className="w-4 h-4 opacity-80" />
                                                Calculator
                                            </div>

                                            <button
                                                type="button"
                                                className="no-drag p-1.5 hover:bg-white/20 rounded-full transition"
                                                title="Close"
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleCalculator();
                                                }}
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* Calculator Body */}
                                        <div className="p-4">
                                            <Calculator />
                                        </div>
                                    </div>
                                </div>
                            </Draggable>
                        </>
                    )}

                    {showAddProductModal && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-white w-[400px] rounded-lg p-6 shadow-xl">
                                <h2 className="text-xl font-bold text-gray-800 mb-5">Quick Add Product</h2>

                                <form onSubmit={handleQuickAdd}>
                                    {/* Name */}
                                    <div className="mb-4 text-left">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Product Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            name="name"
                                            type="text"
                                            required
                                            autoFocus
                                            className="w-full border rounded-md px-3 py-2 outline-none"
                                            placeholder="e.g. Tea, Pen, Charger"
                                        />
                                    </div>

                                    {/* Cost (optional) */}
                                    <div className="mb-4 text-left">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Cost Price <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            name="cost"
                                            type="number"
                                            step="0.01"
                                            required
                                            min="0"
                                            className="w-full border rounded-md px-3 py-2 outline-none"
                                            placeholder="e.g. 50"
                                        />
                                    </div>

                                    {/* Price */}
                                    <div className="mb-6 text-left">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Selling Price <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            name="price"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            required
                                            className="w-full border rounded-md px-3 py-2 outline-none"
                                            placeholder="e.g. 100"
                                        />
                                    </div>

                                    <div className="flex justify-end gap-3">
                                        <button
                                            type="button"
                                            onClick={closeAddProductModal}
                                            className="px-5 py-2 bg-gray-300 rounded-md hover:bg-gray-400"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-5 py-2 button-bg-color text-white rounded-md"
                                        >
                                            Add to Bill
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* All Brands Modal Popup */}
                    {showAllBrandsModal && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-white w-[600px] max-h-[80vh] rounded-lg shadow-xl overflow-hidden">
                                {/* Modal Header */}
                                <div className="bg-[#2D8D79] text-white p-4 flex justify-between items-center">
                                    <h2 className="text-xl font-bold">All Brands</h2>
                                    <button
                                        onClick={() => setShowAllBrandsModal(false)}
                                        className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition-all duration-200"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                {/* Modal Body with Scrollable Grid */}
                                <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)] scroll-container">
                                    <div className="grid grid-cols-2 gap-4">
                                        {filters.brands.map((b) => (
                                            <button
                                                key={b._id}
                                                onClick={() => {
                                                    setSelectedBrand(b.brandName);
                                                    fetchBrandData(b.brandName, setSelectedBrandProducts, setSelectedCategoryProducts, setSearchedProductData, setProgress);
                                                    setShowAllBrandsModal(false);
                                                }}
                                                className={`p-4 border border-gray-200 rounded-lg flex items-center justify-center hover:shadow-md transition-all ${selectedBrand === b.brandName
                                                    ? 'custom text-white border-[#2D8D79]'
                                                    : 'bg-gray-50 text-gray-900 hover:bg-gray-100'
                                                    }`}
                                            >
                                                <h3 className="text-center text-base font-medium">{b.brandName}</h3>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* All Categories Modal Popup */}
                    {showAllCategoriesModal && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-white w-[600px] max-h-[80vh] rounded-lg shadow-xl overflow-hidden">
                                {/* Modal Header */}
                                <div className="bg-[#2D8D79] text-white p-4 flex justify-between items-center">
                                    <h2 className="text-xl font-bold">All Categories</h2>
                                    <button
                                        onClick={() => setShowAllCategoriesModal(false)}
                                        className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition-all duration-200"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                {/* Modal Body with Scrollable Grid */}
                                <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)] scroll-container">
                                    <div className="grid grid-cols-2 gap-4">
                                        {filters.categories.map((c) => (
                                            <button
                                                key={c._id}
                                                onClick={() => {
                                                    setSelectedCategory(c.category);
                                                    fetchCategoryData(c.category, setSelectedCategoryProducts, setSelectedBrandProducts, setSearchedProductData, setProgress);
                                                    setShowAllCategoriesModal(false);
                                                }}
                                                className={`p-4 border border-gray-200 rounded-lg flex items-center justify-center hover:shadow-md transition-all ${selectedCategory === c.category
                                                    ? 'custom text-white border-[#2D8D79]'
                                                    : 'bg-gray-50 text-gray-900 hover:bg-gray-100'
                                                    }`}
                                            >
                                                <h3 className="text-center text-base font-medium">{c.category}</h3>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div>
                {errorMessage && <p className="button-bg-color mt-5 text-center">{errorMessage}</p>}
            </div>
        </div >
    );
}
export default PosSystemBody;