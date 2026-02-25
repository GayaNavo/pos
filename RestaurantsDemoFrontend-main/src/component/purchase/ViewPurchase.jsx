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

import { useState, useEffect, useRef, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Loader from '../utill/Loader';
import '../../styles/role.css';
import { usePDF } from 'react-to-pdf';
import PaginationDropdown from '../utill/Pagination';
import { toast } from 'react-toastify';
import ConfirmationModal from '../common/deleteConfirmationDialog';
import formatWithCustomCommas from '../utill/NumberFormate';
import { useCurrency } from '../../context/CurrencyContext';
import { UserContext } from '../../context/UserContext';
import { useSidebar } from '../../context/SidebarContext';

function ViewPurchaseBody() {
    // State variables
    const { currency } = useCurrency()
    const { sidebarHidden, hideSidebar, showSidebar } = useSidebar();
    const [purchasedData, setPuchasedData] = useState([]);
    const [keyword, setKeyword] = useState('');
    const [amountToPay, setAmountToPay] = useState(0);
    const [searchedSuplierPurchased, setSearchedSuplierPurchased] = useState(null);
    const [loading, setLoading] = useState(false);
    const [openPopupId, setOpenPopupId] = useState(null);
    const [paymentType, setPaymentType] = useState('cash');
    const popupRef = useRef(null);
    const [error, setError] = useState('');
    const [successStatus, setSuccessStatus] = useState('');
    const [openViewSale, setOpenViewSale] = useState(null);
    const [page, setPage] = useState(1);
    const [size, setSize] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);  // State for controlling modal visibility
    const [purchaseToDelete, setPurchaseToDelete] = useState(null);
    const [saleToDelete, setSaleToDelete] = useState(null);
    const [currentDate] = useState(new Date().toISOString().slice(0, 10));
    const debounceTimeout = useRef(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [email, setEmail] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [paymentData, setPaymentData] = useState([]);
    const [openViewPayment, setViewPayment] = useState(null);
    const [openEditPopup, setEditPopup] = useState(false);
    const [payingAmount, setPayingAmount] = useState('');
    const [companyMobile, setCompanyMobile] = useState('');
    const [address, setAddress] = useState('');
    const [response, setResponse] = useState('')
    const { toPDF, targetRef } = usePDF({ filename: `${purchasedData.supplier || 'invoice'}.pdf` });

    //COMBINE ALL DATA FETCHING TYPE INTO ONE STATE
    const combinedProductData = Array.isArray(searchedSuplierPurchased) && searchedSuplierPurchased.length > 0
        ? searchedSuplierPurchased
        : Array.isArray(purchasedData) && purchasedData.length > 0
            ? purchasedData
            : [];
    const [permissionData, setPermissionData] = useState({});
    const { userData } = useContext(UserContext);

    useEffect(() => {
        if (userData?.permissions) {
            setPermissionData(extractPermissions(userData.permissions));
        }
    }, [userData]);

    const extractPermissions = (permissions) => {
        let extractedPermissions = {};

        Object.keys(permissions).forEach((category) => {
            Object.keys(permissions[category]).forEach((subPermission) => {
                extractedPermissions[subPermission] = permissions[category][subPermission];
            });
        });

        return extractedPermissions;
    };

    const fetchSaleData = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/fetchPurchase`, {
                params: {
                    'page[size]': size,
                    'page[number]': page,
                },
            });
            setPuchasedData(response.data.data);
            setSearchedSuplierPurchased(response.data.data);
            setTotalPages(response.data.totalPages || 0);
            setKeyword('');
        } catch (error) {
            console.error('Fetch purchased data error:', error);
            setError('No purchases found.');
            setPuchasedData([]);
            setSearchedSuplierPurchased([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (keyword.trim() === '') {
            fetchSaleData();
        }
    }, [keyword, page, size, refreshKey]);

    const handleNextPage = () => {
        if (page < totalPages) setPage(prev => prev + 1);
    }

    const handlePrevPage = () => {
        if (page > 1) setPage(prev => prev - 1);
    }

    const handleDelete = async (_id) => {
        try {
            await axios.delete(`${process.env.REACT_APP_BASE_URL}/api/deletePurchase/${_id}`);
            setPuchasedData(purchasedData.filter(sale => sale._id !== _id));
            toast.success('Purchase deleted successfully!', { autoClose: 2000 }, { className: "custom-toast" });
            setRefreshKey(prevKey => prevKey + 1);
            fetchSaleData();
        } catch (error) {
            console.error('Delete sale error:', error);
            toast.error('Error deleting purchase!', { autoClose: 2000 });
        }
    };

    const showConfirmationModal = (purchaseId) => {
        setPurchaseToDelete(purchaseId);
        setIsModalOpen(true);
    };

    const searchPurchase = async (query) => {
        setLoading(true);
        setError("");

        try {
            if (!query.trim()) {
                // If the query is empty, reset to all products
                setSearchedSuplierPurchased(purchasedData);
                setSuccessStatus("");
                return;
            }
            const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/searchPurchase`, {
                params: { keyword: query }, // Send the keyword parameter
            });
            if (response.data.purchases && response.data.purchases.length > 0) {
                setSearchedSuplierPurchased(response.data.purchases);
                setSuccessStatus("");
            } else {
                setSearchedSuplierPurchased([]); // Clear the table
                setError("No purchases found for the given query."); // Set error message
            }
        } catch (error) {
            console.error("Search product error:", error);
            setSearchedSuplierPurchased([]); // Clear the table
            setError("No purchases found for the given query.");
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
                setSuccessStatus("");
                setSearchedSuplierPurchased(purchasedData);
            } else {
                searchPurchase(value);
            }
        }, 100);
    };

    const handleKeyDown = (e) => {
        const value = e.target.value;

        if (e.key === 'Backspace' && value === '') {
            setSearchedSuplierPurchased([]);
        }
    };

    const handleTogglePopup = (saleId) => {
        setOpenPopupId(openPopupId === saleId ? null : saleId);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (popupRef.current && !popupRef.current.contains(event.target)) {
                setOpenPopupId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [popupRef]);

    const fetchPaymentData = async (purchaseId) => {
        try {
            const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/getPaymentOfPurchaseById/${purchaseId}`);
            setPaymentData(response.data.payments || []);
            setError(null);
        } catch (error) {
            console.error('Error fetching purchase payment data:', error);
            toast.error('Error fetching purchase payment data!', { autoClose: 3000 });
        }
    };

    const handleSaleViewPopUp = async (saleId) => {
        setOpenPopupId(null);
        const isOpening = openViewSale !== saleId;
        setOpenViewSale(openViewSale === saleId ? null : saleId);
        
        // Hide sidebar on tablets when opening purchase details
        if (isOpening && window.innerWidth >= 640 && window.innerWidth <= 1535) {
            hideSidebar();
        } else if (!isOpening) {
            // Show sidebar when closing purchase details on tablets
            if (window.innerWidth >= 640 && window.innerWidth <= 1535) {
                showSidebar();
            }
        }
        
        if (openViewSale !== saleId) {
        }
    };

    const handleEditClick = (saleId) => {
        setViewPayment(false);
        setPayingAmount('');
        setResponse('');
        setEditPopup(openEditPopup === saleId ? null : saleId);
    };

    const handleShowPaymentPopUp = (saleId) => {
        setPaymentData([]);
        setOpenPopupId(null);
        setViewPayment(openViewPayment === saleId ? null : saleId);
        return fetchPaymentData(saleId);
    };

    useEffect(() => {
        let isMounted = true;
        const fetchSettings = async () => {
            try {
                const { data } = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/getSettings`);
                if (isMounted) {
                    setEmail(data.email || '');
                    setCompanyName(data.companyName || '');
                    setCompanyMobile(data.companyMobile || '');
                    setAddress(data.address || '');
                    if (data.defaultWarehouse) {
                        sessionStorage.setItem('defaultWarehouse', data.defaultWarehouse);
                    }
                    else {
                        console.warn("[DEBUG] No logo received in API response!");
                    }
                }
            } catch (error) {
                if (isMounted) {
                    console.error("[DEBUG] Error fetching settings:", error);
                }
            }
        };
        fetchSettings(); return () => { isMounted = false; };
    }, []);

    const handleDeletePurchasePayment = async (id) => {
        const confirmDelete = window.confirm("Are you sure you want to delete this purchase payment?");
        if (confirmDelete) {
            try {
                const response = await axios.delete(`${process.env.REACT_APP_BASE_URL}/api/deletePurchasePayment/${id}`);

                if (response.status === 200) {
                    setPaymentData((prevData) => prevData.filter((pd) => pd._id !== id));
                    toast.success("Purchase payment deleted successfully!");
                } else {
                    toast.error("Failed to delete the purchase payment. Please try again.");
                }
            } catch (error) {
                if (error.response) {
                    toast.error(`Error: ${error.response.data.message}`);
                    console.error("Error Details:", error.response.data);
                } else {
                    toast.error("An error occurred while deleting the purchase payment.");
                    console.error("Delete Purchase Payment Error:", error);
                }
            }
        }
    };

    const savePurchasePayingData = async (e, purchaseId, grandTotal) => {
        e.preventDefault();
        setError('');
        setResponse('');

        if (!purchaseId) {
            setResponse('Purchase ID is required');
            setLoading(false);
            return;
        }
        if (!grandTotal) {
            setResponse('Amount to pay is required');
            setLoading(false);
            return;
        }
        if (!payingAmount) {
            setResponse('Paying Amount is required');
            setLoading(false);
            return;
        }

        const paidData = {
            purchaseId,
            amountToPay: grandTotal,
            payingAmount,
            currentDate,
            paymentType
        };

        try {
            const response = await axios.post(`${process.env.REACT_APP_BASE_URL}/api/payingForPurchase`, paidData);
            if (response.data) {
                toast.success('Purchase payment recorded successfully!', { autoClose: 2000, className: "custom-toast" });
                setEditPopup(false);
                await fetchSaleData();
            }
            await fetchPaymentData(purchaseId);
        } catch (error) {
            console.error('Error paying for the purchase:', error);
            if (error.response) {
                console.error('Error details:', error.response.data);
                const errorMessage = error.response.data.message || 'An error occurred on the server';
                toast.error(errorMessage, { autoClose: 3000, className: "custom-toast" });
            } else if (error.request) {
                console.error('No response received:', error.request);
                const noResponseMessage = 'No response received from server. Please try again later.';
                toast.error(noResponseMessage, { autoClose: 3000, className: "custom-toast" });
            } else {
                console.error('Request setup error:', error.message);
                const unexpectedErrorMessage = error.message || 'An unexpected error occurred.';
                toast.error(unexpectedErrorMessage, { autoClose: 3000, className: "custom-toast" });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className='relative background-white absolute top-[80px] left-0 w-full sm:left-[220px] sm:w-[calc(100%-220px)] 2xl:left-[18%] 2xl:w-[82%] min-h-[100vh] p-5'>
            <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3'>
                <div className="relative w-full sm:max-w-md">
                    <form onSubmit={(e) => e.preventDefault()} className="flex items-center">
                        <input
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            name='keyword'
                            type="text"
                            placeholder="Search by reference ID or invoice..."
                            className="searchBox w-full sm:w-80 pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:border-transparent"
                            value={keyword}
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
                    </form>
                </div>
                <div className="flex items-center w-full sm:w-auto">
                    {permissionData.create_purchase && (
                        <div className="w-full sm:w-auto">
                            <Link
                                to={'/createPurchase'}
                                className="submit rounded-md px-5 py-2.5 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 w-full sm:w-[200px] text-center block"
                            >
                                Create Purchase
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
            ) : combinedProductData.length > 0 ? (
                <div className="overflow-x-auto rounded-xl shadow-sm border border-[#D4AF37]/20">
                    <table className="min-w-full bg-white">
                        <thead className="bg-[#1F5F3B]">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider rounded-tl-xl">Reference</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Invoice No</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Supplier</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Warehouse</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Payment Status</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Payment Type</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Grand Total</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Paid</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider rounded-tr-xl">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {combinedProductData.map((purchased) => (
                                <tr key={purchased._id} className="hover:bg-[#FFF6E5]/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap"><span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#1F5F3B]/10 text-[#1F5F3B]">{purchased.refferenceId}</span></td>
                                    <td className="px-6 py-4 whitespace-nowrap"><span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#D4AF37]/10 text-[#D4AF37]">{purchased.invoiceNumber}</span></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#4A2C1D] font-medium">{purchased.supplier}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#4A2C1D]">{purchased.warehouse}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#4A2C1D]">{purchased.date}</td>
                                    <td className="px-6 py-4 whitespace-nowrap"><span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#4CAF50]/10 text-[#4CAF50]">{purchased.orderStatus}</span></td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${purchased.paymentStatus?.toLowerCase() === 'paid'
                                            ? 'bg-[#4CAF50]/10 text-[#4CAF50]'
                                            : purchased.paymentStatus?.toLowerCase() === 'partial'
                                                ? 'bg-[#D4AF37]/10 text-[#D4AF37]'
                                                : 'bg-red-100 text-red-600'
                                            }`}>
                                            {purchased.paymentStatus}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap"><span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-600">{purchased.paymentType}</span></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-[#1F5F3B]">{currency} {' '} {formatWithCustomCommas(purchased.grandTotal)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#4A2C1D]">{currency} {' '} {formatWithCustomCommas(purchased.paidAmount)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className='flex items-center justify-end gap-1'>
                                            {permissionData.edit_purchase && (
                                                <Link to={`/editPurchase/${purchased._id}`}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1F5F3B]/10 text-[#1F5F3B] hover:bg-[#1F5F3B] hover:text-white transition-all"
                                                >
                                                    <i className="fas fa-edit text-xs"></i>
                                                </Link>
                                            )}
                                            {permissionData.delete_purchase && (
                                                <button
                                                    onClick={() => showConfirmationModal(purchased._id)}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-100 text-red-600 hover:bg-red-600 hover:text-white transition-all"
                                                >
                                                    <i className="fas fa-trash text-xs"></i>
                                                </button>
                                            )}
                                            {(permissionData.return_purchase || permissionData.view_purchase_popup) && (
                                                <button
                                                    onClick={() => handleTogglePopup(purchased._id)}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-white transition-all rotate-90"
                                                >
                                                    <i className="fa fa-ellipsis-h text-xs"></i>
                                                </button>
                                            )}

                                            {/* Conditional rendering of the popup for the specific sale._id */}
                                            {openPopupId === purchased._id && (
                                                <div ref={popupRef} className="absolute right-0 mt-2 w-48 bg-white border border-[#D4AF37]/20 rounded-xl shadow-lg z-10 overflow-hidden">
                                                    <ul className="text-sm text-[#4A2C1D]">
                                                        {permissionData.view_purchase_popup && (
                                                            <li onClick={() => handleSaleViewPopUp(purchased._id)} className="px-4 py-3 hover:bg-[#FFF6E5] cursor-pointer flex items-center transition-colors">
                                                                <i className="fas fa-eye mr-3 text-[#1F5F3B]"></i>
                                                                View Purchase
                                                            </li>
                                                        )}
                                                        {permissionData.show_payment && (
                                                            <li
                                                                key={purchased._id}
                                                                onClick={() => handleShowPaymentPopUp(purchased._id)}
                                                                className="px-4 py-3 hover:bg-[#FFF6E5] cursor-pointer flex items-center transition-colors"
                                                            >
                                                                <i className="fas fa-credit-card mr-3 text-[#1F5F3B]"></i>
                                                                Show Payment
                                                            </li>
                                                        )}
                                                        {(permissionData.return_purchase && !purchased.returnStatus) && (
                                                            <Link
                                                                to={`/createPurchaseReturn/${purchased._id}`}
                                                                className="px-4 py-3 hover:bg-[#FFF6E5] cursor-pointer flex items-center transition-colors block"
                                                            >
                                                                <i className="fas fa-undo-alt mr-3 text-[#1F5F3B]"></i>
                                                                Create Return
                                                            </Link>
                                                        )}

                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    {/* View Sale popup */}
                                    {openViewSale === purchased._id && (
                                        <div ref={popupRef} className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
                                            <div className="overflow-y-auto scroll-container bg-white w-full max-w-[95vw] sm:max-w-[90vw] lg:max-w-[1300px] max-h-[90vh] p-4 sm:p-6 lg:p-8 rounded-md shadow-lg">
                                                <div ref={targetRef} className="w-full max-w-full bg-white" style={{ boxSizing: 'border-box' }}>
                                                    {/* Header */}
                                                    <div className="mb-4 sm:mb-6 flex justify-between items-center border-b pb-3 sm:pb-4">
                                                        <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-700">Purchased Details from {purchased.customer}</h2>
                                                    </div>

                                                    {/* Sale Info Section */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 text-gray-700">
                                                        {/* Customer Info */}
                                                        <div className="sm:border-r sm:pr-6 lg:pr-8">
                                                            <h3 className="text-base sm:text-lg text-left font-semibold mb-2 p-[8px] bg-gray-100 text-gray-700">
                                                                <i className="fas fa-user mr-2 text-gray-600"></i>
                                                                Suplier Info
                                                            </h3>
                                                            <p className="mb-1 text-sm sm:text-base text-left"><i className="fas fa-user ml-2 mr-2 text-gray-400"></i><span className="font-medium">Suplier:</span> {purchased.supplier}</p>
                                                        </div>

                                                        {/* Company Info */}
                                                        <div className="sm:border-r sm:pr-6 lg:pr-8">
                                                            <h3 className="text-base sm:text-lg p-[8px] bg-gray-100 font-semibold mb-2 text-gray-700 text-left">
                                                                <i className="fas fa-building mr-2 text-gray-600"></i>
                                                                Company Info
                                                            </h3>
                                                            <p className="m-2 text-sm sm:text-base text-left"><i className="fas fa-building mr-2 text-gray-400 text-left"></i><span className="font-medium">Company:</span> {companyName}</p>
                                                            <p className="m-2 text-sm sm:text-base text-left"><i className="fas fa-envelope mr-2 text-gray-400 text-left"></i><span className="font-medium">Email:</span> {email}</p>
                                                            <p className="m-2 text-sm sm:text-base text-left"><i className="fas fa-phone mr-2 text-gray-400 text-left"></i><span className="font-medium">Phone:</span> {companyMobile}</p>
                                                            <p className="m-2 text-sm sm:text-base text-left"><i className="fas fa-map-marker-alt mr-2 text-gray-400 text-left"></i><span className="font-medium ">Address:</span> {address}</p>
                                                        </div>


                                                        {/* Invoice Info <span className="font-medium m-2">Orser status:</span>*/}
                                                        <div>
                                                            <h3 className="text-base sm:text-lg p-[8px] text-left bg-gray-100 font-semibold mb-2 text-gray-700">
                                                                <i className="fas fa-file-invoice mr-2 text-gray-600"></i>
                                                                Invoice Info
                                                            </h3>
                                                            <p className='flex items-center text-sm sm:text-base text-left'>
                                                                <span className="font-medium m-2 flex items-center"><i className="fas fa-money-bill-wave mr-1 text-gray-400"></i>Payment status:</span>
                                                                <span className={`w-16 sm:w-20 flex items-center rounded-[5px] text-center pl-2 m-2 p-[2px] text-xs sm:text-sm ${purchased.paymentStatus === 'paid' ? 'bg-green-100 text-green-500' : 'bg-red-100 text-red-500'}`}>
                                                                    {purchased.paymentStatus}
                                                                </span>
                                                            </p>
                                                            <p className='flex items-center text-sm sm:text-base text-left'>
                                                                <span className=" flex items-center font-medium m-2"><i className="fas fa-check-circle mr-1 text-gray-400"></i>Order status:</span>
                                                                <span className='flex items-center w-16 sm:w-20 rounded-[5px] text-center pl-2 m-2 p-[2px] text-xs sm:text-sm bg-green-100 text-green-500'>
                                                                    {purchased.orderStatus}
                                                                </span>
                                                            </p>
                                                            <p className='mt-2 text-sm sm:text-base text-left'>
                                                                <span className="font-medium m-2 mt-4"><i className="fas fa-warehouse mr-1 text-gray-400"></i>Warehouse:</span>
                                                                {purchased.warehouse}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Product data */}
                                                    <div className="mt-6 sm:mt-8 lg:mt-10">
                                                        <h3 className="text-sm sm:text-md mt-5 text-left p-[2px] text-gray-700 font-semibold">Product Details</h3>
                                                        <div className="overflow-x-auto mt-4">
                                                            <table className="min-w-full bg-white border border-gray-300 text-xs sm:text-sm">
                                                                <thead>
                                                                    <tr>
                                                                        {/* <th className="text-gray-700 py-2 px-4 border-b text-left bg-gray-100 ">Product ID</th> */}
                                                                        <th className="text-gray-700 py-2 px-2 sm:px-4 border-b text-left bg-gray-100">Product name</th>
                                                                        <th className="text-gray-700 py-2 px-2 sm:px-4 border-b text-left bg-gray-100">Variation Type</th>
                                                                        <th className="text-gray-700 py-2 px-2 sm:px-4 border-b text-left bg-gray-100">Product price</th>
                                                                        <th className="text-gray-700 py-2 px-2 sm:px-4 border-b text-left bg-gray-100">Qty</th>
                                                                        <th className="text-gray-700 py-2 px-2 sm:px-4 border-b text-left bg-gray-100">Sub total</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {purchased.productsData.map((product) => (
                                                                        <tr key={product._id} className="text-gray-700">
                                                                            {/* <td className="py-2 text-left px-4 border-b">{product.currentID}</td> */}
                                                                            <td className="py-2 text-left px-2 sm:px-4 border-b">{product.name}</td>
                                                                            <td className="py-2 text-left px-2 sm:px-4 border-b">{product.variationValue ? product.variationValue : 'No Variations'}</td>
                                                                            <td className="py-2 text-left px-2 sm:px-4 border-b">{currency} {formatWithCustomCommas(product.price)}</td>
                                                                            <td className="py-2 text-left px-2 sm:px-4 border-b">{product.quantity}</td>
                                                                            <td className="py-2 text-left px-2 sm:px-4 border-b">{currency} {formatWithCustomCommas(product.subtotal)}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>

                                                    {/* Additional data */}
                                                    <div className="mt-6 sm:mt-8 lg:mt-10">
                                                        <div className="overflow-x-auto">
                                                            <table className="w-full sm:w-auto sm:min-w-[300px] bg-white border border-gray-300 text-xs sm:text-sm">
                                                                <tbody>
                                                                    <tr>
                                                                        <td className="py-2 px-2 sm:px-4 text-left border-b">Tax</td>
                                                                        <td className="py-2 px-2 sm:px-4 text-left border-b">{purchased.tax} %</td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td className="py-2 text-left px-2 sm:px-4 border-b">Shipping</td>
                                                                        <td className="py-2 text-left px-2 sm:px-4 border-b">{currency} {formatWithCustomCommas(purchased.shipping ? purchased.shipping : '0.00')}</td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td className="py-2 text-left px-2 sm:px-4 border-b">Discount</td>
                                                                        <td className="py-2 text-left px-2 sm:px-4 border-b">
                                                                            {(() => {
                                                                                const discountValue = purchased.discount ? Number(purchased.discount) : 0;
                                                                                const discountType = purchased.discountType || "fixed";

                                                                                if (discountType === "percentage") {
                                                                                    return `${discountValue}%`;
                                                                                } else {
                                                                                    return `${currency} ${formatWithCustomCommas(discountValue.toFixed(2))}`;
                                                                                }
                                                                            })()}
                                                                        </td>
                                                                    </tr>

                                                                    <tr>
                                                                        <td className="py-2 text-left px-2 sm:px-4 border-b font-semibold">Total</td>
                                                                        <td className="py-2 text-left px-2 sm:px-4 border-b font-semibold">{currency} {formatWithCustomCommas(purchased.grandTotal ? purchased.grandTotal : '0.00')}</td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Footer */}
                                                <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row justify-end gap-2 sm:gap-0">
                                                    {openViewSale === purchased._id && (
                                                        <button onClick={() => toPDF()} className="submit px-4 sm:px-6 py-2 sm:py-3 mr-0 sm:mr-2 text-white text-sm sm:text-base rounded-md shadow-md transition w-full sm:w-auto">
                                                            <i className="fas fa-file-pdf mr-2 text-white"></i>
                                                            Download PDF
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => {
                                                            setOpenViewSale(null);
                                                            // Show sidebar when closing on tablets
                                                            if (window.innerWidth >= 640 && window.innerWidth <= 1535) {
                                                                showSidebar();
                                                            }
                                                        }}
                                                        className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-500 text-white text-sm sm:text-base rounded-md shadow-md hover:bg-gray-600 transition w-full sm:w-auto">
                                                        Close
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Show payment */}
                                    {openViewPayment === purchased._id && (
                                        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
                                            <div className="bg-white w-full max-w-[95vw] sm:max-w-[90vw] lg:max-w-[800px] max-h-[90vh] overflow-auto p-4 sm:p-6 lg:p-8 rounded-md shadow-lg" data-aos="fade-down">
                                                <h2 className="text-lg sm:text-xl text-black-500 font-semibold">Payment Details</h2>
                                                <div className='overflow-x-auto'>
                                                    <table className="mt-6 sm:mt-8 min-w-full bg-white text-xs sm:text-sm">
                                                        <thead>
                                                            <tr>
                                                                <td className="text-gray-600 py-2 px-2 sm:px-4 border-b text-left bg-gray-100">Date</td>
                                                                <td className="text-gray-600 py-2 px-2 sm:px-4 border-b text-left bg-gray-100">Amount</td>
                                                                <td className="text-gray-600 py-2 px-2 sm:px-4 border-b text-left bg-gray-100">Paid by</td>
                                                                <td className="text-gray-600 py-2 px-2 sm:px-4 border-b text-left bg-gray-100">Payment Type</td>
                                                                <td className="text-gray-600 py-2 px-2 sm:px-4 border-b text-left bg-gray-100 text-right">Action</td>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {paymentData && paymentData.length > 0 ? (
                                                                paymentData.map((pd) => (
                                                                    <tr key={pd._id}>
                                                                        <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-left text-gray-900">{new Date(pd.currentDate).toLocaleDateString()}</td>
                                                                        <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-left text-gray-900">{currency}{' '} {purchased.grandTotal}</td>
                                                                        <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-left text-gray-900">{currency}{' '} {pd.payingAmount ? pd.payingAmount : null}</td>
                                                                        <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-left text-gray-900">{pd.paymentType}</td>
                                                                        <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-gray-900 text-right">
                                                                            <div className="flex justify-center items-center">
                                                                                <button
                                                                                    onClick={() => handleDeletePurchasePayment(pd._id)}
                                                                                    className="text-red-500 hover:text-red-700 font-bold py-1 px-2"
                                                                                    style={{ background: 'transparent' }}
                                                                                >
                                                                                    <i className="fas fa-trash mr-1"></i>
                                                                                </button>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                ))
                                                            ) : (
                                                                <tr>
                                                                    <td colSpan="4" className="text-center py-4">
                                                                        No payment data available.
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                <div className='flex flex-col sm:flex-row items-center gap-2'>
                                                    <button onClick={() => handleEditClick(purchased._id)} className="px-4 sm:px-6 flex items-center justify-center submit mt-4 sm:mt-5 text-white text-sm sm:text-base h-[40px] rounded-md shadow-md transition w-full sm:w-auto">Create Payment</button>
                                                    <button onClick={() => setViewPayment(false)} className="px-4 sm:px-6 py-2 bg-gray-500 mt-2 sm:mt-5 text-white text-sm sm:text-base rounded-md shadow-md hover:bg-gray-600 transition w-full sm:w-auto">Close</button>
                                                </div>
                                                <ConfirmationModal
                                                    isOpen={isModalOpen}
                                                    onClose={() => setIsModalOpen(false)}  // Close modal
                                                    onConfirm={() => handleDelete(saleToDelete)}  // Confirm delete
                                                    message="Are you sure you want to delete this paymemt?"
                                                />
                                            </div>
                                        </div>
                                    )}
                                    {/* Edit payment popup */}
                                    {openEditPopup === purchased._id && (
                                        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
                                            <div className="bg-white w-full max-w-[95vw] sm:max-w-[90vw] lg:max-w-[800px] max-h-[90vh] overflow-auto p-4 sm:p-6 lg:p-8 rounded-md shadow-lg">
                                                <h1 className="text-base sm:text-lg text-gray-600 text-left font-semibold mb-4">Make payment</h1>
                                                <form>
                                                    <div className="mb-4">
                                                        <label className="block text-gray-700 mb-2 text-left text-sm sm:text-base" htmlFor="date">Date:</label>
                                                        <input
                                                            type="date"
                                                            id="date"
                                                            value={currentDate}
                                                            readOnly
                                                            className="border border-gray-300 rounded p-2 w-full outline-none text-sm sm:text-base"
                                                        />
                                                    </div>
                                                    <div className="mb-4">
                                                        <label className="block text-gray-700 mb-2 text-left text-sm sm:text-base" htmlFor="paymentType">Payment type:</label>
                                                        <select
                                                            id="paymentType"
                                                            required
                                                            value={paymentType}
                                                            onChange={(e) => setPaymentType(e.target.value)}
                                                            className="border border-gray-300 rounded p-2 w-full text-left outline-none text-sm sm:text-base"
                                                        >
                                                            <option value="cash">Cash</option>
                                                            <option value="card">Card</option>
                                                            <option value="check">Check</option>
                                                            <option value="bank_transfer">Bank Transfer</option>
                                                        </select>
                                                    </div>
                                                    <div className="mb-4">
                                                        <label className="block text-gray-700 mb-2 text-left text-sm sm:text-base" htmlFor="amountToPay">Grand Total:</label>
                                                        <input
                                                            type="number"
                                                            required
                                                            id="amountToPay"
                                                            readOnly
                                                            value={(purchased.grandTotal).toFixed(2)}
                                                            onChange={(e) => setAmountToPay(e.target.value)}
                                                            className="border border-gray-300 rounded p-2 w-full outline-none text-sm sm:text-base"
                                                            placeholder="Enter amount to pay"
                                                        />
                                                    </div>
                                                    <div className="mb-4">
                                                        <label className="block text-gray-700 mb-2 text-left text-sm sm:text-base" htmlFor="amountToPay">Due Amount:</label>
                                                        <input
                                                            type="number"
                                                            required
                                                            id="amountToPay"
                                                            readOnly
                                                            value={(purchased.grandTotal - purchased.paidAmount).toFixed(2)} // Rounds to nearest whole number
                                                            onChange={(e) => setAmountToPay(e.target.value)}
                                                            className="border border-gray-300 rounded p-2 w-full outline-none text-sm sm:text-base"
                                                            placeholder="Enter amount to pay"
                                                        />
                                                    </div>

                                                    <div className="mb-4">
                                                        <label className="block text-gray-700 mb-2 text-left text-sm sm:text-base" htmlFor="payingAmount">Paying Amount:</label>
                                                        <input
                                                            type="number"
                                                            id="payingAmount"
                                                            required
                                                            value={payingAmount}
                                                            onChange={(e) => {
                                                                const value = e.target.value;
                                                                if (Number(value) <= purchased.grandTotal) {
                                                                    setPayingAmount(value);
                                                                } else {
                                                                    setResponse('Paying amount cannot exceed Amount To Pay.');
                                                                }
                                                            }}
                                                            className="border border-gray-300 rounded p-2 w-full outline-none text-sm sm:text-base"
                                                            placeholder="Enter paying amount"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col sm:flex-row justify-end items-center gap-2">
                                                        <button
                                                            onClick={(e) => savePurchasePayingData(e, purchased._id, purchased.grandTotal)}
                                                            type="submit"
                                                            className="text-white submit py-2 px-4 rounded mt-2 sm:mt-4 text-sm sm:text-base w-full sm:w-auto"
                                                        >
                                                            Save Changes
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setEditPopup(false);  // Close the popup
                                                                fetchSaleData();      // Re-fetch the sales data
                                                            }}
                                                            className="px-4 sm:px-6 mt-2 h-[40px] sm:h-[45px] bg-gray-500 text-white text-sm sm:text-base rounded-md shadow-md hover:bg-gray-600 transition w-full sm:w-auto"
                                                        >
                                                            Close
                                                        </button>
                                                    </div>
                                                    <div>
                                                        {response && <p className="text-color px-5 py-2 rounded-md bg-green-100 text-center mx-auto max-w-sm mt-4 text-sm sm:text-base">{response}</p>}
                                                    </div>
                                                </form>
                                            </div>
                                        </div>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
              <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-white/80 z-50">
                <Loader />
              </div>
            )
            }
            <ConfirmationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}  // Close modal
                onConfirm={() => handleDelete(purchaseToDelete)}  // Confirm delete
                message="Are you sure you want to delete this purchase?"
            />

            {/* Pagination Controls - Visible only when data is loaded */}
            <div>
                {!error && combinedProductData.length > 0 && (
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
        </div >
    );
}
export default ViewPurchaseBody;
