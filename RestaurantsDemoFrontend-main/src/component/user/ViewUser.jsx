

import { useEffect, useState, useRef, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Loader from '../utill/Loader';
import '../../styles/login.css';
import defaultAvatar from '../../img/user.png';
import PaginationDropdown from '../utill/Pagination';
import { toast } from 'react-toastify';
import ConfirmationModal from '../common/deleteConfirmationDialog';
import { UserContext } from '../../context/UserContext';
import { useSidebar } from '../../context/SidebarContext';
const CryptoJS = require("crypto-js");

function ViewUserBody() {
    const [searchedUser, setSearchedUser] = useState([]);
    const [keyword, setKeyword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [page, setPage] = useState(1);
    const [size, setSize] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const debounceTimeout = useRef(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [permissionData, setPermissionData] = useState({});
    const { userData } = useContext(UserContext);
    const { sidebarHidden } = useSidebar();
    const Rkey = process.env.REACT_APP_SUPER_ADMIN_KEY
    const decKey = "be5&2N*alr%hJ-oG";
    const currentType = userData?.role || null;

    useEffect(() => {
        if (userData?.permissions) {
            setPermissionData(extractPermissions(userData.permissions));
        }
    }, [userData]);

    const acc = currentType
        ? CryptoJS.AES.encrypt(
            CryptoJS.AES.encrypt(currentType, Rkey).toString(),
            decKey
        ).toString()
        : null;

    const extractPermissions = (permissions) => {
        let extractedPermissions = {};

        Object.keys(permissions).forEach((category) => {
            Object.keys(permissions[category]).forEach((subPermission) => {
                extractedPermissions[subPermission] = permissions[category][subPermission];
            });
        });

        return extractedPermissions;
    };

    const fetchUserData = async () => {
        setErrorMessage('');
        try {
            setLoading(true);
            const params = {
                'page[size]': size,
                'page[number]': page,
                'acc': acc,
            };

            const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/fetchUsers`, {
                params,
            });

            const sortedUsers = response.data.users.map(user => {
                const truePermissionsCount = Object.values(user.permissions[0] || {})
                    .filter(permission => permission === true).length;
                return { ...user, truePermissionsCount };
            }).sort((a, b) => b.truePermissionsCount - a.truePermissionsCount);

            setSearchedUser(sortedUsers);
            setTotalPages(response.data.totalPages || 0);
            setKeyword('');
        } catch (error) {
            console.error('Fetch user data error:', error);
            setErrorMessage('No users found.');
            setSearchedUser([]);
        } finally {
            setLoading(false);
        }
    };

    const handleNextPage = () => {
        if (page < totalPages) setPage(prev => prev + 1);
    };

    const handlePrevPage = () => {
        if (page > 1) setPage(prev => prev - 1);
    };

    const handleDelete = async (_id) => {
        setErrorMessage('');
        try {
            await axios.delete(`${process.env.REACT_APP_BASE_URL}/api/DeleteUser/${_id}`);
            setSearchedUser(searchedUser.filter(user => user._id !== _id));
            toast.success('User deleted successfully!', { autoClose: 2000 });
            setRefreshKey(prevKey => prevKey + 1);
        } catch (error) {
            console.error('Delete user error:', error);
            toast.error('Error deleting user!', { autoClose: 2000 });
        }
    };

    const showConfirmationModal = (userId) => {
        setUserToDelete(userId);
        setIsModalOpen(true);
    };

    const searchUser = async (query) => {
        setLoading(true);
        setErrorMessage("");

        try {
            const params = { keyword: query, acc: acc };
            const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/searchUser`, {
                params,
            });

            if (response.data.users?.length > 0) {
                setSearchedUser(response.data.users);
            } else {
                setSearchedUser([]);
                setErrorMessage("No users found for the given query.");
            }
        } catch (error) {
            console.error("Search error:", error);
            setSearchedUser([]);
            setErrorMessage("No users found for the given query.");
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
                setErrorMessage("");
                fetchUserData(); // Fetch all users when search is cleared
            } else {
                searchUser(value);
            }
        }, 100);
    };

    const handleKeyDown = (e) => {
        const value = e.target.value;
        if (e.key === 'Backspace' && value === '') {
            fetchUserData();
        }
    };

    useEffect(() => {
        if (keyword.trim() === '') {
            fetchUserData();
        }
    }, [keyword, page, size, refreshKey]);

    const handleStatusChange = async (userId, currentStatus) => {
        if (currentType !== 'superAdmin') {
            toast.error('You do not have permission to change account status.');
            return;
        }

        try {
            const newStatus = currentStatus === 'blocked' ? 'active' : 'blocked';
            const response = await axios.put(
                `${process.env.REACT_APP_BASE_URL}/api/updateUserStatus/${userId}`,
                { accountStatus: newStatus }
            );
            if (response.data.status === 'success') {
                setSearchedUser(prevUsers =>
                    prevUsers.map(user =>
                        user._id === userId ? { ...user, accountStatus: newStatus } : user
                    )
                );

                toast.success(response.data.message ||
                    `User ${newStatus === 'blocked' ? 'blocked' : 'unblocked'} successfully!`
                );
            } else {
                toast.error(response.data.message || 'Failed to update user status.');
            }

        } catch (err) {
            console.error('❌ Error updating user status:', err);
            if (err.response) {
                const message =
                    err.response.data?.message ||
                    `Request failed with status ${err.response.status}`;

                toast.error(message);
            } else if (err.request) {
                toast.error('No response from server. Please check your connection.');
            } else {
                toast.error(`Error: ${err.message}`);
            }
        }
    };

    return (
        <div className={`bg-[#F9FAFB] absolute top-[80px] min-h-[100vh] p-3 md:p-5 transition-all duration-300 ${sidebarHidden ? 'left-0 w-full' : 'left-0 w-full md:left-[220px] md:w-[calc(100vw-220px)] 2xl:left-[18%] 2xl:w-[82%]'}`}>
            <div className='flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 mb-4'>
                <div className="relative w-full lg:w-auto">
                    <div className="relative">
                        <input
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            name='username'
                            type="text"
                            placeholder="Search by username..."
                            className="searchBox w-full lg:w-80 pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:border-transparent"
                        />
                        <button className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
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
                    </div>
                </div>
                {permissionData.create_user && (
                    <Link
                        to={'/createUser'}
                        className="submit rounded-md px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 w-full lg:w-40 text-center block whitespace-nowrap"
                    >
                        Create User
                    </Link>
                )}
            </div>

            {loading ? (
                <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-white/80 z-50">
                    <Loader />
                </div>
            ) : errorMessage ? (
                <div className=" ">
                    <p className="text-red-600 px-5 py-2 rounded-md bg-red-100 mt-5 text-center inline-block">
                        {errorMessage}
                    </p>
                </div>
            ) : searchedUser.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border border-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profile</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">First Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mobile</th>
                                {currentType === 'superAdmin' && (
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Account Status
                                    </th>
                                )}
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {searchedUser.map((user) => (
                                <tr key={user._id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-m text-gray-900">
                                        <img
                                            style={{ width: "40px", height: "40px" }}
                                            className="rounded-full"
                                            alt="Profile"
                                            src={user.profileImage ? user.profileImage : defaultAvatar}
                                        />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-m text-gray-900 text-left">{user.username}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-m text-gray-900 text-left">{user.firstName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-m text-gray-900 text-left">{user.lastName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-m text-gray-900 text-left">{user.role}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-m text-gray-900 text-left">{user.mobile}</td>
                                    {currentType === 'superAdmin' && (
                                        <td className="px-6 py-4 whitespace-nowrap text-m text-gray-900 text-center">
                                            <div
                                                className={`py-2 px-4 cursor-pointer rounded-md text-white 
                                                 ${user.accountStatus === 'blocked' ? 'bg-[#35AF87] hover:bg-[#16796E]' : 'bg-red-700 hover:bg-red-800'}
                                                 `}
                                                onClick={() => handleStatusChange(user._id, user.accountStatus)}
                                            >
                                                {user.accountStatus === 'blocked' ? 'Unblock' : 'Block'}
                                            </div>
                                        </td>
                                    )}


                                    <td className="px-6 h-5 whitespace-nowrap text-m text-gray-900">
                                        <div className='flex items-center justify-end'>
                                            {permissionData.edit_user && (
                                                <Link to={`/editprofilebyadmin/${user._id}`}
                                                    className="text-blue-500 hover:text-blue-700 font-bold py-1 px-2 mr-2 flex items-center"
                                                    style={{ background: 'transparent' }}
                                                >
                                                    <i className="fas fa-edit mr-1"></i>
                                                </Link>
                                            )}
                                            {permissionData.delete_user && (
                                                <button
                                                    onClick={() => showConfirmationModal(user._id)}
                                                    className="text-red-500 hover:text-red-700 font-bold py-1 px-2 flex items-center"
                                                    style={{ background: 'transparent' }}
                                                >
                                                    <i className="fas fa-trash mr-1"></i>
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
                <div className="text-center mt-5">
                    <p>No data available</p>
                </div>
            )}

            <ConfirmationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={() => handleDelete(userToDelete)}
                message="Are you sure you want to delete this user?"
            />

            {searchedUser.length > 0 && (
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
    );
}

export default ViewUserBody;