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

import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import CryptoJS from 'crypto-js';
import axios from 'axios';
import Loader from '../utill/Loader';
import '../../styles/tailwind.css';
import '../../styles/login.css';
import { useLogo } from '../../context/logoContext';

function NewPassword() {
    const location = useLocation();
    const { encryptedUsername } = location.state || {};
    const [decryptedUsername, setDecryptedUsername] = useState('');
    const [firstPassword, setFirstPassword] = useState('');
    const [secondPassword, setSecondPassword] = useState('');
    const [error, setError] = useState('');
    const [progress, setProgress] = useState(false);
    const navigate = useNavigate();
    const { logo } = useLogo();

    useEffect(() => {
        if (encryptedUsername) {
            try {
                const bytes = CryptoJS.AES.decrypt(encryptedUsername, 'pgdftrshj');
                const username = bytes.toString(CryptoJS.enc.Utf8);
                setDecryptedUsername(username);
            } catch (error) {
                console.error('Error decrypting username:', error);
            }
        }
    }, [encryptedUsername]);

    const validatePasswordStrength = (password) => {
        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?#&])[A-Za-z\d@$!%*?#&]{8,}$/;
        return regex.test(password);
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        if (firstPassword !== secondPassword) {
            setError('Passwords do not match');
            return;
        }
        if (!validatePasswordStrength(firstPassword)) {
            setError(
                'Password must be at least 8 characters long, include at least one uppercase letter, one lowercase letter, one number, and one special character.'
            );
            return;
        }

        setProgress(true);
        const encryptedPassword = CryptoJS.AES.encrypt(firstPassword, 'zxcvb').toString();
        const id = decryptedUsername;
        const sendData = {
            username: decryptedUsername,
            password: encryptedPassword
        };
        axios.put(`${process.env.REACT_APP_BASE_URL}/api/changepassword/${id}`, sendData)
            .then(response => {
                setProgress(false);
                if (response.data.status === 'success') {
                    navigate('/');
                } else {
                    setError(response.data.message || 'Unable to reset password');
                }
            })
            .catch(err => {
                setProgress(false);
                console.error('Request failed:', err);
                if (err.response && err.response.data && err.response.data.message) {
                    setError(err.response.data.message);
                } else if (err.message) {
                    setError(err.message);
                } else {
                    setError('Error occurred while resetting password');
                }
            });
    };

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
                                Reset Password
                            </h3>
                        </div>

                        {/* Form section */}
                        <div className="px-4 sm:px-6 py-4 sm:py-6 flex-1">
                            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                                <div>
                                    <label htmlFor="password" className="block text-sm font-normal leading-6 text-gray-700 text-left mb-1.5 sm:mb-2">
                                        New Password
                                    </label>
                                    <div>
                                        <input
                                            id="password"
                                            name="password"
                                            type="password"
                                            required
                                            placeholder="Enter new password"
                                            value={firstPassword}
                                            onChange={(e) => setFirstPassword(e.target.value)}
                                            className="pass block w-full rounded-md border border-gray-300 py-2 sm:py-2.5 px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2D8D79] focus:border-transparent"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="confirmPassword" className="block text-sm font-normal leading-6 text-gray-700 text-left mb-1.5 sm:mb-2">
                                        Confirm Password
                                    </label>
                                    <div>
                                        <input
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            type="password"
                                            required
                                            placeholder="Confirm new password"
                                            value={secondPassword}
                                            onChange={(e) => setSecondPassword(e.target.value)}
                                            className="pass block w-full rounded-md border border-gray-300 py-2 sm:py-2.5 px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2D8D79] focus:border-transparent"
                                        />
                                    </div>
                                </div>
                                <div className="flex w-full justify-center pt-2 sm:pt-3">
                                    <button
                                        type="submit"
                                        className="submit flex w-full justify-center rounded-md bg-[#2D8D79] px-3 py-2 sm:py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#35AF87] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2D8D79]"
                                    >
                                        Save & Update
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

export default NewPassword;
