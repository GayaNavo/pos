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

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { handleProductSelect } from '../sales/SaleController'
import { handleUpdateQuatation } from './QuatationController'
import '../../styles/role.css';
import { Link, useNavigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import Decrease from '../../img/down-arrow (1).png'
import Loader from '../utill/Loader';
import { useCurrency } from '../../context/CurrencyContext';
import formatWithCustomCommas from '../utill/NumberFormate';
import { toast } from 'react-toastify';

function EditQuatationBody() {
    // State management
    const { currency } = useCurrency()
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState([]);
    const [discountType, setDiscountType] = useState('');
    const [error, setError] = useState('');
    const [responseMessage, setResponseMessage] = useState('');
    const [orderStatus, setOrderStatus] = useState('');
    const [paymentStatus, setPaymentStatus] = useState('');
    const [paymentType, setPaymentType] = useState('');
    const [serviceChargeValue, setServiceChargeValue] = useState(0);
    const [quatationData, setQuatationData] = useState([])
    const [quatationProductData, setQuatationProductData] = useState([])
    const [selectedDate, setSelectedDate] = useState('');
    const [progress, setProgress] = useState(false);
    const { id } = useParams();
    const navigate = useNavigate();

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
                setDiscountType(response.data.discountType);
            } catch (error) {
                console.error('Error fetching sale by ID:', error.response ? error.response.data : error.message);
                setError('Cannot get sale by Id.');
            }
            finally {
                setProgress(false);
            }
        };
        if (id) {
            findSaleById();
        }
    }, [id]);

    const calculateTotal = () => {
        const subtotal = quatationProductData.reduce((acc, product, index) => {
            const productQty = quatationProductData[index]?.quantity === '' ? 0 : (Number(quatationProductData[index]?.quantity) || 0);
            const productTaxRate = quatationProductData[index]?.taxRate || 0;
            const discount = quatationProductData[index]?.discount || 0;
            const productPrice = quatationProductData[index]?.price || 0;
            const discountedPrice = Math.max(productPrice - discount, 0);

            const taxType = product?.taxType || "inclusive";
            const baseSubtotal = discountedPrice * productQty;
            const taxAmount =
                taxType.toLowerCase() === "exclusive"
                    ? productPrice * productQty * productTaxRate
                    : 0;

            const productSubtotal = baseSubtotal + taxAmount;
            return acc + productSubtotal;
        }, 0);

        const discountAmount = quatationData.discountType === 'percentage'
            ? subtotal * (quatationData.discount / 100)
            : quatationData.discount || 0;

        const shipping = parseFloat(quatationData.shipping) || 0;

        // Calculate service charge based on type
        let serviceCharge = 0;
        const serviceChargeType = quatationData.serviceChargeType || 'fixed';
        if (serviceChargeType === 'fixed') {
            serviceCharge = parseFloat(quatationData.serviceCharge) || 0;
        } else if (serviceChargeType === 'percentage') {
            serviceCharge = (subtotal * (parseFloat(quatationData.serviceCharge) || 0)) / 100;
        }

        const overallTaxRate = quatationData.tax ? parseFloat(quatationData.tax) / 100 : 0;
        const taxAmount = subtotal * overallTaxRate;
        const total = (subtotal - discountAmount) + taxAmount + shipping + serviceCharge;
        return total.toFixed(2);
    };

    const calculateSubtotal = () => {
        return quatationProductData.reduce((acc, product, index) => {
            const productQty = quatationProductData[index]?.quantity === '' ? 0 : (Number(quatationProductData[index]?.quantity) || 0);
            const productTaxRate = quatationProductData[index]?.taxRate || 0;
            const discount = quatationProductData[index]?.discount || 0;
            const productPrice = quatationProductData[index]?.price || 0;
            const discountedPrice = Math.max(productPrice - discount, 0);

            const taxType = product?.taxType || "inclusive";
            const baseSubtotal = discountedPrice * productQty;
            const taxAmount =
                taxType.toLowerCase() === "exclusive"
                    ? productPrice * productQty * productTaxRate
                    : 0;

            const productSubtotal = baseSubtotal + taxAmount;
            return acc + productSubtotal;
        }, 0);
    };

    useEffect(() => {
        const subtotal = calculateSubtotal();
        let calculatedServiceCharge = 0;
        const serviceChargeType = quatationData.serviceChargeType || 'fixed';
        if (serviceChargeType === 'fixed') {
            calculatedServiceCharge = parseFloat(quatationData.serviceCharge) || 0;
        } else if (serviceChargeType === 'percentage') {
            calculatedServiceCharge = (subtotal * (parseFloat(quatationData.serviceCharge) || 0)) / 100;
        }
        setServiceChargeValue(parseFloat(calculatedServiceCharge.toFixed(2)));
    }, [quatationData.serviceCharge, quatationData.serviceChargeType, quatationProductData]);

    useEffect(() => {
        if (quatationData.date) {
            const formattedDate = new Date(quatationData.date).toISOString().slice(0, 10);
            setSelectedDate(formattedDate);
        }
    }, [quatationData.date]);

    const handleDateChange = (e) => {
        setSelectedDate(e.target.value);
    };

    const handleOrderStatusChange = (e) => {
        const newOrderStatus = e.target.value;
        setOrderStatus(newOrderStatus);
        setQuatationData((prevData) => ({
            ...prevData,
            orderStatus: newOrderStatus,
        }));
    };

    const handlePaymentTypeChange = (e) => {
        const newPaymentType = e.target.value;
        setPaymentType(newPaymentType);
        setQuatationData((prevData) => ({
            ...prevData,
            paymentType: newPaymentType,
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

        // Update the saleProduct state with the new discount value
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

    const handleServiceCharge = (e) => {
        setQuatationData({ ...quatationData, serviceCharge: e.target.value });
    };

    const handleServiceChargeType = (e) => {
        setQuatationData({ ...quatationData, serviceChargeType: e.target.value });
    };

    const handleNoteChange = (e) => {
        setQuatationData({
            ...quatationData,
            note: e.target.value,
        });
    };


    const handleQtyChange = (index, delta) => {
        setQuatationProductData(prev => {
            const item = prev[index];
            if (!item) return prev;
            const currentQty = item.quantity === '' || isNaN(item.quantity) ? 0 : Number(item.quantity);
            const stockQty = Number(item.stockQty) || 0;

            let newQty = currentQty + delta;
            newQty = Math.max(1, Math.min(newQty, stockQty));

            const price = Number(item.price) || 0;
            const discount = Number(item.discount) || 0;
            const discountedPrice = Math.max(price - discount, 0);

            const taxRate = Number(item.taxRate) || 0;
            const taxType = (item.taxType || 'inclusive').toLowerCase();

            const baseSubtotal = discountedPrice * newQty;
            const taxAmount = taxType === 'exclusive' ? price * newQty * taxRate : 0;
            const newSubtotal = (baseSubtotal + taxAmount).toFixed(2);

            return prev.map((p, i) =>
                i === index ? { ...p, quantity: newQty, subtotal: newSubtotal } : p
            );
        });
    };

    const handleQtyInputChange = (index, rawValue) => {
        if (rawValue === '') {
            setQuatationProductData(prev =>
                prev.map((p, i) =>
                    i === index
                        ? { ...p, quantity: '', subtotal: '0.00' }
                        : p
                )
            );
            return;
        }

        const parsed = Number(rawValue);

        if (isNaN(parsed) || parsed < 1) {
            toast.error('Quantity must be a number greater than 0.', {
                autoClose: 2000,
                className: 'custom-toast',
            });
            setQuatationProductData(prev => {
                const item = prev[index];
                if (!item) return prev;

                const price = Number(item.price) || 0;
                const discount = Number(item.discount) || 0;
                const discountedPrice = Math.max(price - discount, 0);
                const taxRate = Number(item.taxRate) || 0;
                const taxType = (item.taxType || 'inclusive').toLowerCase();

                const baseSubtotal = discountedPrice * 1;
                const taxAmount = taxType === 'exclusive' ? price * 1 * taxRate : 0;
                const newSubtotal = (baseSubtotal + taxAmount).toFixed(2);

                return prev.map((p, i) =>
                    i === index
                        ? { ...p, quantity: 1, subtotal: newSubtotal }
                        : p
                );
            });
            return;
        }

        // Valid number
        setQuatationProductData(prev => {
            const item = prev[index];
            if (!item) return prev;

            const stockQty = Number(item.stockQty) || 0;
            const newQty = Math.min(parsed, stockQty);

            const price = Number(item.price) || 0;
            const discount = Number(item.discount) || 0;
            const discountedPrice = Math.max(price - discount, 0);
            const taxRate = Number(item.taxRate) || 0;
            const taxType = (item.taxType || 'inclusive').toLowerCase();

            const baseSubtotal = discountedPrice * newQty;
            const taxAmount = taxType === 'exclusive' ? price * newQty * taxRate : 0;
            const newSubtotal = (baseSubtotal + taxAmount).toFixed(2);

            return prev.map((p, i) =>
                i === index
                    ? { ...p, quantity: newQty, subtotal: newSubtotal }
                    : p
            );
        });
    };

    const handleDelete = async (quatationID, productID) => {
        if (!quatationID || !productID) {
            toast.error("Invalid quotation or product ID.");
            return;
        }

        const total = calculateTotal();
        try {
            const confirmDelete = window.confirm("Are you sure you want to delete this item?");
            if (!confirmDelete) return;

            const response = await axios.delete(
                `${process.env.REACT_APP_BASE_URL}/api/deleteProductFromQuatation`,
                { params: { quatationID, productID, total } }
            );

            if (response.status === 200) {
                toast.error("Item deleted successfully!");
            } else {
                toast.error("Failed to delete the item.");
            }
        } catch (error) {
            console.error("Error deleting item:", error);
            setError('Error deleting the item');

            if (error.response) {
                toast.error(`Failed to delete item: ${error.response.data.message || 'Unknown server error'}`);
            } else if (error.request) {
                toast.error("No response from the server. Please check your network connection.");
            } else {
                toast.error(`Unexpected error: ${error.message}`);
            }
        }
    };

    useEffect(() => {
        if (quatationData.paymentStatus === 'unpaid') {
            setPaymentType('');
            setQuatationData(prevData => ({
                ...prevData,
                paymentType: '',
            }));
        }
    }, [quatationData.paymentStatus]);

    const handlePaymentStatusChange = (e) => {
        const newPaymentStatus = e.target.value;
        setPaymentStatus(newPaymentStatus);
        setQuatationData((prevData) => ({
            ...prevData,
            paymentStatus: newPaymentStatus,
        }));

        if (newPaymentStatus === 'unpaid') {
            setPaymentType('');
            setQuatationData(prevData => ({
                ...prevData,
                paymentType: '',
            }));
        }
    };

    return (
        <div className='background-white relative left-[18%] w-[82%] min-h-[100vh] p-5'>
            {progress && (
                <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-white/80 z-50">
                    <Loader />
                </div>
            )}
            <div className='flex justify-between mt-20 items-center'>
                <div>
                    <h2 className="text-lightgray-300  m-0 p-0 text-2xl">Edit Quatation</h2>
                </div>
                <div>
                    <Link className='px-4 py-1.5 border border-[#35AF87] text-[#35AF87] rounded-md transition-colors duration-300 hover:bg-[#35AF87] hover:text-white' to={'/viewQuotation'}>Back</Link>
                </div>
            </div>
            <div className="bg-white mt-[20px] w-full rounded-2xl px-8 shadow-md">
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
                                >
                                </input>
                                {error.username && <p className="text-red-500">{error.username}</p>}
                            </div>

                            {/* customer */}
                            <div className="flex-1 w-full">
                                <label className="block text-sm font-medium leading-6 text-gray-900 text-left whitespace-nowrap">Customer <span className='text-red-500'>*</span></label>
                                <input
                                    id="customer"
                                    name="customer"
                                    disabled
                                    value={quatationData.customer}
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
                                    autoComplete="given-name"
                                    disabled
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
                                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock Qty</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchase Qty</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">tax</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variation Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sub Total</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                                </tr>
                            </thead>
                            {quatationProductData.length > 0 && (
                                <tbody>
                                    {quatationProductData.map((product, index) => (
                                        <tr key={index}>
                                            <td className="px-2 py-4 text-left whitespace-nowrap text-sm text-gray-500">
                                                {product.name}
                                            </td>

                                            <td className="px-2 py-4 text-left whitespace-nowrap text-sm ">
                                                <p className='rounded-[5px] text-center p-[6px] bg-green-100 text-green-500'>{product.stockQty}</p>
                                            </td>

                                            <td className="px-4 py-4 text-left whitespace-nowrap text-sm text-gray-500">
                                                <div className="flex items-center justify-center space-x-2 min-w-[140px]">
                                                    {/* Decrease button */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleQtyChange(index, -1)}
                                                        disabled={quatationProductData[index]?.quantity <= 1}
                                                        className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
                                                    >
                                                        <img className="w-4 h-4" src={Decrease} alt="decrease" />
                                                    </button>

                                                    {/* Editable quantity input */}
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max={product.stockQty}
                                                        value={quatationProductData[index]?.quantity ?? ''}
                                                        onChange={(e) => handleQtyInputChange(index, e.target.value)}
                                                        className="w-14 py-1 text-center border border-gray-300 rounded outline-none focus:ring-1 focus:ring-gray-300"
                                                    />


                                                    {/* Increase button */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleQtyChange(index, 1)}
                                                        disabled={quatationProductData[index]?.quantity >= product.stockQty}
                                                        className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
                                                    >
                                                        <img className="w-4 h-4 transform rotate-180" src={Decrease} alt="increase" />
                                                    </button>
                                                </div>
                                            </td>

                                            {/* Product Price */}
                                            <td className="px-6 text-left py-4 whitespace-nowrap text-sm text-gray-500">
                                                {currency} {product.price}
                                            </td>

                                            {/* Product Tax */}
                                            <td className="px-6 text-left py-4 whitespace-nowrap text-sm text-gray-500">
                                                {product.taxRate * 100} %
                                            </td>

                                            <td className="px-6 py-4 text-left whitespace-nowrap text-sm text-gray-500">
                                                {currency} {formatWithCustomCommas(product.discount)}
                                            </td>


                                            <td className="px-6 py-4 text-left whitespace-nowrap text-sm text-gray-500">
                                                {product.variationValue ? product.variationValue : 'No Variation'}
                                            </td>

                                            {/* Subtotal */}
                                            <td className="px-6 text-left py-4 whitespace-nowrap text-sm text-gray-500">
                                                {currency} {formatWithCustomCommas(product.subtotal)}
                                            </td>

                                            {/* Delete Action */}
                                            <div className='flex justify-end'>
                                                <td className="px-6 justify-end py-4 whitespace-nowrap text-sm text-gray-500">
                                                    <button
                                                        onClick={() => handleDelete(id, product.currentID)}
                                                        className="text-red-500 hover:text-red-700 font-bold py-1 px-2"
                                                    >
                                                        <i className="fas fa-trash mr-1"></i>
                                                    </button>
                                                </td>
                                            </div>
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
                            <div>
                                <label className="block text-left text-sm font-medium text-gray-700 mb-1">Service Type:</label>
                                <select
                                    onChange={handleServiceChargeType}
                                    value={quatationData.serviceChargeType || 'fixed'}
                                    className='block w-full rounded-md border-0 py-2.5 px-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm'
                                >
                                    <option value="fixed">Fixed</option>
                                    <option value="percentage">Percentage</option>
                                </select>
                            </div>
                            <div className='relative'>
                                <label className="block text-left text-sm font-medium text-gray-700 mb-1">Service Charge:</label>
                                <input
                                    onChange={handleServiceCharge}
                                    value={quatationData.serviceCharge}
                                    type="text"
                                    placeholder="Service"
                                    className='block w-full rounded-md border-0 py-2.5 px-2 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm' />
                                <span className="absolute inset-y-0 right-0 flex items-end mb-2 pr-3 text-gray-500">
                                    {(quatationData.serviceChargeType || 'fixed') === 'fixed' ? currency : '%'}
                                </span>
                            </div>
                        </div>

                        {/* Order, Payment Status, and Payment Type Selects */}
                        <div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
                                <div>
                                    <label className="block text-left text-sm font-medium text-gray-700 mb-1">Status: <span className='text-red-500'>*</span></label>
                                    <select
                                        value={quatationData.orderStatus}
                                        onChange={handleOrderStatusChange}
                                        className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm"
                                    >
                                        <option value="">Select Status</option>
                                        <option value="ordered">Ordered</option>
                                        <option value="pending">Pending</option>
                                    </select>
                                </div>

                                {/* Payment Status Select */}
                                <div>
                                    <label className="block text-left text-sm font-medium text-gray-700 mb-1">Payment Status: <span className='text-red-500'>*</span></label>
                                    <select
                                        value={quatationData.paymentStatus}
                                        onChange={handlePaymentStatusChange}
                                        className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm"
                                    >
                                        <option value="">Select Status</option>
                                        <option value="paid">Paid</option>
                                        <option value="unpaid">Unpaid</option>
                                    </select>
                                </div>

                                {/* Payment Type Select */}
                                <div>
                                    <label className="block text-left text-sm font-medium text-gray-700 mb-1">Payment Type: <span className='text-red-500'>*</span></label>
                                    <select
                                        value={quatationData.paymentType}
                                        onChange={handlePaymentTypeChange}
                                        disabled={quatationData.paymentStatus !== 'paid'}
                                        className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm"
                                    >
                                        <option value="">Select Type</option>
                                        <option value="cash">Cash</option>
                                        <option value="card">Card</option>
                                        <option value="check">Check</option>
                                        <option value="bank_transfer">Bank Transfer</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="w-full mt-10">
                            <label className="block text-left text-sm font-medium text-gray-700 mb-1">
                                Note
                            </label>

                            <textarea
                                value={quatationData.note || ""}
                                onChange={handleNoteChange}
                                placeholder="Add some note about your quotation..."
                                rows={4}
                                className="block w-full rounded-md border-0 py-2.5 px-2 
    text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 
    placeholder:text-gray-400 focus:ring-2 focus:ring-inset 
    focus:ring-gray-400 focus:outline-none sm:text-sm
    resize-none text-left align-top leading-5"
                            />
                        </div>

                    </div>
                    <div className="mt-4 text-right text-lg font-semibold">
                        Total: {currency} {formatWithCustomCommas(calculateTotal())}
                    </div>
                    <button
                        onClick={() => handleUpdateQuatation(id, calculateTotal(), quatationData.orderStatus, quatationData.paymentStatus, quatationData.paidAmount, quatationData.paymentType, quatationData.shipping, quatationData.serviceCharge, serviceChargeValue, quatationData.serviceChargeType || 'fixed', quatationData.discountType, quatationData.discount, quatationData.tax, quatationData.warehouse, quatationData.selectedCustomer, quatationData.note, quatationProductData, setError, setResponseMessage, setProgress, navigate)}
                        className="mt-5 submit w-[200px] text-white rounded py-2 px-4"
                    >
                        Update & Save
                    </button>

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
        </div>
    );
}
export default EditQuatationBody;
