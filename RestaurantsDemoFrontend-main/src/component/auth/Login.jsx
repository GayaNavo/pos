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
import { UserContext } from '../../context/UserContext';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import CryptoJS from 'crypto-js';
import Loader from '../utill/Loader';
import '../../styles/tailwind.css';
import '../../styles/login.css';
import { toast } from 'react-toastify';
import { useLogo } from '../../context/logoContext';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [progress, setProgress] = useState(false);
    const [isPOS, setIsPOS] = useState();
    const { setUserData, clearUserData } = useContext(UserContext);
    const { logo } = useLogo();
    const navigate = useNavigate();
    let logoutTimer;

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setProgress(true);

        // Encrypting the username and password
        const normalizedUsername = username.toLowerCase();
        const userKey = process.env.REACT_APP_USER_KEY;
        const secretKey = process.env.REACT_APP_SECRET_KEY;
        const encryptedPassword = CryptoJS.AES.encrypt(password, secretKey).toString();
        const encryptedUsername = CryptoJS.AES.encrypt(normalizedUsername, userKey).toString();
        const userData = { encryptedUsername, encryptedPassword };

        try {
            const response = await axios.post(`${process.env.REACT_APP_BASE_URL}/api/login`, userData);
            if (response.data.token) {
                const { token, encryptedToken, hasRequiredData, hasPrefixSettings, isKitchenRole } = response.data;

                // Clear any existing user data before setting new data
                sessionStorage.clear();
                sessionStorage.setItem('token', token);
                sessionStorage.setItem('encryptedToken', encryptedToken);
                sessionStorage.setItem('isPOS', isPOS);

                // Decode the token to get expiration time
                const decodedToken = jwtDecode(token);
                const currentTime = Date.now() / 1000;
                const expirationTime = decodedToken.exp;

                sessionStorage.setItem('expirationTime', expirationTime.toString());
                const timeUntilExpiration = (expirationTime - currentTime) * 1000;
                logoutTimer = setTimeout(() => {
                    alert('Session expired. Logging out.');
                    handleLogout();
                }, timeUntilExpiration);

                try {
                    console.log("[DEBUG] Fetching settings...");
                    const settingsResponse = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/getSettings`);

                    if (settingsResponse.data.defaultWarehouse) {
                        sessionStorage.setItem("defaultWarehouse", settingsResponse.data.defaultWarehouse);
                        console.log("[DEBUG] Default Warehouse set:", settingsResponse.data.defaultWarehouse);
                    } else {
                        console.warn("[DEBUG] No default warehouse found in settings.");
                    }
                } catch (settingsError) {
                    console.error("[DEBUG] Error fetching settings:", settingsError);
                }

                // Set user data in context
                await setUserData(token);

                // Navigate based on role and prefix settings status
                toast.success(
                    "Logged in successfully!",
                    { autoClose: 500 },
                    { className: "custom-toast" }
                );

                // Kitchen role → go directly to kitchen display
                if (isKitchenRole) {
                    navigate('/kitchen');
                } else if (hasRequiredData && hasPrefixSettings) {
                    // Prefix settings exist - go to dashboard
                    navigate('/dashboard');
                } else {
                    // Prefix settings missing - go to prefix settings (skip receipt settings)
                    navigate('/prefixsettingsInitiate');
                }
            } else {
                setError('Login failed. Please try again.');
            }
        } catch (error) {
            if (error.response) {
                console.error('Error response:', error.response);

                switch (error.response.status) {
                    case 400:
                        setError(error.response.data.message || 'Username and password are required.');
                        break;

                    case 401: 
                        setError(error.response.data.message || 'Invalid username or password.');
                        break;

                    case 403: 
                        setError(error.response.data.message || 'Account locked. Please try again later.');
                        break;

                    case 404:
                        setError(error.response.data.message || 'User not found.');
                        break;

                    case 500:
                        setError(error.response.data.message || 'Server error. Please try again later.');
                        break;

                    default:
                        setError(error.response.data.message || 'An unexpected error occurred. Please try again.');
                }

            } else if (error.request) {
                console.error('No response received:', error.request);
                setError('No response received from server. Please check your network connection.');
            } else {
                console.error('Request setup error:', error.message);
                setError('An unexpected error occurred. Please try again.');
            }
        } finally {
            setProgress(false);
        }
    };

    useEffect(() => {
        const expirationTime = sessionStorage.getItem('expirationTime');
        if (expirationTime) {
            const currentTime = Date.now() / 1000;
            if (currentTime >= expirationTime) {
                // Token has expired
                alert('Session expired. Logging out.');
                handleLogout();
            } else {
                const timeUntilExpiration = (expirationTime - currentTime) * 1000;
                logoutTimer = setTimeout(() => {
                    alert('Session expired. Logging out.');
                    handleLogout();
                }, timeUntilExpiration);
            }
        }

        // Clear the timer on component unmount
        return () => {
            if (logoutTimer) {
                clearTimeout(logoutTimer);
            }
        };
    }, []);

    const handleLogout = () => {
        if (logoutTimer) {
            clearTimeout(logoutTimer);
        }
        clearUserData();
        sessionStorage.clear();
        navigate('/');
    };

    useEffect(() => {
        return () => {
            if (logoutTimer) {
                clearTimeout(logoutTimer);
            }
        };
    }, []);

    return (
        <div className="w-full min-h-screen flex items-center justify-center bg-gray-100 px-4 py-6 sm:px-6 sm:py-8 overflow-auto">
            <div className="w-full bg-gray-100 flex flex-col items-center justify-center">
                
                {/* Large Outer Card */}
                <div className="w-full max-w-[400px] sm:max-w-[420px] md:max-w-[450px] lg:max-w-[480px] xl:max-w-[500px] 2xl:max-w-[520px] bg-white rounded-lg shadow-xl p-5 sm:p-6 md:p-8 flex flex-col items-center">
                    
                    {/* Logo inside outer card */}
                    <img
                        alt="Your Company"
                        src={logo}
                        className="h-10 sm:h-12 md:h-14 w-auto mb-4 sm:mb-5 md:mb-6"
                    />

                    {/* Inner Card with teal header */}
                    <div className="w-full overflow-hidden bg-white rounded-lg shadow-md border border-gray-200 flex flex-col">
                        {/* Teal header inside the inner card */}
                        <div className="bg-[#2D8D79] py-3 sm:py-4 px-4 sm:px-6 rounded-t-lg">
                            <h3 className="text-center text-base sm:text-lg md:text-xl font-semibold text-white">
                                Sign in to your Account
                            </h3>
                        </div>

                        {/* Form section */}
                        <div className="px-4 sm:px-6 py-4 sm:py-6 flex-1">
                            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                                <div>
                                    <label htmlFor="email" className="block text-sm font-normal leading-6 text-gray-700 text-left mb-1.5 sm:mb-2">
                                        User name
                                    </label>
                                    <div>
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            required
                                            autoComplete="email"
                                            placeholder="pos.ideazone@gmail.com"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            className="pass block w-full rounded-md border border-gray-300 py-2 sm:py-2.5 px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2D8D79] focus:border-transparent"
                                        />
                                    </div>
                                    <div className="text-right mt-1.5 sm:mt-2">
                                        <Link
                                            to={`/forgetpassword`}
                                            className="text-sm font-normal text-[#2D8D79] hover:text-[#246B5D]"
                                        >
                                            Forgot Password
                                        </Link>
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="password" className="block text-sm font-normal leading-6 text-gray-700 text-left mb-1.5 sm:mb-2">
                                        Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="password"
                                            name="password"
                                            type={showPassword ? "text" : "password"}
                                            required
                                            placeholder="••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            autoComplete="current-password"
                                            className="pass block w-full rounded-md border border-gray-300 py-2 sm:py-2.5 px-3 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2D8D79] focus:border-transparent"
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
                                </div>
                                <div className="flex w-full justify-center pt-2 sm:pt-3">
                                    <button
                                        type="submit"
                                        className="submit flex w-full justify-center rounded-md bg-[#2D8D79] px-3 py-2 sm:py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#35AF87] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2D8D79]"
                                    >
                                        Log in
                                    </button>
                                </div>
                                <div className="h-[18px] flex items-center justify-center">
                                    {error && <h2 className="text-red-700 text-center text-sm">{error}</h2>}
                                </div>
                            </form>
                        </div>

                        {/* Footer inside inner card */}
                        <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
                            <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-600">Powerd by</span>
                                <span className="text-xs font-bold text-gray-900">IDEAZONE</span>
                            </div>
                            <span className="text-xs text-[#2D8D79]">Version 2.0</span>
                        </div>
                    </div>
                </div>
            </div>
            {progress && (
                <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-white/80 z-50">
                    <Loader />
                </div>
            )}
        </div>
    );
}

export default Login;
