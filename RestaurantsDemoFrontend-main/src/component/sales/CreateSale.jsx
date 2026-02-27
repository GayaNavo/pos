

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { handleProductSelect, handleProductSearch, handleCustomerSearch, handleCustomerSelect, handleWarehouseChange, handleVariationChange, getProductCost, getDiscount, getQty, getPriceRange, handleDelete, handleQtyChange, getTax, handleSave, getTaxType, handleRemoveVariation } from './SaleController'
import '../../styles/role.css';
import { Link } from 'react-router-dom';
import { fetchProductDataByWarehouse } from '../pos/utils/fetchByWarehose';
import Decrease from '../../img/down-arrow (1).png';
import { decryptData } from '../utill/encryptionUtils';
import Loader from '../utill/Loader';
import Box from '@mui/material/Box';
import formatWithCustomCommas from '../utill/NumberFormate';
import { useCurrency } from '../../context/CurrencyContext';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

function CreateSaleBody() {
    const navigate = useNavigate();
    const { currency } = useCurrency()
    const [warehouseData, setWarehouseData] = useState([]);
    const [warehouse, setWarehouse] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchCustomer, setSearchCustomer] = useState('');
    const [filteredCustomer, setFilteredCustomer] = useState([])
    const [selectedCustomer, setSelectedCustomer] = useState([])
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState([]);
    const [date, setDate] = useState('')
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
    const [serviceCharge, setServiceCharge] = useState('');
    const [serviceChargeValue, setServiceChargeValue] = useState(0);
    const [serviceChargeType, setServiceChargeType] = useState('fixed');
    const [serviceChargeSymbol, setServiceChargeSymbol] = useState(currency);
    const [tax, setTax] = useState('')
    const [error, setError] = useState('');
    const [responseMessage, setResponseMessage] = useState('');
    const [orderStatus, setOrderStatus] = useState('');
    const [note, setNote] = useState('null');
    const [invoiceData, setInvoiceData] = useState([]);
    const [balance, setBalance] = useState(0);
    const [paymentStatus, setPaymentStatus] = useState('');
    const [shouldPrint, setShouldPrint] = useState(false);
    const [paymentType, setPaymentType] = useState({ cash: false, card: false, bank_transfer: false });
    const [amounts, setAmounts] = useState({ cash: '', card: '', bank_transfer: '' });
    const numberRegex = /^[0-9]*(\.[0-9]+)?$/;
    const [decryptedUser, setDecryptedUser] = useState(null);
    const [preFix, setPreFix] = useState('');
    const [invoiceNumber, setInvoiceNumber] = useState(null);
    const [regDataFetching, setFetchRegData] = useState(false);
    const cashierUsername = sessionStorage.getItem('cashierUsername');
    const cashRegisterID = sessionStorage.getItem('cashRegisterID');
    const deliveryNote = '';
    const shouldPrintKOT = false;
    const [orderType, setOrderType] = useState('Normal');

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

    const calculateBalance = () => {
        const total = calculateTotal();
        const paidAmount = Object.values(amounts).reduce((sum, value) => sum + (Number(value) || 0), 0);
        return total - paidAmount;
    };

    const calculateBaseTotal = () => {
        return selectedProduct.reduce((total, product) => {
            const productPrice = Number(getPriceRange(product, product.selectedVariation));

            const productQty = product.ptype === "Variation"
                ? (product.variationValues?.[product.selectedVariation]?.barcodeQty ?? 0)
                : (product.barcodeQty ?? 0);

            if (productQty === "" || productQty === 0) return total;

            const numericQty = Number(productQty);

            const taxType = getTaxType(product, product.selectedVariation)
            const taxRate = product.orderTax ? product.orderTax / 100 : getTax(product, product.selectedVariation) / 100;
            const discount = Number(getDiscount(product, product.selectedVariation));
            const discountedPrice = Math.max(productPrice - discount, 0);

            let subTotal = discountedPrice * numericQty;
            if (taxType?.toLowerCase() === 'exclusive') {
                subTotal += (productPrice * numericQty * taxRate);
            }
            return total + subTotal;

        }, 0);
    };

    const calculateDiscountValue = () => {
        const baseTotal = calculateBaseTotal();
        if (discountType === 'fixed') return Number(discount) || 0;
        if (discountType === 'percentage') return (baseTotal * (Number(discount) || 0)) / 100;
        return 0;
    };

    const calculateTotal = () => {
        const productTotal = selectedProduct.reduce((total, product) => {
            const productPrice = Number(getPriceRange(product, product.selectedVariation));
            const productQty = product.ptype === "Variation"
                ? (product.variationValues?.[product.selectedVariation]?.barcodeQty ?? 0)
                : (product.barcodeQty ?? 0);

            if (productQty === "" || productQty === 0) return total;

            const numericQty = Number(productQty);
            const taxRate = product.orderTax ? product.orderTax / 100 : getTax(product, product.selectedVariation) / 100;
            const taxType = getTaxType(product, product.selectedVariation);
            const discount = Number(getDiscount(product, product.selectedVariation));
            const discountedPrice = Math.max(productPrice - discount, 0);

            let subTotal = discountedPrice * numericQty;
            if (taxType?.toLowerCase() === 'exclusive') {
                subTotal += (productPrice * numericQty * taxRate);
            }

            return total + subTotal;

        }, 0);

        let discountValue = 0;
        if (discountType === 'fixed') {
            discountValue = Number(discount);
        } else if (discountType === 'percentage') {
            discountValue = (productTotal * Number(discount)) / 100;
        }

        // Shipping cost remains the same
        const shippingValue = Number(shipping);

        // Calculate service charge based on type
        let serviceChargeValue = 0;
        if (serviceChargeType === 'fixed') {
            serviceChargeValue = Number(serviceCharge);
        } else if (serviceChargeType === 'percentage') {
            serviceChargeValue = (productTotal * Number(serviceCharge)) / 100;
        }

        const globalTaxRate = Number(tax) / 100;
        const globalTax = productTotal * globalTaxRate;
        const grandTotal = productTotal - discountValue + shippingValue + serviceChargeValue + globalTax;
        return grandTotal;
    };

    const calculateTaxLessTotal = () => {
        let productTotal = selectedProduct.reduce((total, product) => {
            const productPrice = Number(getPriceRange(product, product.selectedVariation));
            const productQty = product.ptype === "Variation"
                ? (product.variationValues?.[product.selectedVariation]?.barcodeQty ?? 0)
                : (product.barcodeQty ?? 0);

            if (productQty === "" || productQty === 0) return total;

            const numericQty = Number(productQty);
            const discount = Number(getDiscount(product, product.selectedVariation));
            const discountedPrice = Math.max(productPrice - discount, 0);
            const subTotal = (discountedPrice * numericQty);
            return total + subTotal;

        }, 0);
        const total = productTotal;
        return isNaN(total) ? 0 : total;
    };

    const calculateProfitOfSale = () => {
        const profitTotal = selectedProduct.reduce((totalProfit, product) => {
            const productPrice = parseFloat(getPriceRange(product, product.selectedVariation));
            const productCost = parseFloat(getProductCost(product, product.selectedVariation));
            const productQty = product.ptype === "Variation"
                ? (product.variationValues?.[product.selectedVariation]?.barcodeQty ?? 0)
                : (product.barcodeQty ?? 0);

            if (productQty === "" || productQty === 0) return totalProfit;

            const numericQty = Number(productQty);
            const discount = Number(getDiscount(product, product.selectedVariation));
            const discountedPrice = Math.max(productPrice - discount, 0);
            const totalProductCost = (productCost * numericQty)
            const subTotal = (discountedPrice * numericQty);
            const profitOfProduct = subTotal - totalProductCost;
            return totalProfit + profitOfProduct;

        }, 0);

        let taxLessTotal = calculateTaxLessTotal();

        let discountValue = 0;
        if (discountType === 'fixed') {
            discountValue = Number(discount);
        } else if (discountType === 'percentage') {
            discountValue = (taxLessTotal * Number(discount)) / 100;
        }

        const pureProfit = profitTotal - discountValue;
        return pureProfit;
    };

    const handleDiscountType = (e) => {
        setDiscountType(e.target.value)
    }

    const handleDiscount = (e) => {
        const value = e.target.value;
        let errorMessage = '';

        if (discountType === 'percentage') {
            const numericValue = parseFloat(value);
            if (numericValue < 1 || numericValue > 100) {
                errorMessage = 'Percentage must be between 1 and 100.';
            }
        } else if (discountType === 'fixed' && !numberRegex.test(value)) {
            errorMessage = 'Discount must be a valid number.';
        }

        if (errorMessage) {
            setError(errorMessage);
        } else {
            setDiscount(value);
            setError('');
        }
    };

    const handleAmountChange = (type, value) => {
        const numericValue = Number(value);
        const totalAmount = Object.keys(amounts).reduce((acc, key) => {
            return acc + (key === type ? 0 : (parseFloat(amounts[key]) || 0));
        }, 0);
        const newTotalAmount = parseFloat((totalAmount + numericValue).toFixed(2));
        const saleTotal = parseFloat(calculateTotal().toFixed(2));

        if (newTotalAmount > saleTotal) {
            toast.error('Total amount cannot exceed the total value of the sale.', {
                autoClose: 2000,
            }, {
                className: 'custom-toast',
            });
            return;
        }
        setAmounts((prev) => ({
            ...prev,
            [type]: value,
        }));
    };

    useEffect(() => {
        const baseTotal = calculateBaseTotal();

        let calculatedServiceCharge = 0;

        if (serviceChargeType === 'fixed') {
            calculatedServiceCharge = parseFloat(serviceCharge) || 0;
        } else if (serviceChargeType === 'percentage') {
            calculatedServiceCharge = (baseTotal * (parseFloat(serviceCharge) || 0)) / 100;
        }

        setServiceChargeValue(parseFloat(calculatedServiceCharge.toFixed(2)));
    }, [serviceCharge, serviceChargeType, selectedProduct]);

    const handleCheckboxChange = (type) => {
        setPaymentType(prev => ({
            ...prev,
            [type]: !prev[type]
        }));
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

    const handleShipping = (e) => {
        setShipping(e.target.value)
    }

    const handleServiceCharge = (e) => {
        setServiceCharge(e.target.value)
    }

    const handleServiceChargeType = (e) => {
        setServiceChargeType(e.target.value);
    }

    useEffect(() => {
        if (serviceChargeType === 'fixed') {
            setServiceChargeSymbol(currency);
        } else if (serviceChargeType === 'percentage') {
            setServiceChargeSymbol('%');
        }
    }, [serviceChargeType, currency]);

    useEffect(() => {
        const encryptedUser = sessionStorage.getItem('user');
        if (encryptedUser) {
            try {
                const user = decryptData(encryptedUser);
                setDecryptedUser(user);
            } catch (error) {
                sessionStorage.removeItem('user');
                alert('Session data corrupted. Please log in again.');
                return;
            }
        } else {
            console.error('User data could not be retrieved');
            alert('Could not retrieve user data. Please log in again.');
        }
    }, []);

    useEffect(() => {
        const fetchSettings = () => {
            if (!decryptedUser) {
                console.error('No decrypted user data available');
                return;
            }
            const preFix = decryptedUser.prefixes?.[0].salePrefix;
            if (!preFix) {
                console.error('No receipt settings available');
                setError('Receipt settings not found');
                return;
            }
            console.log('Fetched data:', preFix);
            setPreFix(preFix)
        };

        fetchSettings();
    }, [decryptedUser]);

    const handlePrintAndClose = () => {
        setWarehouse('');
        setSearchTerm('');
        setSearchCustomer('');
        setFilteredCustomer([]);
        setSelectedCustomer([]);
        setFilteredProducts([]);
        setSelectedProduct([]);
        setDiscount('');
        setShipping('');
        setServiceCharge('');
        setServiceChargeType('fixed');
        setTax('');
        setOrderStatus('');
        setPaymentStatus('');
        setDiscountType('');
        setAmounts({ cash: '', card: '', bank_transfer: '' });
        setPaymentType({ cash: false, card: false, bank_transfer: false });
        setError('');
        setResponseMessage('');
        setBalance(0);
        setShouldPrint(false);
        setInvoiceNumber(null);
        setInvoiceData([]);

        // Redirect to sale view page
        navigate('/viewSale');
    };

    useEffect(() => {
        if (paymentStatus === 'unpaid') {
            setPaymentType({
                cash: false,
                card: false,
                bank_transfer: false
            });
            setAmounts({
                cash: '',
                card: '',
                bank_transfer: ''
            });
        }
    }, [paymentStatus]);

    const handlePaymentStatusChange = (e) => {
        const newStatus = e.target.value;
        setPaymentStatus(newStatus);

        if (newStatus === 'unpaid') {
            setPaymentType({
                cash: false,
                card: false,
                bank_transfer: false
            });
            setAmounts({
                cash: '',
                card: '',
                bank_transfer: ''
            });
        }
    };

    return (
        <div className='background-white relative left-[18%] w-[82%] min-h-[100vh]  p-5'>
            {progress && (
                <Box className="fullscreen-loader">
                    <Loader />
                </Box>
            )}
            <div className='mt-20 flex justify-between items-center'>
                <div>
                    <h2 className="text-lightgray-300 m-0 p-0 text-2xl">Create Sale</h2>
                </div>
                <div>
                    <Link className='px-4 py-1.5 border border-[#35AF87] text-[#35AF87] rounded-md transition-colors duration-300 hover:bg-[#35AF87] hover:text-white' to={'/viewSale'}>Back</Link>
                </div>
            </div>
            <div className="bg-white mt-[20px] w-full rounded-2xl px-8 shadow-md pb-20">
                <div className="flex  flex-1 flex-col px-2 py-12 lg:px-8">
                    <form >
                        <div className="flex flex-col md:flex-row w-full md:space-x-5 space-y-5 md:space-y-0 items-end"> {/* Add space between inputs if needed */}
                            {/* warehouse*/}
                            <div className="w-full md:flex-1"> {/* Use flex-1 to allow the field to take full width */}
                                <label className="block text-sm font-medium leading-6 text-gray-900 text-left whitespace-nowrap mb-1">Select warehouse <span className='text-red-500'>*</span></label>
                                <select
                                    id="warehouse"
                                    name="warehouse"
                                    value={warehouse}
                                    onChange={(e) => handleWarehouseChange(e, setWarehouse, fetchProductDataByWarehouse, setProductData, setSelectedCategoryProducts, setSelectedBrandProducts, setSearchedProductData, setLoading)}
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

                            {/* customer */}
                            <div className="w-full md:flex-1 relative"> {/* Use flex-1 here as well */}
                                <label className="block text-sm font-medium leading-6 text-gray-900 text-left whitespace-nowrap mb-1">Customer <span className='text-red-500'>*</span></label>
                                <input
                                    id="customer"
                                    name="customer"
                                    value={searchCustomer}
                                    required
                                    onChange={(e) => handleCustomerSearch(e, setSearchCustomer, setFilteredCustomer)}
                                    placeholder={"        Search..."}
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
                            <div className="w-full md:flex-1"> {/* Use flex-1 here as well */}
                                <label className="block text-sm font-medium leading-6 text-gray-900 text-left whitespace-nowrap mb-1">Date <span className='text-red-500'>*</span></label>
                                <input
                                    id="date"
                                    name="date"
                                    type="date"
                                    required
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
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
                            onChange={(e) => handleProductSearch(e, setSearchTerm, setFilteredProducts, warehouse)}
                            placeholder={searchTerm ? "" : "        Search..."}
                            className={`block w-full rounded-md border-0 py-2.5 pl-10 pr-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6 ${!warehouse ? "bg-gray-200 cursor-not-allowed opacity-50" : ""
                                }`}
                            disabled={!warehouse}
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
                        {selectedProduct.length > 0 && (
                            <table className="mt-10 min-w-full bg-white border border-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock Qty</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchase Qty</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">tax</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sub Total</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variation</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {selectedProduct.length === 0 ? (
                                        <tr>
                                            <td colSpan="8" className="px-6 py-8 text-center text-sm text-gray-500">
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
                                                                    ? product.variationValues[product.selectedVariation]?.barcodeQty ?? 0
                                                                    : product.barcodeQty ?? 0
                                                            }
                                                            onChange={(e) =>
                                                                handleQtyChange(
                                                                    index,
                                                                    product.selectedVariation,
                                                                    setSelectedProduct,
                                                                    e.target.value
                                                                )
                                                            }
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

                                                {/* Product Price */}
                                                <td className="px-6 py-4 text-left whitespace-nowrap text-sm text-gray-700 font-medium">
                                                    {currency} {getPriceRange(product, product.selectedVariation)}
                                                </td>

                                                {/* Display Product Tax */}
                                                <td className="px-6 py-4 text-left whitespace-nowrap text-sm text-gray-600">
                                                    {product.orderTax
                                                        ? `${product.orderTax}%`
                                                        : `${getTax(product, product.selectedVariation)}%`}
                                                </td>

                                                <td className="px-6 py-4 text-left whitespace-nowrap text-sm text-gray-700 font-semibold">
                                                    {currency}{' '}
                                                    {(() => {
                                                        const price = getPriceRange(product, product.selectedVariation) || 0;
                                                        const quantity = product.variationValues?.[product.selectedVariation]?.barcodeQty || product.barcodeQty || 0;

                                                        if (quantity === "" || quantity === 0 || !quantity) {
                                                            return formatWithCustomCommas(0);
                                                        }

                                                        const numericQuantity = Number(quantity);
                                                        const taxType = getTaxType(product, product.selectedVariation);
                                                        const taxRate = product.orderTax
                                                            ? Number(product.orderTax) / 100
                                                            : getTax(product, product.selectedVariation) / 100;
                                                        const discount = Number(getDiscount(product, product.selectedVariation)) || 0;

                                                        const discountedPrice = Math.max(price - discount, 0);

                                                        const subtotal = taxType.toLowerCase() === 'exclusive'
                                                            ? discountedPrice * numericQuantity + (price * numericQuantity * taxRate)
                                                            : discountedPrice * numericQuantity;

                                                        return formatWithCustomCommas(subtotal);
                                                    })()}
                                                </td>

                                                <td className="px-6 py-4 text-left whitespace-nowrap text-sm text-gray-500">
                                                    {product.ptype === 'Variation' && product.variationValues ? (
                                                        <div className="flex items-center justify-left gap-2">
                                                            {/* Current Variation Display */}
                                                            <div className="flex items-center gap-2">
                                                                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm font-medium">
                                                                    {product.selectedVariation}
                                                                </span>
                                                            </div>

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
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4 mt-60">
                            <div className="relative">
                                <label className="block text-left text-sm font-medium text-gray-700">Discount Type:</label>
                                <select
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (!value) {
                                            alert("Please select a discount type.");
                                        }
                                        handleDiscountType(e);
                                    }}
                                    value={discountType}
                                    className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                >
                                    <option value="">Discount type</option>
                                    <option value="fixed">Fixed</option>
                                    <option value="percentage">Percentage</option>
                                </select>
                            </div>
                            <div className="relative">
                                <label className="block text-left text-sm font-medium text-gray-700">Discount:</label>
                                <input
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (!/^\d*\.?\d*$/.test(value)) {
                                            alert("Only numbers are allowed for discount.");
                                            return;
                                        }
                                        handleDiscount({ target: { value } });
                                    }}
                                    value={discount}
                                    type="text"
                                    placeholder="Discount"
                                    className="block w-full rounded-md border-0 py-2.5 px-2 pr-10 text-gray-900 shadow-sm ring-1 ring-gray-400 placeholder:text-gray-400 focus:ring-gray-400 focus:outline-none sm:text-sm"
                                />
                                <span className="absolute inset-y-0 right-0 flex items-end mb-2 pr-3 text-gray-500">
                                    {discountSymbole}
                                </span>
                            </div>
                            <div className="relative">
                                <label className="block text-left text-sm font-medium text-gray-700">Tax:</label>
                                <input
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (!/^\d*\.?\d*$/.test(value)) {
                                            alert("Only numbers are allowed for tax.");
                                            return;
                                        }
                                        handleTax({ target: { value } });
                                    }}
                                    value={tax}
                                    type="text"
                                    placeholder="Tax"
                                    className="block w-full rounded-md border-0 py-2.5 px-2 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm"
                                />
                                <span className="absolute inset-y-0 right-0 flex items-end mb-2 pr-3 text-gray-500">
                                    %
                                </span>
                            </div>
                            <div className="relative">
                                <label className="block text-left text-sm font-medium text-gray-700">Delivery Charge:</label>
                                <input
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (!/^\d*\.?\d*$/.test(value)) {
                                            alert("Only numbers are allowed for shipping.");
                                            return;
                                        }
                                        handleShipping({ target: { value } });
                                    }}
                                    value={shipping}
                                    type="text"
                                    placeholder="Delivery Charge"
                                    className="block w-full rounded-md border-0 py-2.5 px-2 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm"
                                />
                                <span className="absolute inset-y-0 right-0 flex items-end mb-2 pr-3 text-gray-500">
                                    {currency}
                                </span>
                            </div>
                            <div>
                                <label className="block text-left text-sm font-medium text-gray-700">Service Charge Type:</label>
                                <select
                                    value={serviceChargeType}
                                    onChange={handleServiceChargeType}
                                    className="block w-full rounded-md border-0 py-2.5 px-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm"
                                >
                                    <option value="fixed">Fixed</option>
                                    <option value="percentage">Percentage</option>
                                </select>
                            </div>
                            <div className="relative">
                                <label className="block text-left text-sm font-medium text-gray-700">Service Charge:</label>
                                <input
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (!/^\d*\.?\d*$/.test(value)) {
                                            alert("Only numbers are allowed for service charge.");
                                            return;
                                        }
                                        handleServiceCharge({ target: { value } });
                                    }}
                                    value={serviceCharge}
                                    type="text"
                                    placeholder="Service Charge"
                                    className="block w-full rounded-md border-0 py-2.5 px-2 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm"
                                />
                                <span className="absolute inset-y-0 right-0 flex items-end mb-2 pr-3 text-gray-500">
                                    {serviceChargeSymbol}
                                </span>
                            </div>
                        </div>

                        {/* Order, Payment Status, and Payment Type Selects */}
                        <div className="flex flex-col md:flex-row justify-between gap-4 mt-10">
                            <div className='w-full md:w-1/2'>
                                <label className="text-left block text-sm font-medium text-gray-700 whitespace-nowrap mb-1">Status: <span className='text-red-500'>*</span></label>
                                <select
                                    value={orderStatus}
                                    onChange={(e) => setOrderStatus(e.target.value)}
                                    className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                >
                                    <option value="">Select Order Status</option>
                                    <option value="ordered">Ordered</option>
                                    <option value="pending">Pending</option>
                                </select>
                            </div>

                            {/* Payment Status Select */}
                            <div className='w-full md:w-1/2'>
                                <label className="text-left block text-sm font-medium text-gray-700 whitespace-nowrap mb-1">Payment Status: <span className='text-red-500'>*</span></label>
                                <select
                                    value={paymentStatus}
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

                        {/* Payment Type Select */}
                        <div className="mt-10 mb-14 w-full">
                            <div>
                                <label className="text-left block text-sm font-medium text-gray-700">
                                    Payment Type: <span className='text-red-500'>*</span>
                                </label>
                                <div className="mt-4 flex flex-wrap gap-6 md:gap-10 w-full">
                                    {Object.keys(paymentType).map((type) => (
                                        <div key={type} className="flex items-center space-x-2 relative">
                                            <input
                                                type="checkbox"
                                                id={type}
                                                checked={paymentType[type]}
                                                onChange={() => handleCheckboxChange(type)}
                                                disabled={paymentStatus === "unpaid"}
                                                className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                            />
                                            <label htmlFor={type} className="text-sm text-gray-700 capitalize">{type.replace('_', ' ')}</label>
                                            {paymentType[type] && (
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        value={amounts[type]}
                                                        onChange={(e) => handleAmountChange(type, e.target.value)}
                                                        placeholder="Enter amount"
                                                        disabled={paymentStatus === "unpaid"}
                                                        className="block w-44 rounded-md border-0 pl-4 py-2.5 pr-2 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-xs text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm"
                                                    />
                                                    <span className="absolute inset-y-0 right-2 flex items-center text-gray-500">
                                                        {currency}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 text-right text-lg font-semibold">
                        Balance: {currency} {formatWithCustomCommas(calculateBalance())}
                    </div>
                    <div className="mt-4 text-right text-lg font-semibold">
                        Total: {currency}  {formatWithCustomCommas(calculateTotal())}
                    </div>

                    <div className="mt-4 text-right text-lg font-semibold">
                        Profit: {currency}  {formatWithCustomCommas(calculateProfitOfSale())}
                    </div>

                    <div className="container mx-auto text-left">
                        <div className='mt-10 flex justify-start'>
                            <button onClick={() =>
                                handleSave(
                                    calculateTotal().toFixed(2),
                                    calculateProfitOfSale().toFixed(2),
                                    orderStatus,
                                    paymentStatus,
                                    paymentType,
                                    amounts,
                                    shipping,
                                    serviceCharge,
                                    serviceChargeValue,
                                    serviceChargeType,
                                    discountType,
                                    discount,
                                    calculateDiscountValue().toFixed(2),
                                    deliveryNote,
                                    tax,
                                    warehouse,
                                    selectedCustomer?.name,
                                    selectedProduct,
                                    preFix,
                                    '0',
                                    setInvoiceNumber,
                                    setResponseMessage,
                                    setError,
                                    setProgress,
                                    setInvoiceData,
                                    note,
                                    balance,
                                    handlePrintAndClose,
                                    false,
                                    shouldPrintKOT,
                                    cashierUsername,
                                    cashRegisterID,
                                    setFetchRegData,
                                    '',
                                    '',
                                    orderType
                                )
                            } className="mt-5 submit  w-[200px] text-white rounded py-2 px-4">
                                Save sale
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
}
export default CreateSaleBody;
