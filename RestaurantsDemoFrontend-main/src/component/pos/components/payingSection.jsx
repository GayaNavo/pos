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

import { useState, useEffect, useRef, } from "react";
import { fetchAllData } from "../utils/fetchAllData";
import axios from "axios";
import '../../../styles/login.css';
import { handleSave } from '../../sales/SaleController'
import { decryptData } from '../../utill/encryptionUtils';
import { useCurrency } from '../../../context/CurrencyContext';
import formatWithCustomCommas from '../../utill/NumberFormate';
import { useReactToPrint } from 'react-to-print';
import CircularProgress from '@mui/material/CircularProgress';
import { toast } from "react-toastify";

const PayingSection = ({ handlePopupClose, totalItems, totalPcs, profit, tax, shipping, serviceCharge, serviceChargeType, discount, discountValue, deliveryNote, productDetails, handleBillReset, setSelectedCategoryProducts, setSelectedBrandProducts, setSearchedProductData, setProductData, selectedCustomer, discountType, warehouse, responseMessage, setResponseMessage, setReloadStatus, offerPercentage, calculateTotalPrice, setError, setProgress, setSelectedOffer, setFetchRegData, orderId, setOrderId, serviceChargeValue, customerDisplayChannel }) => {
    const [receivedAmount, setReceivedAmount] = useState('');
    const [returnAmount, setReturnAmount] = useState('');
    const [paymentType, setPaymentType] = useState('cash');
    const [note, setNote] = useState('');
    const [paymentStatus, setPaymentStatus] = useState('paid');
    const printRef = useRef();
    const totalPrice = calculateTotalPrice();
    const [decryptedUser, setDecryptedUser] = useState(null);
    const [preFix, setPreFix] = useState('');
    const [loading, setLoading] = useState(false);
    const { currency } = useCurrency();
    const [invoiceData, setInvoiceData] = useState([]);
    const [printTrigger, setPrintTrigger] = useState(false);
    const [amounts, setAmounts] = useState({ cash: '', card: '', bank_transfer: '', });
    const [validationFailed, setValidationFailed] = useState(false);
    const [invoiceNumber, setInvoiceNumber] = useState(null);
    const [isPrintReady, setIsPrintReady] = useState(false);
    const [settings, setSettings] = useState({
        companyName: '',
        companyMobile: '',
        companyAddress: '',
        logo: '',
        email: '',
        currency: '',
    });
    const [showKotConfirm, setShowKotConfirm] = useState(false);
    const [kotNote, setKotNote] = useState('');
    const [orderType, setOrderType] = useState('Normal');
    const cashierUsername = sessionStorage.getItem('cashierUsername');
    const cashRegisterID = sessionStorage.getItem('cashRegisterID');
    const [isPayLoading, setIsPayLoading] = useState(false);


    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data } = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/getSettings`);
                setSettings({
                    companyName: data.companyName || '',
                    companyMobile: data.companyMobile || '',
                    companyAddress: data.address || '',
                    logo: data.logo || '',
                    email: data.email || '',
                    currency: data.currency || '',
                });
            } catch (error) {
                console.error("[DEBUG] Error fetching settings:", error);
            }
        };
        fetchSettings();
    }, []);

    const handleAmountChange = (type, value) => {
        setAmounts(prevState => {
            const updatedAmounts = {
                ...prevState,
                [type]: value
            };
            return updatedAmounts;
        });
    };

    const calculateTotalReceivedAmount = () => {
        const { cash, card, bank_transfer } = amounts;
        return parseFloat(cash || 0) + parseFloat(card || 0) + parseFloat(bank_transfer || 0);
    };

    const totalReceivedAmount = calculateTotalReceivedAmount();

    const calculateBalance = () => {
        const totalPrice = parseFloat(calculateTotalPrice()) || 0;
        const totalPaid = Object.values(amounts).reduce((acc, amount) => acc + (parseFloat(amount) || 0), 0);
        const balance = totalPrice - totalPaid;
        return isNaN(balance) ? "0.00" : balance.toFixed(2);
    };

    const validatePaymentStatus = () => {
        const totalPrice = parseFloat(calculateTotalPrice()) || 0;
        const totalPaid = Object.values(amounts).reduce((acc, amount) => acc + (parseFloat(amount) || 0), 0);
        const balance = totalPrice - totalPaid;
        const normalizedPaymentStatus = paymentStatus?.toLowerCase();

        if (normalizedPaymentStatus === 'paid' && balance > 0) {
            toast.error("Payment status is 'Paid', but there's still a balance remaining. Please adjust the payment amount.");
            setProgress(false);
            setValidationFailed(true);
            return false;
        }

        setValidationFailed(false);
        return true;
    };

    useEffect(() => {
        const totalAmount = calculateTotalPrice();
        const calculatedReturnAmount = totalReceivedAmount - totalAmount;
        setReturnAmount(calculatedReturnAmount.toFixed(2));
    }, [totalReceivedAmount, calculateTotalPrice]);

    useEffect(() => {
        if (customerDisplayChannel?.current) {
            customerDisplayChannel.current.postMessage({
                type: 'UPDATE_BILLING',
                payload: {
                    receivedAmount: totalReceivedAmount,
                    balance: parseFloat(returnAmount) || 0
                }
            });
        }
    }, [totalReceivedAmount, returnAmount, customerDisplayChannel]);

    const handlePrintAndClose = () => {
        setReloadStatus(true)
        setReceivedAmount('');
        setReturnAmount('');
        setPaymentType('cash');
        setNote('');
        setPaymentStatus('paid');
        handleBillReset();
        handlePopupClose();
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

    const updateProductQuantities = async (productDetails, shouldPrint = false, shouldPrintKOT = false, kotNoteText = '') => {
        try {
            setSelectedOffer('');
            const reStructuredProductDetails = productDetails.map(product => {
                const name = product.name;
                const isInventory = product.isInventory;
                const _id = product.currentID;
                const ptype = product.ptype;
                const discount = product.discount;
                const selectedVariation = product.variation;
                const price = product.price;
                const productCost = product.productCost || 0;
                const barcodeQty = product.qty || 1;
                const orderTax = product.tax;
                const taxType = product.taxType || 'inclusive'
                const specialDiscount = product.specialDiscount || 0;
                const offcialProduct = product.offcialProduct;

                return {
                    name,
                    _id,
                    isInventory,
                    ptype,
                    discount,
                    specialDiscount,
                    selectedVariation,
                    price,
                    productCost,
                    barcodeQty,
                    orderTax,
                    taxType,
                    offcialProduct
                };
            });

            const selectedProduct = reStructuredProductDetails;
            const paymentTypesArray = Object.keys(amounts).reduce((acc, type) => {
                if (Number(amounts[type]) > 0) {
                    acc[type] = amounts[type];
                }
                return acc;
            }, {});

            const result = await handleSave(
                calculateTotalPrice(),
                profit,
                "ordered",
                'paid',
                paymentTypesArray,
                amounts,
                shipping,
                serviceCharge,
                serviceChargeValue,
                serviceChargeType,
                discountType,
                discount,
                discountValue,
                deliveryNote,
                tax,
                warehouse ? warehouse : 'Unknown',
                selectedCustomer ? selectedCustomer : 'Walk-in Customer',
                selectedProduct,
                preFix,
                offerPercentage,
                setInvoiceNumber,
                setResponseMessage,
                setError,
                setProgress,
                setInvoiceData,
                note,
                calculateBalance(),
                handlePrintAndClose,
                shouldPrint,
                shouldPrintKOT,
                cashierUsername,
                cashRegisterID,
                setFetchRegData,
                orderId,
                setOrderId,
                orderType,
                kotNoteText
            );
            await fetchAllData(setProductData, setSelectedCategoryProducts, setSelectedBrandProducts, setSearchedProductData, setLoading, setError);
            return;
        } catch (error) {
            console.error('Error updating product quantities:', error);
        }
    };

    const handleSubmitPayment = async (shouldPrint, shouldPrintKOT = false, kotNoteText = '') => {

        // show loader immediately
        setIsPayLoading(true);

        // validation fails → stop loader
        if (!validatePaymentStatus()) {
            setIsPayLoading(false);
            return;
        }

        try {
            await updateProductQuantities(productDetails, shouldPrint, shouldPrintKOT, kotNoteText);

            if (shouldPrint) {
                // The printing (silent or fallback) is handled inside handleSave (called via updateProductQuantities)
            } else {
                handlePopupClose();
                await fetchAllData(
                    setProductData,
                    setSelectedCategoryProducts,
                    setSelectedBrandProducts,
                    setSearchedProductData,
                    setLoading,
                    setError
                );
            }

            setSelectedOffer('');
        } catch (error) {
            console.error('Error updating product quantities:', error);
        }

        // hide loader when everything finishes
        setIsPayLoading(false);
    };

    const handlePrint = useReactToPrint({
        content: () => printRef.current,
        onBeforeGetContent: () => {
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve();
                }, 300);
            });
        },
        onAfterPrint: () => {
            setPrintTrigger(false);
            handlePopupClose();
        }
    });

    useEffect(() => {
        if (invoiceData.invoiceNumber && printTrigger) {
            const observer = new MutationObserver((mutationsList) => {
                console.log('MutationObserver triggered', mutationsList);
                setIsPrintReady(true);
                observer.disconnect();
            });

            if (printRef.current) {
                observer.observe(printRef.current, {
                    childList: true,
                    subtree: true,
                    characterData: true,
                });
            } else {
                console.warn('printRef.current is null!');
            }
            return () => observer.disconnect();
        }
    }, [invoiceData, printTrigger]);

    useEffect(() => {
        if (invoiceData.invoiceNumber && printTrigger) {
            const timeout = setTimeout(() => {
                handlePrint();
            }, 300);
            return () => clearTimeout(timeout);
        }
    }, [invoiceData, printTrigger]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-2 sm:p-4">
            <div className="bg-white w-full max-w-[1250px] h-auto max-h-[95vh] overflow-y-auto p-4 md:p-5 lg:p-6 rounded-md shadow-lg z-50
                           md:w-[85vw] md:max-w-[650px] md:h-auto
                           lg:w-[90vw] lg:max-w-[1000px] lg:h-auto
                           xl:w-[85vw] xl:max-w-[1250px]">
                <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Make Payment</h2>
                <div className="flex flex-col lg:flex-row mt-4 gap-6">
                    <div className="w-full lg:w-auto lg:flex-1">
                        <div className='flex flex-col sm:flex-row gap-4'>
                            <div className="w-full sm:w-auto sm:flex-1">
                                <label className="block text-sm font-medium leading-6 text-gray-900">Paying Amount:</label>
                                <input
                                    type="text"
                                    placeholder="Paying Amount"
                                    value={calculateTotalPrice()}
                                    className="block w-full sm:w-[280px] lg:w-[320px] rounded-md border-0 py-2.5 px-3 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm"
                                    readOnly
                                />
                            </div>
                            <div className="w-full sm:w-auto sm:flex-1">
                                <label className="block text-sm font-medium leading-6 text-gray-900">Payment Status:</label>
                                <select
                                    value={paymentStatus}
                                    onChange={(e) => setPaymentStatus(e.target.value)}
                                    className="block w-full sm:w-[280px] lg:w-[320px] sm:ml-0 lg:ml-4 rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                >
                                    <option>Paid</option>
                                    {/* <option>Unpaid</option> */}
                                </select>
                            </div>
                        </div>
                        <div className="w-full text-center mt-6">
                            <label className="text-sm font-medium leading-6 text-gray-900 mb-2 text-left">
                                Payment Type:
                            </label>
                        </div>
                        <div className="w-full">
                            <div className="bg-gray-100 border border-gray-400 shadow-md rounded-lg p-4">
                                <h2 className="text-lg text-gray-800 mb-3">Add Payment Details</h2>
                                <table className="w-full border border-gray-300 rounded-lg bg-white shadow-sm">
                                    <tbody>
                                        {['cash', 'card', 'bank_transfer'].map((type, index) => (
                                            <tr key={index} className="border-t border-gray-300 hover:bg-gray-100">
                                                <td className="px-4 py-3 font-medium text-sm text-gray-700 border border-gray-300 bg-gray-200">
                                                    {type === 'cash' ? 'Cash' : type === 'card' ? 'Card' : 'Bank Transfer'}
                                                </td>
                                                <td className="px-4 py-2 border border-gray-300">
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            value={amounts[type]}
                                                            onChange={(e) => handleAmountChange(type, e.target.value)}
                                                            placeholder="Enter amount"
                                                            className="block w-full rounded-md border-0 py-2.5 px-3 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-500 focus:outline-none sm:text-sm"
                                                        />
                                                        <span className="absolute inset-y-0 right-3 flex items-center text-sm text-gray-400">
                                                            {currency}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}

                                        {/* Balance Field Row */}
                                        <tr className="border-t border-gray-300 hover:bg-gray-100">
                                            <td colSpan="2" className="px-4 py-3 text-right font-semibold text-sm text-gray-700 border border-gray-300">
                                                Balance: {currency} {formatWithCustomCommas(calculateBalance())}
                                            </td>
                                        </tr>

                                        {/* Note Field Row */}
                                        <tr className="border-t border-gray-300 hover:bg-gray-100">
                                            <td className="px-4 py-3 font-medium text-sm text-gray-700 border border-gray-300 bg-gray-200 align-top">
                                                Note
                                            </td>
                                            <td className="px-4 py-2 border border-gray-300">
                                                <textarea
                                                    value={note}
                                                    onChange={(e) => setNote(e.target.value)}
                                                    placeholder="Enter any additional notes..."
                                                    className="block w-full h-[50px] rounded-md border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-500 focus:outline-none sm:text-sm"
                                                />
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div className='mt-0 lg:ml-8 w-full lg:w-[450px] xl:w-[520px]'>
                        <label className="block text-sm font-medium leading-6 text-gray-900 mb-4">Summary of Sale:</label>
                        <table className="w-full border border-gray-300 rounded-lg">
                            <tbody>
                                <tr className="border-t border-gray-300">
                                    <td className="px-3 py-2 text-sm text-left text-gray-600 border border-gray-300">Total Products</td>
                                    <td className="px-3 py-2 text-sm text-left text-gray-600 border border-gray-300">{totalItems}</td>
                                </tr>
                                <tr className="border-t border-gray-300">
                                    <td className="px-3 py-2 text-sm text-left text-gray-600 border border-gray-300">Total Amount</td>
                                    <td className="px-3 py-2 text-sm text-left text-gray-600 border border-gray-300">{currency}{' '}{formatWithCustomCommas(calculateTotalPrice())}</td>
                                </tr>
                                <tr className="border-t border-gray-300">
                                    <td className="px-3 py-2 text-sm text-left text-gray-600 border border-gray-300">Order Tax</td>
                                    <td className="px-3 py-2 text-sm text-left text-gray-600 border border-gray-300">{tax} % </td>
                                </tr>
                                <tr className="border-t border-gray-300">
                                    <td className="px-3 py-2 text-sm text-left text-gray-600 border border-gray-300">Discount</td>
                                    <td className="px-3 py-2 text-sm text-left text-gray-600 border border-gray-300">
                                        {discountType === 'fixed' ? `${currency} ${discount}` : `${discount}%`}
                                    </td>
                                </tr>

                                <tr className="border-t border-gray-300">
                                    <td className="px-3 py-2 text-sm text-left text-gray-600 border border-gray-300">Shipping</td>
                                    <td className="px-3 py-2 text-sm text-left text-gray-600 border border-gray-300">{currency}{' '}{shipping}</td>
                                </tr>
                                <tr className="border-t border-gray-300">
                                    <td className="px-3 py-2 text-sm text-left text-gray-600 border border-gray-300">Service Charge</td>
                                    <td className="px-3 py-2 text-sm text-left text-gray-600 border border-gray-300">
                                        {serviceChargeType === 'fixed' ? `${currency} ${serviceCharge}` : `${serviceCharge}%`}
                                    </td>
                                </tr>
                                <tr className="border-t border-gray-300">
                                    <td className="px-3 py-2 text-sm text-left text-gray-600 border border-gray-300">Grand Total</td>
                                    <td className="px-3 py-2 text-sm text-left text-gray-600 border border-gray-300">{currency}{' '}{formatWithCustomCommas(calculateTotalPrice())}</td>
                                </tr>
                            </tbody>
                        </table>

                        <div className='mt-6 text-center'>
                            <label className="block text-sm font-medium leading-6 text-gray-900 mb-2">Order Type:</label>
                            <div className="flex flex-row gap-6 justify-center">
                                <label className="flex items-center cursor-pointer px-4 py-2">
                                    <input
                                        type="radio"
                                        name="orderType"
                                        value="Normal"
                                        checked={orderType === 'Normal'}
                                        onChange={(e) => setOrderType(e.target.value)}
                                        className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500"
                                    />
                                    <span className="ml-3 text-sm text-gray-700">Normal</span>
                                </label>
                                <label className="flex items-center cursor-pointer px-4 py-2">
                                    <input
                                        type="radio"
                                        name="orderType"
                                        value="PickMe"
                                        checked={orderType === 'PickMe'}
                                        onChange={(e) => setOrderType(e.target.value)}
                                        className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500"
                                    />
                                    <span className="ml-3 text-sm text-gray-700">PickMe</span>
                                </label>
                                <label className="flex items-center cursor-pointer px-4 py-2">
                                    <input
                                        type="radio"
                                        name="orderType"
                                        value="Uber"
                                        checked={orderType === 'Uber'}
                                        onChange={(e) => setOrderType(e.target.value)}
                                        className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500"
                                    />
                                    <span className="ml-3 text-sm text-gray-700">Uber</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons - Moved to bottom */}
                <div className="mt-6 border-t pt-4">
                    <div className='flex flex-wrap gap-3 justify-start lg:justify-start'>
                        <button
                            className="px-4 py-2 text-sm bg-gray-500 text-white rounded-md"
                            onClick={handlePopupClose}
                            type="button"
                        >
                            Cancel
                        </button>

                        <button
                            className="px-4 py-2 text-sm button-bg-color text-white rounded-md disabled:opacity-50"
                            onClick={() => handleSubmitPayment(false)}
                            type="button"
                            disabled={isPayLoading}
                        >
                            {isPayLoading ? "Processing..." : "Submit Payment"}
                        </button>

                        <button
                            className="px-4 py-2 text-sm button-bg-color text-white rounded-md disabled:opacity-50"
                            onClick={() => setShowKotConfirm(true)}
                            type="button"
                            disabled={isPayLoading}
                        >
                            {isPayLoading ? "Processing..." : "Submit & Print Bill"}
                        </button>
                    </div>
                </div>

                {isPayLoading && (
                    <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
                        <CircularProgress />
                    </div>
                )}

                <div className="flex relative justify-center mt-4 ml-0 mr-0 text-center">
                    {responseMessage && (
                        <p className="text-color px-5 py-2 text-sm rounded-md bg-green-100 mt-5 text-center mx-auto max-w-sm inline-block">
                            {responseMessage}
                        </p>
                    )}
                </div>
            </div>
            {showKotConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
                    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg w-full max-w-[350px] sm:max-w-[450px] text-center">
                        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Do you want to print the KOT bill too?</h3>
                        <div className="mb-4">
                            <textarea
                                value={kotNote}
                                onChange={(e) => setKotNote(e.target.value)}
                                placeholder="Add any special instructions or notes for the kitchen..."
                                rows={3}
                                className="block w-full rounded-lg border border-gray-300 py-2 px-3 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:ring-2 focus:ring-gray-200 focus:border-gray-200 focus:outline-none transition-colors resize-none text-left"
                            />
                        </div>
                        <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-4">
                            <button
                                className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-gray-500 text-white rounded-md"
                                onClick={() => {
                                    setShowKotConfirm(false);
                                    setKotNote('');
                                    handleSubmitPayment(true, false);
                                }}
                            >
                                No, Just Print Bill
                            </button>
                            <button
                                className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm submit text-white rounded-md"
                                onClick={() => {
                                    const noteText = kotNote.trim();
                                    setShowKotConfirm(false);
                                    setKotNote('');
                                    handleSubmitPayment(true, true, noteText);
                                }}
                            >
                                Yes, Print KOT Too
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default PayingSection;
