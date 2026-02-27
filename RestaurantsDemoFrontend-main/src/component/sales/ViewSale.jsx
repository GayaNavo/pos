

import { useState, useEffect, useRef, useContext } from 'react';
import { Link, } from 'react-router-dom';
import axios from 'axios';
import Box from '@mui/material/Box';
import Loader from '../utill/Loader';
import '../../styles/role.css';
import { usePDF } from 'react-to-pdf';
import PaginationDropdown from '../utill/Pagination';
import { toast } from 'react-toastify';
import ConfirmationModal from '../common/deleteConfirmationDialog';
import formatWithCustomCommas from '../utill/NumberFormate';
import AOS from 'aos';
import 'aos/dist/aos.css'
import { useCurrency } from '../../context/CurrencyContext';
import { UserContext } from '../../context/UserContext';

function ViewSaleBody() {
    // State variables
    const [saleData, setSaleData] = useState([]);
    const [keyword, setKeyword] = useState('');
    const [searchedCustomerSale, setSearchedCustomerSale] = useState(null);
    const [loading, setLoading] = useState(false);
    const [openPopupId, setOpenPopupId] = useState(null);
    const popupRef = useRef(null);
    const printRef = useRef();
    const [openViewSale, setOpenViewSale] = useState(null);
    const [openViewPayment, setViewPayment] = useState(null);
    const [filteredSaleData, setFilteredSaleData] = useState(saleData);
    const [openEditPopup, setEditPopup] = useState(false);
    const debounceTimeout = useRef(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [orderTypeFilter, setOrderTypeFilter] = useState('All');
    const { toPDF, targetRef } = usePDF({ filename: `${saleData.customer || 'invoice'}.pdf` });

    //COMBINE ALL DATA FETCHING TYPE INTO ONE STATE
    const combinedProductData = Array.isArray(searchedCustomerSale) && searchedCustomerSale.length > 0
        ? searchedCustomerSale
        : Array.isArray(saleData) && saleData.length > 0
            ? saleData
            : [];

    // Filter by order type
    const filteredByOrderType = orderTypeFilter === 'All'
        ? combinedProductData
        : combinedProductData.filter(sale => (sale.orderType || 'Normal') === orderTypeFilter);

    const [paymentType, setPaymentType] = useState('cash');
    const [amountToPay, setAmountToPay] = useState(0);
    const [payingAmount, setPayingAmount] = useState('');
    const [currentDate] = useState(new Date().toISOString().slice(0, 10));
    const [response, setResponse] = useState('')
    const [paymentData, setPaymentData] = useState([]);
    const [error, setError] = useState(null);
    const [successStatus, setSuccessStatus] = useState('');
    const [page, setPage] = useState(1);
    const [size, setSize] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saleToDelete, setSaleToDelete] = useState(null);
    const { currency } = useCurrency()
    const [permissionData, setPermissionData] = useState({});
    const [email, setEmail] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [companyMobile, setCompanyMobile] = useState('');
    const [address, setAddress] = useState('');
    const { userData } = useContext(UserContext);

    useEffect(() => {
        if (userData?.permissions) {
            console.log("UserData received in useEffect:", userData);

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
            const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/fetchSales`, {
                params: {
                    'page[size]': size,
                    'page[number]': page,
                },
            });
            if (response.data && Array.isArray(response.data.sales) && response.data.sales.length > 0) {
                setSaleData(response.data.sales);
                setSearchedCustomerSale(response.data.sales);
                console.log("Response: ", response.data.sales);
                setTotalPages(response.data.totalPages || 0);
                setKeyword('');
                setLoading(false);
            } else {
                console.warn('No sales data found.');
                setSaleData([]);
                setTotalPages(0);
                setError('No sales data available.');
                setLoading(false)
            }
        } catch (error) {
            console.error('Fetch sale data error:', error);
            setError('No sales found.');
            setLoading(false);
            setSaleData([]);
            setSearchedCustomerSale([]);
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
            await axios.delete(`${process.env.REACT_APP_BASE_URL}/api/DeleteSale/${_id}`);
            setSaleData(saleData.filter(sale => sale._id !== _id));
            toast.success('Sale deleted successfully!', { autoClose: 2000 }, { className: "custom-toast" });
            setRefreshKey(prevKey => prevKey + 1);
            fetchSaleData();
        } catch (error) {
            console.error('Error deleting sale:', error);
            toast.error('Error deleting sale!', { autoClose: 2000 }, { className: "custom-toast" });
            if (error.response) {
                console.error('Error details:', error.response.data);
                setError(error.response.data.message || 'An error occurred on the server');
            } else if (error.request) {
                console.error('No response received:', error.request);
                setError('No response received from server. Please try again later.');
            } else {
                console.error('Request setup error:', error.message);
                setError(error.message || 'An unexpected error occurred.');
            }
        }
        finally {
            setLoading(false);
        }
    };

    const showConfirmationModal = (saleId) => {
        setSaleToDelete(saleId);
        setIsModalOpen(true);
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

    const handleSaleViewPopUp = async (saleId) => {
        setOpenPopupId(null);
        setPayingAmount('');
        setOpenViewSale(openViewSale === saleId ? null : saleId);
        if (openViewSale !== saleId) {
            const sale = saleData.find((sale) => sale._id === saleId);
            const customerName = sale.customer;

            try {
                if (customerName) {
                    const response = await axios.get(
                        `${process.env.REACT_APP_BASE_URL}/api/searchCustomerByName?name=${encodeURIComponent(customerName)}`
                    );
                    setFilteredSaleData(response.data.customer);
                } else {
                    console.warn('Customer name is empty.');
                    setFilteredSaleData(saleData);
                }
            } catch (error) {
                if (error.response) {
                    console.error('Server Error:', error.response.data);
                } else if (error.request) {
                    console.error('No Response from Server:', error.request);
                } else {
                    console.error('Error:', error.message)
                }

            }
        }
    };

    const fetchPaymentData = async (saleId) => {
        try {
            const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/getPaymentOfSaleById/${saleId}`);
            setPaymentData(response.data.payments || []);
            setError(null);
        } catch (error) {
            console.error('Error fetching payment data:', error);
            toast.error('Error fetching payment data!', { autoClose: 3000 });
        }
    };

    const handleShowPaymentPopUp = (saleId) => {
        setPaymentData([]);
        setOpenPopupId(null);
        setViewPayment(openViewPayment === saleId ? null : saleId);
        return fetchPaymentData(saleId);
    };

    const handleEditClick = (saleId) => {
        setViewPayment(false);
        setPayingAmount('');
        setResponse('');
        setEditPopup(openEditPopup === saleId ? null : saleId);
    };

    const savePayingData = async (e, saleId, grandTotal) => {
        e.preventDefault()
        setError('')
        setResponse('')
        if (!saleId) {
            toast.error('Sale ID is required');
            setLoading(false);
            return;
        }
        if (!grandTotal) {
            toast.error('Amount to pay is required');
            setLoading(false);
            return;
        }
        if (!payingAmount) {
            toast.error('Paiyng Amount is required');
            setLoading(false);
            return;
        }
        const paidData = {
            saleId,
            amountToPay: grandTotal,
            payingAmount,
            currentDate,
            paymentType
        }

        try {
            const response = await axios.post(`${process.env.REACT_APP_BASE_URL}/api/payingForSale`, paidData);
            if (response.data) {
                toast.success('Payment successful!', { autoClose: 2000, className: "custom-toast" });
                setEditPopup(false);
                await fetchSaleData();
            }
            await fetchPaymentData(saleId);
        } catch (error) {
            console.error('Error paying for the sale:', error);
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
        }
        finally {
            setLoading(false);
        }
    }

    const searchSale = async (query) => {
        setLoading(true);
        setError("");

        try {
            if (!query.trim()) {
                setSearchedCustomerSale(saleData);
                setSuccessStatus("");
                return;
            }

            const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/searchSale`, {
                params: { keyword: query },
            });
            if (response.data.sales && response.data.sales.length > 0) {
                setSearchedCustomerSale(response.data.sales);
                setSuccessStatus("");
            } else {
                setSearchedCustomerSale([]);
                setError("No sales found for the given query.");
            }
        } catch (error) {
            console.error("Search product error:", error);
            setSearchedCustomerSale([]);
            setError("No sales found for the given query.");
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
                setSearchedCustomerSale(saleData); // Reset to full list
            } else {
                searchSale(value); // Call the search API with the entered query
            }
        }, 100); // Adjust debounce delay as needed
    };

    const handlePrintInvoice = async (saleId) => {
        try {
            const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/printInvoice/${saleId}`);
            if (response.data.html) {
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
            console.error("Error printing invoice:", error);
        }
    };

    const handleKeyDown = (e) => {
        const value = e.target.value;
        if (e.key === 'Backspace' && value === '') {
            setSearchedCustomerSale([]);
        }
    };

    useEffect(() => {
        AOS.init({
            duration: 400,
            easing: 'ease-in-out',
            once: true,
        });
    }, []);

    const handleDeletePayment = async (id) => {
        const confirmDelete = window.confirm("Are you sure you want to delete this payment?");
        if (confirmDelete) {
            try {
                const response = await axios.delete(`${process.env.REACT_APP_BASE_URL}/api/deletePayment/${id}`);

                if (response.status === 200) {
                    setPaymentData((prevData) => prevData.filter((pd) => pd._id !== id));
                    toast.success("Payment deleted successfully!");
                } else {
                    toast.error("Failed to delete the payment. Please try again.");
                }
            } catch (error) {
                if (error.response) {
                    toast.error(`Error: ${error.response.data.message}`);
                    console.error("Error Details:", error.response.data);
                } else {
                    toast.error("An error occurred while deleting the payment.");
                    console.error("Delete Payment Error:", error);
                }
            }
        }
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

    return (
        <div className='relative background-white absolute top-[80px] left-[18%] w-[82%] h-[100vh] p-5'>
            <div className='flex flex-col sm:flex-row justify-between mb-4 gap-4'>
                <div className="relative w-full sm:max-w-md">
                    <form onSubmit={(e) => e.preventDefault()} className="flex items-center">
                        <input
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            name='keyword'
                            type="text"
                            placeholder="Search by scanning the invoice no or reference ID..."
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
                {permissionData.create_sale && (
                    <div>
                        <Link
                            to={'/createSale'}
                            className="submit flex-none rounded-md px-4 py-2.5 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 whitespace-nowrap text-center relative"
                        >
                            Create Sale
                        </Link>
                    </div>
                )}
            </div>

            {/* Order Type Filter Radio Buttons */}
            <div className="flex gap-3 items-center mb-4">
                <span className="text-sm font-medium text-[#4A2C1D]">Order Type:</span>
                <button
                    onClick={() => setOrderTypeFilter('All')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${orderTypeFilter === 'All'
                        ? 'bg-[#1F5F3B] text-white'
                        : 'bg-[#FFF6E5] text-[#4A2C1D] hover:bg-[#D4AF37]/20'
                        }`}
                >
                    All
                </button>
                <button
                    onClick={() => setOrderTypeFilter('Normal')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${orderTypeFilter === 'Normal'
                        ? 'bg-[#1F5F3B] text-white'
                        : 'bg-[#FFF6E5] text-[#4A2C1D] hover:bg-[#D4AF37]/20'
                        }`}
                >
                    Normal
                </button>
                <button
                    onClick={() => setOrderTypeFilter('PickMe')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${orderTypeFilter === 'PickMe'
                        ? 'bg-[#1F5F3B] text-white'
                        : 'bg-[#FFF6E5] text-[#4A2C1D] hover:bg-[#D4AF37]/20'
                        }`}
                >
                    PickMe
                </button>
                <button
                    onClick={() => setOrderTypeFilter('Uber')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${orderTypeFilter === 'Uber'
                        ? 'bg-[#1F5F3B] text-white'
                        : 'bg-[#FFF6E5] text-[#4A2C1D] hover:bg-[#D4AF37]/20'
                        }`}
                >
                    Uber
                </button>
            </div>

            <div>
                {loading ? (
                    <Box className="fullscreen-loader">
                        <Loader />
                    </Box>

                ) : filteredByOrderType.length > 0 ? (
                    <div className="overflow-x-auto rounded-xl shadow-sm border border-[#D4AF37]/20">
                        <table className="min-w-full bg-white">
                            <thead className="bg-[#1F5F3B]">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider rounded-tl-xl">Reference</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Invoice No</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Customer</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Warehouse</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Order Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Payment Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Payment Type</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Service Charge</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Grand Total</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Paid</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider rounded-tr-xl">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {filteredByOrderType.map((sale) => (
                                    <tr key={sale._id} className="hover:bg-[#FFF6E5]/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap"><span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#1F5F3B]/10 text-[#1F5F3B]">{sale.refferenceId}</span></td>
                                        <td className="px-6 py-4 whitespace-nowrap"><span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#D4AF37]/10 text-[#D4AF37]">{sale.invoiceNumber}</span></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#4A2C1D] font-medium">{sale.customer}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#4A2C1D]">{sale.warehouse}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#4A2C1D]">{sale.date || 'Invalid Date'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap"><span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#4CAF50]/10 text-[#4CAF50]">{sale.orderStatus}</span></td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${(sale.orderType === 'Uber' || sale.orderType === 'uber') ? 'bg-purple-100 text-purple-600' :
                                                (sale.orderType === 'PickMe' || sale.orderType === 'Pickme' || sale.orderType === 'pickme') ? 'bg-[#D4AF37]/10 text-[#D4AF37]' :
                                                    'bg-blue-100 text-blue-600'
                                                }`}>
                                                {sale.orderType || 'Normal'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${sale.paymentStatus === 'paid' ? 'bg-[#4CAF50]/10 text-[#4CAF50]' : sale.paymentStatus === 'partial' ? 'bg-[#D4AF37]/10 text-[#D4AF37]' :
                                                'bg-red-100 text-red-600'}`}>
                                                {sale.paymentStatus}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-600">
                                                {sale.paymentType.map(pt => pt.type).join(' + ')}
                                            </span>
                                        </td>

                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#4A2C1D]">
                                            {sale.serviceChargeValue || 0.00} {currency}
                                        </td>

                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-[#1F5F3B]">
                                            {currency}{' '}{formatWithCustomCommas(sale.grandTotal)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#4A2C1D]">
                                            {currency}{' '}{formatWithCustomCommas(sale.paidAmount)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className='flex items-center justify-end gap-1'>
                                                {permissionData.edit_sale && (
                                                    <Link to={`/editSale/${sale._id}`}
                                                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1F5F3B]/10 text-[#1F5F3B] hover:bg-[#1F5F3B] hover:text-white transition-all"
                                                    >
                                                        <i className="fas fa-edit text-xs"></i>
                                                    </Link>
                                                )}
                                                {permissionData.delete_sale && (
                                                    <button
                                                        onClick={() => showConfirmationModal(sale._id)}
                                                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-100 text-red-600 hover:bg-red-600 hover:text-white transition-all"
                                                    >
                                                        <i className="fas fa-trash text-xs"></i>
                                                    </button>
                                                )}
                                                {(permissionData.view_sl_popup || permissionData.show_payment || permissionData.return_sale) && (
                                                    <button
                                                        onClick={() => handleTogglePopup(sale._id)}
                                                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-white transition-all rotate-90"
                                                    >
                                                        <i className="fa fa-ellipsis-h text-xs"></i>
                                                    </button>
                                                )}

                                                {/* Conditional rendering of the popup for the specific sale._id */}
                                                {openPopupId === sale._id && (
                                                    <div ref={popupRef} className="absolute right-0 mt-2 w-48 bg-white border border-[#D4AF37]/20 rounded-xl shadow-lg z-10 overflow-hidden">
                                                        <ul ref={targetRef} className="text-sm text-[#4A2C1D]">
                                                            {permissionData.view_sl_popup && (
                                                                <li onClick={() => handleSaleViewPopUp(sale._id)} className="px-4 py-3 hover:bg-[#FFF6E5] cursor-pointer flex items-center transition-colors">
                                                                    <i className="fas fa-eye mr-3 text-[#1F5F3B]"></i>
                                                                    View Sale
                                                                </li>
                                                            )}
                                                            {permissionData.show_payment && (
                                                                <li
                                                                    key={sale._id}
                                                                    onClick={() => handleShowPaymentPopUp(sale._id)}
                                                                    className="px-4 py-3 hover:bg-[#FFF6E5] cursor-pointer flex items-center transition-colors"
                                                                >
                                                                    <i className="fas fa-credit-card mr-3 text-[#1F5F3B]"></i>
                                                                    Show Payment
                                                                </li>
                                                            )}
                                                            {permissionData.return_sale && sale.returnStatus === false && (
                                                                <Link to={`/createSaleReturn/${sale._id}`} className="px-4 py-3 hover:bg-[#FFF6E5] cursor-pointer flex items-center transition-colors block">
                                                                    <i className="fas fa-undo-alt mr-3 text-[#1F5F3B]"></i>
                                                                    Create Return
                                                                </Link>
                                                            )}
                                                            {permissionData.print_sale && (
                                                                <li
                                                                    onClick={() => handlePrintInvoice(sale._id)}
                                                                    className="px-4 py-3 hover:bg-[#FFF6E5] cursor-pointer flex items-center transition-colors"
                                                                >
                                                                    <i className="fas fa-print mr-3 text-[#1F5F3B]"></i>
                                                                    Print Invoice
                                                                </li>
                                                            )}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        {/* View Sale popup */}
                                        {openViewSale === sale._id && (
                                            <div ref={popupRef} className="overflow-y-auto scroll-container fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start overflow-y-auto py-10 z-[9999]">
                                                <div className="bg-white w-full max-w-[1300px] mx-4 p-4 sm:p-8 rounded-md shadow-lg min-h-[100px]" data-aos="fade-down">
                                                    <div
                                                        ref={el => { targetRef.current = el; printRef.current = el }}
                                                        className="w-full max-w-[1250px] p-4 sm:p-10 bg-white"
                                                        style={{
                                                            margin: '0 auto',
                                                            padding: '15px',
                                                            boxSizing: 'border-box',
                                                        }}
                                                    >
                                                        {/* Header */}
                                                        <div className="mb-6 flex justify-between items-center border-b pb-4">
                                                            <h2 className="text-xl sm:text-2xl font-bold text-gray-700">Sale Details for {sale.customer}</h2>
                                                        </div>

                                                        {/* Sale Info Section */}
                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 text-gray-600">
                                                            {/* Customer Info */}
                                                            <div className="lg:border-r pr-0 lg:pr-8">
                                                                <h3 className="text-lg font-semibold mb-2 p-[8px] text-left bg-gray-100 text-gray-700">
                                                                    <i className="fas fa-user mr-2 text-gray-600 "></i>
                                                                    Customer Info
                                                                </h3>
                                                                <p className="mb-1 text-left"><i className="fas fa-user ml-2 mr-2 text-gray-400 text-left"></i><span className="font-medium">Customer:</span> {sale.customer}</p>
                                                            </div>

                                                            {/* Company Info */}
                                                            <div className="lg:border-r pr-0 lg:pr-8">
                                                                <h3 className="text-lg p-[8px] bg-gray-100 font-semibold mb-2 text-gray-700 text-left">
                                                                    <i className="fas fa-building mr-2 text-gray-600"></i>
                                                                    Company Info
                                                                </h3>
                                                                <p className="m-2 text-left"><i className="fas fa-building mr-2 text-gray-400 text-left"></i><span className="font-medium">Company:</span> {companyName}</p>
                                                                <p className="m-2 text-left"><i className="fas fa-envelope mr-2 text-gray-400 text-left"></i><span className="font-medium">Email:</span> {email}</p>
                                                                <p className="m-2 text-left"><i className="fas fa-phone mr-2 text-gray-400 text-left"></i><span className="font-medium">Phone:</span> {companyMobile}</p>
                                                                <p className="m-2 text-left"><i className="fas fa-map-marker-alt mr-2 text-gray-400 text-left"></i><span className="font-medium ">Address:</span> {address}</p>
                                                            </div>

                                                            {/* Invoice Info <span className="font-medium m-2">Orser status:</span>*/}
                                                            <div>
                                                                <h3 className="text-lg p-[8px] bg-gray-100 font-semibold mb-2 text-gray-700 text-left">
                                                                    <i className="fas fa-file-invoice mr-2 text-gray-600"></i>
                                                                    Invoice Info
                                                                </h3>
                                                                <p className='flex items-center text-left'>
                                                                    <span className=" flex items-center font-medium m-2"><i className="fas fa-check-circle mr-1 text-gray-400"></i>Invoice No:</span>
                                                                    <span className=' flex items-center w-40 rounded-[5px] text-center m-2 p-[2px] bg-green-100 text-green-500'>
                                                                        {sale.invoiceNumber}
                                                                    </span>
                                                                </p>
                                                                <p className='flex items-center text-left'>
                                                                    <span className="font-medium m-2 flex items-center"><i className="fas fa-money-bill-wave mr-1 text-gray-400"></i>Payment status:</span>
                                                                    <span className={`w-20 flex items-center rounded-[5px] text-center m-2 p-[2px] ${sale.paymentStatus === 'paid' ? 'bg-green-100 text-green-500' : 'bg-red-100 text-red-500'}`}>
                                                                        {sale.paymentStatus}
                                                                    </span>
                                                                </p>
                                                                <p className='flex items-center text-left'>
                                                                    <span className=" flex items-center font-medium m-2"><i className="fas fa-check-circle mr-1 text-gray-400"></i>Order status:</span>
                                                                    <span className=' flex items-center w-20 rounded-[5px] text-center m-2 p-[2px] bg-green-100 text-green-500'>
                                                                        {sale.orderStatus}
                                                                    </span>
                                                                </p>
                                                                <p className='mt-2 text-left'>
                                                                    <span className="font-medium m-2 mt-4 text-left"><i className="fas fa-warehouse mr-1 text-gray-400"></i>Warehouse:</span>
                                                                    {sale.warehouse}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Product data */}
                                                        <div className="mt-10">
                                                            <h3 className="text-md  mt-5 text-left p-[2px] text-gray-700">Product Details</h3>
                                                            <table className=" mt-4 min-w-full bg-white border border-gray-300">
                                                                <thead>
                                                                    <tr>
                                                                        {/* <th className="text-gray-900 py-2 px-4 border-b text-left bg-gray-100 ">Product ID</th> */}
                                                                        <th className="text-gray-700 py-2 px-4 border-b text-left bg-gray-100 ">Product name</th>
                                                                        <th className="text-gray-700 py-2 px-4 border-b text-left  bg-gray-100 ">Product price</th>
                                                                        <th className="text-gray-700 py-2 px-4 border-b text-left  bg-gray-100 ">Qty</th>
                                                                        <th className="text-gray-700 py-2 px-4 border-b text-left  bg-gray-100 ">Product tax</th>
                                                                        <th className="text-gray-700 py-2 px-4 border-b text-left  bg-gray-100 ">Discount</th>
                                                                        <th className="text-gray-700 py-2 px-4 border-b text-left  bg-gray-100 ">Special Discount</th>
                                                                        <th className="text-gray-700 py-2 px-4 border-b text-left  bg-gray-100 ">Sub total</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {sale.productsData.map((product) => (
                                                                        <tr key={product._id} className="text-gray-700">
                                                                            {/* <td className="py-2 px-4 border-b">{product.currentID}</td> */}
                                                                            <td className="py-2 px-4 border-b text-left">{product.name}</td>
                                                                            <td className="py-2 px-4 border-b text-left">{currency}{' '} {formatWithCustomCommas(product.price)}</td>
                                                                            <td className="py-2 px-4 border-b text-left">{product.quantity}</td>
                                                                            <td className="py-2 px-4 border-b text-left">{product.taxRate * 100} %</td>
                                                                            <td className="py-2 px-4 border-b text-left">{currency}{' '} {formatWithCustomCommas(product.discount ? product.discount : 0.00)}</td>
                                                                            <td className="py-2 px-4 border-b text-left">{currency}{' '} {formatWithCustomCommas(product.specialDiscount ? product.specialDiscount : 0.00
                                                                            )}</td>
                                                                            <td className="py-2 px-4 border-b text-left">{currency}{' '} {formatWithCustomCommas(product.subtotal)}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>

                                                        {/* Additional data */}
                                                        <div className="mt-10">
                                                            <table className=" mt-10 min-w-[400px] bg-white border border-gray-300">
                                                                <tbody>
                                                                    <tr>
                                                                        <td className="py-2 px-4 border-b text-left">Tax</td>
                                                                        <td className="py-2 px-4 border-b text-left">{sale.tax ? sale.tax : 0} %</td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td className="py-2 px-4 border-b text-left">Delivery Charge</td>
                                                                        <td className="py-2 px-4 border-b text-left">{currency}{' '} {formatWithCustomCommas(sale.shipping ? sale.shipping : '0.00')}</td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td className="py-2 px-4 border-b text-left">Discount</td>
                                                                        <td className="py-2 px-4 border-b text-left">
                                                                            {currency}{' '} {sale.discountValue ? sale.discountValue : 0.00}
                                                                        </td>
                                                                    </tr>

                                                                    <tr>
                                                                        <td className="py-2 px-4 border-b text-left">Total</td>
                                                                        <td className="py-2 px-4 border-b text-left">{currency}{' '} {formatWithCustomCommas(sale.grandTotal)}</td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td className="py-2 px-4 border-b text-left">Special Offer</td>
                                                                        <td className="py-2 px-4 border-b text-left">{sale.offerPercentage ? sale.offerPercentage : 0} %</td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                        <style>
                                                            {`
                                                              @media print {
                                                              body > :not(.fixed) {
                                                               display: none !important;
                                                            }
                                                             .fixed {
                                                               position: relative !important;
                                                               background: white !important;
                                                               padding: 0 !important;
                                                               margin: 0 !important;
                                                            }
                                                           .bg-white {
                                                               box-shadow: none !important;
                                                               width: 100% !important;
                                                               padding: 0 !important;
                                                            }
                                                            .w-[1250px] {
                                                               width: 100% !important;
                                                               padding: 0 !important;
                                                            }
                                                            `}
                                                        </style>
                                                    </div>
                                                    {/* Footer */}
                                                    <div className="relative items-last flex flex-wrap justify-end gap-2 print:hidden">
                                                        {openViewSale === sale._id && (
                                                            <button onClick={() => toPDF()} className="submit px-4 sm:px-6 py-3 text-white rounded-md shadow-md transition">
                                                                <i className="fas fa-file-pdf mr-2 text-white"></i>
                                                                Download PDF
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => setOpenViewSale(null)}
                                                            className="px-4 sm:px-6 py-3 bg-gray-500 text-white rounded-md shadow-md hover:bg-gray-600 transition">
                                                            Close
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Show payment */}
                                        {openViewPayment === sale._id && (
                                            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[9999]">
                                                <div className="bg-white w-full max-w-[800px] mx-4 h-auto max-h-[90vh] overflow-auto p-4 sm:p-8 pt-4 rounded-md shadow-lg" data-aos="fade-down">
                                                    <h2 className="text-xl text-black-500 font">Payment Details</h2>
                                                    <div className=''>
                                                        <table className="mt-8 min-w-full bg-white">
                                                            <thead>
                                                                <tr>
                                                                    <td className="text-gray-600 py-2 px-4 border-b text-left bg-gray-100">Date</td>
                                                                    <td className="text-gray-600 py-2 px-4 border-b text-left bg-gray-100">Amount</td>
                                                                    <td className="text-gray-600 py-2 px-4 border-b text-left bg-gray-100">Paid by</td>
                                                                    <td className="text-gray-600 py-2 px-4 border-b text-left bg-gray-100">Payment Type</td>
                                                                    <td className="text-gray-600 py-2 px-4 border-b text-left bg-gray-100 text-right pr-10">Action</td>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {paymentData && paymentData.length > 0 ? (
                                                                    paymentData.map((pd) => (
                                                                        <tr key={pd._id}>
                                                                            <td className="px-4 py-4 whitespace-nowrap text-left text-m text-gray-900">{new Date(pd.currentDate).toLocaleDateString()}</td>
                                                                            <td className="px-4 py-4 whitespace-nowrap text-left text-m text-gray-900">{currency}{' '} {sale.grandTotal}</td>
                                                                            <td className="px-4 py-4 whitespace-nowrap text-left text-m text-gray-900">{currency}{' '} {pd.payingAmount ? pd.payingAmount : null}</td>
                                                                            <td className="px-4 py-4 whitespace-nowrap text-left text-m text-gray-900">{pd.paymentType}</td>
                                                                            <td className="px-4 py-4 whitespace-nowrap text-m text-gray-900 text-right">
                                                                                <div className="flex justify-center items-center">
                                                                                    <button
                                                                                        onClick={() => handleDeletePayment(pd._id)}
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
                                                    <div className='flex items-center'>
                                                        <button onClick={() => handleEditClick(sale._id)} className="px-6 flex items-center submit mt-5 text-white mr-2 h-[40px] rounded-md shadow-md transition">Create Payment</button>
                                                        <button onClick={() => setViewPayment(false)} className="px-6 py-2 bg-gray-500 mt-5 text-white rounded-md shadow-md hover:bg-gray-600 transition">Close</button>
                                                    </div>
                                                    <ConfirmationModal
                                                        isOpen={isModalOpen}
                                                        onClose={() => setIsModalOpen(false)}
                                                        onConfirm={() => handleDelete(saleToDelete)}
                                                        message="Are you sure you want to delete this paymemt?"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                        {/* Edit payment popup */}
                                        {openEditPopup === sale._id && (
                                            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
                                                <div className="fixed inset-0 flex justify-center items-center mt-28">
                                                    <div className="bg-white w-[800px] h-[620px] overflow-auto p-8 pt-5 rounded-md mb-10">
                                                        <h1 className="text-gray-600 text-left">Make payment</h1>
                                                        <form>
                                                            <div className="mb-4">
                                                                <label className="block text-gray-700 mb-2 text-left" htmlFor="date">Date:</label>
                                                                <input
                                                                    type="date"
                                                                    id="date"
                                                                    value={currentDate}
                                                                    readOnly
                                                                    className="border border-gray-300 rounded p-2 w-full outline-none"
                                                                />
                                                            </div>
                                                            <div className="mb-4">
                                                                <label className="block text-gray-700 mb-2 text-left" htmlFor="paymentType">Payment type:</label>
                                                                <select
                                                                    id="paymentType"
                                                                    required
                                                                    value={paymentType}
                                                                    onChange={(e) => setPaymentType(e.target.value)}
                                                                    className="border border-gray-300 rounded p-2 w-full text-left outline-none"
                                                                >
                                                                    <option value="cash">Cash</option>
                                                                    <option value="card">Card</option>
                                                                    <option value="bank_transfer">Bank Transfer</option>
                                                                </select>
                                                            </div>
                                                            <div className="mb-4">
                                                                <label className="block text-gray-700 mb-2 text-left" htmlFor="amountToPay">Grand Total:</label>
                                                                <input
                                                                    type="number"
                                                                    required
                                                                    id="amountToPay"
                                                                    readOnly
                                                                    value={(sale.grandTotal).toFixed(2)}
                                                                    onChange={(e) => setAmountToPay(e.target.value)}
                                                                    className="border border-gray-300 rounded p-2 w-full outline-none"
                                                                    placeholder="Enter amount to pay"
                                                                />
                                                            </div>
                                                            <div className="mb-4">
                                                                <label className="block text-gray-700 mb-2 text-left" htmlFor="amountToPay">Due Amount:</label>
                                                                <input
                                                                    type="number"
                                                                    required
                                                                    id="amountToPay"
                                                                    readOnly
                                                                    value={(sale.grandTotal - sale.paidAmount).toFixed(2)} // Rounds to nearest whole number
                                                                    onChange={(e) => setAmountToPay(e.target.value)}
                                                                    className="border border-gray-300 rounded p-2 w-full outline-none"
                                                                    placeholder="Enter amount to pay"
                                                                />
                                                            </div>

                                                            <div className="mb-4">
                                                                <label className="block text-gray-700 mb-2 text-left" htmlFor="payingAmount">Paying Amount:</label>
                                                                <input
                                                                    type="number"
                                                                    id="payingAmount"
                                                                    required
                                                                    value={payingAmount}
                                                                    onChange={(e) => {
                                                                        const value = e.target.value;
                                                                        if (Number(value) <= sale.grandTotal) {
                                                                            setPayingAmount(value);
                                                                        } else {
                                                                            toast.error('The paying amount cannot exceed Amount To Pay.');
                                                                        }
                                                                    }}
                                                                    className="border border-gray-300 rounded p-2 w-full outline-none"
                                                                    placeholder="Enter paying amount"
                                                                />
                                                            </div>
                                                            <div className="flex justify-end items-center">
                                                                <button
                                                                    onClick={(e) => savePayingData(e, sale._id, sale.grandTotal)}
                                                                    type="submit"
                                                                    className="text-white submit py-2 px-4 rounded mt-4"
                                                                >
                                                                    Save Changes
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setEditPopup(false);
                                                                        fetchSaleData();
                                                                    }}
                                                                    className="px-6 ml-2 mt-[17px] h-[45px] bg-gray-500 text-white  rounded-md shadow-md hover:bg-gray-600 transition"
                                                                >
                                                                    Close
                                                                </button>
                                                            </div>
                                                            <div>
                                                                {response && <p className="text-color px-5 py-2 rounded-md bg-green-100 text-center mx-auto max-w-sm">{response}</p>}
                                                            </div>
                                                        </form>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p></p>
                )
                }
            </div>
            <ConfirmationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}  // Close modal
                onConfirm={() => handleDelete(saleToDelete)}  // Confirm delete
                message="Are you sure you want to delete this sale?"
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
            <div className="absolute top-24 left-0 w-full">
                {error && (
                    <p className="text-red-600 px-5 py-2 rounded-md bg-red-100 text-center mx-auto max-w-sm mt-24">
                        {error}
                    </p>
                )}
            </div>
        </div >
    );
}

export default ViewSaleBody;
