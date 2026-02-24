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
import { useCurrency } from '../../context/CurrencyContext';
import formatWithCustomCommas from '../utill/NumberFormate';
import { UserContext } from '../../context/UserContext';
import { useSidebar } from '../../context/SidebarContext';

function ViewAdjustmentBody() {
    // State variables
    const { currency } = useCurrency()
    const { sidebarHidden, hideSidebar, showSidebar } = useSidebar();
    const [saleData, setSaleData] = useState([]);
    const [keyword, setKeyword] = useState('');
    const [searchedCustomerSale, setSearchedCustomerSale] = useState(null);
    const [loading, setLoading] = useState(false);
    const [openPopupId, setOpenPopupId] = useState(null);
    const popupRef = useRef(null);
    const [openViewSale, setOpenViewSale] = useState(null);
    const [error, setError] = useState('');
    const [responseMessage, setResponseMessage] = useState('');
    const [page, setPage] = useState(1);
    const [size, setSize] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [adjustmentToDelete, setAdjustmentToDelete] = useState(null);
    const debounceTimeout = useRef(null);
    const [refreshKey, setRefreshKey] = useState(0);
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

    const { toPDF, targetRef } = usePDF({ filename: `${saleData.customer || 'invoice'}.pdf` });
    //COMBINE ALL DATA FETCHING TYPE INTO ONE STATE
    const combinedProductData = Array.isArray(searchedCustomerSale) && searchedCustomerSale.length > 0
        ? searchedCustomerSale
        : Array.isArray(saleData) && saleData.length > 0
            ? saleData
            : [];

    const fetchSaleData = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/fetchAdjustments`, {
                params: {
                    // sort: '-createdAt',
                    'page[size]': size, // Use the selected size
                    'page[number]': page,
                },
            });
            setSaleData(response.data.data);
            setSearchedCustomerSale(response.data.data);
            setTotalPages(response.data.totalPages || 0);
            setKeyword('');
            setError(''); // Clear error message on success
        } catch (error) {
            console.error('Fetch sale data error:', error);
            setError('No adjustments found.'); // Set error message
            setSaleData([]);
            setSearchedCustomerSale([]);
            setLoading(false);
        } finally {
            setLoading(false);
        }
    };

    // Fetch all customers
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

    // Handle delete customer
    const handleDelete = async (_id) => {
        try {
            await axios.delete(`${process.env.REACT_APP_BASE_URL}/api/DeleteAdjustment/${_id}`);
            setSaleData(saleData.filter(sale => sale._id !== _id));
            setError('');

            toast.success('Adjustment deleted successfully!', { autoClose: 2000 }, { className: "custom-toast" });
            setRefreshKey(prevKey => prevKey + 1);
            fetchSaleData();
        } catch (error) {
            console.error('Error deleting adjustment!', error);
            toast.error('Failed to delete the sale. Please try again.', { autoClose: 2000 });
        }
    };

    const showConfirmationModal = (adjustmentId) => {
        setAdjustmentToDelete(adjustmentId);
        setIsModalOpen(true);
    };

    const searchAdjustment = async (query) => {
        setLoading(true);
        setError('');
        try {
            if (!query.trim()) {
                setSearchedCustomerSale(saleData);
                setResponseMessage('');
                return;
            }

            const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/searchAdjustment`, {
                params: { keyword: query },
            });
            console.log('Search API response:', response.data);
            if (response.data.adjustments && response.data.adjustments.length > 0) {
                setSearchedCustomerSale(response.data.adjustments);
                setResponseMessage('');
            } else {
                setSearchedCustomerSale([]); // Clear the table
                setError('No adjustments found for the given query.'); // Set error message
            }
        } catch (error) {
            console.error('Find base unit error:', error);
            setSearchedCustomerSale([]); // Clear the table
            setError('No adjustments found for the given name.');
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
            if (value.trim() === '') {
                setError('');
                setResponseMessage('');
                setSearchedCustomerSale(saleData); // Reset to full list
            } else {
                searchAdjustment(value);
            }
        }, 100);
    };

    const handleKeyDown = (e) => {
        const value = e.target.value;

        // If backspace is pressed and the input becomes empty, reset the searchedBrand
        if (e.key === "Backspace" && value === '') {
            setSearchedCustomerSale([]);
        }
    };

    // Close popup when clicking outside
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

    //have to remove
    const handleSaleViewPopUp = async (saleId) => {
        setOpenPopupId(null);
        const isOpening = openViewSale !== saleId;
        setOpenViewSale(openViewSale === saleId ? null : saleId);
        
        // Hide sidebar on tablets when opening adjustment details
        if (isOpening && window.innerWidth >= 640 && window.innerWidth <= 1535) {
            hideSidebar();
        } else if (!isOpening) {
            // Show sidebar when closing adjustment details on tablets
            if (window.innerWidth >= 640 && window.innerWidth <= 1535) {
                showSidebar();
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
        <div className='relative background-white absolute top-[80px] left-0 w-full sm:left-[220px] sm:w-[calc(100%-220px)] 2xl:left-[18%] 2xl:w-[82%] h-[100vh] p-5'>
            <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3'>
                <div className="relative w-full sm:max-w-md">
                    <form onSubmit={(e) => e.preventDefault()} className="flex items-center">
                        <input
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            name='keyword'
                            type="text"
                            placeholder="Add search by reference Id"
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
                    {permissionData.create_adjustment && (
                        <div className="w-full sm:w-auto">
                            <Link
                                to={'/createAdjustment'}
                                className="submit rounded-md px-5 py-2.5 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 w-full sm:w-[200px] text-center block"
                            >
                                Create Adjustment
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
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border border-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Refference Id</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Warehouse</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {combinedProductData.map((sale) => (
                                <tr key={sale._id}>
                                    <td className="px-6 py-4 text-left whitespace-nowrap text-m text-gray-900"><p className='rounded-[5px] text-center p-[6px] bg-red-100 text-red-500'>{sale.refferenceId}</p></td>
                                    <td className="px-6 py-4 text-left whitespace-nowrap text-m text-gray-900">{sale.warehouse}</td>
                                    <td className="px-6 py-4 text-left whitespace-nowrap text-m text-gray-900">{new Date(sale.date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-right whitespace-nowrap text-m text-gray-900">
                                        <div className='flex items-center justify-end'>
                                            {permissionData.edit_adjustment && (
                                                <Link to={`/editAdjustment/${sale._id}`}
                                                    className="text-blue-500 hover:text-blue-700 font-bold py-1 px-2 mr-2 flex items-center"
                                                    style={{ background: 'transparent' }}
                                                >
                                                    <i className="fas fa-edit mr-1"></i>
                                                </Link>
                                            )}
                                            {permissionData.delete_adjustment && (
                                                <button
                                                    onClick={() => showConfirmationModal(sale._id)}
                                                    className="text-red-500 hover:text-red-700 font-bold py-1 px-2 flex items-center"
                                                    style={{ background: 'transparent' }}
                                                >
                                                    <i className="fas fa-trash mr-1"></i>
                                                </button>
                                            )}
                                            {permissionData.view_adjustment_popup && (
                                                <button
                                                    onClick={() => handleSaleViewPopUp(sale._id)}
                                                    className="text-[#35AF87] hover:text-[#16796E] font-bold py-1 px-2 mr-2 text-lg"
                                                    style={{ background: 'transparent' }}
                                                >
                                                    <i className="fas fa-eye mr-1"></i>
                                                </button>
                                            )}
                                        </div>
                                    </td>

                                    {/* View Sale popup */}
                                    {openViewSale === sale._id && (
                                        <div ref={popupRef} className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
                                            <div className="overflow-y-auto scroll-container bg-white w-full max-w-[95vw] sm:max-w-[90vw] lg:max-w-[1300px] max-h-[90vh] p-4 sm:p-6 lg:p-8 rounded-md shadow-lg">
                                                <div ref={targetRef} className="w-full max-w-full bg-white" style={{ boxSizing: 'border-box' }}>
                                                    {/* Header */}
                                                    <div className="mb-4 sm:mb-6 flex justify-between items-center border-b pb-3 sm:pb-4">
                                                        <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-700">Adjustment Details</h2>
                                                    </div>

                                                    {/* Sale Info Section */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 text-gray-700">
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
                                                            <h3 className="text-base sm:text-lg text-left p-[8px] bg-gray-100 font-semibold mb-2 text-gray-700">
                                                                <i className="fas fa-file-invoice mr-2 text-gray-600"></i>
                                                                Invoice Info
                                                            </h3>
                                                            <p className='mt-2 text-sm sm:text-base text-left'>
                                                                <span className="font-medium m-2 mt-4"><i className="fas fa-warehouse mr-1 text-gray-400"></i>Warehouse:</span>
                                                                {sale.warehouse}
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
                                                                        <th className="text-gray-700 py-2 px-2 sm:px-4 border-b text-left bg-gray-100">Product name</th>
                                                                        <th className="text-gray-700 py-2 px-2 sm:px-4 border-b text-left bg-gray-100">Variation</th>
                                                                        <th className="text-gray-700 py-2 px-2 sm:px-4 border-b text-left bg-gray-100">Adjustment Type</th>
                                                                        <th className="text-gray-700 py-2 px-2 sm:px-4 border-b text-left bg-gray-100">Product Cost</th>
                                                                        <th className="text-gray-700 py-2 px-2 sm:px-4 border-b text-left bg-gray-100">Qty</th>
                                                                        <th className="text-gray-700 py-2 px-2 sm:px-4 border-b text-left bg-gray-100">Sub total</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {sale.productsData.map((product) => (
                                                                        <tr key={product._id} className="text-gray-700">
                                                                            <td className="py-2 px-2 sm:px-4 border-b text-left">{product.name}</td>
                                                                            <td className="py-2 px-2 sm:px-4 border-b text-left">{product.variationValue}</td>
                                                                            <td className="py-2 px-2 sm:px-4 border-b text-left">{product.AdjustmentType}</td>
                                                                            <td className="py-2 px-2 sm:px-4 border-b text-left">{currency} {formatWithCustomCommas(product.productCost)}</td>
                                                                            <td className="py-2 px-2 sm:px-4 border-b text-left">{product.quantity}</td>
                                                                            <td className="py-2 px-2 sm:px-4 border-b text-left">{currency} {formatWithCustomCommas(product.subtotal)}</td>
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
                                                                        <td className="py-2 px-2 sm:px-4 border-b text-left font-semibold">Total</td>
                                                                        <td className="py-2 px-2 sm:px-4 border-b text-left font-semibold">{currency} {formatWithCustomCommas(sale.grandTotal)}</td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Footer */}
                                                <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row justify-end gap-2 sm:gap-0">
                                                    {openViewSale === sale._id && (
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
                onConfirm={() => handleDelete(adjustmentToDelete)}  // Confirm delete
                message="Are you sure you want to delete this adjustment?"
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
            {/* Error and Response Messages */}
            <div className="absolute bottom-28 right-0 left-0">
                {responseMessage && (
                    <p className="text-color px-5 py-2 rounded-md bg-green-100 text-center mx-auto max-w-sm">
                        {responseMessage}
                    </p>
                )}
            </div>
        </div >
    );
}

export default ViewAdjustmentBody;
