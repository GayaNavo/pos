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
import { useParams, Link, useNavigate } from 'react-router-dom';
import '../../styles/dashboardBody.css';
import avatarIcon from '../../img/profile.png';
import Loader from '../utill/Loader';
import { isAllowedKey } from '../utill/MobileValidation';
import { toast } from 'react-toastify';

function EditSuplierBody() {
    const { id } = useParams();
    const [formData, setFormData] = useState({
        username: '',
        name: '',
        companyName: '',
        mobile: '',
        address: ''
    });
    const [errors, setErrors] = useState({});
    const [responseMessage, setResponseMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/fetchSupplier`, {
                    params: { id },
                });
                const fetchedData = response.data;
                setFormData({
                    name: fetchedData.name || '',
                    companyName: fetchedData.companyName || '',
                    mobile: fetchedData.mobile || '',
                });
                setLoading(false);
            } catch (error) {
                setErrors({ general: 'Failed to fetch user data.' });
                setLoading(false);
            }
        };
        fetchUserData();
    }, [id]);

    const handleKeyDown = (e) => {
        const key = e.key;
        if (!isAllowedKey(key)) {
            e.preventDefault();
        }
    };

    const handleChange = (e) => {
        setErrors({});
        setResponseMessage('');
        const { name, value } = e.target;
        let updatedFormData = { ...formData, [name]: value };

        // Mobile input restrictions
        if (name === 'mobile') {
            if (!/^\d*$/.test(value)) return;
            if (value.length === 1 && value !== '0') return;
            if (value.length > 10) return;
        }

        // Username/email restrictions
        if (name === 'username') {
            if (!/^[a-zA-Z0-9@._%+-]*$/.test(value)) return;
            if (value.length > 50) return;
        }

        setFormData(updatedFormData);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setErrors({});
        setResponseMessage('');
        setProgress(true);

        let isValid = true;

        //  Name validation
        if (!formData.name || formData.name.trim() === "") {
            toast.error('Supplier name is required.', {
                autoClose: 3000,
                className: 'custom-toast'
            });
            isValid = false;
        }

        //  Mobile validation (optional)
        if (formData.mobile && formData.mobile.trim() !== "") {
            const mobileRegex = /^0\d{9}$/;
            if (!mobileRegex.test(formData.mobile)) {
                toast.error('Mobile number must start with 0 and be exactly 10 digits.', {
                    autoClose: 3000,
                    className: 'custom-toast'
                });
                isValid = false;
            }
        }

        if (!isValid) {
            setProgress(false);
            return;
        }

        //  Prepare the data to submit
        const formDataToSubmit = {
            id,
            name: formData.name.trim(),
            companyName: formData.companyName?.trim() || "",
            mobile: formData.mobile?.trim() || "",
        };

        axios.put(`${process.env.REACT_APP_BASE_URL}/api/editSuplierProfileByAdmin`, formDataToSubmit)
            .then(response => {
                toast.success(response.data.message, { autoClose: 2000, className: "custom-toast" });
                navigate('/viewSuplier');
                setLoading(false);
            })
            .catch(error => {
                const errorMessage = error.response?.data?.message || 'Supplier update failed.';
                toast.error(errorMessage, { autoClose: 2000, className: "custom-toast" });
                setLoading(false);
            })
            .finally(() => {
                setProgress(false);
            });
    };

    const handleClear = () => {
        setFormData({
            name: '',
            companyName: '',
            mobile: '',
        });
        setErrors({});
        setResponseMessage('');
    };

    if (loading) {
        return <p>Loading...</p>;
    }

    return (
        <div className='background-white absolute top-[80px] left-[18%] w-[82%] h-[900px] p-5'>
            {progress && (
                <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-white/80 z-50">
                    <Loader />
                </div>
            )}
            <div className='flex justify-between items-center'>
                <div>
                    <h2 className="text-lightgray-300  m-0 p-0 text-2xl">Edit Suplier</h2>
                </div>
                <div>
                    <Link className='px-4 py-1.5 border border-[#35AF87] text-[#35AF87] rounded-md transition-colors duration-300 hover:bg-[#35AF87] hover:text-white' to={'/viewSuplier'}>Back</Link>
                </div>
            </div>
            <div className="bg-white mt-[20px] w-full h-[800px] rounded-2xl px-8 shadow-md">
                <div className="flex min-h-full flex-1 flex-col px-2 py-12 lg:px-8">
                    <div className="flex items-center justify-center">
                        <img className='w-[120px] h-[120px] rounded mb-10' src={avatarIcon} alt="icon" />
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="grid grid-cols-2 gap-x-10 gap-y-9">
                            {/* <div className="flex space-x-16"> */}
                            <div className="flex-1">
                                {/* Name field */}
                                <div className="mt-2">
                                    <label className="block text-sm font-medium leading-6 text-gray-900 text-left">
                                        Name <span className='text-red-500'>*</span>
                                    </label>
                                    <input
                                        id="name"
                                        name="name"
                                        type="text"
                                        required
                                        placeholder='Ben'
                                        value={formData.name}
                                        onChange={handleChange}
                                        autoComplete="given-name"
                                        className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                    />
                                    {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
                                </div>
                                {/* Company Name field */}
                                <div className="mt-5">
                                    <label className="block text-sm font-medium leading-6 text-gray-900 text-left">
                                        Company Name
                                    </label>
                                    <input
                                        id="companyName"
                                        name="companyName"
                                        type="text"

                                        placeholder='Hemas'
                                        value={formData.companyName}
                                        onChange={handleChange}
                                        autoComplete="organization"
                                        className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                    />
                                    {errors.companyName && <p className="text-red-600 text-sm mt-1">{errors.companyName}</p>}
                                </div>
                                {/* Mobile number field */}
                                <div className="mt-5">
                                    <label htmlFor="mobile" className="block text-sm font-medium leading-6 text-gray-900 text-left">
                                        Mobile number
                                    </label>
                                    <input
                                        id="mobile"
                                        name="mobile"
                                        type="text"
                                        placeholder='0 xx xxxx xxx'
                                        value={formData.mobile}
                                        onChange={handleChange}
                                        onKeyDown={handleKeyDown}
                                        maxLength={10}
                                        className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                    />
                                    <p className="text-gray-500 text-left text-xs mt-1">
                                        Must start with 0 and be exactly 10 digits
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="container mx-auto text-left">
                            <div className='mt-16 flex justify-start'>
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
                </div>
            </div>
        </div>
    );
}

export default EditSuplierBody;
