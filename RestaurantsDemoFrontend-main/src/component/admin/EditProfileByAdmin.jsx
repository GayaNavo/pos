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

import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useParams, Link, useNavigate } from 'react-router-dom';
import '../../styles/dashboardBody.css';
import Loader from '../utill/Loader';
import { UserContext } from '../../context/UserContext';
import { decryptData } from '../utill/encryptionUtils';
import CryptoJS from 'crypto-js';
import { toast } from 'react-toastify';

function EditProfileByAdmin() {
    const { id } = useParams();
    const [formData, setFormData] = useState({
        username: '',
        firstName: '',
        lastName: '',
        role: '',
        mobile: '',
        profileImage: ''
    });
    const [progress, setProgress] = useState(false);
    const [errors, setErrors] = useState({});
    const [jobRoles, setJobRoles] = useState([]);
    const [responseMessage, setResponseMessage] = useState('');
    const { userData } = useContext(UserContext);
    const Rkey = process.env.REACT_APP_SUPER_ADMIN_KEY
    const decKey = "be5&2N*alr%hJ-oG";
    const currentType = userData?.role || null;
    const navigate = useNavigate();

    const acc = currentType
        ? CryptoJS.AES.encrypt(
            CryptoJS.AES.encrypt(currentType, Rkey).toString(),
            decKey
        ).toString()
        : null;

    useEffect(() => {
        setProgress(true);
        axios.get(`${process.env.REACT_APP_BASE_URL}/api/getJobRoles`, {
            params: {
                acc: acc
            }
        })
            .then(response => {
                setJobRoles(response.data.jobRoles);
            })
            .catch(error => {
                console.error('Error fetching job roles:', error);
                setErrors(prevErrors => ({ ...prevErrors, general: 'Failed to fetch job roles.' }));
            })
            .finally(() => {
                setProgress(false);
            });
    }, []);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                setProgress(true);
                const params = {
                    'acc': acc,
                    id: id
                };
                const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/fetchUsers`, {
                    params
                });

                const fetchedData = response.data;

                if (!fetchedData.profileImage) {
                    fetchedData.profileImage = '';
                }

                setFormData(fetchedData);
            } catch (error) {
                console.error('Error fetching user data:', error);
                setErrors(prevErrors => ({ ...prevErrors, general: 'Failed to fetch user data.' }));
            } finally {
                setProgress(false);
            }
        };

        fetchProfile();
    }, [id]);

    const encryptedUser = sessionStorage.getItem('user');
    let decryptedUser = null;

    if (encryptedUser) {
        try {
            decryptedUser = decryptData(encryptedUser);
        } catch (error) {
            console.error('Failed to decrypt user data:', error);
            sessionStorage.removeItem('user');
            alert('Session data corrupted. Please log in again.');
            return;
        }
    }

    const handleChange = (e) => {
        setErrors({});
        setResponseMessage('');
        const { name, value } = e.target;
        let updatedFormData = { ...formData, [name]: value };

        if (name === 'mobile') {
            if (!/^\d*$/.test(value)) return;
            if (value.length === 1 && value !== '0') return;
            if (value.length > 10) return;
        }
        if (name === 'username') {
            if (!/^[a-zA-Z0-9@._%+-]*$/.test(value)) return;
            if (value.length > 50) return;
        }

        setFormData(updatedFormData);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setResponseMessage('');
        setProgress(true);

        // Final validation before API call
        const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
        if (!gmailRegex.test(formData.username)) {
            toast.error('Email must be a valid Gmail address (example@gmail.com)');
            setProgress(false);
            return;
        }

        const mobileRegex = /^0\d{9}$/;
        if (!mobileRegex.test(formData.mobile)) {
            toast.error('Mobile number must start with 0 and be exactly 10 digits');
            setProgress(false);
            return;
        }

        const formDataToSubmit = {
            id,
            username: formData.username.toLowerCase(),
            firstName: formData.firstName,
            lastName: formData.lastName,
            role: formData.role,
            mobile: formData.mobile
        };

        try {
            const response = await axios.put(`${process.env.REACT_APP_BASE_URL}/api/updateUser`, formDataToSubmit);

            if (response.data.status === 'success' || response.status === 200) {
                toast.success("Successfully updated the user", { autoClose: 2000, className: "custom-toast" });
                if (decryptedUser && decryptedUser.id === id) {
                    localStorage.setItem('logoutRequired', 'true');
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                } else {
                    setTimeout(() => {
                        navigate("/users");
                    }, 1000);
                }
            } else {
                const errorMessage = response.data.message || "Failed to update the user, please try again";
                toast.error(errorMessage, { autoClose: 2000, className: "custom-toast" });
            }
        } catch (error) {
            console.error('Error updating user:', error);
            const errorMessage = error.response?.data?.message || "Failed to update the user, please try again";
            toast.error(errorMessage, { autoClose: 2000, className: "custom-toast" });
        } finally {
            setProgress(false);
        }
    };

    const handleCancel = () => {
        setFormData(prevData => ({
            ...prevData,
            username: '',
            firstName: '',
            lastName: '',
            role: '',
            mobile: ''
        }));
        setErrors({});
        setResponseMessage('');
    };

    const defaultAvatar = 'https://jingslearning.com/media/images/login-user-head.png';

    return (
        <div className='background-white absolute top-[80px] left-[18%] w-[82%] h-[900px] p-5'>
            {progress && (
                <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-white/80 z-50">
                    <Loader />
                </div>
            )}
            <div className='flex justify-between items-center'>
                <div>
                    <h2 className="text-lightgray-300 m-0 p-0 text-2xl">Edit user</h2>
                </div>
                <div>
                    <Link className='px-4 py-1.5 border border-[#35AF87] text-[#35AF87] rounded-md transition-colors duration-300 hover:bg-[#35AF87] hover:text-white' to={'/users'}>Back</Link>
                </div>
            </div>
            <div className="bg-white mt-[20px] w-full h-[800px] rounded-2xl px-8 shadow-md">
                <div className="flex min-h-full flex-1 flex-col px-2 py-12 lg:px-8">
                    <form onSubmit={handleSubmit}>
                        <div className="flex items-center justify-center h-20 mt-20 relative">
                            <div>
                                <img
                                    style={{ width: "140px", height: "140px" }}
                                    className="rounded-full"
                                    alt="Profile"
                                    src={formData.profileImage || defaultAvatar}
                                    onError={(e) => { e.target.src = defaultAvatar; }}
                                />
                            </div>
                        </div>
                        <div className="flex space-x-6 mt-10" style={{ padding: '40px' }}>
                            <div className="flex-1 space-y-6">
                                <div>
                                    <label htmlFor="firstName" className="block text-sm font-medium leading-6 text-gray-900 text-left">
                                        First name <span className='text-red-500'>*</span>
                                    </label>
                                    <div className="mt-2">
                                        <input
                                            id="firstName"
                                            name="firstName"
                                            type="text"
                                            required
                                            value={formData.firstName}
                                            onChange={handleChange}
                                            placeholder='Alex'
                                            className="pass block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="lastName" className="block text-sm font-medium leading-6 text-gray-900 text-left">
                                        Last Name <span className='text-red-500'>*</span>
                                    </label>
                                    <div className="mt-2">
                                        <input
                                            id="lastName"
                                            name="lastName"
                                            type="text"
                                            required
                                            value={formData.lastName}
                                            onChange={handleChange}
                                            placeholder='Boult'
                                            className="pass block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                        />
                                    </div>
                                </div>

                                {/* Role field */}
                                <div className="mt-5">
                                    <label className="block text-sm font-medium leading-6 text-gray-900 text-left">Select user role <span className='text-red-500'>*</span></label>
                                    <select
                                        id="role"
                                        name="role"
                                        value={formData.role}
                                        onChange={handleChange}
                                        className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                    >
                                        {jobRoles.map((jobRole) => (
                                            <option key={jobRole._id} value={jobRole.roleName}>{jobRole.roleName}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex space-x-4 mt-5">
                                    <button
                                        type="submit"
                                        className="button-bg-color  button-bg-color:hover  inline-flex justify-center rounded-md bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                    >
                                        Save
                                    </button>
                                    <button
                                        onClick={handleCancel}
                                        type="button"
                                        className="inline-flex justify-center rounded-md bg-gray-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 space-y-6">
                                <div className='mb-4'>
                                    <label htmlFor="mobile" className="block text-sm font-medium leading-6 text-gray-900 text-left">
                                        Mobile number <span className='text-red-500'>*</span>
                                    </label>
                                    <div className="mt-2">
                                        <input
                                            id="mobile"
                                            name="mobile"
                                            type="text"
                                            required
                                            value={formData.mobile}
                                            onChange={(e) => {
                                                let value = e.target.value;
                                                if (!/^\d*$/.test(value)) return;
                                                if (value.length === 1 && value !== "0") return;
                                                if (value.length > 10) return;
                                                setFormData({ ...formData, mobile: value });
                                            }}
                                            maxLength={10}
                                            placeholder="0 xx xxx xxxx"
                                            className="pass block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 
                                            focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                        />
                                        <p className="text-gray-400 text-left text-xs mt-1">
                                            Must start with 0 and be exactly 10 digits
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="username" className="block text-sm font-medium text-gray-900 text-left">
                                        Username <span className='text-red-500'>*</span>
                                    </label>
                                    <div className="mt-2">
                                        <input
                                            id="username"
                                            name="username"
                                            type="email"
                                            required
                                            value={formData.username}
                                            onChange={handleChange}
                                            placeholder="example@gmail.com"
                                            className="pass block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {errors.general && (
                            <p className="text-red-600 px-5 py-2 rounded-md bg-red-100 text-center mx-auto max-w-sm">
                                {errors.general}
                            </p>
                        )}

                        {responseMessage && (
                            <p className="text-color px-5 py-2 rounded-md bg-green-100 mt-5 text-center mx-auto max-w-sm">
                                {responseMessage}
                            </p>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
}

export default EditProfileByAdmin;