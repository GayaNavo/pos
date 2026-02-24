import { useState, useEffect, useRef } from "react";
import FoodMenu from "../../../img/food menu.png";
import { toast } from 'react-toastify';
import axios from "axios";
import { Link } from "react-router-dom";
import { Search, Plus, Minus, ShoppingCart, X, ChevronLeft, ChevronRight } from "lucide-react";
import { getQty, getDiscount, getProductCost, getTaxHandler } from '../utils/qtyAndPriceCalculation';
import { useOrderChannel } from '../../../context/OrderChannelContext';

function RestaurantMenuView() {
    const [searchedItems, setSearchedItems] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [keyword, setKeyword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState({ brands: [], warehouses: [], categories: [] });
    const [selectedBrandId, setSelectedBrandId] = useState(null);
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);
    const [size, setSize] = useState(12);
    const [totalPages, setTotalPages] = useState(0);
    const [cart, setCart] = useState([]);
    const [showCart, setShowCart] = useState(false);
    const [orderType, setOrderType] = useState("dine-in");
    const [tableNo, setTableNo] = useState("");
    const [tokenNo, setTokenNo] = useState("");
    const [parcelNo, setParcelNo] = useState("");
    const [kotNote, setKotNote] = useState("");
    const [showVariationModal, setShowVariationModal] = useState(false);
    const [menuType, setMenuType] = useState("");
    const isForeign = menuType === "foreign";
    const [selectedProduct, setSelectedProduct] = useState(null);
    const debounceTimeout = useRef(null);
    const ITEMS_PER_PAGE = 20;
    const { sendOrder } = useOrderChannel();

    useEffect(() => {
        const fetchFilters = async () => {
            setLoading(true);
            const pageSize = 10000;
            const pageNumber = 1;

            try {
                const [brandRes, categoryRes] = await Promise.all([
                    fetch(`${process.env.REACT_APP_BASE_URL}/api/fetchBrands?page[size]=${pageSize}&page[number]=${pageNumber}`),
                    fetch(`${process.env.REACT_APP_BASE_URL}/api/fetchCategories?page[size]=${pageSize}&page[number]=${pageNumber}`),
                ]);

                if (!brandRes.ok || !categoryRes.ok) throw new Error("Failed to fetch filters");

                const brandsData = await brandRes.json();
                const categoriesData = await categoryRes.json();

                setFilters({
                    brands: Array.isArray(brandsData.data) ? brandsData.data : [],
                    categories: Array.isArray(categoriesData.data) ? categoriesData.data : [],
                    warehouses: []
                });
            } catch (err) {
                console.error("Error fetching filters:", err);
                toast.error("Failed to load filters");
                setFilters({ brands: [], categories: [], warehouses: [] });
            } finally {
                setLoading(false);
            }
        };

        fetchFilters();
    }, []);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data } = await axios.get(
                    `${process.env.REACT_APP_BASE_URL}/api/getSettings`
                );
                setMenuType(data.menuType || "local");
            } catch (error) {
                console.error("[DEBUG] Error fetching settings:", error);
            }
        };

        fetchSettings();
    }, []);

    const getItemPrice = (product) => {
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
            return Math.min(...prices);
        }

        const singlePrice = Number(product.productPrice);
        return !isNaN(singlePrice) && singlePrice > 0 ? singlePrice : 0;
    };

    const getTax = (product, selectedVariation = null) => {
        if (selectedVariation?.tax !== undefined) {
            return {
                rate: Number(selectedVariation.tax),
                type: selectedVariation.taxType || "Inclusive"
            };
        }
        if (product.warehouse && typeof product.warehouse === "object") {
            const warehouses = Object.values(product.warehouse);
            for (const wh of warehouses) {
                if (wh.orderTax !== undefined) {
                    return {
                        rate: Number(wh.orderTax),
                        type: wh.taxType || "Inclusive"
                    };
                }
            }
        }
        return {
            rate: Number(getTax(product) || 0),
            type: getTaxHandler(product) || "Inclusive"
        };
    };

    const hasVariations = (product) => {
        if (product.warehouse) {
            for (const warehouseKey in product.warehouse) {
                const warehouse = product.warehouse[warehouseKey];
                if (warehouse.variationValues && Object.keys(warehouse.variationValues).length > 0) {
                    return true;
                }
            }
        }
        return false;
    };

    const getVariationOptions = (product) => {
        const options = [];
        if (product.warehouse) {
            for (const warehouseKey in product.warehouse) {
                const warehouse = product.warehouse[warehouseKey];
                if (warehouse.variationValues) {
                    for (const variationKey in warehouse.variationValues) {
                        const variation = warehouse.variationValues[variationKey];
                        options.push({
                            name: variationKey,
                            price: Number(variation.productPrice),
                            qty: Number(variation.productQty),
                            discount: Number(variation.discount || 0),
                            tax: Number(variation.orderTax || 0),
                            taxType: variation.taxType || "Inclusive",
                            productCost: Number(variation.productCost || 0)
                        });
                    }
                }
            }
        }
        return options;
    };

    const fetchMenuItems = async (requestedPage = page) => {
        setLoading(true);
        setError("");

        try {
            const response = await axios.get(
                `${process.env.REACT_APP_BASE_URL}/api/getProductsForMenu`,
                {
                    params: {
                        brand: selectedBrandId || undefined,
                        category: selectedCategoryId || undefined,
                        keyword: keyword || undefined,
                        page: requestedPage,
                        limit: ITEMS_PER_PAGE
                    }
                }
            );

            const data = response.data;

            if (data && Array.isArray(data.products)) {
                setSearchedItems(data.products);
                const computedTotalPages = data.totalPages ?? Math.max(1, Math.ceil((data.total ?? data.products.length) / ITEMS_PER_PAGE));
                setTotalPages(computedTotalPages);
                if (data.page && Number(data.page) !== page) {
                    setPage(Number(data.page));
                }
            } else {
                setSearchedItems([]);
                setTotalPages(0);
                setError("No products found.");
            }
        } catch (error) {
            console.error("Fetch menu error:", error);
            setSearchedItems([]);
            setTotalPages(0);
            setError("Failed to load menu items.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setPage(1);
        fetchMenuItems(1);
    }, [menuType]);

    useEffect(() => {
        fetchMenuItems(page);
    }, [page, keyword, selectedBrandId, selectedCategoryId, menuType]);

    useEffect(() => {
        setPage(1);

        if (keyword.trim() === '') {
            fetchMenuItems();
        }
    }, [keyword, selectedBrandId, selectedCategoryId, size]);

    useEffect(() => {
        if (keyword.trim() === '') {
            fetchMenuItems();
        }
    }, [keyword, page, size]);

    const searchMenuItems = async (query) => {
        setLoading(true);
        setError("");

        try {
            if (!query.trim()) {
                setSearchedItems(menuItems);
                return;
            }

            const response = await fetch(
                `${process.env.REACT_APP_BASE_URL}/api/searchProduct?keyword=${encodeURIComponent(query)}`
            );

            const data = await response.json();

            if (data.products && data.products.length > 0) {
                setSearchedItems(data.products);
            } else {
                setSearchedItems([]);
                setError("No items found for your search.");
            }
        } catch (error) {
            console.error("Search error:", error);
            setSearchedItems([]);
            setError("No items found for your search.");
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const value = e.target.value;
        setKeyword(value);

        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }

        debounceTimeout.current = setTimeout(() => {
            if (value.trim() === "") {
                setError("");
                setSearchedItems(menuItems);
            } else {
                searchMenuItems(value);
            }
        }, 300);
    };

    const addToCart = (item, selectedVariation = null) => {
        const cartKey = selectedVariation
            ? `${item._id}-${selectedVariation.name}`
            : item._id;

        const existingItem = cart.find(cartItem => cartItem.cartKey === cartKey);

        const itemToAdd = {
            ...item,
            cartKey,
            selectedVariation,
            displayPrice: selectedVariation
                ? selectedVariation.price
                : getItemPrice(item),
            variationDiscount: selectedVariation?.discount ??
                (item.warehouse && typeof item.warehouse === "object"
                    ? Object.values(item.warehouse).find(w => w?.discount > 0)?.discount || 0
                    : 0) ??
                item.discount ?? getDiscount(item) ?? 0,
            variationTax: selectedVariation?.tax || 0,
            variationTaxType: selectedVariation?.taxType || "Inclusive",
            variationProductCost: selectedVariation?.productCost ??
                (item.warehouse && typeof item.warehouse === "object"
                    ? Object.values(item.warehouse)[0]?.productCost || 0
                    : 0) ??
                item.productCost ?? getProductCost(item) ?? 0,
            variationStockQty: selectedVariation?.qty ??
                (item.warehouse && typeof item.warehouse === "object"
                    ? Object.values(item.warehouse)[0]?.productQty || 0
                    : 0) ??
                getQty(item) ?? 0

        };

        if (existingItem) {
            setCart(cart.map(cartItem =>
                cartItem.cartKey === cartKey
                    ? { ...cartItem, quantity: cartItem.quantity + 1 }
                    : cartItem
            ));
        } else {
            setCart([...cart, { ...itemToAdd, quantity: 1 }]);
        }
    };

    const updateQuantity = (cartKey, change) => {
        setCart(cart.map(item => {
            if (item.cartKey === cartKey) {
                const newQuantity = item.quantity + change;
                return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
            }
            return item;
        }).filter(item => item.quantity > 0));
    };

    const removeFromCart = (cartKey) => {
        setCart(cart.filter(item => item.cartKey !== cartKey));
    };

    const getTotalPrice = () => {
        return cart.reduce((total, item) => {
            const basePrice = Number(item.displayPrice || getItemPrice(item));

            const discountAmount = item.variationDiscount !== undefined
                ? Number(item.variationDiscount)
                : Number(getDiscount(item) || 0);

            const finalPrice = basePrice - discountAmount;
            const quantity = item.quantity;

            // Use variation tax if available
            const taxRateRaw = Number(
                item.selectedVariation?.tax ??
                (item.warehouse ? Object.values(item.warehouse)[0]?.orderTax : null) ??
                getTax(item)?.rate ??
                0
            );

            const taxRate = taxRateRaw / 100;

            const taxType = (
                item.selectedVariation?.taxType ||
                (item.warehouse ? Object.values(item.warehouse)[0]?.taxType : null) ||
                getTaxHandler(item) ||
                "inclusive"
            ).toLowerCase();

            let itemTotal = finalPrice * quantity;

            if (taxType.toLowerCase() === "exclusive") {
                itemTotal += basePrice * quantity * taxRate;
            }

            return total + itemTotal;
        }, 0);
    };

    const sendToCashier = async () => {
        if (orderType === "dine-in" && (!tableNo || tableNo.trim() === "")) {
            toast.error("Please enter a Table No!");
            return;
        }
        if (orderType === "takeaway" && (!tokenNo || tokenNo.trim() === "")) {
            toast.error("Please enter a Token No!");
            return;
        }
        if (orderType === "delivery" && (!parcelNo || parcelNo.trim() === "")) {
            toast.error("Please enter a Parcel No!");
            return;
        }

        if (cart.length === 0) {
            toast.error("Cart is empty!");
            return;
        }

        const orderData = {
            orderType,
            tableNo: orderType === "dine-in" ? tableNo.trim() : undefined,
            tokenNo: orderType === "takeaway" ? tokenNo.trim() : undefined,
            parcelNo: orderType === "delivery" ? parcelNo.trim() : undefined,
            items: cart.map(item => {
                const isVariation = !!item.selectedVariation;
                const basePrice = Number(item.displayPrice || getItemPrice(item));

                const discount = isVariation && item.variationDiscount !== undefined
                    ? Number(item.variationDiscount)
                    : Number(getDiscount(item) || 0);

                const priceAfterDiscount = basePrice - discount;
                const quantity = item.quantity;

                const taxRate = Number(
                    item.selectedVariation?.tax ??
                    (item.warehouse ? Object.values(item.warehouse)[0]?.orderTax : null) ??
                    getTax(item)?.rate ??
                    0
                );

                const taxType = item.selectedVariation?.taxType ||
                    (item.warehouse ? Object.values(item.warehouse)[0]?.taxType : null) ||
                    getTaxHandler(item) ||
                    "inclusive";

                const productCostValue = item.variationProductCost !== undefined
                    ? Number(item.variationProductCost)
                    : getProductCost(item);

                let subtotal = priceAfterDiscount * quantity;

                if (taxType.toLowerCase() === "exclusive" && taxRate > 0) {
                    subtotal += basePrice * quantity * (taxRate / 100);
                }

                let warehouseName = null;
                if (item.warehouse && typeof item.warehouse === "object") {
                    warehouseName = Object.keys(item.warehouse)[0] || null;
                }

                return {
                    id: item._id,
                    name: item.name,
                    ptype: item.ptype || (isVariation ? "Variation" : "Single"),
                    offcialProduct: true,
                    stokeQty: isVariation
                        ? (item.selectedVariation?.qty || getQty(item))
                        : getQty(item),
                    quantity,
                    price: basePrice,
                    productCost: productCostValue,
                    tax: taxRate,
                    taxType: taxType,
                    discount: discount,
                    isInventory: item.isInventory,
                    warehouse: warehouseName,
                    variationType: item.variation || null,
                    variationValue: item.selectedVariation?.name || null,
                    subtotal: Number(subtotal.toFixed(2))
                };
            }),
            totalPrice: Number(getTotalPrice().toFixed(2)),
            kotNote: kotNote.trim() || undefined,
            timestamp: new Date().toISOString(),
            status: "pending",
        };

        try {
            const response = await axios.post(`${process.env.REACT_APP_BASE_URL}/api/requestOrder`, orderData);
            sendOrder(response.data.data || response.data);

            const ref = orderType === "dine-in" ? tableNo
                : orderType === "takeaway" ? tokenNo
                    : parcelNo;

            toast.success(`Order sent successfully! → ${ref.trim()}`);
            setCart([]);
            setTableNo("");
            setTokenNo("");
            setParcelNo("");
            setKotNote("");
            setOrderType("dine-in");
            setShowCart(false);
        } catch (error) {
            console.error("Order submission failed:", error);
            if (error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error("Failed to send order. Please try again.");
            }
        }
    };

    const handleProductClick = (product) => {
        if (hasVariations(product)) {
            setSelectedProduct(product);
            setShowVariationModal(true);
        } else {
            addToCart(product);
        }
    };

    const handleNextPage = () => {
        if (page < totalPages) setPage(prev => prev + 1);
    };

    const handlePrevPage = () => {
        if (page > 1) setPage(prev => prev - 1);
    };

    const hasAvailableVariations = (product) => {
        if (!product.isInventory) return true;
        if (product.warehouse) {
            for (const warehouseKey in product.warehouse) {
                const warehouse = product.warehouse[warehouseKey];
                if (warehouse.variationValues) {
                    for (const variationKey in warehouse.variationValues) {
                        const variation = warehouse.variationValues[variationKey];
                        if (variation.productQty > 0) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    };

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
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-lg sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
                    <div className="flex justify-between items-center">
                        {/* LEFT SIDE (Back + Toggle) */}
                        <div className="flex items-center gap-3">
                            <Link
                                to="/dashboard"
                                className="bg-[#35AF87] text-white w-[40px] h-[40px] shadow-xl flex items-center justify-center rounded-[20px] font-medium hover:shadow-2xl"
                            >
                                &lt;
                            </Link>

                            <button
                                type="button"
                                onClick={() =>
                                    setMenuType(isForeign ? "local" : "foreign")
                                }
                                className={`relative inline-flex h-7 w-12 rounded-full transition-colors ${isForeign ? "bg-[#35AF87]" : "bg-gray-300"}`}
                            >
                                <span
                                    className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-white transition-transform ${isForeign ? "translate-x-5" : "translate-x-0"} `}
                                />
                            </button>
                        </div>

                        {/* RIGHT SIDE (Cart) */}
                        <button
                            onClick={() => setShowCart(!showCart)}
                            className="relative bg-[#35AF87] text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-[#16796E] transition-colors"
                        >
                            <ShoppingCart size={24} />
                            <span className="font-semibold">Cart</span>
                            {cart.length > 0 && (
                                <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">
                                    {cart.length}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search menu items..."
                            value={keyword}
                            onChange={handleInputChange}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#35AF87]"
                        />
                    </div>

                    {/* Filters - Responsive Grid */}
                    {(filters.brands.length > 0 || filters.categories.length > 0) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
                            {/* Brand Filter */}
                            {filters.brands.length > 0 && (
                                <div className="border-r pr-4">
                                    <h3 className="text-sm text-left font-semibold text-gray-700 mb-3">
                                        Filter by Brand
                                    </h3>

                                    <div className="flex items-center gap-3">
                                        {/* Fixed - All Brands */}
                                        <button
                                            onClick={() => setSelectedBrandId(null)}
                                            className={`h-12 px-6 rounded-full text-sm font-medium whitespace-nowrap transition-all shadow-sm flex items-center justify-center ${selectedBrandId === null
                                                ? "bg-[#35AF87] text-white shadow-md"
                                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                                }`}
                                        >
                                            All Brands
                                        </button>

                                        {/* Scrollable Brands */}
                                        <div
                                            className="flex items-center gap-3 overflow-x-auto scrollbar-hide smooth-scroll snap-x snap-mandatory"
                                            onWheel={(e) => {
                                                e.preventDefault();
                                                e.currentTarget.scrollLeft += e.deltaY * 1.2;
                                                if (Math.abs(e.deltaX) > 0) {
                                                    e.currentTarget.scrollLeft += e.deltaX;
                                                }
                                            }}
                                        >
                                            {filters.brands.map((brand) => (
                                                <button
                                                    key={brand._id}
                                                    onClick={() => setSelectedBrandId(brand.brandName)}
                                                    className={`h-12 px-6 rounded-full text-sm font-medium whitespace-nowrap flex items-center justify-center flex-shrink-0 snap-start transition-all shadow-sm
                                                            ${selectedBrandId === brand.brandName
                                                            ? "bg-[#35AF87] text-white shadow-md"
                                                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                                        }`}
                                                >
                                                    {brand.brandName}
                                                </button>

                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Category Filter */}
                            {filters.categories.length > 0 && (
                                <div>
                                    <h3 className="text-sm text-left font-semibold text-gray-700 mb-3">
                                        Filter by Category
                                    </h3>

                                    <div className="flex items-center gap-3">
                                        {/* Fixed - All Categories */}
                                        <button
                                            onClick={() => setSelectedCategoryId(null)}
                                            className={`h-12 px-6 rounded-full text-sm font-medium whitespace-nowrap transition-all shadow-sm flex items-center justify-center ${selectedCategoryId === null
                                                ? "bg-[#35AF87] text-white shadow-md"
                                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                                }`}
                                        >
                                            All Categories
                                        </button>

                                        {/* Scrollable Categories */}
                                        <div
                                            className="flex items-center gap-3 overflow-x-auto scrollbar-hide smooth-scroll snap-x snap-mandatory"
                                            onWheel={(e) => {
                                                e.preventDefault();
                                                e.currentTarget.scrollLeft += e.deltaY * 1.2;
                                                if (Math.abs(e.deltaX) > 0) {
                                                    e.currentTarget.scrollLeft += e.deltaX;
                                                }
                                            }}
                                        >
                                            {filters.categories.map((category) => (
                                                <button
                                                    key={category._id}
                                                    onClick={() => setSelectedCategoryId(category.category)}
                                                    className={`h-12 px-6 rounded-full text-sm font-medium whitespace-nowrap flex items-center justify-center flex-shrink-0 snap-start transition-all shadow-sm
                                                            ${selectedCategoryId === category.category
                                                            ? "bg-[#35AF87] text-white shadow-md"
                                                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                                        }`}
                                                >
                                                    {category.category}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
                <div className="h-screen max-h-[calc(100vh-240px)] overflow-y-auto hide-scrollbar pt-4 pb-20">
                    {loading && (
                        <div className="flex justify-center items-center py-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A5B63]"></div>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 text-red-800 px-4 py-3 rounded-md text-center shadow-sm">
                            {error}
                        </div>
                    )}

                    {!loading && !error && (
                        <>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                                {searchedItems.map((item) => {
                                    const stockQty = getQty(item);
                                    const isInventoryTracked = item.isInventory === true;
                                    const isOutOfStock = hasVariations(item)
                                        ? (isInventoryTracked && !hasAvailableVariations(item))
                                        : (isInventoryTracked && stockQty === 0);
                                    return (
                                        <div
                                            key={item._id}
                                            className={`bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 ${isOutOfStock ? 'opacity-50' : 'cursor-pointer'
                                                }`}
                                            onClick={() => !isOutOfStock && handleProductClick(item)}
                                        >
                                            {/* Image Section */}
                                            <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden relative">
                                                {item.image ? (
                                                    <img
                                                        src={item.image}
                                                        alt={item.name}
                                                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                                                    />
                                                ) : (
                                                    <div className="text-gray-400 text-center p-4">
                                                        <img src={FoodMenu} alt="menu" className="w-20 h-20 mx-auto opacity-50" />
                                                    </div>
                                                )}

                                                {/* Out of Stock Overlay */}
                                                {isOutOfStock && (
                                                    <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center backdrop-blur-sm">
                                                        <span className="text-white font-bold text-lg">Out of Stock</span>
                                                    </div>
                                                )}

                                                {/* FINAL DISCOUNT BADGE */}
                                                {(() => {
                                                    let discount = 0;
                                                    if (item.warehouse && typeof item.warehouse === "object") {
                                                        for (const key in item.warehouse) {
                                                            if (item.warehouse[key]?.discount > 0) {
                                                                discount = Number(item.warehouse[key].discount);
                                                                break;
                                                            }
                                                        }
                                                    }
                                                    if (discount === 0) discount = Number(item.discount || getDiscount(item) || 0);
                                                    if (discount <= 0) return null;

                                                    return (
                                                        <div className="absolute top-2 left-2 bg-red-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg z-10 animate-pulse">
                                                            Save Rs. {discount}
                                                        </div>
                                                    );
                                                })()}

                                                {/* Variation Badge */}
                                                {hasVariations(item) && !isOutOfStock && (
                                                    <div className="absolute top-2 right-2 bg-[#16796E] text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-md">
                                                        Options
                                                    </div>
                                                )}

                                                {/* Low Stock Badge */}
                                                {isInventoryTracked && !isOutOfStock && stockQty < 5 && stockQty > 0 && (
                                                    <div className="absolute bottom-2 left-2 bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md">
                                                        Only {stockQty} left!
                                                    </div>
                                                )}
                                            </div>

                                            {/* Content */}
                                            <div className="p-3">
                                                <h3 className="font-bold text-gray-900 text-sm mb-0.5 truncate leading-tight">
                                                    {item.name}
                                                </h3>
                                                <p className="text-xs text-gray-600 font-medium mb-2">
                                                    {item.category || "Uncategorized"}
                                                </p>

                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        {/* Price with Strike-through if Discounted */}
                                                        {(() => {
                                                            const basePrice = getItemPrice(item);
                                                            let discount = 0;

                                                            // Check ALL warehouses (not just warehouse01)
                                                            if (item.warehouse && typeof item.warehouse === "object") {
                                                                for (const key in item.warehouse) {
                                                                    if (item.warehouse[key]?.discount > 0) {
                                                                        discount = Number(item.warehouse[key].discount);
                                                                        break;
                                                                    }
                                                                }
                                                            }
                                                            // If no warehouse discount → use product-level discount
                                                            if (discount === 0) {
                                                                discount = Number(item.discount || getDiscount(item) || 0);
                                                            }

                                                            const finalPrice = basePrice - discount;

                                                            return (
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-lg font-bold text-[#16796E]">
                                                                        Rs. {finalPrice.toFixed(2)}
                                                                    </span>
                                                                    {discount > 0 && (
                                                                        <span className="text-sm text-gray-500 line-through">
                                                                            Rs. {basePrice.toFixed(2)}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()}

                                                        <p className="text-xs text-left text-gray-500 mt-1">
                                                            {isInventoryTracked ? (stockQty > 0 ? `${stockQty} available` : 'Unavailable') : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                                {!isOutOfStock && (
                                                    <div className="flex justify-end items-center gap-1 text-[#16796E]">
                                                        <Plus size={18} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex justify-center items-center gap-3 mt-6 pb-4">
                                <button
                                    onClick={handlePrevPage}
                                    disabled={page === 1}
                                    className="px-4 sm:px-6 py-2.5 sm:py-3 bg-[#35AF87] text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-[#16796E] transition-all duration-200 flex items-center gap-2 font-medium text-sm shadow-sm hover:shadow-md"
                                >
                                    <ChevronLeft size={18} />
                                    <span className="hidden sm:inline">Previous</span>
                                </button>
                                <div className="bg-white px-4 py-2 rounded-lg shadow-sm">
                                    <span className="text-gray-700 font-semibold text-sm">
                                        Page {page} of {totalPages}
                                    </span>
                                </div>
                                <button
                                    onClick={handleNextPage}
                                    disabled={page === totalPages}
                                    className="px-4 sm:px-6 py-2.5 sm:py-3 bg-[#35AF87] text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-[#16796E] transition-all duration-200 flex items-center gap-2 font-medium text-sm shadow-sm hover:shadow-md"
                                >
                                    <span className="hidden sm:inline">Next</span>
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Variation Selection Modal */}
            {showVariationModal && selectedProduct && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-800">Select {selectedProduct.variation}</h2>
                            <button onClick={() => setShowVariationModal(false)}>
                                <X size={24} className="text-gray-600" />
                            </button>
                        </div>

                        <div className="p-4">
                            <h3 className="font-semibold text-lg mb-4">{selectedProduct.name}</h3>
                            <div className="space-y-3">
                                {getVariationOptions(selectedProduct).map((variation, index) => {
                                    const isInventoryTracked = selectedProduct.isInventory === true;
                                    const isVariationOutOfStock = isInventoryTracked && variation.qty === 0;

                                    return (
                                        <button
                                            key={index}
                                            onClick={() => {
                                                if (!isVariationOutOfStock) {
                                                    addToCart(selectedProduct, variation);
                                                    setShowVariationModal(false);
                                                }
                                            }}
                                            disabled={isVariationOutOfStock}
                                            className={`w-full border border-gray-200 rounded-lg p-4 text-left transition-colors ${isVariationOutOfStock
                                                ? 'bg-gray-100 cursor-not-allowed opacity-50'
                                                : 'bg-gray-50 hover:bg-blue-50'
                                                }`}
                                        >
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="font-semibold text-gray-800">{variation.name}</p>
                                                    {isInventoryTracked && (
                                                        <p className="text-sm text-gray-500">
                                                            {isVariationOutOfStock ? 'Out of Stock' : `Stock: ${variation.qty}`}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* FINAL PRICE WITH DISCOUNT */}
                                                <div className="text-right">
                                                    <span className="text-lg font-bold text-[#16796E]">
                                                        Rs. {(Number(variation.price) - Number(variation.discount || 0)).toFixed(2)}
                                                    </span>
                                                    {Number(variation.discount || 0) > 0 && (
                                                        <div className="text-sm text-gray-500 line-through">
                                                            Rs. {Number(variation.price).toFixed(2)}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Cart Sidebar */}
            {showCart && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
                    <div className="bg-white w-full max-w-md h-full overflow-y-auto">
                        {/* Header */}
                        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-800">Your Order</h2>
                            <button onClick={() => setShowCart(false)}>
                                <X size={24} className="text-gray-600" />
                            </button>
                        </div>

                        {/* DYNAMIC ORDER TYPE HEADER */}
                        <div className="bg-gradient-to-r from-[#1A5B63] to-[#145a54] text-white p-2">
                            <h3 className="text-xl font-bold">
                                {orderType === "dine-in" && "Dine In"}
                                {orderType === "takeaway" && "Takeaway"}
                                {orderType === "delivery" && "Delivery"}
                            </h3>
                            <p className="text-lg opacity-90 mt-1">
                                {orderType === "dine-in" && (tableNo ? `Table ${tableNo}` : "No table selected")}
                                {orderType === "takeaway" && (tokenNo ? `Token #${tokenNo}` : "No token")}
                                {orderType === "delivery" && (parcelNo ? `Parcel #${parcelNo}` : "No parcel")}
                            </p>
                        </div>

                        {/* DYNAMIC INPUT FIELD - CHANGES AUTOMATICALLY */}
                        <div className="text-left bg-gray-50 border-b border-gray-200 p-5">
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                                {orderType === "dine-in" && "Table Number"}
                                {orderType === "takeaway" && "Token Number"}
                                {orderType === "delivery" && "Parcel Number"}
                                <span className="text-red-500 ml-1">*</span>
                            </label>

                            {orderType === "dine-in" && (
                                <input
                                    type="text"
                                    value={tableNo}
                                    onChange={(e) => setTableNo(e.target.value)}
                                    placeholder="e.g. A5, VIP-1, Table 7"
                                    className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-[#35AF87]/30 text-lg font-semibold text-center bg-white shadow-inner"
                                    autoFocus
                                />
                            )}

                            {orderType === "takeaway" && (
                                <input
                                    type="text"
                                    value={tokenNo}
                                    onChange={(e) => setTokenNo(e.target.value)}
                                    placeholder="e.g. T108, 205"
                                    className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-[#35AF87]/30 text-lg font-semibold text-center bg-white shadow-inner"
                                    autoFocus
                                />
                            )}

                            {orderType === "delivery" && (
                                <input
                                    type="text"
                                    value={parcelNo}
                                    onChange={(e) => setParcelNo(e.target.value)}
                                    placeholder="e.g. D045, P301"
                                    className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-[#35AF87]/30 text-lg font-semibold text-center bg-white shadow-inner"
                                    autoFocus
                                />
                            )}
                        </div>

                        {/* ORDER TYPE SELECTION - BEAUTIFUL TABS */}
                        <div className="bg-white p-4 border-b border-gray-200">
                            <div className="grid grid-cols-3 gap-3">
                                {/* Dine In */}
                                <button
                                    onClick={() => {
                                        setOrderType("dine-in");
                                        setTokenNo("");
                                        setParcelNo("");
                                    }}
                                    className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all ${orderType === "dine-in"
                                        ? "border-[#35AF87] bg-[#E8FFF5] shadow-lg scale-105"
                                        : "border-gray-300 hover:border-[#35AF87]/50"
                                        }`}
                                >
                                    <svg className="w-8 h-8 text-[#1A5B63]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3v18m6-10H6" />
                                    </svg>
                                    <span className="text-sm font-bold mt-2">Dine In</span>
                                </button>

                                {/* Takeaway */}
                                <button
                                    onClick={() => {
                                        setOrderType("takeaway");
                                        setTableNo("");
                                        setParcelNo("");
                                    }}
                                    className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all ${orderType === "takeaway"
                                        ? "border-[#35AF87] bg-[#E8FFF5] shadow-lg scale-105"
                                        : "border-gray-300 hover:border-[#35AF87]/50"
                                        }`}
                                >
                                    <svg className="w-8 h-8 text-[#1A5B63]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 7h18l-1.5 12h-15L3 7z" />
                                    </svg>
                                    <span className="text-sm font-bold mt-2">Takeaway</span>
                                </button>

                                {/* Delivery */}
                                <button
                                    onClick={() => {
                                        setOrderType("delivery");
                                        setTableNo("");
                                        setTokenNo("");
                                    }}
                                    className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all ${orderType === "delivery"
                                        ? "border-[#35AF87] bg-[#E8FFF5] shadow-lg scale-105"
                                        : "border-gray-300 hover:border-[#35AF87]/50"
                                        }`}
                                >
                                    <svg className="w-8 h-8 text-[#1A5B63]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 13l2-2h13l3 3m-5 5a2 2 0 110-4 2 2 0 010 4zm-10 0a2 2 0 110-4 2 2 0 010 4z" />
                                    </svg>
                                    <span className="text-sm font-bold mt-2">Delivery</span>
                                </button>
                            </div>
                        </div>

                        <div className="p-4">
                            {cart.length === 0 ? (
                                <p className="text-center text-gray-500 py-8">Your cart is empty</p>
                            ) : (
                                <>
                                    {/* Cart Items */}
                                    {cart.map((item) => {
                                        const originalPrice = Number(item.displayPrice || getItemPrice(item));
                                        const discount = item.variationDiscount !== undefined
                                            ? Number(item.variationDiscount)
                                            : Number(getDiscount(item) || 0);

                                        const priceAfterDiscount = originalPrice - discount;
                                        const quantity = item.quantity;

                                        // Tax handling
                                        const taxRateRaw = Number(
                                            item.selectedVariation?.tax ??
                                            (item.warehouse ? Object.values(item.warehouse)[0]?.orderTax : null) ??
                                            getTax(item)?.rate ??
                                            0
                                        );

                                        const taxRate = taxRateRaw;

                                        const taxType = (
                                            item.selectedVariation?.taxType ||
                                            (item.warehouse ? Object.values(item.warehouse)[0]?.taxType : null) ||
                                            getTaxHandler(item) ||
                                            "inclusive"
                                        ).toLowerCase();

                                        const taxAmount = taxType.toLowerCase() === "exclusive"
                                            ? (originalPrice * quantity * taxRate) / 100
                                            : 0;

                                        return (
                                            <div key={item.cartKey} className="bg-gray-50 rounded-lg p-4 mb-3 border border-gray-200">
                                                {/* Product Name + Variation */}
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex-1">
                                                        <h3 className="font-semibold text-gray-800">{item.name}</h3>
                                                        {item.selectedVariation && (
                                                            <p className="text-sm text-gray-600">{item.selectedVariation.name}</p>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => removeFromCart(item.cartKey)}
                                                        className="text-red-500 hover:text-red-700 transition-colors"
                                                    >
                                                        <X size={20} />
                                                    </button>
                                                </div>

                                                {/* Quantity Controls */}
                                                <div className="flex items-center gap-3 mb-4">
                                                    <button
                                                        onClick={() => updateQuantity(item.cartKey, -1)}
                                                        className="w-9 h-9 rounded-full bg-gray-300 hover:bg-gray-400 flex items-center justify-center transition-colors"
                                                    >
                                                        <Minus size={16} />
                                                    </button>
                                                    <span className="w-12 text-center font-bold text-lg">{quantity}</span>
                                                    <button
                                                        onClick={() => updateQuantity(item.cartKey, 1)}
                                                        className="w-9 h-9 rounded-full bg-[#35AF87] hover:bg-[#1A5B63] text-white flex items-center justify-center transition-colors"
                                                    >
                                                        <Plus size={16} />
                                                    </button>
                                                </div>

                                                {/* Price Breakdown */}
                                                <div className="text-sm space-y-1 text-right border-t pt-3">
                                                    <div className="flex justify-between text-gray-600">
                                                        <span>Price:</span>
                                                        <span>Rs. {originalPrice.toFixed(2)}</span>
                                                    </div>

                                                    {/* Discount Line */}
                                                    {discount > 0 && (
                                                        <div className="flex justify-between text-green-600 font-medium">
                                                            <span>Discount:</span>
                                                            <span>- Rs. {discount.toFixed(2)}</span>
                                                        </div>
                                                    )}

                                                    <div className="flex justify-between font-semibold">
                                                        <span>After Discount:</span>
                                                        <span>Rs. {(priceAfterDiscount * quantity).toFixed(2)}</span>
                                                    </div>

                                                    {/* Tax Line (only for exclusive tax) */}
                                                    {taxRate > 0 && taxType.toLowerCase() === "exclusive" && (
                                                        <div className="flex justify-between text-blue-600">
                                                            <span>Tax (+{taxRate}%):</span>
                                                            <span>+ Rs. {taxAmount.toFixed(2)}</span>
                                                        </div>
                                                    )}

                                                    {/* Item Total */}
                                                    <div className="flex justify-between font-bold text-lg text-[#35AF87] pt-2 border-t mt-2">
                                                        <span>Item Total:</span>
                                                        <span>Rs. {((priceAfterDiscount * quantity) + taxAmount).toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Final Total */}
                                    <div className="border-t-2 border-gray-300 pt-4 mt-6 bg-gray-50 rounded-lg p-4">
                                        <div className="mb-4">
                                            <label className="block text-sm font-semibold text-gray-700 mb-1 text-left">Note for Kitchen (Optional)</label>
                                            <textarea
                                                value={kotNote}
                                                onChange={(e) => setKotNote(e.target.value)}
                                                placeholder="Add any special instructions or notes for the kitchen..."
                                                rows={2}
                                                className="block w-full rounded-lg border border-gray-300 py-2 px-3 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:ring-2 focus:ring-gray-200 focus:border-gray-200 focus:outline-none transition-colors resize-none"
                                            />
                                        </div>
                                        <div className="text-2xl font-bold text-gray-800 flex justify-between">
                                            <span>Grand Total:</span>
                                            <span className="text-[#35AF87]">Rs. {getTotalPrice().toFixed(2)}</span>
                                        </div>
                                        <button
                                            onClick={sendToCashier}
                                            className="mt-4 w-full bg-[#1A5B63] hover:bg-[#145a54] text-white py-4 rounded-lg font-bold text-lg transition-all"
                                        >
                                            Send Order to Cashier
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default RestaurantMenuView;