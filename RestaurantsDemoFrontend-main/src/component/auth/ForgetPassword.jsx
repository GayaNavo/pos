import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import CryptoJS from 'crypto-js';
import Loader from '../utill/Loader';
import '../../styles/tailwind.css';
import '../../styles/login.css';
import { useLogo } from '../../context/logoContext';

function ForgetPassword() {
    // Getting and setting values and status
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');
    const [progress, setProgress] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { logo } = useLogo();
    const navigate = useNavigate();

    const handleSubmit = (event) => {
        event.preventDefault();
        setIsLoading(true);
        setProgress(true);
        setError(''); // Clear previous errors

        // Encrypting Username
        const normalizedUsername = username.toLowerCase();
        const secretKey = process.env.REACT_APP_USERNAME_ENCRYPTION_KEY;
        const encryptedUsername = CryptoJS.AES.encrypt(normalizedUsername, secretKey).toString();
        const sendData = { encryptedUsername };

        console.log(normalizedUsername)

        // Axios requet for sending username to get the OTP
        axios.post(`${process.env.REACT_APP_BASE_URL}/api/forgetpassword`, sendData)
            .then((result) => {
                setIsLoading(false);
                setProgress(false);

                if (result.data.status === "success") {
                    const code = result.data.otp;
                    const expiresAt = result.data.expiresAt;
                    sessionStorage.setItem('otpExpiresAt', expiresAt.toString());

                    // Encrypting password reset code
                    const resetCodeSecret = 'zxcvb';
                    const encryptedOTP = CryptoJS.AES.encrypt(code, resetCodeSecret).toString();
                    navigate('/sendOTP', { state: { encryptedOTP, encryptedUsername, expiresAt } });
                } else {
                    // Handle error response from the backend (failure case)
                    setError(result.data.message || 'Unable to send username for password reset');
                }
            })
            .catch((err) => {
                setIsLoading(false);
                setProgress(false);
                console.error('Request failed:', err);

                if (err.response) {
                    // show the backend message
                    setError(err.response.data.message || 'An unexpected error occurred.');
                } else {
                    // For any other error (like network failure), display a generic message
                    setError('Network error: Unable to reach the server.');
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
                                Forgot Password
                            </h3>
                        </div>

                        {/* Form section */}
                        <div className="px-4 sm:px-6 py-4 sm:py-6 flex-1">
                            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                                <div>
                                    <label htmlFor="email" className="block text-sm font-normal leading-6 text-gray-700 text-left mb-1.5 sm:mb-2">
                                        Email address
                                    </label>
                                    <div>
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            required
                                            autoComplete="email"
                                            placeholder="admin@infy-pos.com"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            className="pass block w-full rounded-md border border-gray-300 py-2 sm:py-2.5 px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2D8D79] focus:border-transparent"
                                        />
                                    </div>
                                </div>
                                <div className="flex w-full justify-center items-center gap-4 pt-2 sm:pt-3">
                                    <Link
                                        to={'/'}
                                        className="flex w-1/2 justify-center items-center rounded-md border border-[#4B5563] bg-[#4B5563] px-3 py-2 sm:py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#6B7280] hover:border-[#6B7280] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                                    >
                                        Back
                                    </Link>
                                    <button
                                        type="submit"
                                        className="submit flex w-1/2 justify-center items-center rounded-md bg-[#2D8D79] px-3 py-2 sm:py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#35AF87] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2D8D79]"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? 'Sending...' : 'Send Code'}
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
            {/* Progress circle */}
            {progress && (
                <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-white/80 z-50">
                    <Loader />
                </div>
            )}
        </div>
    );
}

export default ForgetPassword;

