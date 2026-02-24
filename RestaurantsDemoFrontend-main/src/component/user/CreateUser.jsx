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
import '../../styles/role.css';
import { Link, useNavigate } from 'react-router-dom';
import avatarIcon from '../../img/profile.png';
import Loader from '../utill/Loader';
import { toast } from 'react-toastify';
import { UserContext } from '../../context/UserContext';
import CryptoJS from 'crypto-js';

function CreateUserBody() {
    // State management
    const [username, setUsername] = useState('');
    const [role, setRole] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [mobile, setMobile] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [responseMessage, setResponseMessage] = useState('');
    const [jobRoles, setJobRoles] = useState([]);
    const [progress, setProgress] = useState(false);
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

    // Fetch job roles on component mount
    useEffect(() => {
        const fetchJobRoles = async () => {
            try {
                const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/getJobRoles`, { params: { acc } });
                setJobRoles(response.data.jobRoles);
            } catch (err) {
                console.error('Error fetching job roles:', err);
                setError('Failed to fetch job roles. Please try again later.');
            }
        };

        fetchJobRoles();
    }, []);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setResponseMessage('');
        setProgress(true);

        const normalizedUsername = username.toLowerCase().trim();
        const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;

        if (!gmailRegex.test(normalizedUsername)) {
            toast.error('Username must be a valid Gmail address (example@gmail.com)');
            setProgress(false);
            return;
        }

        // Role validation
        if (role === "#" || !role) {
            toast.error('Please select a valid role.');
            return;
        }

        // Mobile number validation
        const mobileRegex = /^0\d{9}$/;
        if (!mobileRegex.test(mobile)) {
            toast.error('Invalid mobile number. It must start with 0 and be exactly 10 digits.');
            setProgress(false);
            return;
        }

        // Password validation
        if (password !== confirmPassword) {
            toast.error('Passwords do not match.');
            setProgress(false);
            return;
        }

        // Password strength validation
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?#&])[A-Za-z\d@$!%*?#&]{8,}$/;
        if (!passwordRegex.test(password)) {
            toast.error('Password must be at least 8 characters long, include at least one uppercase letter, one lowercase letter, one number, and one special character.');
            setProgress(false);
            return;
        }

        setError('');

        const userData = {
            username: normalizedUsername,
            role,
            firstName,
            lastName,
            mobile,
            password
        };

        try {
            const result = await axios.post(`${process.env.REACT_APP_BASE_URL}/api/addUser`, userData);
            if (result.data.status === 'success') {
                toast.success(
                    "User added successfully!",
                    { autoClose: 2000 },
                    { className: "custom-toast" }
                );
                navigate('/users');
            } else {
                if (result.data.message === 'Mobile Number already exists') {
                    toast.error(
                        "Mobile number already exists, please use a different one.",
                        { autoClose: 2000 },
                        { className: "custom-toast" }
                    );
                } else {
                    toast.error(
                        'User not added: ' + result.data.message,
                        { autoClose: 2000 },
                        { className: "custom-toast" }
                    );
                }
            }
        } catch (error) {
            if (error.response) {
                toast.error(
                    'Server error: ' + error.response.data.message || 'An error occurred, please try again later.',
                    { autoClose: 2000 },
                    { className: "custom-toast" }
                );
            } else if (error.request) {
                toast.error(
                    'Network error: Please check your internet connection.',
                    { autoClose: 2000 },
                    { className: "custom-toast" }
                );
            } else {
                toast.error(
                    'Unexpected error: ' + error.message,
                    { autoClose: 2000 },
                    { className: "custom-toast" }
                );
            }
        } finally {
            setProgress(false);
        }
    };

    // Handle clear operation
    const handleClear = () => {
        setUsername('');
        setRole('');
        setFirstName('');
        setLastName('');
        setMobile('');
        setPassword('');
        setConfirmPassword('');
        setError('');
        setResponseMessage('');
    };

    return (
        <div className='background-white absolute top-[80px] left-[18%] w-[82%] h-[800px] p-5'>
            <div className='flex justify-between items-center'>
                {progress && (
                    <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-white/80 z-50">
                        <Loader />
                    </div>
                )}
                <div>
                    <h2 className="text-lightgray-300  m-0 p-0 text-2xl">Create User</h2>
                </div>
                <div>
                    <Link className='px-4 py-1.5 border border-[#35AF87] text-[#35AF87] rounded-md transition-colors duration-300 hover:bg-[#35AF87] hover:text-white' to={'/users'}>Back</Link>
                </div>
            </div>
            <div className="bg-white mt-[20px] w-full h-[670px] rounded-2xl px-8 shadow-md">
                <div className="flex min-h-full flex-1 flex-col px-2 py-12 lg:px-8">
                    <div className="flex items-center justify-center">
                        <img className='w-[120px] h-[120px] rounded mb-10' src={avatarIcon} alt="icon" />
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="flex space-x-16">
                            <div className="flex-1">
                                {/* Username field */}
                                <div className="mt-2">
                                    <label className="block text-sm font-medium leading-6 text-gray-900 text-left">Enter the Email <span className='text-red-500'>*</span></label>
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
                                </div>

                                {/* Role field */}
                                <div className="mt-5">
                                    <label className="block text-sm font-medium leading-6 text-gray-900 text-left">Select user role <span className='text-red-500'>*</span></label>
                                    <select
                                        id="role"
                                        name="role"
                                        value={role}
                                        onChange={(e) => setRole(e.target.value)}
                                        className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                    >
                                        <option value="#">#Select Role</option>
                                        {jobRoles.map((jobRole, index) => (
                                            <option key={index} value={jobRole.name}>{jobRole.roleName}</option>
                                        ))}
                                    </select>

                                </div>
                            </div>

                            <div className="flex-1">
                                {/* First name field */}
                                <div className="mt-2">
                                    <label className="block text-sm font-medium leading-6 text-gray-900 text-left">First Name <span className='text-red-500'>*</span></label>
                                    <input
                                        id="fname"
                                        name="fname"
                                        type="text"
                                        required
                                        placeholder='Ben'
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        autoComplete="given-name"
                                        className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                    />
                                </div>

                                {/* Last name field */}
                                <div className="mt-5">
                                    <label className="block text-sm font-medium leading-6 text-gray-900 text-left">Last Name <span className='text-red-500'>*</span></label>
                                    <input
                                        id="lname"
                                        name="lname"
                                        type="text"
                                        required
                                        placeholder='Stokes'
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        autoComplete="family-name"
                                        className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                    />
                                </div>

                                {/* Mobile number field */}
                                <div className="mt-5">
                                    <label htmlFor="mobile" className="block text-sm font-medium leading-6 text-gray-900 text-left">
                                        Mobile number <span className='text-red-500'>*</span>
                                    </label>
                                    <div className="mt-2">
                                        <input
                                            id="mobile"
                                            name="mobile"
                                            type="text"
                                            required
                                            placeholder="0 xx xxxx xxx"
                                            value={mobile}
                                            maxLength={10}
                                            onChange={(e) => {
                                                let value = e.target.value;
                                                if (!/^\d*$/.test(value)) return;
                                                if (value.length === 1 && value !== "0") return;
                                                if (value.length > 10) return;

                                                setMobile(value);
                                            }}
                                            className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                        />
                                        <p className="text-gray-500 text-left text-xs mt-1">
                                            Must start with 0 and be exactly 10 digits
                                        </p>
                                    </div>
                                </div>

                                {/* Password field */}
                                <div className="mt-5">
                                    <label htmlFor="password" className="block text-sm font-medium leading-6 text-gray-900 text-left">
                                        Password <span className='text-red-500'>*</span>
                                    </label>
                                    <div className="mt-2 relative">
                                        <input
                                            id="password"
                                            name="password"
                                            type={showPassword ? "text" : "password"}
                                            required
                                            placeholder="Enter password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                                        >
                                            {showPassword ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                    <p className="text-gray-500 text-left text-xs mt-1">
                                        Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
                                    </p>
                                </div>

                                {/* Confirm Password field */}
                                <div className="mt-5">
                                    <label htmlFor="confirmPassword" className="block text-sm font-medium leading-6 text-gray-900 text-left">
                                        Confirm Password <span className='text-red-500'>*</span>
                                    </label>
                                    <div className="mt-2 relative">
                                        <input
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            type={showConfirmPassword ? "text" : "password"}
                                            required
                                            placeholder="Confirm password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                                        >
                                            {showConfirmPassword ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                            )}
                                        </button>
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

export default CreateUserBody;
