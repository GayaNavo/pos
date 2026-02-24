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
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { decryptData } from '../utill/encryptionUtils';
import Loader from '../utill/Loader';

const EditOffer = () => {
    const { id } = useParams(); // Get the offer ID from the URL
    const navigate = useNavigate();

    // State management
    const [offerName, setOfferName] = useState('');
    const [endDate, setDate] = useState('');
    const [percentage, setPercentage] = useState(0);
    const [createdBy, setDecryptedUser] = useState(null);
    const [progress, setProgress] = useState(false);
    const [loading, setLoading] = useState(true);

    // Fetch the existing offer data when the component mounts
    useEffect(() => {
        const fetchOfferData = async () => {
            try {
                const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/findOfferById/${id}`);
                const { offerName, percentage, endDate } = response.data.offer;
                setOfferName(offerName);
                setPercentage(percentage);
                setDate(endDate);
            } catch (error) {
                console.error('Error fetching offer data:', error);
                toast.error('Failed to fetch offer data. Please try again later.', { autoClose: 2000 });
            } finally {
                setLoading(false);
            }
        };

        fetchOfferData();
    }, [id]);

    useEffect(() => {
        const encryptedUser = sessionStorage.getItem('user');
        if (encryptedUser) {
            try {
                const user = decryptData(encryptedUser);
                setDecryptedUser(user.username);
            } catch (error) {
                sessionStorage.removeItem('user');
                alert('Session data corrupted. Please log in again.');
                return;
            }
        } else {
            console.error('User data could not be retrieved');
            alert('Could not retrieve user data. Please log in again.');
        }
    }, []);

    // Handle form submission
    const handleSubmit = async (event) => {
        event.preventDefault();
        setProgress(true);

        // Frontend validation
        if (!offerName || offerName.trim() === '') {
            toast.error('Offer name is required.', { autoClose: 2000, className: "custom-toast" });
            setProgress(false);
            return;
        }

        if (!percentage || isNaN(percentage) || percentage < 0 || percentage > 100) {
            toast.error('Percentage must be a valid number between 0 and 100.', { autoClose: 2000, className: "custom-toast" });
            setProgress(false);
            return;
        }

        if (!createdBy || createdBy.trim() === '') {
            toast.error('Created by field is required.', { autoClose: 2000, className: "custom-toast" });
            setProgress(false);
            return;
        }

        const offerData = {
            endDate,
            percentage,
            offerName,
            createdBy,
        };

        try {
            const result = await axios.put(`${process.env.REACT_APP_BASE_URL}/api/editOffer/${id}`, offerData);
            if (result.data.status === 'success') {
                toast.success("Offer updated successfully!", { autoClose: 2000, className: "custom-toast" });
                navigate('/viewOffers');
            } else {
                toast.error('Offer not updated: ' + result.data.message, { autoClose: 2000, className: "custom-toast" });
            }
        } catch (error) {
            if (error.response) {
                toast.error('Server error: ' + (error.response.data.message || 'An error occurred, please try again later.'), { autoClose: 2000, className: "custom-toast" });
            } else if (error.request) {
                toast.error('Network error: Please check your internet connection.', { autoClose: 2000, className: "custom-toast" });
            } else {
                toast.error('Unexpected error: ' + error.message, { autoClose: 2000, className: "custom-toast" });
            }
        } finally {
            setProgress(false);
        }
    };

    // Handle clear operation
    const handleClear = () => {
        setOfferName('');
        setPercentage('');
        setDate('');
    };

    if (loading) {
        return (
            <div className='relative background-white absolute top-[80px] left-[18%] w-[82%] min-h-[100vh] p-5'>
  <div className="fullscreen-loader">
    <Loader />
  </div>
            </div>
        );
    }

    return (
        <div className='relative background-white absolute top-[80px] left-[18%] w-[82%] min-h-[100vh] p-5'>
            <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3'>
                {progress && (
  <div className="fullscreen-loader">
    <Loader />
  </div>
                )}
                <div>
                    <h2 className="text-lightgray-300  m-0 p-0 text-2xl">Edit Offer</h2>
                </div>
                <div>
                    <Link className='px-4 py-1.5 border border-[#35AF87] text-[#35AF87] rounded-md transition-colors duration-300 hover:bg-[#35AF87] hover:text-white whitespace-nowrap' to={'/viewOffers'}>Back</Link>
                </div>
            </div>
            <div className="bg-white mt-[20px] w-full min-h-[670px] rounded-2xl px-4 sm:px-8 shadow-md">
                <div className="flex min-h-full flex-1 flex-col px-2 py-12 lg:px-8">
                    <form onSubmit={handleSubmit}>
                        <div className="flex flex-col md:flex-row md:space-x-16 space-y-4 md:space-y-0">
                            <div className="flex-1">
                                {/* Offer Name Field */}
                                <div className="mt-2">
                                    <label className="block text-sm font-medium leading-6 text-gray-900 text-left">Offer Name <span className='text-red-500'>*</span></label>
                                    <input
                                        id="offerName"
                                        name="offerName"
                                        required
                                        placeholder='Family Offer'
                                        value={offerName}
                                        onChange={(e) => setOfferName(e.target.value)}
                                        autoComplete="off"
                                        className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                    />
                                </div>

                                {/* End Date Field */}
                                <div className="mt-5">
                                    <label htmlFor="endDate" className="block text-sm font-medium leading-6 text-gray-900 text-left">
                                        End Date
                                    </label>
                                    <div className="">
                                        <input
                                            id="endDate"
                                            name="endDate"
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setDate(e.target.value)}
                                            autoComplete="off"
                                            className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1">
                                {/* Percentage Field */}
                                <div className="mt-2">
                                    <label className="block text-sm font-medium leading-6 text-gray-900 text-left">Percentage <span className='text-red-500'>*</span></label>
                                    <input
                                        id="percentage"
                                        name="percentage"
                                        type="number"
                                        required
                                        placeholder='10%'
                                        value={percentage}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            if (/^\d*\.?\d*$/.test(value)) {
                                                const numericValue = parseFloat(value);
                                                if (!isNaN(numericValue) && numericValue >= 0 && numericValue <= 100) {
                                                    setPercentage(value);
                                                }
                                            }
                                        }}
                                        autoComplete="off"
                                        className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                    />
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
                </div>
            </div>
        </div>
    );
};

export default EditOffer;