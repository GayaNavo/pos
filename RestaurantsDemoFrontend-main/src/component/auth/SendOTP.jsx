import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, Link } from "react-router-dom";
import axios from 'axios';
import CryptoJS from 'crypto-js';
import Loader from '../utill/Loader';
import '../../styles/tailwind.css';
import '../../styles/login.css';
import { useLogo } from '../../context/logoContext';

function SendOTP() {
    const location = useLocation();
    const navigate = useNavigate();
    const [progress, setProgress] = useState(false);
    const { encryptedUsername, } = location.state || {};
    const storedExpiresAt = sessionStorage.getItem('otpExpiresAt');
    const initialTimeLeft = storedExpiresAt
        ? Math.max(Math.floor((parseInt(storedExpiresAt) - Date.now()) / 1000), 0)
        : 300;
    const [timeLeft, setTimeLeft] = useState(initialTimeLeft);
    const [OTP, setOTP] = useState(["", "", "", "", "", ""]);
    const [error, setError] = useState('');
    const { logo } = useLogo();
    const inputRefs = useRef([]);

    const handleChange = (e, idx) => {
        const value = e.target.value.replace(/\D/g, "");
        const newOtp = [...OTP];
        newOtp[idx] = value;
        setOTP(newOtp);

        if (value && idx < 5) {
            inputRefs.current[idx + 1].focus();
        }
    };

    const handleKeyDown = (e, idx) => {
        if (e.key === "Backspace") {
            const newOtp = [...OTP];

            if (OTP[idx]) {
                newOtp[idx] = "";
                setOTP(newOtp);
            } else if (idx > 0) {
                inputRefs.current[idx - 1].focus();
                newOtp[idx - 1] = "";
                setOTP(newOtp);
            }
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setProgress(true);

        const otp_key = process.env.REACT_APP_OTP_KEY;
        const otpString = OTP.join("")

        try {
            const encryptedOTP = CryptoJS.AES.encrypt(otpString, otp_key).toString();

            const response = await axios.post(`${process.env.REACT_APP_BASE_URL}/api/verifyOtp`, {
                encryptedUsername,
                encryptedOTP
            });

            if (response.data.status === 'success') {
                navigate('/newpassword', { state: { encryptedUsername } });
            } else {
                setError(response.data.message || 'Failed to verify OTP.');
            }
        } catch (err) {
            console.error('Error verifying OTP:', err);
            if (err.response) {
                const status = err.response.status;
                const message = err.response.data?.message;

                switch (status) {
                    case 400:
                        setError(message || 'Invalid OTP or request format');
                        break;
                    case 401:
                        setError('Unauthorized request. Please try again.');
                        break;
                    case 404:
                        setError('Service not found. Please contact support.');
                        break;
                    case 429:
                        setError('Too many requests. Please wait and try again.');
                        break;
                    case 500:
                        setError('Server error. Please try again later.');
                        break;
                    default:
                        setError(message || `Server error (${status}). Please try again.`);
                }
            } else if (err.request) {
                if (err.code === 'NETWORK_ERROR' || err.code === 'ERR_NETWORK') {
                    setError('Network connection failed. Check your internet and try again.');
                } else if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
                    setError('Request timed out. Please try again.');
                } else {
                    setError('Unable to connect to server. Please check your connection.');
                }
            } else if (err.message) {
                if (err.message.includes('Cannot read properties')) {
                    setError('Configuration error. Please refresh and try again.');
                } else {
                    setError(`Error: ${err.message}`);
                }
            } else {
                setError('An unexpected error occurred. Please try again.');
            }
        } finally {
            setProgress(false);
        }
    };

    useEffect(() => {
        if (timeLeft <= 0) {
            setError('OTP expired. Please request a new one.');
            navigate('/forgetpassword');
            return;
        }

        const timerId = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);

        return () => clearInterval(timerId);
    }, [timeLeft, navigate]);

    const formatTime = () => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
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
                                Enter OTP
                            </h3>
                        </div>

                        {/* Form section */}
                        <div className="px-4 sm:px-6 py-4 sm:py-6 flex-1">
                            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                                <div>
                                    <label htmlFor="otp" className="block text-sm font-normal leading-6 text-gray-700 text-left mb-1.5 sm:mb-2">
                                        Enter OTP:
                                    </label>
                                    <div className="flex justify-between space-x-2 sm:space-x-3">
                                        {OTP.map((digit, idx) => (
                                            <input
                                                key={idx}
                                                ref={(el) => (inputRefs.current[idx] = el)}
                                                type="text"
                                                inputMode="numeric"
                                                maxLength={1}
                                                value={digit}
                                                onChange={(e) => handleChange(e, idx)}
                                                onKeyDown={(e) => handleKeyDown(e, idx)}
                                                className="w-10 h-10 sm:w-12 sm:h-12 text-center border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2D8D79] text-lg sm:text-xl"
                                                autoFocus={idx === 0}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div className="flex w-full justify-center items-center gap-4 pt-2 sm:pt-3">
                                    <Link
                                        to={'/forgetpassword'}
                                        className="flex w-1/2 justify-center items-center rounded-md border border-[#4B5563] bg-[#4B5563] px-3 py-2 sm:py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#6B7280] hover:border-[#6B7280] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                                    >
                                        Back
                                    </Link>
                                    <button
                                        type="submit"
                                        className="submit flex w-1/2 justify-center items-center rounded-md bg-[#2D8D79] px-3 py-2 sm:py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#35AF87] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2D8D79]"
                                    >
                                        Reset Password
                                    </button>
                                </div>
                                <div className="text-center pt-2">
                                    <div className='text-base text-[#2D8D79] font-medium'>{timeLeft > 0 && `Expires in ${formatTime(timeLeft)}`}</div>
                                    <div className='text-xs text-gray-600 mt-1'>You can request OTP only once at one time.</div>
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

export default SendOTP;

