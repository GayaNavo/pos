/*
 * Copyright (c) 2025 Ideazone (Pvt) Ltd
 * Proprietary and Confidential
 */

import React, { useState, useEffect } from 'react';
import { useCurrency } from '../../../context/CurrencyContext';
import formatWithCustomCommas from '../../utill/NumberFormate';
import axios from 'axios';
import { Maximize2, X } from 'lucide-react';

const CustomerDisplay = () => {
    const { currency } = useCurrency();
    const [billingData, setBillingData] = useState({
        products: [],
        subtotal: 0,
        discount: 0,
        tax: 0,
        shipping: 0,
        serviceCharge: 0,
        total: 0,
        currencySymbol: currency
    });
    const [settings, setSettings] = useState({
        companyName: 'Restaurant',
        logo: ''
    });
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data } = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/getSettings`);
                setSettings({
                    companyName: data.companyName || 'Restaurant',
                    logo: data.logo || ''
                });
            } catch (error) {
                console.error("Error fetching settings for customer display:", error);
            }
        };
        fetchSettings();

        const channel = new BroadcastChannel('pos-customer-display');

        const handleMessage = (event) => {
            if (event.data.type === 'UPDATE_BILLING') {
                setBillingData(prev => ({
                    ...prev,
                    ...event.data.payload
                }));
            } else if (event.data.type === 'RESET_BILLING') {
                setBillingData({
                    products: [],
                    subtotal: 0,
                    discount: 0,
                    tax: 0,
                    shipping: 0,
                    serviceCharge: 0,
                    total: 0,
                    receivedAmount: 0,
                    balance: 0,
                    currencySymbol: currency
                });
            }
        };

        channel.addEventListener('message', handleMessage);

        // Request initial state
        channel.postMessage({ type: 'REQUEST_SYNC' });

        return () => {
            channel.removeEventListener('message', handleMessage);
            channel.close();
        };
    }, [currency]);
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    };

    return (
        <div className="h-screen bg-[#F4F7F6] text-gray-800 font-sans flex flex-col overflow-hidden">
            {/* Header - Refined Green Gradient */}
            <header className="bg-gradient-to-r from-[#35AF87] to-[#2D9373] p-4 lg:p-6 flex items-center justify-between shadow-lg shrink-0 text-white">
                <div className="flex items-center space-x-3 lg:space-x-4">
                    {settings.logo && (
                        <div className="w-10 h-10 lg:w-14 lg:h-14 rounded-xl bg-white/20 backdrop-blur-sm p-1 border border-white/30 flex items-center justify-center shadow-inner">
                            <img src={settings.logo} alt="Logo" className="w-full h-full object-contain filter brightness-0 invert" />
                        </div>
                    )}
                    <h1 className="text-xl lg:text-3xl font-black uppercase tracking-tight">{settings.companyName}</h1>
                </div>

                <div className="flex items-center space-x-4 lg:space-x-8">
                    {/* Glassy Time Box - As per reference */}
                    <div className="hidden sm:flex flex-col items-center bg-white/15 backdrop-blur-xl rounded-2xl px-5 py-2 border border-white/20 shadow-xl">
                        <div className="text-xl lg:text-2xl font-black font-mono tracking-tighter flex items-center">
                            <svg className="w-4 h-4 mr-2 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                        <div className="text-[10px] lg:text-xs font-bold opacity-80 uppercase tracking-[0.2em] mt-0.5">
                            {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                        </div>
                    </div>

                    <button
                        onClick={toggleFullscreen}
                        className="p-2 lg:p-3 hover:bg-white/20 rounded-2xl text-white transition-all border border-white/10 shadow-lg group active:scale-95"
                        title="Toggle Fullscreen"
                    >
                        <Maximize2 className="w-5 h-5 lg:w-6 lg:h-6 group-hover:scale-110 transition-transform" />
                    </button>
                </div>
            </header>

            <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Items List - Minimal Light Theme */}
                <div className="flex-[0.4] lg:flex-[0.6] p-4 lg:p-8 overflow-y-auto bg-white border-r border-slate-200 scroll-container">
                    <div className="mb-6 flex items-center space-x-2">
                        <div className="w-1.5 h-6 bg-[#35AF87] rounded-full"></div>
                        <h3 className="text-xs lg:text-sm font-black text-slate-400 uppercase tracking-widest">Order Details</h3>
                    </div>

                    <table className="w-full text-left border-collapse table-fixed">
                        <thead>
                            <tr className="text-slate-400 border-b border-slate-100 text-[9px] lg:text-[10px] uppercase tracking-widest font-bold">
                                <th className="pb-3 w-[55%]">Description</th>
                                <th className="pb-3 w-[15%] text-center">Qty</th>
                                <th className="pb-3 w-[30%] text-right font-mono">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {billingData.products.length > 0 ? (
                                [...billingData.products].reverse().map((item, index) => (
                                    <tr key={index} className="group hover:bg-slate-50 transition-colors duration-200">
                                        <td className="py-3 lg:py-4 pr-2">
                                            <div className="text-[11px] lg:text-base font-bold text-slate-700 truncate group-hover:text-[#35AF87] transition-colors">{item.name}</div>
                                            {item.variationName && <div className="text-[9px] lg:text-xs text-slate-400 font-medium truncate">{item.variationName}</div>}
                                        </td>
                                        <td className="py-3 lg:py-4 px-1 text-center">
                                            <span className="text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg text-[10px] lg:text-xs font-black">{item.qty}</span>
                                        </td>
                                        <td className="py-3 lg:py-4 pl-2 text-right text-[10px] lg:text-sm font-black font-mono text-slate-800">
                                            {formatWithCustomCommas(item.subtotal)}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="3" className="py-20 lg:py-32 text-center">
                                        <div className="text-slate-200 flex flex-col items-center">
                                            <svg className="w-16 h-16 lg:w-24 lg:h-24 mb-4 opacity-10" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 001-.89l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" /></svg>
                                            <span className="text-lg lg:text-2xl font-black uppercase tracking-tight opacity-20 italic">Welcome! We're ready</span>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Summary Section - Optimized Static Layout */}
                <div className="flex-[1.2] lg:flex-[1.4] p-4 lg:p-8 flex flex-col items-center justify-center relative overflow-hidden bg-slate-50/50">
                    <div className="w-full max-w-2xl relative z-10 flex flex-col items-center space-y-4 lg:space-y-8">

                        <div className="text-center w-full">
                            <h2 className="text-[#2D9373] text-2xl lg:text-4xl font-black mb-6 tracking-tight">Total Amount</h2>

                            {/* Hero Card - Reference Inspired Focus */}
                            <div className="bg-white rounded-[24px] lg:rounded-[32px] p-6 lg:p-12 shadow-[0_20px_50px_rgba(53,175,135,0.2)] border border-[#35AF87]/20 flex items-center justify-center min-w-[300px] lg:min-w-[580px] relative overflow-hidden group">
                                <div className="text-[#2D9373] text-6xl lg:text-[7rem] font-black tracking-tighter leading-none flex items-center select-none">
                                    <span className="text-2xl lg:text-5xl mr-3 lg:mr-4 opacity-70 font-bold">{billingData.currencySymbol}</span>
                                    {formatWithCustomCommas(billingData.total)}
                                </div>

                                {/* Subtle inner accent like the reference */}
                                <div className="absolute inset-0 bg-gradient-to-br from-[#35AF87]/5 to-transparent pointer-events-none"></div>
                            </div>
                        </div>

                        {/* Breakdown - High Density */}
                        <div className="w-full max-w-md bg-white/60 backdrop-blur-md rounded-2xl p-4 lg:p-6 shadow-md border border-white flex flex-col space-y-2 lg:space-y-4">
                            <div className="flex justify-between items-center text-slate-400 font-bold uppercase tracking-widest text-[8px] lg:text-[10px]">
                                <span>Subtotal</span>
                                <span className="text-slate-500 font-mono text-xs lg:text-sm">{billingData.currencySymbol} {formatWithCustomCommas(billingData.subtotal)}</span>
                            </div>

                            {billingData.discount > 0 && (
                                <div className="flex justify-between items-center text-rose-400 font-bold uppercase tracking-widest text-[8px] lg:text-[10px]">
                                    <span>Discount</span>
                                    <span className="font-mono text-xs lg:text-sm">-{billingData.currencySymbol} {formatWithCustomCommas(billingData.discount)}</span>
                                </div>
                            )}

                            {billingData.tax > 0 && (
                                <div className="flex justify-between items-center text-slate-400 font-bold uppercase tracking-widest text-[8px] lg:text-[10px]">
                                    <span>Tax</span>
                                    <span className="text-slate-500 font-mono text-xs lg:text-sm">{billingData.currencySymbol} {formatWithCustomCommas(billingData.tax)}</span>
                                </div>
                            )}

                            {billingData.serviceCharge > 0 && (
                                <div className="flex justify-between items-center text-slate-400 font-bold uppercase tracking-widest text-[8px] lg:text-[10px]">
                                    <span>Service Charge</span>
                                    <span className="text-slate-500 font-mono text-xs lg:text-sm">{billingData.currencySymbol} {formatWithCustomCommas(billingData.serviceCharge)}</span>
                                </div>
                            )}

                            {billingData.shipping > 0 && (
                                <div className="flex justify-between items-center text-slate-400 font-bold uppercase tracking-widest text-[8px] lg:text-[10px]">
                                    <span>Shipping</span>
                                    <span className="text-slate-500 font-mono text-xs lg:text-sm">{billingData.currencySymbol} {formatWithCustomCommas(billingData.shipping)}</span>
                                </div>
                            )}

                            <div className="h-px bg-slate-200 w-full opacity-50"></div>

                            <div className="flex justify-between items-center border-t border-slate-100 pt-2">
                                <span className="text-slate-800 font-black uppercase tracking-tight text-sm lg:text-base">Payable</span>
                                <span className="text-[#35AF87] font-black font-mono text-sm lg:text-lg">{billingData.currencySymbol} {formatWithCustomCommas(billingData.total)}</span>
                            </div>

                            {(billingData.receivedAmount > 0) && (
                                <div className="flex justify-between items-center bg-[#35AF87]/5 p-2 rounded-lg">
                                    <span className="text-slate-500 font-black uppercase tracking-tight text-[10px] lg:text-xs">Paid</span>
                                    <span className="text-blue-600 font-black font-mono text-xs lg:text-base">{billingData.currencySymbol} {formatWithCustomCommas(billingData.receivedAmount)}</span>
                                </div>
                            )}

                            {(billingData.balance !== undefined && billingData.balance != 0) && (
                                <div className="flex justify-between items-center pt-1">
                                    <span className="text-slate-800 font-black uppercase tracking-tighter text-xs lg:text-sm">Change</span>
                                    <span className="text-rose-500 font-black font-mono text-base lg:text-xl">{billingData.currencySymbol} {formatWithCustomCommas(Math.abs(billingData.balance))}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Background Accents */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#35AF87]/[0.02] rounded-full -translate-y-1/2 translate-x-1/2 blur-[80px]"></div>
                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#35AF87]/[0.02] rounded-full translate-y-1/2 -translate-x-1/2 blur-[80px]"></div>
                </div>
            </main>
        </div>
    );
};

export default CustomerDisplay;
