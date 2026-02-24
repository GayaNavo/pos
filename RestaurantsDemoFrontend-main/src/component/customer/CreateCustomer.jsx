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
import '../../styles/role.css';
import { Link, useNavigate } from 'react-router-dom';
import avatarIcon from '../../img/profile.png';
import Loader from '../utill/Loader';
import { isValidMobileInput, isAllowedKey } from '../utill/MobileValidation';
import { toast } from 'react-toastify';

function CreateCustomerBody() {
    // State managemen
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [mobile, setMobile] = useState('');
    const [error, setError] = useState('');
    const [progress, setProgress] = useState(false);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const [responseMessage, setResponseMessage] = useState('');

    // Initial page load
    useEffect(() => {
        // Simulate initial loading
        const timer = setTimeout(() => {
            setLoading(false);
        }, 200);
        return () => clearTimeout(timer);
    }, []);

    // Handle form submission
    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setResponseMessage('');
        setProgress(true);

        try {
            // Mobile number validation
            const mobileRegex = /^0\d{9}$/;
            if (!mobileRegex.test(mobile)) {
                setError('Invalid mobile number. Format: 0xxxxxxxxx (10 digits)');
                setProgress(false);
                return;
            }

            // Customer data (no country, city, or nic)
            const customerData = {
                name,
                mobile,
                address,
            };

            // Axios request to add user
            const response = await axios.post(
                `${process.env.REACT_APP_BASE_URL}/api/createCustomer`,
                customerData
            );

            if (response.data && response.data.message) {
                toast.success(
                    response.data.message,
                    { autoClose: 2000 },
                    { className: "custom-toast" }
                );
                setTimeout(() => {
                    navigate('/viewCustomers');
                }, 1000);
            } else {
                toast.success(
                    "Customer created successfully",
                    { autoClose: 2000 },
                    { className: "custom-toast" }
                );
                setTimeout(() => {
                    navigate('/viewCustomers');
                }, 1000);
            }
        } catch (error) {
            const errorMessage =
                error.response?.data?.message || 'An error occurred while adding the customer. Please try again.';
            toast.error(errorMessage || "Error creating customer",
                { autoClose: 2000 },
                { className: "custom-toast" });
            console.error('Error:', errorMessage, error);
        } finally {
            setProgress(false);
        }
    };

    // Handle clear operation
    const handleClear = () => {
        setName('');
        setMobile('');
        setAddress('');
        setError('');
        setResponseMessage('');
    };

    return (
        <div className='background-white relative left-[18%] w-[82%] min-h-[100vh] p-5'>
            {(loading || progress) && (
                <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-white/80 z-50">
                    <Loader />
                </div>
            )}
            <div className='flex mt-20 justify-between items-center'>
                <div>
                    <h2 className="text-lightgray-300 m-0 p-0 text-2xl">Create Customer</h2>
                </div>
                <div>
                    <Link className='px-4 py-1.5 border border-[#35AF87] text-[#35AF87] rounded-md transition-colors duration-300 hover:bg-[#35AF87] hover:text-white' to={'/viewCustomers'}>Back</Link>
                </div>
            </div>
            <div className="bg-white mt-[20px] min-h-[100vh] w-full rounded-2xl px-8 shadow-md pb-10">
                <div className="flex min-h-full flex-1 flex-col px-2 py-12 lg:px-8">
                    <div className="flex items-center justify-center">
                        <img className='w-[120px] h-[120px] rounded mb-10' src={avatarIcon} alt="icon" />
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                            {/* <div className="flex space-x-16"> */}
                            {/* <div className="flex-1"> */}
                            {/* Username field */}
                            {/* <div className="mt-2">
                                    <label className="block text-sm font-medium leading-6 text-gray-900 text-left">User Name <span className='text-red-500'>*</span></label>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        required
                                        placeholder='sample@gmail.com'
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        autoComplete="email"
                                        className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                    />
                                </div> */}

                            {/* Address field (not required) */}
                            {/* <div className="mt-5">
                                    <label className="block text-sm font-medium leading-6 text-gray-900 text-left">Address</label>
                                    <textarea
                                        id="address"
                                        name="address"
                                        placeholder='No 46, Rock view Garden Thennekumbura'
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        autoComplete="given-name"
                                        className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                    />
                                </div> */}
                            {/* </div> */}

                            <div className="flex-1">
                                {/* Name field */}
                                <div className="mt-2">
                                    <label className="block text-sm font-medium leading-6 text-gray-900 text-left">Name <span className='text-red-500'>*</span></label>
                                    <input
                                        id="name"
                                        name="name"
                                        type="text"
                                        required
                                        placeholder='Ben'
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        autoComplete="given-name"
                                        className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                    />
                                </div>

                                {/* Mobile number field */}
                                <div className="mt-5">
                                    <label htmlFor="mobile" className="block text-sm font-medium leading-6 text-gray-900 text-left">
                                        Mobile number <span className='text-red-500'>*</span>
                                    </label>
                                    <div className="mt-0">
                                        <input
                                            id="mobile"
                                            name="mobile"
                                            type="text"
                                            required
                                            placeholder='0 xx xxxx xxx'
                                            value={mobile}
                                            onChange={(e) => {
                                                const inputValue = e.target.value;
                                                if (isValidMobileInput(inputValue)) {
                                                    setMobile(inputValue);
                                                }
                                            }}
                                            onKeyDown={(e) => {
                                                if (!isAllowedKey(e.key)) {
                                                    e.preventDefault();
                                                }
                                            }}
                                            maxLength={10}
                                            className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                        />
                                         <p className="text-gray-500 text-left text-xs mt-1">
                                Must start with 0 and be exactly 10 digits
                            </p>
                                    </div>
                                </div>

                                <div className="mt-5">
                                    <label className="block text-sm font-medium leading-6 text-gray-900 text-left">Address</label>
                                    <textarea
                                        id="address"
                                        name="address"
                                        placeholder='No 46, Rock view Garden Thennekumbura'
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        autoComplete="given-name"
                                        className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="container mx-auto text-left">
                            <div className='mt-10 flex justify-start'>
                                <button
                                    type='submit'
                                    className={`button-bg-color  button-bg-color:hover flex-none rounded-md bg-indigo-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 w-[100px] text-center focus-visible:outline-offset-2 focus-visible:outline-indigo-50`}
                                >
                                    Save
                                </button>

                                <button
                                    type="button"
                                    className="inline-flex ml-2 justify-center rounded-md bg-gray-600 py-2.5 px-4 text-sm font-medium text-white shadow-sm hover:bg-gray-500 focus:outline-none focus:ring-2 w-[100px]  focus:ring-gray-500 focus:ring-offset-2"
                                    onClick={handleClear}
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                    </form>

                    {/* Error and Response Messages */}
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
    );
}

export default CreateCustomerBody;
