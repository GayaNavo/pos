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
import { toast } from 'react-toastify';

function CreateSuplierBody() {
    // State management
    const [name, setName] = useState('');
    const [mobile, setMobile] = useState('');
    const [companyName, setCompany] = useState('');
    const [error, setError] = useState('');
    const [progress, setProgress] = useState(false);
    const [loading, setLoading] = useState(true);
    const [responseMessage, setResponseMessage] = useState('');
    const navigate = useNavigate();

    // Initial page load
    useEffect(() => {
        const timer = setTimeout(() => {
            setLoading(false);
        }, 200);
        return () => clearTimeout(timer);
    }, []);

    // Handle submit 
    const handleSubmit = (event) => {
        event.preventDefault();
        setError('');
        setResponseMessage('');
        setProgress(true);

        let isValid = true;

        //  Name validation
        if (!name || name.trim() === "") {
            toast.error('Supplier name is required.', {
                autoClose: 3000,
                className: "custom-toast"
            });
            isValid = false;
        }

        //  Mobile validation (optional)
        if (mobile && mobile.trim() !== "") {
            const mobileRegex = /^0\d{9}$/;
            if (!mobileRegex.test(mobile)) {
                toast.error('Mobile number must start with 0 and be exactly 10 digits.', {
                    autoClose: 3000,
                    className: "custom-toast"
                });
                isValid = false;
            }
        }

        if (!isValid) {
            setProgress(false);
            return;
        }

        //  Prepare supplier data
        const suplierData = {
            name: name.trim(),
            companyName: companyName?.trim() || "",
            mobile: mobile?.trim() || "",
        };

        axios.post(`${process.env.REACT_APP_BASE_URL}/api/createSuplier`, suplierData)
            .then(result => {
                if (result.data.status === "success") {
                    toast.success(
                        "Supplier created successfully!",
                        { autoClose: 2000 },
                        { className: "custom-toast" }
                    );
                    navigate('/viewSuplier');
                } else {
                    toast.error(
                        "User not added: " + result.data.message,
                        { autoClose: 2000 },
                        { className: "custom-toast" }
                    );
                }
            })
            .catch(error => {
                if (error.response) {
                    toast.error(
                        "User not added, please try again later. " + error.response.data.message,
                        { autoClose: 2000 },
                        { className: "custom-toast" }
                    );
                } else {
                    toast.error(
                        "User not added: " + error.message,
                        { autoClose: 2000 },
                        { className: "custom-toast" }
                    );
                }
            })
            .finally(() => {
                setProgress(false);
            });
    };

    // Handle clear operation
    const handleClear = () => {
        setName('');
        setCompany('');
        setMobile('');
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
                    <h2 className="text-lightgray-300  m-0 p-0 text-2xl">Create Supplier</h2>
                </div>
                <div>
                    <Link className='px-4 py-1.5 border border-[#35AF87] text-[#35AF87] rounded-md transition-colors duration-300 hover:bg-[#35AF87] hover:text-white' to={'/viewSuplier'}>Back</Link>
                </div>
            </div>
            <div className="bg-white mt-[20px] min-h-[100vh] w-full rounded-2xl px-8 shadow-md pb-10">
                <div className="flex min-h-full flex-1 flex-col px-2 py-12 lg:px-8">
                    <div className="flex items-center justify-center">
                        <img className='w-[120px] h-[120px] rounded mb-10' src={avatarIcon} alt="icon" />
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="grid grid-cols-2 gap-x-10 gap-y-9">
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

                                {/* Company Name field */}
                                <div className="mt-5">
                                    <label className="block text-sm font-medium leading-6 text-gray-900 text-left">Company Name </label>
                                    <input
                                        id="companyName"
                                        name="companyName"
                                        type="text"

                                        placeholder='Hemas'
                                        value={companyName}
                                        onChange={(e) => setCompany(e.target.value)}
                                        autoComplete="organization"
                                        className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                    />
                                </div>

                                {/* Mobile number field */}
                                <div className="mt-5">
                                    <label htmlFor="mobile" className="block text-sm font-medium leading-6 text-gray-900 text-left">
                                        Mobile number
                                    </label>
                                    <div className="mt-0">
                                        <input
                                            id="mobile"
                                            name="mobile"
                                            type="text"
                                            placeholder='0 xx xxxx xxx'
                                            value={mobile}
                                            maxLength={10}
                                            onChange={(e) => {
                                                let value = e.target.value;
                                                // Only allow digits
                                                if (!/^\d*$/.test(value)) return;
                                                // If first character is entered and it's not '0', prevent it
                                                if (value.length === 1 && value !== '0') {
                                                    setMobile('');
                                                    return;
                                                }
                                                // Limit to 10 digits
                                                if (value.length > 10) return;

                                                setMobile(value);
                                            }}
                                            onKeyDown={(e) => {
                                                const allowedKeys = ['Backspace', 'ArrowLeft', 'ArrowRight', 'Delete', 'Tab'];
                                                if (!/^\d$/.test(e.key) && !allowedKeys.includes(e.key)) {
                                                    e.preventDefault();
                                                }
                                            }}
                                            className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                        />
                                        <p className="text-gray-500 text-left text-xs mt-1">
                                            Must start with 0 and be exactly 10 digits
                                        </p>
                                    </div>
                                </div>

                            </div>
                        </div>
                        <div className="container mx-auto text-left">
                            <div className='mt-10 flex justify-start'>
                                <button type='submit' className="button-bg-color  button-bg-color:hover flex-none rounded-md bg-indigo-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 w-[100px] text-center focus-visible:outline-offset-2 focus-visible:outline-indigo-500">
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

export default CreateSuplierBody;
