

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { handleProductSelect, handleDelete } from '../sales/SaleController';
import { handleCreateSale } from './QuatationController'
import '../../styles/role.css';
import { Link, useNavigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import Decrease from '../../img/down-arrow (1).png';
import Loader from '../utill/Loader';
import { decryptData } from '../utill/encryptionUtils';
import { useCurrency } from '../../context/CurrencyContext';
import formatWithCustomCommas from '../utill/NumberFormate';
import { toast } from 'react-toastify';

function CreateSaleFromQuatationBody() {
    const { currency } = useCurrency()
    const [warehouseData, setWarehouseData] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState([]);
    const [discountType, setDiscountType] = useState('');
    const [error, setError] = useState('');
    const [responseMessage, setResponseMessage] = useState('');
    const [orderStatus, setOrderStatus] = useState('');
    const [paymentStatus, setPaymentStatus] = useState('');
    const [quatationData, setQuatationData] = useState([])
    const [quatationProductData, setQuatationProductData] = useState([]);
    const [discountAmount, setDiscountAmount] = useState(0);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [decryptedUser, setDecryptedUser] = useState(null);
    const [preFix, setPreFix] = useState('')
    const [progress, setProgress] = useState(false);
    const [serviceCharge, setServiceCharge] = useState('');
    const [serviceChargeValue, setServiceChargeValue] = useState(0);
    const [serviceChargeType, setServiceChargeType] = useState('fixed');
    const [serviceChargeSymbol, setServiceChargeSymbol] = useState(currency);
    const [invoiceNumber, setInvoiceNumber] = useState(null);
    const [paymentType, setPaymentType] = useState({
        cash: false,
        card: false,
        bank_transfer: false
    });

    const [amounts, setAmounts] = useState({
        cash: '',
        card: '',
        bank_transfer: ''
    });

    const navigate = useNavigate();
    const { id } = useParams();

    useEffect(() => {
        const findSaleById = async () => {
            try {
                setProgress(true)
                const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/findQuatationById/${id}`);
                const fetchedProductsQty = response.data.productsData || [];
                const initializedProductsQty = fetchedProductsQty.map(pq => ({
                    ...pq,
                    quantity: pq.quantity || Object.keys(pq.quantity)[0]
                }));
                setQuatationProductData(initializedProductsQty);
                setQuatationData(response.data);
                setServiceCharge(response.data.serviceCharge || '');
                setServiceChargeType(response.data.serviceChargeType || 'fixed');
                setServiceChargeValue(response.data.serviceChargeValue || 0);
            } catch (error) {
                console.error('Error fetching sale by ID:', error.response ? error.response.data : error.message);
                setError('Error fetching sale by Id.');
            }
            finally {
                setProgress(false)
            }
        };

        if (id) {
            findSaleById();
        }
    }, [id]);

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

    const calculateTaxLessTotal = () => {
        const subtotal = quatationProductData.reduce((acc, product) => {
            const productPrice = Number(product?.price) || 0;
            const productQty = Number(product?.quantity) || 1;

            if (productQty === '' || !productQty || productQty === 0) {
                return acc;
            }
            const discount = Number(product?.discount) || 0;
            const discountedPrice = productPrice - discount;

            const productSubtotal = discountedPrice * productQty;
            return acc + productSubtotal;
        }, 0);

        return subtotal;
    };

    const calculateTotal = () => {
        const subtotal = quatationProductData.reduce((acc, product, index) => {
            const productQty = quatationProductData[index]?.quantity || 0;
            if (productQty === '' || !productQty || productQty === 0) {
                return acc;
            }
            const discount = quatationProductData[index]?.discount || 0;
            const productTaxRate = quatationProductData[index]?.taxRate || 0;
            const taxType = quatationProductData[index]?.taxType || "inclusive";
            const discountedPrice = Math.max(product.price - discount, 0);
            const baseSubtotal = discountedPrice * productQty;

            const taxAmount = taxType.toLowerCase() === "exclusive"
                ? product.price * productQty * productTaxRate
                : 0;

            const productSubtotal = baseSubtotal + taxAmount;
            return acc + productSubtotal;
        }, 0);

        const discountAmount = quatationData.discountType === 'percentage'
            ? subtotal * (quatationData.discount / 100)
            : quatationData.discount || 0;

        const shipping = parseFloat(quatationData.shipping) || 0;
        const overallTaxRate = quatationData.tax ? parseFloat(quatationData.tax) / 100 : 0;
        const taxAmount = subtotal * overallTaxRate;
        const total = (subtotal - discountAmount) + taxAmount + shipping + serviceChargeValue;
        return parseFloat(total.toFixed(2));
    };

    const calculateDiscountAmount = () => {
        const subtotal = quatationProductData.reduce((acc, product, index) => {
            const productQty = quatationProductData[index]?.quantity || 0;
            if (productQty === '' || !productQty || productQty === 0) {
                return acc;
            }
            const productTaxRate = quatationProductData[index]?.taxRate / 100 || 0;
            const discount = quatationProductData[index]?.discount || 0;
            const productPrice = quatationProductData[index]?.price || 0;
            const discountedPrice = productPrice - discount;

            const productSubtotal = ((discountedPrice) * productQty) + ((productPrice) * productQty * (productTaxRate * 100));
            return acc + productSubtotal;
        }, 0);

        return discountType === 'percentage'
            ? subtotal * (quatationData.discount / 100)
            : quatationData.discount || 0;
    };

    const calculateProfitOfSale = () => {
        const profitTotal = quatationProductData.reduce((acc, product, index) => {
            const productPrice = product.price || 0;
            const productQty = quatationProductData[index]?.quantity || 0;
            if (productQty === '' || !productQty || productQty === 0) {
                return acc;
            }
            const discount = quatationProductData[index]?.discount || 0;
            const productCost = quatationProductData[index]?.productCost || 0;

            const discountedPrice = productPrice - discount;
            const totalProductCost = (productCost * productQty)
            const subTotal = (discountedPrice * productQty);
            const profitOfProduct = subTotal - totalProductCost;

            return acc + profitOfProduct;
        }, 0);

        const totalPrice = calculateTaxLessTotal();
        let discountValue = 0;
        if (quatationData.discountType === 'fixed') {
            discountValue = quatationData.discount || 0;
        } else if (quatationData.discountType === 'percentage') {
            discountValue = (totalPrice * quatationData.discount) / 100;
        }

        const pureProfit = profitTotal - discountValue;
        return pureProfit;
    };

    useEffect(() => {
        const discountValue = calculateDiscountAmount();
        setDiscountAmount(discountValue);
    }, [quatationProductData, discountType, quatationData.discount, quatationData.shipping, quatationData.tax]);

    const calculateBaseForServiceCharge = () => {
        return quatationProductData.reduce((acc, product) => {
            const productQty = Number(product?.quantity) || 0;
            if (productQty <= 0) return acc;

            const productPrice = Number(product?.price) || 0;
            const discount = Number(product?.discount) || 0;
            const discountedPrice = Math.max(productPrice - discount, 0);
            const taxType = product?.taxType || "inclusive";
            const taxRate = Number(product?.taxRate) || 0;
            let itemTotal = discountedPrice * productQty;

            if (taxType.toLowerCase() === "exclusive") {
                itemTotal += productPrice * productQty * taxRate;
            }

            return acc + itemTotal;
        }, 0);
    };

    useEffect(() => {
        if (!quatationProductData.length && !serviceCharge) {
            setServiceChargeValue(0);
            return;
        }

        const baseTotal = calculateBaseForServiceCharge();

        let serviceChargeCost = 0;

        if (serviceChargeType === 'fixed') {
            serviceChargeCost = parseFloat(serviceCharge) || 0;
        } else if (serviceChargeType === 'percentage') {
            serviceChargeCost = (baseTotal * (parseFloat(serviceCharge) || 0)) / 100;
        }

        setServiceChargeValue(parseFloat(serviceChargeCost.toFixed(2)));
    }, [serviceCharge, serviceChargeType, quatationProductData]);

    const calculateBalance = () => {
        const total = calculateTotal();
        const paidAmount = Object.values(amounts).reduce((sum, value) => sum + (Number(value) || 0), 0);
        return total - paidAmount;
    };

    useEffect(() => {
        if (quatationData.date) {
            const formattedDate = new Date(quatationData.date).toISOString().slice(0, 10);
            setSelectedDate(formattedDate);
        }
    }, [quatationData.date]);

    const handleDateChange = (e) => {
        setSelectedDate(e.target.value);
    };

    useEffect(() => {
        if (quatationData.customer) {
            setSelectedCustomer(quatationData.customer);
        }
    }, [quatationData.customer]);

    const handleAmountChange = (type, value) => {
        setAmounts(prev => ({
            ...prev,
            [type]: value
        }));
    };

    const handleCheckboxChange = (type) => {
        setPaymentType(prev => ({
            ...prev,
            [type]: !prev[type]
        }));
    };

    const handleDiscountType = (e) => {
        const value = e.target.value;
        setDiscountType(value);
        setQuatationData({
            ...quatationData,
            discountType: value,
        });
    };

    const handleDiscount = (e) => {
        const value = e.target.value;
        if (discountType === 'percentage') {
            const numericValue = parseFloat(value);
            if (isNaN(numericValue) || numericValue < 1 || numericValue > 100) {
                toast.error('Please enter a percentage value between 1 and 100.');
                return;
            }
        }

        setQuatationData({
            ...quatationData,
            discount: value
        });
    };

    const handleTax = (e) => {
        setQuatationData({ ...quatationData, tax: e.target.value });
    };

    const handleShippng = (e) => {
        setQuatationData({ ...quatationData, shipping: e.target.value });
    };

    const handleQtyChange = (index, delta) => {
        setQuatationProductData(prev => {
            const currentQty = prev[index]?.quantity;
            const stockQty = prev[index]?.stockQty || 0;

            let newQty;
            if (currentQty === '' || currentQty === null || currentQty === undefined) {
                newQty = 0 + delta;
            } else {
                newQty = currentQty + delta;
            }
            newQty = Math.max(1, Math.min(newQty, stockQty));

            const discount = prev[index].discount || 0;
            const productPrice = prev[index].price || 0;
            const discountedPrice = Math.max(productPrice - discount, 0);
            const productTaxRate = prev[index].taxRate || 0;
            const taxType = prev[index]?.taxType || "inclusive";

            const baseSubtotal = discountedPrice * newQty;
            const taxAmount = taxType.toLowerCase() === "exclusive"
                ? productPrice * newQty * productTaxRate
                : 0;

            const newSubtotal = baseSubtotal + taxAmount;
            const updatedQuatationProductData = prev.map((item, i) =>
                i === index
                    ? { ...item, quantity: newQty, subtotal: newSubtotal.toFixed(2) }
                    : item
            );
            return updatedQuatationProductData;
        });
    };

    useEffect(() => {
        const encryptedUser = sessionStorage.getItem('user');
        if (encryptedUser) {
            try {
                const user = decryptData(encryptedUser);
                setDecryptedUser(user);
            } catch (error) {
                console.error('Failed to decrypt user data:', error);
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

    return (
        <div className='background-white relative left-[18%] w-[82%] min-h-[100vh] p-5'>
            {progress && (
                <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-white/80 z-50">
                    <Loader />
                </div>
            )}
            <div className='flex justify-between items-center mt-20'>
                <div>
                    <h2 className="text-lightgray-300  m-0 p-0 text-2xl">Create Sale From Quatation</h2>
                </div>
                <div>
                    <Link className='px-4 py-1.5 border border-[#35AF87] text-[#35AF87] rounded-md transition-colors duration-300 hover:bg-[#35AF87] hover:text-white' to={'/viewQuotation'}>Back</Link>
                </div>
            </div>
            <div className="bg-white mt-[20px] w-full rounded-2xl px-8 shadow-md pb-5">
                <div className="flex  flex-1 flex-col px-2 py-12 lg:px-8">
                    <form >
                        <div className="flex flex-col md:flex-row w-full md:space-x-5 space-y-5 md:space-y-0 items-end">
                            {/* warehouse*/}
                            <div className="flex-1 w-full">
                                <label className="block text-sm font-medium leading-6 text-gray-900 text-left whitespace-nowrap">Select warehouse <span className='text-red-500'>*</span></label>
                                <input
                                    id="warehouse"
                                    name="warehouse"
                                    value={quatationData.warehouse}
                                    disabled
                                    className="block w-full rounded-md pl-3 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                />
                                {error.username && <p className="text-red-500">{error.username}</p>}
                            </div>

                            {/* customer */}
                            <div className="flex-1 w-full">
                                <label className="block text-sm font-medium leading-6 text-gray-900 text-left whitespace-nowrap">Customer <span className='text-red-500'>*</span></label>
                                <input
                                    id="customer"
                                    name="customer"
                                    value={selectedCustomer}
                                    disabled
                                    required
                                    placeholder={"Search..."}
                                    className="block w-full rounded-md pl-3 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                />
                            </div>

                            {/*Date*/}
                            <div className="flex-1 w-full">
                                <label className="block text-sm font-medium leading-6 text-gray-900 text-left whitespace-nowrap">Date <span className='text-red-500'>*</span></label>
                                <input
                                    id="date"
                                    name="date"
                                    type="date"
                                    required
                                    value={selectedDate}
                                    onChange={handleDateChange}
                                    disabled
                                    autoComplete="given-name"
                                    className="block w-full rounded-md border- pl-5 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                />
                            </div>
                        </div>
                    </form>

                    <div>
                        {filteredProducts.length > 0 && (
                            <ul className="absolute left-0 z-10 ml-[82px] w-[1213px] bg-white border border-gray-300 rounded-md shadow-lg">
                                {filteredProducts.map((product) => (
                                    <li
                                        key={product._id}
                                        onClick={() => handleProductSelect(product, setSelectedProduct, setSearchTerm, setFilteredProducts)}
                                        className="cursor-pointer hover:bg-gray-100 px-4 py-4 text-left"
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
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variation Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock Qty</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchase Qty</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">tax</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sub Total</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                                </tr>
                            </thead>
                            {quatationProductData.length > 0 && (
                                <tbody>
                                    {quatationProductData.map((product, index) => (
                                        <tr key={index}>
                                            <td className="px-6 py-4 text-left whitespace-nowrap text-sm text-gray-500">
                                                {product.name}
                                            </td>

                                            <td className="px-6 py-4 text-left whitespace-nowrap text-sm text-gray-500">
                                                {product.variationValue ? product.variationValue : 'No Variation'}
                                            </td>

                                            <td className="px-6 py-4 whitespace-nowrap text-sm ">
                                                <p className='rounded-[5px] text-center p-[6px] bg-green-100 text-green-500'>{product.stockQty}</p>
                                            </td>

                                            <td className="px-6 py-4 text-left whitespace-nowrap text-sm text-gray-500">
                                                <div className="flex items-center">
                                                    <button
                                                        onClick={() => handleQtyChange(index, -1)} // Decrement
                                                        disabled={!(quatationProductData[index]?.quantity > 1)}
                                                        className="px-2 py-2 bg-gray-100 rounded hover:bg-gray-200"
                                                    >
                                                        <img className='w-[16px] h-[16px]' src={Decrease} alt='decrease' />
                                                    </button>

                                                    {/* Input field for direct quantity entry */}
                                                    <input
                                                        type="number"
                                                        value={quatationProductData[index]?.quantity ?? ''}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            if (val === '') {
                                                                // Allow clearing the field
                                                                setQuatationProductData(prev =>
                                                                    prev.map((item, i) =>
                                                                        i === index
                                                                            ? { ...item, quantity: '', subtotal: '0.00' }
                                                                            : item
                                                                    )
                                                                );
                                                            } else {
                                                                const newQty = parseInt(val, 10);
                                                                if (!isNaN(newQty) && newQty >= 1) {
                                                                    // Directly set the quantity instead of calculating delta
                                                                    const stockQty = quatationProductData[index]?.stockQty || 0;
                                                                    const clampedQty = Math.min(newQty, stockQty);

                                                                    setQuatationProductData(prev => {
                                                                        const discount = prev[index].discount || 0;
                                                                        const productPrice = prev[index].price || 0;
                                                                        const discountedPrice = Math.max(productPrice - discount, 0);
                                                                        const productTaxRate = prev[index].taxRate || 0;
                                                                        const taxType = prev[index]?.taxType || "inclusive";

                                                                        const baseSubtotal = discountedPrice * clampedQty;
                                                                        const taxAmount = taxType.toLowerCase() === "exclusive"
                                                                            ? productPrice * clampedQty * productTaxRate
                                                                            : 0;

                                                                        const newSubtotal = baseSubtotal + taxAmount;

                                                                        return prev.map((item, i) =>
                                                                            i === index
                                                                                ? { ...item, quantity: clampedQty, subtotal: newSubtotal.toFixed(2) }
                                                                                : item
                                                                        );
                                                                    });
                                                                }
                                                            }
                                                        }}
                                                        className="mx-2 w-16 py-[5px] text-center border rounded outline-none focus:ring-1 focus:ring-blue-100"
                                                        min="1"
                                                    />

                                                    <button
                                                        onClick={() => handleQtyChange(index, 1)} // Increment
                                                        disabled={!(quatationProductData[index]?.quantity < product.stockQty)}
                                                        className="px-2 py-2 bg-gray-100 rounded hover:bg-gray-200"
                                                    >
                                                        <img className='w-[16px] h-[16px] transform rotate-180' src={Decrease} alt='increase' />
                                                    </button>
                                                </div>
                                            </td>

                                            {/* Product Price */}
                                            <td className="px-6 py-4 text-left whitespace-nowrap text-sm text-gray-500">
                                                {currency} {product.price}
                                            </td>

                                            {/* Product Tax */}
                                            <td className="px-6 py-4 text-left whitespace-nowrap text-sm text-gray-500">
                                                {product.taxRate * 100} %  {/* Show a default if no tax is available */}
                                            </td>

                                            {/* Subtotal */}
                                            <td className="px-6 py-4 text-left whitespace-nowrap text-sm text-gray-500">
                                                {currency} {formatWithCustomCommas(product.subtotal)}
                                            </td>

                                            {/* Delete Action */}
                                            <td className="px-6 py-4 text-left whitespace-nowrap text-sm text-gray-500">
                                                <button
                                                    onClick={() => handleDelete(index)}
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 mt-60">
                            <div className="relative">
                                <label className="block text-left text-sm font-medium text-gray-700 mb-1">Discount Type:</label>
                                <select
                                    onChange={handleDiscountType}
                                    value={quatationData.discountType}
                                    className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                >
                                    <option value=''>Discount</option>
                                    <option value='fixed'>Fixed</option>
                                    <option value='percentage'>Percentage</option>
                                </select>
                            </div>
                            <div className='relative'>
                                <label className="block text-left text-sm font-medium text-gray-700 mb-1">Discount:</label>
                                <input
                                    onChange={handleDiscount}
                                    value={quatationData.discount}
                                    type="text"
                                    placeholder="Discount"
                                    className='block w-full rounded-md border-0 py-2.5 px-2 pr-10 text-gray-900 shadow-sm ring-1 ring-gray-400 placeholder:text-gray-400 focus:ring-gray-400 focus:outline-none sm:text-sm' />
                                <span className="absolute inset-y-0 right-0 flex items-end mb-2 pr-3 text-gray-500">
                                    {discountType === 'percentage' ? '%' : currency}
                                </span>
                            </div>
                            <div className="relative">
                                <label className="block text-left text-sm font-medium text-gray-700 mb-1">Tax:</label>
                                <input
                                    onChange={handleTax}
                                    value={quatationData.tax}
                                    type="text"
                                    placeholder="Tax"
                                    className="block w-full rounded-md border-0 py-2.5 px-2 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm"
                                />
                                <span className="absolute inset-y-0 right-0 flex items-end mb-2 pr-3 text-gray-500">
                                    %
                                </span>
                            </div>
                            <div className='relative'>
                                <label className="block text-left text-sm font-medium text-gray-700 mb-1">Shipping:</label>
                                <input
                                    onChange={handleShippng}
                                    value={quatationData.shipping}
                                    type="text"
                                    placeholder="Shipping"
                                    className='block w-full rounded-md border-0 py-2.5 px-2 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm' />
                                <span className="absolute inset-y-0 right-0 flex items-end mb-2 pr-3 text-gray-500">
                                    {currency}
                                </span>
                            </div>
                        </div>

                        {/* Order, Payment Status, and Payment Type Selects */}
                        <div>
                            <div className="flex justify-between gap-4 mt-10">
                                <div className='w-1/4'>
                                    <label className="text-left block text-sm font-medium text-gray-700">Service Charge Type:</label>
                                    <select
                                        value={serviceChargeType}
                                        onChange={handleServiceChargeType}
                                        className='block w-full rounded-md border-0 py-2.5 px-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm'
                                    >
                                        <option value="fixed">Fixed</option>
                                        <option value="percentage">Percentage</option>
                                    </select>
                                </div>

                                <div className='w-1/4'>
                                    <label className="text-left block text-sm font-medium text-gray-700">Service Charge: </label>
                                    <input
                                        onChange={handleServiceCharge}
                                        value={serviceCharge}
                                        type="text"
                                        placeholder="Service Charge"
                                        className='block w-full rounded-md border-0 py-2.5 px-2 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm' />
                                    <span className="absolute inset-y-0 right-0 flex items-end mb-2  pr-3 text-gray-500">
                                        {serviceChargeSymbol}
                                    </span>
                                </div>

                                <div className='w-1/4'>
                                    <label className="text-left block text-sm font-medium text-gray-700">Status: <span className='text-red-500'>*</span></label>
                                    <select
                                        value={quatationData.orderStatus}
                                        onChange={(e) => setOrderStatus(e.target.value)}
                                        className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm"
                                    >
                                        <option value="">Select Status</option>
                                        <option value="ordered">Sent</option>
                                        <option value="pending">Pending</option>
                                    </select>
                                </div>

                                {/* Payment Status Select */}
                                <div className='w-1/4 text-right'>
                                    <label className="text-left block text-sm font-medium text-gray-700">Payment Status: <span className='text-red-500'>*</span></label>
                                    <select
                                        value={paymentStatus}
                                        onChange={handlePaymentStatusChange}
                                        className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm"
                                    >
                                        <option value="">Select Status</option>
                                        <option value="paid">Paid</option>
                                        <option value="partial">Partial</option>
                                        <option value="unpaid">Unpaid</option>
                                    </select>
                                </div>
                            </div>


                            {/* Payment Type Select */}
                            <div className='mt-10 mb-14'>
                                <div>
                                    <label className="text-left block text-sm font-medium text-gray-700">
                                        Payment Type: <span className='text-red-500'>*</span>
                                    </label>
                                    <div className="space-y-2 mt-4 ml-4 sm:ml-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                                        {Object.keys(paymentType).map((type) => (
                                            <div key={type} className="flex items-center space-x-2 relative">
                                                <input
                                                    type="checkbox"
                                                    id={type}
                                                    checked={paymentType[type]}
                                                    disabled={paymentStatus === 'unpaid'}
                                                    onChange={() => handleCheckboxChange(type)}
                                                    className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                />
                                                <label htmlFor={type} className="text-sm text-gray-700 capitalize">{type.replace('_', ' ')}</label>
                                                {paymentType[type] && (
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            value={amounts[type]}
                                                            onChange={(e) => handleAmountChange(type, e.target.value)}
                                                            disabled={paymentStatus === 'unpaid'}
                                                            placeholder="Enter amount"
                                                            className="block w-32 rounded-md border-0 py-2.5 px-2 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-xs text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm"
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
                    </div>
                    <div className="mt-4 text-right text-lg font-semibold">
                        Balance: {currency} {formatWithCustomCommas(calculateBalance())}
                    </div>
                    <div className="mt-4 text-right text-lg font-semibold">
                        Total: {currency} {formatWithCustomCommas(calculateTotal())}
                    </div>
                    <div className="mt-4 text-right text-lg font-semibold">
                        profit: {currency} {formatWithCustomCommas(calculateProfitOfSale())}
                    </div>
                    <button
                        onClick={() => handleCreateSale(
                            quatationData._id,
                            calculateTotal(),
                            calculateProfitOfSale(),
                            quatationData.orderStatus,
                            paymentStatus,
                            paymentType,
                            amounts,
                            quatationData.shipping,
                            serviceCharge,
                            serviceChargeValue,
                            serviceChargeType,
                            quatationData.discountType,
                            quatationData.discount,
                            discountAmount,
                            quatationData.tax,
                            quatationData.warehouse,
                            selectedCustomer,
                            quatationProductData,
                            preFix,
                            setInvoiceNumber,
                            setError,
                            setResponseMessage,
                            setProgress,
                            navigate
                        )}
                        className="mt-5 submit w-[300px] text-white rounded py-2 px-4"
                    >
                        Create sale from Quotation
                    </button>

                    {/* Error and Response Messages */}
                    <div className='mt-10'>
                        {error && (
                            <p className="text-red-600 px-5 py-2 rounded-md bg-red-100 mt-5 text-center mx-auto max-w-sm">
                                {error}
                            </p>
                        )}
                        {responseMessage && (
                            <p className="text-color px-5 py-2 rounded-md bg-green-100 mt-5 text-center  mx-auto max-w-sminline-block">
                                {responseMessage}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div >
    );
}
export default CreateSaleFromQuatationBody;
