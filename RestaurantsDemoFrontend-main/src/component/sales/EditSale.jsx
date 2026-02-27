

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { handleCustomerSelect, handleWarehouseChange, handleUpdateSale, handleProductSearch, getTaxType } from './SaleController'
import '../../styles/role.css';
import { Link, useNavigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { fetchProductDataByWarehouse } from '../pos/utils/fetchByWarehose';
import ConfirmationModal from '../common/deleteConfirmationDialog';
import Decrease from '../../img/down-arrow (1).png'
import Loader from '../utill/Loader';
import Box from '@mui/material/Box';
import { toast } from 'react-toastify';
import formatWithCustomCommas from '../utill/NumberFormate';
import { useCurrency } from '../../context/CurrencyContext';

function EditSaleBody() {
    // State management
    const { currency } = useCurrency()
    const [warehouseData, setWarehouseData] = useState([]);
    const [warehouse, setWarehouse] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState([]);
    const [searchCustomer, setSearchCustomer] = useState('');
    const [filteredCustomer, setFilteredCustomer] = useState([])
    const [selectedCustomer, setSelectedCustomer] = useState([])
    const [selectedCategoryProducts, setSelectedCategoryProducts] = useState([]);
    const [selectedBrandProducts, setSelectedBrandProducts] = useState([]);
    const [productBillingHandling, setSearchedProductData] = useState([]);
    const [productData, setProductData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [discountType, setDiscountType] = useState('');
    const [error, setError] = useState('');
    const [responseMessage, setResponseMessage] = useState('');
    const [orderStatus, setOrderStatus] = useState('');
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);
    const [confirmMessage, setConfirmMessage] = useState("");
    const [paymentStatus, setPaymentStatus] = useState('');
    const [paymentType, setPaymentType] = useState({ cash: false, card: false, bank_transfer: false, });
    const [previousPaymentDetails, setPreviousPaymentDetails] = useState([]);
    const [amounts, setAmounts] = useState({ cash: '', card: '', bank_transfer: '', });
    const [saleProduct, setSaleProduct] = useState([])
    const [saleReturProductData, setSaleReturProductData] = useState([]);
    const [selectedDate, setSelectedDate] = useState('');
    const [progress, setProgress] = useState(false);
    const [total, setTotal] = useState(0);
    const [orderType, setOrderType] = useState('Normal');
    const navigate = useNavigate();
    const { id } = useParams();

    useEffect(() => {
        const findSaleById = async () => {
            try {
                setProgress(true);
                const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/findSaleById/${id}`);

                const fetchedProductsQty = Array.isArray(response.data?.productsData)
                    ? response.data.productsData
                    : [];

                const initializedProductsQty = fetchedProductsQty.map(pq => ({
                    ...pq,
                    quantity: pq.quantity || Object.keys(pq.quantity)[0],
                    source: "backend",
                }));

                const saleStatus = (response.data.paymentStatus || "unpaid").toLowerCase();
                setSaleProduct(response.data);
                setPaymentStatus(saleStatus);
                setSaleReturProductData(initializedProductsQty);
                setOrderType(response.data.orderType || 'Normal');

                const fetchedPaymentDetails = response.data.paymentType || [];
                setPreviousPaymentDetails(fetchedPaymentDetails);

                const clearedPaymentType = { cash: false, card: false, bank_transfer: false };
                const clearedAmounts = { cash: "", card: "", bank_transfer: "" };
                setPaymentType(clearedPaymentType);
                setAmounts(clearedAmounts);
            } catch (error) {
                console.error(
                    "Error fetching sale by ID:",
                    error.response ? error.response.data : error.message
                );
            } finally {
                setProgress(false);
            }
        };

        if (id) {
            findSaleById();
        }
    }, [id]);

    const fetchData = async (url, setter) => {
        setLoading(true);
        try {
            const { data } = await axios.get(url);
            setter(data);
        } catch (error) {
            console.error(`${url} fetch error:`, error);
            setter([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(`${process.env.REACT_APP_BASE_URL}/api/fetchWarehouses`, setWarehouseData);
        return () => { };
    }, []);

    const getPriceRange = (product, selectedVariation) => {
        if (product.ptype === 'Variation' && product.variationValues && selectedVariation) {
            return product.variationValues[selectedVariation]?.productPrice || product.productPrice || 0;
        }
        return product.productPrice || 0;
    };

    const getProductCost = (product, selectedVariation) => {
        if (product.ptype === 'Variation' && product.variationValues && selectedVariation) {
            return product.variationValues[selectedVariation]?.productCost || product.productCost || 0;
        }
        return product.productCost || 0;
    };

    const getTax = (product, selectedVariation) => {
        if (product.ptype === 'Variation' && product.variationValues && selectedVariation) {
            return product.variationValues[selectedVariation]?.orderTax || product.orderTax || 0;
        }
        return product.orderTax || 0;
    };

    const getQty = (product, selectedVariation) => {
        if (product.ptype === 'Variation' && product.variationValues && selectedVariation) {
            return product.variationValues[selectedVariation]?.productQty || product.stockQty || 0;
        }
        return product.stockQty || 0;
    };

    const getDiscount = (product, selectedVariation) => {
        if (product.ptype === 'Variation' && product.variationValues && selectedVariation) {
            return product.variationValues[selectedVariation]?.discount || product.discount || 0;
        }
        return product.discount || 0;
    };

    const calculateTotal = () => {
        const newSubtotal = saleReturProductData.reduce((acc, product) => {
            const price = Number(product.price || product.productPrice || getPriceRange(product, product.selectedVariation) || 0);
            const quantity = Number(product.quantity || 0);
            const taxType = product.taxType || getTaxType(product, product.selectedVariation) || "inclusive";
            const taxRate = Number(product.taxRate || getTax(product, product.selectedVariation)) || 0;
            const discount = Number(product.discount || getDiscount(product, product.selectedVariation)) || 0;
            const specialDiscount = Number(product.specialDiscount) || 0;

            const discountedPrice = Math.max(price - discount - specialDiscount, 0);
            let productSubtotal = discountedPrice * quantity;
            if (taxType.toLowerCase() === "exclusive") {
                const taxableAmount = price * quantity;
                const taxAmount = taxableAmount * taxRate;
                productSubtotal += taxAmount;
            }
            return acc + productSubtotal;
        }, 0);

        const newDiscountAmount = discountType === 'percentage'
            ? (newSubtotal * (saleProduct.discount / 100))
            : saleProduct.discount || 0;

        const offerPercentage = parseFloat(saleProduct.offerPercentage) || 0;
        const offerDiscountAmount = newSubtotal * (offerPercentage / 100);

        // Calculate shipping and tax
        const newShipping = parseFloat(saleProduct.shipping) || 0;
        
        // Calculate service charge based on type
        let newServiceCharge = 0;
        const serviceChargeType = saleProduct.serviceChargeType || 'fixed';
        if (serviceChargeType === 'fixed') {
            newServiceCharge = parseFloat(saleProduct.serviceCharge) || 0;
        } else if (serviceChargeType === 'percentage') {
            newServiceCharge = (newSubtotal * (parseFloat(saleProduct.serviceCharge) || 0)) / 100;
        }
        
        const overallTaxRate = saleProduct.tax ? parseFloat(saleProduct.tax) / 100 : 0;
        const newTaxAmount = (newSubtotal) * overallTaxRate;

        // Calculate final total
        const newTotal = (newSubtotal - newDiscountAmount - offerDiscountAmount) + newTaxAmount + newShipping + newServiceCharge;
        setTotal(newTotal.toFixed(2));
        return newTotal;
    };

    const calculateTaxLessTotal = () => {
        const Subtotal = saleReturProductData.reduce((acc, product) => {
            const price = product.price || product.productPrice || getPriceRange(product, product.selectedVariation) || 0;
            const quantity = product.quantity || 0;
            const discount = product.discount || getDiscount(product, product.selectedVariation) || 0;
            const specialDiscount = product.specialDiscount || 0;
            const discountedPrice = price - discount - specialDiscount;
            const productSubtotal = (discountedPrice * quantity);

            return acc + productSubtotal;
        }, 0);

        return isNaN(Subtotal) ? 0 : Subtotal;
    }

    const calculateProfitOfSale = () => {
        const profitTotal = saleReturProductData.reduce((totalProfit, product) => {
            const productPrice = product.price || product.productPrice || getPriceRange(product, product.selectedVariation) || 0;
            const productCost = product.productCost || (getProductCost(product, product.selectedVariation));
            const productQty = product.quantity || 0;
            const discount = Number(getDiscount(product, product.selectedVariation));
            const specialDiscount = product.specialDiscount || 0;
            const discountedPrice = productPrice - discount - specialDiscount;

            const totalProductCost = (productCost * productQty);
            const subTotal = (discountedPrice * productQty);
            const profitOfProduct = subTotal - totalProductCost;
            return totalProfit + profitOfProduct;
        }, 0);

        let taxLessTotal = calculateTaxLessTotal();

        let discountValue = 0;
        if (discountType === 'fixed') {
            discountValue = Number(saleProduct.discount);
        } else if (discountType === 'percentage') {
            discountValue = (taxLessTotal * Number(saleProduct.discount)) / 100;
        }
        const offerPercentage = parseFloat(saleProduct.offerPercentage) || 0;
        const offerDiscountValue = (taxLessTotal * offerPercentage) / 100;
        const pureProfit = profitTotal - discountValue - offerDiscountValue;

        return pureProfit;
    };

    useEffect(() => {
        setSaleReturProductData(prevProducts =>
            prevProducts.map(product => {
                const price = Number(product.price || getPriceRange(product, product.selectedVariation) || 0);
                const quantity = Number(product.quantity || 0);
                const taxType = product.taxType || getTaxType(product, product.selectedVariation) || "inclusive";
                const taxRate = product.taxRate
                    ? Number(product.taxRate)
                    : getTax(product, product.selectedVariation) / 100;
                const discount = Number(getDiscount(product, product.selectedVariation)) || 0;
                const specialDiscount = Number(product.specialDiscount) || 0;

                const discountedPrice = Math.max(price - discount - specialDiscount, 0);

                // Base subtotal
                let newSubtotal = discountedPrice * quantity;

                // Add tax only if exclusive
                if (taxType.toLowerCase() === "exclusive") {
                    const taxableAmount = price * quantity;
                    const taxAmount = taxableAmount * taxRate;
                    newSubtotal += taxAmount;
                }

                return {
                    ...product,
                    subtotal: newSubtotal.toFixed(2),
                };
            })
        );
    }, [saleReturProductData]);

    const handleUpdateClick = () => {
        if (!Array.isArray(saleReturProductData) || saleReturProductData.length === 0) {
            toast.error('Please add at least one product to the sale');
            return;
        }
        const formattedPaymentType = Object.keys(paymentType)
            .filter((type) => paymentType[type])
            .map((type) => ({
                type,
                amount: amounts[type] ? Number(amounts[type]) : 0,
            }))
            .filter(({ amount }) => amount > 0);

        handleUpdateSale(
            id,
            total,
            calculateProfitOfSale().toFixed(2),
            saleProduct.orderStatus || 'pending',
            saleProduct.paymentStatus || 'partial',
            formattedPaymentType,
            amounts,
            saleProduct.shipping || 0,
            saleProduct.serviceCharge || 0,
            saleProduct.serviceChargeType || 'fixed',
            saleProduct.discountType || 'fixed',
            saleProduct.discount || 0,
            saleProduct.tax || 0,
            saleProduct.warehouse,
            saleProduct.selectedCustomer,
            saleReturProductData,
            saleProduct.offerPercentage || 0,
            setError,
            setResponseMessage,
            setProgress,
            navigate,
            orderType
        );
    };

    const handleQtyChange = (index, deltaOrValue, isDirectInput = false) => {
        setSaleReturProductData(prev =>
            prev.map((item, i) => {
                if (i !== index) return item;

                // Handle empty string (field cleared)
                if (isDirectInput && deltaOrValue === '') {
                    return {
                        ...item,
                        quantity: '',
                        subtotal: '0.00',
                    };
                }

                // Determine current stock 
                let stockQty = 0;
                if (item.ptype === 'Variation' && item.selectedVariation) {
                    stockQty = item.variationValues?.[item.selectedVariation]?.productQty ?? 0;
                } else {
                    stockQty = item.stockQty ?? item.productQty ?? 0;
                }

                let newQty;
                if (isDirectInput) {
                    newQty = Math.max(1, deltaOrValue);
                } else {
                    const currentQty = item.quantity === '' || item.quantity === undefined || item.quantity === null ? 0 : item.quantity;
                    newQty = currentQty + deltaOrValue;
                    newQty = Math.max(1, newQty);
                }
                if (item.isInventory && newQty > stockQty) {
                    toast.error(`Cannot exceed stock quantity of ${stockQty}`);
                    return item;
                }

                const price = Number(
                    item.price ||
                    item.productPrice ||
                    getPriceRange(item, item.selectedVariation) ||
                    0
                );

                const taxType = (item.taxType || getTaxType(item, item.selectedVariation) || 'inclusive').toLowerCase();

                const taxRate = Number(
                    item.taxRate ??
                    (item.source === 'frontend'
                        ? item.orderTax / 100
                        : item.orderTax) ??
                    getTax(item, item.selectedVariation)
                ) || 0;

                const discount = Number(
                    item.discount ||
                    getDiscount(item, item.selectedVariation) ||
                    0
                );
                const specialDiscount = Number(item.specialDiscount) || 0;
                const priceAfterDiscount = Math.max(price - discount - specialDiscount, 0);

                let subtotal = priceAfterDiscount * newQty;
                if (taxType === 'exclusive') {
                    const tax = price * newQty * taxRate;
                    subtotal += tax;
                }

                return {
                    ...item,
                    quantity: newQty,
                    subtotal: subtotal.toFixed(2),
                };
            })
        );
    };

    useEffect(() => {
        calculateTotal();
    }, [saleReturProductData]);

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

                    // Get variation details
                    const variationDetails = product.variationValues[variation] || {};
                    const updatedPrice = variationDetails.productPrice || product.productPrice;
                    const updatedCost = variationDetails.productCost || product.productCost;
                    const updatedTax = variationDetails.orderTax || product.orderTax;
                    const updatedQty = variationDetails.productQty || product.stockQty;
                    const currentQty = product.quantity || 0;

                    // Adjust quantity if exceeds available stock
                    const adjustedQty = Math.min(currentQty, updatedQty);
                    if (adjustedQty < currentQty) {
                        toast.warning(`Quantity adjusted to available stock (${updatedQty}) for "${variation}"`);
                    }

                    // Calculate new subtotal
                    const taxRate = updatedTax / 100;
                    const discount = variationDetails.discount || product.discount;
                    const specialDiscount = product.specialDiscount || 0;
                    const discountedPrice = updatedPrice - discount - specialDiscount;
                    const newSubtotal = (discountedPrice * adjustedQty) + (updatedPrice * adjustedQty * taxRate);

                    return {
                        ...product,
                        selectedVariation: variation,
                        productPrice: updatedPrice,
                        productCost: updatedCost,
                        orderTax: updatedTax,
                        stockQty: updatedQty,
                        quantity: adjustedQty,
                        discount: discount,
                        subtotal: newSubtotal.toFixed(2),
                    };
                }
                return product;
            })
        );
    };

    useEffect(() => {
        if (saleProduct.date?.iso) {
            const dateOnly = saleProduct.date.iso.split(' ')[0];
            setSelectedDate(dateOnly);
        } else if (saleProduct.date?.full) {
            const [datePart] = saleProduct.date.full.split(', ');
            const [day, month, year] = datePart.split('/');
            const formattedDate = `${year}-${month}-${day}`;
            setSelectedDate(formattedDate);
        }
    }, [saleProduct.date]);

    const handleDateChange = (e) => {
        setSelectedDate(e.target.value);
    };

    const handleOrderStatusChange = (e) => {
        const newOrderStatus = e.target.value;
        setOrderStatus(newOrderStatus);
        setSaleProduct((prevData) => ({
            ...prevData,
            orderStatus: newOrderStatus,
        }));
    };

    useEffect(() => {
        if (saleProduct && saleProduct.discountType) {
            setDiscountType(saleProduct.discountType);
            setSaleProduct((prevSaleProduct) => ({
                ...prevSaleProduct,
                discountType: saleProduct.discountType,
            }));
        }
    }, [saleProduct]);

    const handleDiscountType = (e) => {
        const value = e.target.value;
        setDiscountType(value);
        setSaleProduct((prevSaleProduct) => ({
            ...prevSaleProduct,
            discountType: value,
        }));
    };

    const handleDiscount = (e) => {
        const value = e.target.value;
        if (discountType === 'percentage') {
            const numericValue = parseFloat(value);
            if (isNaN(numericValue) || numericValue < 1 || numericValue > 100) {
                alert('Please enter a percentage value between 1 and 100.');
                return;
            }
        }
        setSaleProduct({
            ...saleProduct,
            discount: value
        });
    };

    const handleTax = (e) => {
        setSaleProduct({ ...saleProduct, tax: e.target.value });
    };

    const handleShippng = (e) => {
        setSaleProduct({ ...saleProduct, shipping: e.target.value });
    };

    const handleServiceCharge = (e) => {
        setSaleProduct({ ...saleProduct, serviceCharge: e.target.value });
    };

    const handleServiceChargeType = (e) => {
        setSaleProduct({ ...saleProduct, serviceChargeType: e.target.value });
    };

    const handlePaymentStatusChange = (e) => {
        const newStatus = e.target.value.toLowerCase();
        setPaymentStatus(newStatus);
        setSaleProduct((prev) => ({
            ...prev,
            paymentStatus: newStatus,
        }));

        if (newStatus === "unpaid") {
            const clearedTypes = { cash: false, card: false, bank_transfer: false };
            const clearedAmounts = { cash: "", card: "", bank_transfer: "" };
            setPaymentType(clearedTypes);
            setAmounts(clearedAmounts);
        }
    };
    const handleCheckboxChange = (type) => {
        setPaymentType((prev) => {
            const updatedPaymentType = { ...prev, [type]: !prev[type] };
            setAmounts((prevAmounts) => ({
                ...prevAmounts,
                [type]: updatedPaymentType[type] ? '' : prevAmounts[type] || '',
            }));
            return updatedPaymentType;
        });
    };

    const handleAmountChange = (type, value) => {
        const numericValue = Number(value);
        const totalAmount = Object.keys(amounts).reduce((acc, key) => acc + (Number(amounts[key]) || 0), 0);
        const newTotalAmount = totalAmount - (Number(amounts[type]) || 0) + numericValue;
        const saleTotal = Number(calculateTotal());

        if (newTotalAmount > saleTotal) {
            toast.error('Total amount cannot exceed the total value of the sale.', { autoClose: 2000 }, { className: "custom-toast" });
            return;
        }

        setAmounts((prev) => ({
            ...prev,
            [type]: value,
        }));
    };

    const handleProductSelect = (product) => {
        setSaleReturProductData((prevProducts) => {
            // Check for duplicate products
            const isDuplicate = prevProducts.some(p =>
                p._id === product._id &&
                (!product.selectedVariation || p.selectedVariation === product.selectedVariation)
            );

            if (isDuplicate) {
                toast.error('This product is already added');
                return prevProducts;
            }

            // Initialize values
            const price = product.productPrice || getPriceRange(product, product.selectedVariation) || 0;
            const taxValue = product.orderTax / 100 || 0;
            const discount = getDiscount(product, product.selectedVariation);
            const stockQty = getQty(product, product.selectedVariation);

            const newProduct = {
                ...product,
                _id: product._id,
                name: product.name,
                code: product.code,
                barcode: product.barcode,
                ptype: product.ptype,
                selectedVariation: product.selectedVariation || null,
                quantity: 0,
                productPrice: price,
                productCost: getProductCost(product, product.selectedVariation) || 0,
                stockQty: stockQty,
                taxRate: taxValue,
                orderTax: taxValue,
                discount: discount,
                specialDiscount: product.specialDiscount || 0,
                variationValues: product.variationValues || {},
                warehouse: product.warehouse || warehouse,
                source: 'frontend',
                subtotal: calculateProductSubtotal(product, product.selectedVariation, 1)
            };

            return [...prevProducts, newProduct];
        });

        // Clear search state
        setSearchTerm('');
        setFilteredProducts([]);
    };

    const calculateProductSubtotal = (product, variation, quantity = 1) => {
        const price = variation && product.variationValues?.[variation]?.productPrice
            ? product.variationValues[variation].productPrice
            : product.productPrice || 0;

        const taxRate = product.source === 'frontend'
            ? (product.orderTax / 100 || getTax(product, variation) / 100)
            : (product.orderTax || getTax(product, variation));

        const discount = product.discount || getDiscount(product, variation) || 0;
        const specialDiscount = product.specialDiscount || 0;
        const discountedPrice = price - discount - specialDiscount;
        return (discountedPrice * quantity) + (price * quantity * taxRate);
    };

    <ConfirmationModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => {
            if (confirmAction) confirmAction();
            setIsConfirmOpen(false);
        }}
        message={confirmMessage}
    />


    return (
        <div className='background-white relative left-[18%] w-[82%] min-h-[100vh] p-5 pb-10'>
            {progress && (
  <Box className="fullscreen-loader">
    <Loader />
  </Box>
            )}
            <div className='flex justify-between mt-20 items-center'>
                <div>
                    <h2 className="text-lightgray-300  m-0 p-0 text-2xl">Edit Sale</h2>
                </div>
                <div>
                    <Link className='px-4 py-1.5 border border-[#35AF87] text-[#35AF87] rounded-md transition-colors duration-300 hover:bg-[#35AF87] hover:text-white' to={'/viewSale'}>Back</Link>
                </div>
            </div>
            <div className="bg-white mt-[20px] w-full rounded-2xl px-8 shadow-md pb-10">
                <div className="flex  flex-1 flex-col px-2 py-12 lg:px-8">
                    <form >
                        <div className="flex flex-col md:flex-row w-full md:space-x-5 space-y-5 md:space-y-0 items-end"> {/* Add space between inputs if needed */}
                            {/* warehouse*/}
                            <div className="w-full md:flex-1"> {/* Use flex-1 to allow the field to take full width */}
                                <label className="block text-sm font-medium leading-6 text-gray-900 text-left whitespace-nowrap mb-1">Select warehouse <span className='text-red-500'>*</span></label>
                                <input
                                    id="warehouse"
                                    name="warehouse"
                                    readOnly
                                    value={saleProduct.warehouse} // Pre-filled warehouse for editing
                                    onChange={(e) =>
                                        handleWarehouseChange(
                                            e,
                                            setWarehouse,
                                            saleProduct.warehouse,
                                            fetchProductDataByWarehouse,
                                            setProductData,
                                            setSelectedCategoryProducts,
                                            setSelectedBrandProducts,
                                            setSearchedProductData,
                                            setLoading
                                        )
                                    }
                                    className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                />
                            </div>

                            {/* customer */}
                            <div className="w-full md:flex-1 relative"> {/* Use flex-1 here as well */}
                                <label className="block text-sm font-medium leading-6 text-gray-900 text-left whitespace-nowrap mb-1">Customer <span className='text-red-500'>*</span></label>
                                <input
                                    id="customer"
                                    name="customer"
                                    value={saleProduct.customer}
                                    required
                                    placeholder={searchCustomer ? "" : "        Search..."}
                                    className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                />
                                {filteredCustomer.length > 0 && (
                                    <ul className="absolute z-10 mt-1 w-full text-left bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                        {filteredCustomer.map((customer) => (
                                            <li
                                                key={customer._id}
                                                onClick={() => handleCustomerSelect(customer, setSelectedCustomer, setSearchCustomer, setFilteredCustomer)}
                                                className="cursor-pointer hover:bg-gray-100 px-4 py-4"
                                            >
                                                {customer.name}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            {/*Date*/}
                            <div className="w-full md:flex-1">
                                <label className="block text-sm font-medium leading-6 text-gray-900 text-left whitespace-nowrap mb-1">Date <span className='text-red-500'>*</span></label>
                                <input
                                    id="date"
                                    name="date"
                                    type="date"
                                    required
                                    value={selectedDate}
                                    onChange={handleDateChange}
                                    disabled
                                    autoComplete="given-name"
                                    className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                />
                            </div>
                        </div>
                    </form>

                    <div className="flex-1 mt-5 relative">
                        {/* Input Field */}
                        <input
                            id="text"
                            name="text"
                            type="text"
                            required
                            value={searchTerm}
                            onChange={(e) => handleProductSearch(
                                e,
                                setSearchTerm,
                                setFilteredProducts,
                                warehouse,
                                saleProduct?.warehouse
                            )}

                            placeholder={searchTerm ? "" : "        Search..."}
                            className="block w-full rounded-md border-0 py-2.5 pl-10 pr-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                        />

                        {filteredProducts.length > 0 && (
                            <ul className="absolute left-0 z-10 w-full  text-left bg-white border border-gray-300 rounded-md shadow-lg mt-1">
                                {filteredProducts.map((product) => (
                                    <li
                                        key={product._id}
                                        onClick={() => handleProductSelect(product, setSelectedProduct, setSearchTerm, setFilteredProducts)}
                                        className="cursor-pointer hover:bg-gray-100 px-4 py-4"
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
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock Qty</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchase Qty</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sub Total (-Dis / +Tax)</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variation</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
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
                                                    {product.productQty ? product.productQty : product.stockQty || getQty(product, product.selectedVariation)}
                                                </p>
                                            </td>

                                            <td className="px-6 py-4 text-left whitespace-nowrap text-sm text-gray-500">
                                                <div className="flex items-center">
                                                    <button
                                                        onClick={() => handleQtyChange(index, -1)} // Decrement
                                                        className="px-2 py-2 bg-gray-100 rounded hover:bg-gray-200"
                                                    >
                                                        <img className="w-[16px] h-[16px]" src={Decrease} alt="decrease" />
                                                    </button>
                                                    <input
                                                        type="number"
                                                        value={product.quantity ?? ''}
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            if (val === '') {
                                                                handleQtyChange(index, '', true);
                                                            } else {
                                                                handleQtyChange(index, parseInt(val, 10) || 0, true);
                                                            }
                                                        }}
                                                        className="mx-2 w-16 py-[5px] text-center border rounded outline-none focus:ring-1 focus:ring-blue-100"
                                                        min="0"
                                                    />
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
                                                {currency} {formatWithCustomCommas(product.price || getPriceRange(product, product.selectedVariation))}
                                            </td>

                                            {/* Subtotal */}
                                            <td className="px-6 text-left py-4 whitespace-nowrap text-sm text-gray-500">
                                                {currency} {formatWithCustomCommas(product.subtotal)}
                                            </td>

                                            {/* Variation Type */}
                                            <td className="px-6 py-4 text-left whitespace-nowrap text-sm text-gray-500">
                                                {product.variationValues && Object.keys(product.variationValues).length > 0 ? (
                                                    <select
                                                        value={product.selectedVariation}
                                                        onChange={(e) => product.source === 'frontend' && handleVariationChange(index, e.target.value)}
                                                        disabled={product.source === 'backend'}
                                                        className={`block w-full border py-2 border-gray-300 rounded-md shadow-sm focus:border-transparent ${product.source === 'backend' ? 'bg-gray-100 cursor-not-allowed' : ''
                                                            }`}
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
                                            <td className="px-6 py-4 text-left whitespace-nowrap text-sm text-gray-500">
                                                <button
                                                    onClick={() => {
                                                        if (product.source === 'backend') {
                                                            setConfirmMessage("Are you sure you want to delete this item?");
                                                            setConfirmAction(() => async () => {
                                                                const total = calculateTotal();
                                                                try {
                                                                    const response = await axios.delete(
                                                                        `${process.env.REACT_APP_BASE_URL}/api/deleteProductFromSale`,
                                                                        { params: { saleID: id, productID: product.currentID, total } }
                                                                    );
                                                                    setSaleReturProductData(prev =>
                                                                        prev.filter(p => p.currentID !== product.currentID)
                                                                    );
                                                                    if (response.status === 200) {
                                                                        toast.success("Sale deleted successfully!", { autoClose: 2000 });
                                                                    } else {
                                                                        toast.error("Failed to delete the item.");
                                                                    }
                                                                } catch (error) {
                                                                    console.error(error);
                                                                    toast.error(error.response?.data?.message || "An unexpected error occurred.");
                                                                } finally {
                                                                    setLoading(false);
                                                                }
                                                            });
                                                            setIsConfirmOpen(true);
                                                        } else if (product.source === 'frontend') {
                                                            setConfirmMessage("Are you sure you want to delete this item?");
                                                            setConfirmAction(() => () => {
                                                                setSaleReturProductData(prev =>
                                                                    prev.filter(p => p._id !== product._id)
                                                                );
                                                                toast.success("Sale deleted successfully!", { autoClose: 2000 });
                                                            });
                                                            setIsConfirmOpen(true);
                                                        }
                                                    }}
                                                    className="text-red-500 hover:text-red-700 font-bold py-1 px-2"
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

                    <div className="">
                        {/* DISCOUNT, SHIPPING AND TAX INPUT */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4 mt-60">
                            <div className="relative">
                                <label className="block text-left text-sm font-medium text-gray-700">Discount Type:</label>
                                <select
                                    onChange={handleDiscountType}
                                    value={saleProduct.discountType}
                                    className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
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
                                    value={saleProduct.discount}
                                    type="text"
                                    placeholder="Discount"
                                    className='block w-full rounded-md border-0 py-2.5 px-2 pr-10 text-gray-900 shadow-sm ring-1 ring-gray-400 placeholder:text-gray-400 focus:ring-gray-400 focus:outline-none sm:text-sm' />
                                <span className="absolute inset-y-0 right-0 flex items-end mb-2 pr-3 text-gray-500">
                                    {discountType === 'percentage' ? '%' : currency}
                                </span>
                            </div>
                            <div className="relative">
                                <label className="block text-left text-sm font-medium text-gray-700">Tax:</label>
                                <input
                                    onChange={handleTax}
                                    value={saleProduct.tax}
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
                                    value={saleProduct.shipping}
                                    type="text"
                                    placeholder="Shipping"
                                    className='block w-full rounded-md border-0 py-2.5 px-2 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm' />
                                <span className="absolute inset-y-0 right-0 flex items-end mb-2 pr-3 text-gray-500">
                                    {currency}
                                </span>
                            </div>
                            <div>
                                <label className="block text-left text-sm font-medium text-gray-700">Service Charge Type:</label>
                                <select
                                    value={saleProduct.serviceChargeType || 'fixed'}
                                    onChange={handleServiceChargeType}
                                    className='block w-full rounded-md border-0 py-2.5 px-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm'
                                >
                                    <option value="fixed">Fixed</option>
                                    <option value="percentage">Percentage</option>
                                </select>
                            </div>
                            <div className='relative'>
                                <label className="block text-left text-sm font-medium text-gray-700">Service Charge:</label>
                                <input
                                    onChange={handleServiceCharge}
                                    value={saleProduct.serviceCharge}
                                    type="text"
                                    placeholder="Service Charge"
                                    className='block w-full rounded-md border-0 py-2.5 px-2 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm' />
                                <span className="absolute inset-y-0 right-0 flex items-end mb-2 pr-3 text-gray-500">
                                    {(saleProduct.serviceChargeType === 'percentage') ? '%' : currency}
                                </span>
                            </div>
                        </div>

                        {/* Order, Payment Status, and Payment Type Selects */}
                        <div className="flex flex-col md:flex-row justify-between gap-4 mt-10">
                            <div className='w-full md:w-1/2'>
                                <label className="block text-sm font-medium text-left text-gray-700 whitespace-nowrap mb-1">Status: <span className='text-red-500'>*</span></label>
                                <select
                                    value={saleProduct.orderStatus}
                                    onChange={handleOrderStatusChange}
                                    className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                >
                                    <option value="">Select Order Status</option>
                                    <option value="ordered">Ordered</option>
                                    <option value="pending">Pending</option>
                                </select>
                            </div>

                            {/* Payment Status Select */}
                            <div className='w-full md:w-1/2'>
                                <label className="block text-sm font-medium text-left text-gray-700 whitespace-nowrap mb-1">Payment Status: <span className='text-red-500'>*</span></label>
                                <select
                                    value={saleProduct.paymentStatus}
                                    onChange={handlePaymentStatusChange}
                                    className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                >
                                    <option value="">Select Payment Status</option>
                                    <option value="paid">Paid</option>
                                    <option value="partial">Partial</option>
                                    <option value="unpaid">Unpaid</option>
                                </select>
                            </div>
                        </div>

                        {/* Order Type Radio Buttons */}
                        <div className="mt-6">
                            <label className="text-left block text-sm font-medium text-gray-700 mb-3">
                                Order Type: <span className='text-red-500'>*</span>
                            </label>
                            <div className="flex gap-6">
                                <label className="flex items-center cursor-pointer">
                                    <input
                                        type="radio"
                                        name="orderType"
                                        value="Normal"
                                        checked={orderType === 'Normal'}
                                        onChange={(e) => setOrderType(e.target.value)}
                                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">Normal</span>
                                </label>
                                <label className="flex items-center cursor-pointer">
                                    <input
                                        type="radio"
                                        name="orderType"
                                        value="PickMe"
                                        checked={orderType === 'PickMe'}
                                        onChange={(e) => setOrderType(e.target.value)}
                                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">PickMe</span>
                                </label>
                                <label className="flex items-center cursor-pointer">
                                    <input
                                        type="radio"
                                        name="orderType"
                                        value="Uber"
                                        checked={orderType === 'Uber'}
                                        onChange={(e) => setOrderType(e.target.value)}
                                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">Uber</span>
                                </label>
                            </div>
                        </div>

                        {previousPaymentDetails.length > 0 && (
                            <div className="mb-6 mt-5 p-4 bg-blue-50 border border-blue-200 rounded-lg shadow-sm">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3 text-left">
                                    Previous Payment Details
                                </h3>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {previousPaymentDetails.map((payment, index) => {
                                        const typeLabels = {
                                            cash: "Cash",
                                            card: "Card",
                                            bank_transfer: "Bank Transfer",
                                            cheque: "Cheque",
                                            credit: "Credit",
                                        };

                                        const label = typeLabels[payment.type] || payment.type;

                                        return (
                                            <div
                                                key={index}
                                                className="flex justify-between items-center bg-white p-3 rounded-md border border-blue-100 shadow-sm"
                                            >
                                                <span className="text-gray-800 font-medium">{label}</span>
                                                <span className="text-gray-700 font-semibold">
                                                    {currency} {formatWithCustomCommas(payment.amount)}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Payment Type Select */}
                        <div className="mt-10 mb-14 w-full">
                            <label className="text-left block text-sm font-medium text-gray-700">
                                Payment Type: <span className='text-red-500'>*</span>
                            </label>

                            <div className="mt-4 flex flex-wrap gap-6 md:gap-10 w-full">
                                {Object.keys(paymentType).map((type) => {
                                    const isDisabled = paymentStatus === "unpaid";
                                    return (
                                        <div key={type} className="flex items-center space-x-2 relative opacity-100">
                                            <input
                                                type="checkbox"
                                                id={type}
                                                checked={paymentType[type]}
                                                onChange={() => handleCheckboxChange(type)}
                                                disabled={isDisabled}
                                                className={`h-5 w-5 border-gray-300 rounded focus:ring-blue-500 ${isDisabled ? "cursor-not-allowed opacity-50" : "text-blue-600"
                                                    }`}
                                            />
                                            <label
                                                htmlFor={type}
                                                className={`text-sm capitalize ${isDisabled ? "text-gray-400" : "text-gray-700"
                                                    }`}
                                            >
                                                {type.replace("_", " ")}
                                            </label>

                                            {paymentType[type] && (
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        value={amounts[type]}
                                                        onChange={(e) => handleAmountChange(type, e.target.value)}
                                                        placeholder="Enter amount"
                                                        disabled={isDisabled}
                                                        className={`block w-44 rounded-md border-0 py-2.5 px-4 pr-10 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-xs focus:ring-2 focus:ring-inset focus:outline-none sm:text-sm ${isDisabled
                                                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                                            : "text-gray-900"
                                                            }`}
                                                    />
                                                    <span className="absolute inset-y-0 right-2 flex items-center text-gray-500">
                                                        {currency}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                    <div className="mt-1 text-right text-lg font-semibold">
                        Balance: {currency} {formatWithCustomCommas(
                            (total - Object.values(amounts).reduce((acc, val) => acc + (Number(val) || 0), 0)).toFixed(2)
                        )}
                    </div>

                    <div className="mt-4 text-right text-lg font-semibold">
                        Total: {currency} {formatWithCustomCommas(total)}
                    </div>
                    <div className="mt-4 text-right text-lg font-semibold">
                        Profit: {currency} {
                            saleReturProductData?.length > 0
                                ? formatWithCustomCommas(calculateProfitOfSale())
                                : '0.00'
                        }
                    </div>

                    <button
                        onClick={handleUpdateClick}
                        className="mt-5 submit w-[200px] text-white rounded py-2 px-4"
                    >
                        Update & Save
                    </button>
                </div>
                {/* Error and Response Messages */}
                <div className="mt-5">
                    <div className="relative">
                        {/* Reserve space for messages */}
                        {/* <div className="absolute top-0 left-0 w-full"> */}
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
                    <div className="h-[50px]"></div>
                </div>

                <ConfirmationModal
                    isOpen={isConfirmOpen}
                    onClose={() => setIsConfirmOpen(false)}
                    onConfirm={() => {
                        if (confirmAction) confirmAction();
                        setIsConfirmOpen(false);
                    }}
                    message={confirmMessage}
                />
            </div>
        </div>
    );
}
export default EditSaleBody;