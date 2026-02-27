

import { useState, useEffect, useRef, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Loader from '../utill/Loader';
import '../../styles/login.css';
import { read, utils } from "xlsx";
import PaginationDropdown from '../utill/Pagination';
import { toast } from 'react-toastify';
import ConfirmationModal from '../common/deleteConfirmationDialog';
import { UserContext } from '../../context/UserContext';
import { useSidebar } from '../../context/SidebarContext';

function ViewCustomersBody() {
    const [customerData, setCustomerData] = useState([]);
    const [keyword, setKeyword] = useState('');
    const [searchedCustomer, setSearchedCustomer] = useState([]);
    const [loading, setLoading] = useState(false);
    const [openPopup, setOpenPopup] = useState(false);
    const [excelData, setExcelData] = useState([]);
    const [error, setError] = useState('');
    const [successStatus, setSuccessStatus] = useState('');
    const [page, setPage] = useState(1);
    const [size, setSize] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [customerToDelete, setCustomerToDelete] = useState(null);
    const debounceTimeout = useRef(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const navigate = useNavigate();
    const [permissionData, setPermissionData] = useState({});
    const { userData } = useContext(UserContext);
    const { sidebarHidden } = useSidebar();

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

    const fetchCustomerData = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/fetchCustomer`, {
                params: {
                    sort: '-createdAt',
                    'page[size]': size,
                    'page[number]': page,
                },
            });
            setCustomerData(response.data.customers);
            setSearchedCustomer(response.data.customers);
            setTotalPages(response.data.totalPages || 0);
            setKeyword('');
        } catch (error) {
            setError('No customers found.');
            setCustomerData([]);
            setSearchedCustomer([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (keyword.trim() === '') {
            fetchCustomerData();
        }
    }, [keyword, page, size, refreshKey]);

    const handleNextPage = () => {
        if (page < totalPages) setPage(prev => prev + 1);
    };

    const handlePrevPage = () => {
        if (page > 1) setPage(prev => prev - 1);
    };

    const handleDelete = async (_id) => {
        setError('');
        setSuccessStatus('');
        try {
            await axios.delete(`${process.env.REACT_APP_BASE_URL}/api/DeleteCustomer/${_id}`);
            setCustomerData(customerData.filter(customer => customer._id !== _id));
            toast.success('Customer deleted successfully!', { autoClose: 2000 });
            setRefreshKey(prevKey => prevKey + 1);
            fetchCustomerData('');
        } catch (error) {
            toast.error('Customer deleted unsuccessful!', { autoClose: 2000 });
        }
    };

    const showConfirmationModal = (customerId) => {
        setCustomerToDelete(customerId); // Set the sale ID to be deleted
        setIsModalOpen(true);  // Open the confirmation modal
    };

    const searchCustomer = async (query) => {
        setLoading(true);
        setError(""); // Clear any previous error messages

        try {
            if (!query.trim()) {
                // If the query is empty, reset to all products
                setSearchedCustomer(customerData); // Reset to the initial list
                setSuccessStatus("");
                return;
            }

            const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/searchCustomer`, {
                params: { keyword: query }, // Send the keyword parameter
            });
            console.log("API Response: ", response.data);
            if (response.data.customers && response.data.customers.length > 0) {
                setSearchedCustomer(response.data.customers);
                setSuccessStatus("");
            } else {
                setSearchedCustomer([]); // Clear the table
                setError("No customers found for the given query."); // Set error message
            }
        } catch (error) {
            console.error("Search product error:", error);
            setSearchedCustomer([]); // Clear the table
            setError("No customers found for the given query.");
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
                setSearchedCustomer(customerData); // Reset to full list
            } else {
                searchCustomer(value); // Call the search API with the entered query
            }
        }, 100); // Adjust debounce delay as needed
    };

    const handleKeyDown = (e) => {
        const value = e.target.value;

        // If backspace is pressed and the input becomes empty, reset the searchedBaseUnits
        if (e.key === 'Backspace' && value === '') {
            setSearchedCustomer([]);
        }
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = read(data, { type: "array" });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const rawData = utils.sheet_to_json(worksheet, { defval: "" });

                const formattedData = rawData
                    .map(row => {
                        const cleaned = {};
                        Object.keys(row).forEach(key => {
                            cleaned[key.trim().toLowerCase()] = String(row[key]).trim();
                        });
                        return cleaned;
                    })
                    .filter(row => row.name && row.mobile);

                const validMobileRegex = /^0\d{9}$/;
                const invalidMobiles = formattedData.filter(cust => !validMobileRegex.test(cust.mobile));

                if (invalidMobiles.length > 0) {
                    const invalidList = invalidMobiles.map(c => `${c.name} (${c.mobile})`).join(", ");
                    const errorMsg = `Invalid mobile numbers found for: ${invalidList}. Each number must start with 0 and contain exactly 10 digits.`;

                    console.warn(errorMsg);
                    toast.error("Invalid mobile numbers detected. Please fix and re-upload.", {
                        autoClose: 2500,
                        className: "custom-toast",
                    });
                    setExcelData([]);
                    return;
                }

                setExcelData(formattedData);
                toast.success("File processed successfully." ,{ autoClose: 2000, className: "custom-toast" });
                setError(null);
                console.log("Processed Customer Data:", formattedData);
            } catch (err) {
                console.error("Error processing file:", err);
                setExcelData([]);
                toast.error("Error reading file. Please check the format.", {
                    autoClose: 2500,
                    className: "custom-toast",
                });
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleSave = async () => {
        setError('');
        setSuccessStatus('');

        if (!excelData || excelData.length === 0) {
            toast.error('No data to save. Please upload a valid file.', { autoClose: 2000, className: "custom-toast" });
            return;
        }

        try {
            const response = await axios.post(
                `${process.env.REACT_APP_BASE_URL}/api/importCustomers`,
                { customers: excelData }
            );

            if (response.status === 201) {
                toast.success('Customer imported successfully!', { autoClose: 2000, className: "custom-toast" });

                setTimeout(() => {
                    navigate("/viewCustomers");
                }, 2000);

                setExcelData([]);
                setOpenPopup(false);
                fetchCustomerData(); // call outside nested definition
            } else {
                toast.error('Failed to save customers. Please try again.', { autoClose: 2000, className: "custom-toast" });
            }
        } catch (error) {
            setOpenPopup(false);

            const duplicates = error.response?.data?.duplicates || [];
            if (error.response?.data?.message === 'Some customers already exist') {
                toast.error(`Customer(s) already exist: ${JSON.stringify(duplicates)}`, { autoClose: 2000, className: "custom-toast" });
            } else {
                toast.error('Failed to save customers. Please try again.', { autoClose: 2000, className: "custom-toast" });
            }
        }
    };

    const handleClosePopup = () => {
        setOpenPopup(false);
    };

    return (
        <div className={`relative background-white absolute top-[80px] min-h-[100vh] p-3 md:p-5 transition-all duration-300 ${sidebarHidden ? 'left-0 w-full' : 'left-0 w-full md:left-[220px] md:w-[calc(100vw-220px)] 2xl:left-[18%] 2xl:w-[82%]'}`}>
            <div className='flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 mb-4'>
                <div className="relative w-full lg:w-auto">
                    <form
                        className="flex items-center"
                    >
                        <input
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            name='keyword'
                            type="text"
                            placeholder="Search by  customer name..."
                            className="searchBox w-full lg:w-80 pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:border-transparent"
                            value={keyword}
                        />
                        <button type="button" className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
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
                <div className="flex flex-row items-center gap-2 w-full lg:w-auto">
                    {permissionData.import_customer && (
                        <button onClick={() => setOpenPopup(true)} className="submit rounded-md px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 flex-1 lg:w-40 text-center block whitespace-nowrap">
                            Import Customer
                        </button>
                    )}
                    {permissionData.create_customer && (
                        <Link
                            to={'/createCustomer'}
                            className="submit rounded-md px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 flex-1 lg:w-40 text-center block whitespace-nowrap"
                        >
                            Create Customer
                        </Link>
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
            ) : searchedCustomer.length > 0 ? (
                <div className="overflow-x-auto rounded-xl shadow-sm border border-[#D4AF37]/20">
                    <table className="min-w-full bg-white">
                        <thead className="bg-[#1F5F3B]">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider rounded-tl-xl">Customer Name</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Mobile</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Address</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Created On</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider rounded-tr-xl">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {searchedCustomer.map((searchedCustomer) => (
                                <tr key={searchedCustomer._id} className="hover:bg-[#FFF6E5]/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#4A2C1D]">{searchedCustomer.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#4A2C1D]">{searchedCustomer.mobile}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#4A2C1D]">{searchedCustomer.address}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#4A2C1D]">{new Date(searchedCustomer.createdAt).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className='flex items-center justify-end gap-1'>
                                            {permissionData.edit_customer && (
                                                <Link to={`/editCustomerDetails/${searchedCustomer._id}`}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1F5F3B]/10 text-[#1F5F3B] hover:bg-[#1F5F3B] hover:text-white transition-all"
                                                >
                                                    <i className="fas fa-edit text-xs"></i>
                                                </Link>
                                            )}
                                            {permissionData.delete_customer && (
                                                <button
                                                    onClick={() => showConfirmationModal(searchedCustomer._id)}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-100 text-red-600 hover:bg-red-600 hover:text-white transition-all"
                                                >
                                                    <i className="fas fa-trash text-xs"></i>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : customerData.length > 0 ? (
                <div className="overflow-x-auto rounded-xl shadow-sm border border-[#D4AF37]/20">
                    <table className="min-w-full bg-white">
                        <thead className="bg-[#1F5F3B]">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider rounded-tl-xl">Customer Name</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Mobile</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Created On</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider rounded-tr-xl">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {customerData.map((user) => (
                                <tr key={user._id} className="hover:bg-[#FFF6E5]/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#4A2C1D]">{user.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#4A2C1D]">{user.mobile}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#4A2C1D]">{new Date(user.createdAt).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className='flex items-center justify-end gap-1'>
                                            {permissionData.edit_customer && (
                                                <Link to={`/editCustomerDetails/${user._id}`}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1F5F3B]/10 text-[#1F5F3B] hover:bg-[#1F5F3B] hover:text-white transition-all"
                                                >
                                                    <i className="fas fa-edit text-xs"></i>
                                                </Link>
                                            )}
                                            {permissionData.delete_customer && (
                                                <button
                                                    onClick={() => showConfirmationModal(user._id)}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-100 text-red-600 hover:bg-red-600 hover:text-white transition-all"
                                                >
                                                    <i className="fas fa-trash text-xs"></i>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-white/80 z-50">
                    <Loader />
                </div>
            )}
            <ConfirmationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}  // Close modal
                onConfirm={() => handleDelete(customerToDelete)}  // Confirm delete
                message="Are you sure you want to delete this customer?"
            />

            {customerData.length > 0 && (
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
            {openPopup && (
                <>
                    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-40" onClick={() => setOpenPopup(false)}></div>
                    <div className="fixed inset-0 flex items-center justify-center z-50">
                        <div className="bg-white p-6 rounded-lg shadow-lg w-1/2 h-[450px] overflow-y-auto">
                            <h2 className="text-lg font-semibold mb-4">Import Customer</h2>
                            <div>
                                <input
                                    type="file"
                                    accept=".xlsx, .xls"
                                    onChange={handleFileChange}
                                    className=""
                                />
                            </div>
                            <div className='mt-10'>
                                {/* <label className="block text-sm font-medium leading-6 text-gray-900 text-left">Username : Required</label> */}
                                <label className="block text-sm font-medium leading-6 text-gray-900 text-left">Name : Required</label>
                                {/* <label className="block text-sm font-medium leading-6 text-gray-900 text-left">NIC : Required</label> */}
                                <label className="block text-sm font-medium leading-6 text-gray-900 text-left">Mobile : Required</label>
                                {/* <label className="block text-sm font-medium leading-6 text-gray-900 text-left">Country : Required</label> */}
                                {/* <label className="block text-sm font-medium leading-6 text-gray-900 text-left">City : Required</label> */}
                                <label className="block text-sm font-medium leading-6 text-gray-900 text-left">Address </label>
                            </div>
                            <div>
                                <button onClick={handleSave} className="submit flex-none rounded-md px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 w-40 text-center">
                                    Save
                                </button>
                                <button onClick={handleClosePopup} className="mt-20 inline-flex ml-2 justify-center rounded-md bg-gray-600 py-2.5 px-4 text-sm font-medium text-white shadow-sm hover:bg-gray-500 focus:outline-none focus:ring-2 w-[100px] focus:ring-gray-500 focus:ring-offset-2">
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
            <div className='mt-5'>
                {/* Error and Response Messages */}
                {/* {error && <p className="text-red-600 px-5 py-2 rounded-md bg-red-100 mt-5 text-center inline-block">{error}</p>} */}
                {successStatus && <p className="text-color px-5 py-2 rounded-md bg-green-100 mt-5 text-center inline-block">{successStatus}</p>}
            </div>
        </div>
    );
}

export default ViewCustomersBody;