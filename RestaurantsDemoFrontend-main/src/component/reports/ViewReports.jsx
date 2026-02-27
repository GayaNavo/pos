

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import '../../styles/role.css';
import AOS from 'aos';
import 'aos/dist/aos.css';
import Loader from '../utill/Loader';
import Reset from '../../img/reset.png';
import { FaCartPlus, FaExchangeAlt } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { handleExportPdf, handleExportSalesWithItemsPdf } from '../utill/ExportingPDF';
import { useCurrency } from '../../context/CurrencyContext';
import formatWithCustomCommas from '../utill/NumberFormate';
import Fillter from '../../img/filter.png';

function ViewReportBody() {
    // State management
    const { currency } = useCurrency()
    const [saleData, setSaleData] = useState({});
    const [saleReturnData, setSaleReturnData] = useState({});
    const [purchaseData, setPurchaseData] = useState({});
    const [purchaseReturnData, setPurchaseReturnData] = useState({});
    const [totalSaleAmount, setTotalSale] = useState(0);
    const [totalSaleReturnAmount, setTotalSaleReturn] = useState(0);
    const [totalPurchaseAmount, setTotalPurchase] = useState(0);
    const [totalPurchaseReturnAmount, setTotalPurchaseReturn] = useState(0);
    const [searchedCustomerSale, setSearchedCustomerSale] = useState(null);
    const [warehouseData, setWarehouseData] = useState([]);
    const [warehouse, setWarehouse] = useState('all')
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [activeTable, setActiveTable] = useState('sales');
    const [loading, setLoading] = useState(false);
    const [fillterOptionPopUp, setFiltterOptionPopUp] = useState(false)
    const [error, setError] = useState('');
    const [orderStatus, setOrderStatus] = useState([]);
    const [paymentStatus, setPaymentStatus] = useState([]);
    const [paymentType, setPaymentType] = useState([]);
    const [orderType, setOrderType] = useState('All');
    const [totalServiceCharge, setTotalServiceCharge] = useState(0);
    const [date, setDate] = useState('');
    const [filterParams, setFilterParams] = useState("");
    const ref = useRef();

    //COMBINE ALL DATA FETCHING TYPE INTO ONE STATE
    const combinedProductData = Array.isArray(searchedCustomerSale) && searchedCustomerSale.length > 0
        ? searchedCustomerSale
        : Array.isArray(saleReturnData) && saleReturnData.length > 0
            ? saleReturnData
            : [];

    useEffect(() => {
        const fetchAllWarehouses = async () => {
            try {
                const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/fetchWarehouses`);
                setWarehouseData(response.data.warehouses || []);
            } catch (error) {
                console.error('Failed to fetch all warehouses:', error);
            }
        };

        fetchAllWarehouses();
    }, []);

    const fetchReportData = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/getReportData/${warehouse}`);
            const { totals } = response.data.data;
            setTotalSale(totals.totalSale);
            setTotalSaleReturn(totals.totalSaleReturn);
            setTotalPurchase(totals.totalPurchase);
            setTotalPurchaseReturn(totals.totalPurchaseReturn);

        } catch (error) {
            console.error('Error fetching report data:', error);
            setError('Failed to fetch report data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReportData();
    }, [warehouse]);

    useEffect(() => {
        const params = new URLSearchParams();

        const warehouseValue = Array.isArray(warehouse) ? warehouse : [warehouse];
        const orderStatusValue = Array.isArray(orderStatus) ? orderStatus : [orderStatus];
        const paymentStatusValue = Array.isArray(paymentStatus) ? paymentStatus : [paymentStatus];
        const paymentTypeValue = Array.isArray(paymentType) ? paymentType : [paymentType];

        params.append("orderStatus", orderStatusValue.includes("all") ? "all" : orderStatusValue.join(","));
        params.append("paymentStatus", paymentStatusValue.includes("all") ? "all" : paymentStatusValue.join(","));
        params.append("paymentType", paymentTypeValue.includes("all") ? "all" : paymentTypeValue.join(","));
        params.append("warehouse", warehouseValue.includes("all") ? "all" : warehouseValue.join(","));
        params.append("orderType", orderType);

        if (date) {
            params.append("date", date);
        }

        const paramsString = params.toString();
        setFilterParams(paramsString);

    }, [warehouse, orderStatus, paymentStatus, paymentType, orderType, date]);

    useEffect(() => {
        if (!filterParams) return;
        const getFilteredReportData = async () => {
            setLoading(true);

            try {
                setLoading(true);
                const url = `${process.env.REACT_APP_BASE_URL}/api/getFilteredReportData?${filterParams}`;
                const response = await axios.get(url);
                const { sales, saleReturns, purchases, purchaseReturns } = response.data.data || {
                    sales: [], saleReturns: [], purchases: [], purchaseReturns: []
                };
                setSaleData(sales);
                setSaleReturnData(saleReturns);
                setPurchaseData(purchases);
                setPurchaseReturnData(purchaseReturns);

                const serviceChargeSum = sales.reduce((sum, sale) => {
                    return sum + (parseFloat(sale.serviceChargeValue) || 0);
                }, 0);
                setTotalServiceCharge(serviceChargeSum);

            } catch (error) {
                console.error("Error fetching filtered report data:", error);
                setSaleData([]);
                setSaleReturnData([]);
                setPurchaseData([]);
                setPurchaseReturnData([]);
            } finally {
                setLoading(false);
            }
        };

        getFilteredReportData();

    }, [filterParams]);

    const handleTableChange = (table) => {
        setActiveTable(table);
    };

    useEffect(() => {
        AOS.init({
            duration: 1000,
            easing: 'ease-in-out',
            once: true,
        });
    }, []);

    const handleFilter = async () => {
        try {
            const base = `${process.env.REACT_APP_BASE_URL}/api/getReportDataByDate/all`;
            const url = new URL(base);
            if (fromDate && toDate) {
                url.searchParams.set('fromDate', fromDate);
                url.searchParams.set('toDate', toDate);
            }

            const res = await fetch(url);
            const result = await res.json();

            const sales = result.data?.saleData || [];
            setSaleData(result.data?.saleData || []);
            setPurchaseData(result.data?.purchaseData || []);
            setSaleReturnData(result.data?.saleReturnData || []);
            setPurchaseReturnData(result.data?.purchaseReturnData || []);

            const serviceChargeSum = sales.reduce((sum, sale) => {
                return sum + (parseFloat(sale.serviceChargeValue) || 0);
            }, 0);
            setTotalServiceCharge(serviceChargeSum);
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    };

    const exportSalesPdf = async () => {
        console.log('[ViewReports] Exporting sales data:', saleData.length, 'sales');

        // Collect all unique product codes and IDs from sales
        const productCodes = new Set();
        const productIds = new Set();

        saleData.forEach(sale => {
            if (sale.productsData && Array.isArray(sale.productsData)) {
                sale.productsData.forEach(product => {
                    if (product.productCode) productCodes.add(product.productCode);
                    if (product.code) productCodes.add(product.code);
                    if (product.currentID) productIds.add(product.currentID);
                });
            }
        });

        // Fetch all products with their categories
        let productCategoryMap = {};
        try {
            const response = await fetch(`${process.env.REACT_APP_BASE_URL}/api/findAllProduct`);
            const result = await response.json();

            if (result.products && Array.isArray(result.products)) {
                result.products.forEach(product => {
                    if (product.code) {
                        productCategoryMap[product.code] = product.category;
                    }
                    if (product._id) {
                        productCategoryMap[product._id] = product.category;
                    }
                });
            }
        } catch (error) {
            console.error('[ViewReports] Error fetching products:', error);
        }

        // Enrich sales data with categories
        const enrichedSaleData = saleData.map(sale => {
            if (sale.productsData && Array.isArray(sale.productsData)) {
                const enrichedProducts = sale.productsData.map(product => {
                    const lookupKey = product.productCode || product.code || product.currentID;
                    const category = productCategoryMap[lookupKey] ||
                        productCategoryMap[product.currentID] ||
                        'Uncategorized';

                    return {
                        ...product,
                        category: category
                    };
                });

                return {
                    ...sale,
                    productsData: enrichedProducts
                };
            }
            return sale;
        });

        const formattedData = enrichedSaleData.map(item => ({
            ...item,
            date: item.date,
            grandTotal: formatWithCustomCommas(item.grandTotal, { currency }),
            paidAmount: formatWithCustomCommas(item.paidAmount, { currency })
        }));

        const totalSaleAmount = saleData.reduce((total, sale) => total + parseFloat(sale.paidAmount || 0), 0);
        handleExportSalesWithItemsPdf({
            data: formattedData,
            currency,
            title: 'Sales Report',
            summaryTitle: 'Sales Summary',
            additionalData: {
                "Total Sale Amount": `${currency} ${formatWithCustomCommas(totalSaleAmount)}`,
            },
        });
    };

    const exportSalesReturnPdf = () => {
        const formattedData = combinedProductData.map(item => ({
            ...item,
            date: item.date,
            grandTotal: formatWithCustomCommas(item.grandTotal, { currency }),
            paidAmount: formatWithCustomCommas(item.paidAmount, { currency }),
            returnAmount: formatWithCustomCommas(item.returnAmount, { currency })
        }));
        const totalSaleReturnAmount = combinedProductData.reduce((total, sale) => total + parseFloat(sale.returnAmount || 0), 0);
        handleExportPdf({
            data: formattedData,
            currency,
            title: 'Sales Return Report',
            summaryTitle: 'Sales Return Summary',
            tableColumns: ["Warehouse", "Date", `Grand Total(${currency})`, "Paid Amount", "Return Amount", "Note"],
            dataKeys: ["warehouse", "date", "grandTotal", "paidAmount", "returnAmount", "note"],
            additionalData: {
                "Total Sale Return Amount": `${currency} ${formatWithCustomCommas(totalSaleReturnAmount)}`,
            },
            customColumnWidths: [30, 25, 35, 30, 30, 40],
        });
    };

    const exportPurchasePdf = () => {
        const formattedData = purchaseData.map(item => ({
            ...item,
            date: item.date,
            grandTotal: formatWithCustomCommas(item.grandTotal, { currency }),
            paidAmount: formatWithCustomCommas(item.paidAmount, { currency })
        }));
        const totalPurchaseAmount = purchaseData.reduce((total, sale) => total + parseFloat(sale.paidAmount || 0), 0);
        handleExportPdf({
            data: formattedData,
            currency,
            title: 'Purchase Report',
            summaryTitle: 'Purchase Summary',
            tableColumns: ["Supplier", "Warehouse", "Date", `Grand Total(${currency})`, `Paid Amount(${currency})`, "Order Status"],
            dataKeys: ["supplier", "warehouse", "date", "grandTotal", "paidAmount", "orderStatus"],
            additionalData: {
                "Total Purchase Amount": `${currency} ${formatWithCustomCommas(totalPurchaseAmount)}`,
            },
            customColumnWidths: [35, 30, 25, 35, 35, 30],  // Date column width reduced to 25mm
        });
    };

    const exportPurchaseReturnPdf = () => {
        const formattedData = purchaseReturnData.map(item => ({
            ...item,
            date: item.date, // Use the date string as-is from the backend
            grandTotal: formatWithCustomCommas(item.grandTotal, { currency }),
            paidAmount: formatWithCustomCommas(item.paidAmount, { currency })
        }));
        const totalPurchaseReturnAmount = purchaseReturnData.reduce((total, sale) => total + parseFloat(sale.paidAmount || 0), 0);
        handleExportPdf({
            data: formattedData,
            currency,
            title: 'Purchase Return Report',
            summaryTitle: 'Purchase Return Summary',
            tableColumns: ["Supplier", "Warehouse", "Date", `Grand Total(${currency})`, `Paid Amount(${currency})`, "Note"],
            dataKeys: ["supplier", "warehouse", "date", "grandTotal", "paidAmount", "note"],
            additionalData: {
                "Total Purchase Returns Amount": `${currency} ${formatWithCustomCommas(totalPurchaseReturnAmount)}`,
            },
            customColumnWidths: [35, 30, 25, 35, 35, 30],  // Date column width reduced to 25mm
        });
    };

    return (
        <div className='relative background-white absolute top-[80px] left-0 sm:left-[220px] 2xl:left-[18%] w-full sm:w-[calc(100%-220px)] 2xl:w-[82%] min-h-screen p-3 sm:p-5'>
            <div>
                <div className="m-0 flex justify-center items-start">
                    <div className='absolute right-4 sm:right-10'>
                        {activeTable === 'sales' && (
                            <button onClick={exportSalesPdf} className="submit rounded-md px-2 sm:px-3.5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm w-32 sm:w-40 text-center">
                                {'Export As PDF'}
                            </button>
                        )}
                        {activeTable === 'salesReturn' && (
                            <button onClick={exportSalesReturnPdf} className="submit rounded-md px-2 sm:px-3.5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm w-32 sm:w-40 text-center">
                                {'Export As PDF'}
                            </button>
                        )}
                        {activeTable === 'purchase' && (
                            <button onClick={exportPurchasePdf} className="submit rounded-md px-2 sm:px-3.5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm w-32 sm:w-40 text-center">
                                {'Export As PDF'}
                            </button>
                        )}
                        {activeTable === 'purchaseReturn' && (
                            <button onClick={exportPurchaseReturnPdf} className="submit rounded-md px-2 sm:px-3.5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm w-32 sm:w-40 text-center">
                                {'Export As PDF'}
                            </button>
                        )}
                    </div>
                </div>

                <div ref={ref} className='pt-2'>
                    <div className="grid gap-4 px-2 sm:px-6 mt-10 mb-10 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
                        <Link to={'/viewSale'}>
                            <div
                                className="h-28 flex items-center justify-center rounded-[10px] shadow-lg"
                                style={{ background: '#1A5B63' }}
                                data-aos="fade-down"
                            >
                                <div className="flex flex-row items-start space-x-4">
                                    <h1 className="text-white font-bold text-center text-[10px] sm:text-[20px] md:text-[20px] lg:text-[24px] xl:text-[28px]" >
                                        {currency}  &nbsp;
                                    </h1>
                                    <div className="flex flex-col items-start">
                                        <h1 className="text-white font-bold text-center text-[10px] sm:text-[20px] md:text-[20px] lg:text-[24px] xl:text-[28px]">
                                            {totalSaleAmount}
                                        </h1>
                                        <p className="text-white text-sm">Sale</p> {/* Sale label */}
                                    </div>
                                </div>

                            </div>
                        </Link>

                        <Link to={'/viewPurchase'}>
                            <div className="h-28 flex flex-col items-center justify-center rounded-[10px] shadow-lg" style={{
                                background: ' #1A5B63',
                            }} data-aos="fade-down">

                                <div className="flex flex-row items-start space-x-4">
                                    {/* Shopping Cart Icon */}
                                    <div className="flex flex-col items-start">
                                        <h1 className="text-white font-bold text-center text-[10px] sm:text-[20px] md:text-[20px] lg:text-[24px] xl:text-[28px]">
                                            {currency} {totalPurchaseAmount}
                                        </h1>
                                        <p className="text-white text-sm">Purchase</p> {/* Sale label */}
                                    </div>
                                </div>
                            </div>
                        </Link>

                        <Link to={'/viewSaleReturns'}>
                            <div className="h-28 flex flex-col items-center justify-center rounded-[10px] shadow-lg" style={{
                                background: ' #44BC8D',
                            }} data-aos="fade-down">
                                <div className="flex flex-row items-start space-x-4">
                                    {/* Shopping Cart Icon */}
                                    <div className="flex flex-col items-start">
                                        <h1 className="text-white font-bold text-center text-[10px] sm:text-[20px] md:text-[20px] lg:text-[24px] xl:text-[28px]">
                                            {currency} {totalSaleReturnAmount}
                                        </h1>
                                        <p className="text-white text-sm">Sale Return</p> {/* Sale label */}
                                    </div>
                                </div>
                            </div>
                        </Link>

                        <Link to={'/viewPurchaseReturns'}>
                            <div className="h-28 flex flex-col items-center justify-center rounded-[10px] shadow-lg" style={{
                                background: ' #1A5B63',
                            }} data-aos="fade-down">
                                <div className="flex flex-row items-start space-x-4">
                                    {/* Shopping Cart Icon */}
                                    <div className="flex flex-col items-start">
                                        <h1 className="text-white font-bold text-center text-[10px] sm:text-[20px] md:text-[20px] lg:text-[24px] xl:text-[28px]">
                                            {currency} &nbsp;{totalPurchaseReturnAmount}
                                        </h1>
                                        <p className="text-white text-sm">Purchase Return</p> {/* Sale label */}
                                    </div>
                                </div>
                            </div>
                        </Link>

                    </div>

                    <div className='flex flex-wrap gap-2 sm:gap-0 mt-6 mb-4 ml-[4px] border-b border-gray-300'>
                        <button
                            className={`px-3 sm:px-5 py-2 text-sm sm:text-base ${activeTable === 'sales' ? 'text-gray-800 font-semibold border-b-2 border-[#44BC8D]' : 'text-gray-500'} hover:text-gray-700`}
                            onClick={() => handleTableChange('sales')}
                        >
                            Sale
                        </button>
                        <button
                            className={`px-3 sm:px-5 py-2 text-sm sm:text-base ${activeTable === 'purchase' ? 'text-gray-800 font-semibold border-b-2 border-[#44BC8D]' : 'text-gray-500'} hover:text-gray-700`}
                            onClick={() => handleTableChange('purchase')}
                        >
                            Purchase
                        </button>
                        <button
                            className={`px-3 sm:px-5 py-2 text-sm sm:text-base ${activeTable === 'salesReturn' ? 'text-gray-800 font-semibold border-b-2 border-[#44BC8D]' : 'text-gray-500'} hover:text-gray-700`}
                            onClick={() => handleTableChange('salesReturn')}
                        >
                            Sale Return
                        </button>
                        <button
                            className={`px-3 sm:px-5 py-2 text-sm sm:text-base ${activeTable === 'purchaseReturn' ? 'text-gray-800 font-semibold border-b-2 border-[#44BC8D]' : 'text-gray-500'} hover:text-gray-700`}
                            onClick={() => handleTableChange('purchaseReturn')}
                        >
                            Purchase Return
                        </button>
                    </div>

                    <button onClick={() => setFiltterOptionPopUp(true)} className='flex mt-5 sm:mt-10 ml-2 sm:ml-5 mb-5 justify-end'>
                        <img src={Fillter} alt='Fillter' className='w-8 h-8 sm:w-10 sm:h-10' />
                    </button>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center ml-2 sm:ml-5 gap-2 sm:gap-4 mb-4">
                        <div>
                            <label className="block text-left text-xs sm:text-sm font-medium">From Date</label>
                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                className="border px-2 py-1 rounded text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-left text-xs sm:text-sm font-medium">To Date</label>
                            <input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                className="border px-2 py-1 rounded text-sm"
                            />
                        </div>

                        <button
                            onClick={handleFilter}
                            className="bg-[#44BC8D] text-white px-3 sm:px-4 py-[5px] mt-2 sm:mt-5 rounded text-sm"
                        >
                            Filter
                        </button>
                    </div>

                    {fillterOptionPopUp && (
                        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex justify-center items-center pb-10 z-50">
                            <div className="relative bg-white w-[350px] sm:w-[400px] p-6 rounded-xl shadow-2xl transform scale-100 opacity-0 animate-fadeIn">

                                {/* Close Button */}
                                <button
                                    onClick={() => setFiltterOptionPopUp(false)}
                                    className="absolute top-4 right-4 text-gray-600 hover:text-red-500 transition-all touch-manipulation"
                                >
                                    <img
                                        className="w-5 h-5"
                                        src="https://th.bing.com/th/id/OIP.Ej48Pm2kmEsDdVNyEWkW0AHaHa?rs=1&pid=ImgDetMain"
                                        alt="close"
                                    />
                                </button>

                                {/* Header (Draggable handle) */}
                                <h1 className="text-center text-gray-600 font-semibold draggable-handle cursor-move">
                                    Filters
                                </h1>

                                {/* Status Select */}
                                <div className="mt-5">
                                    <label className="text-left block text-sm font-medium text-gray-700">Status</label>
                                    <select
                                        value={orderStatus}
                                        onChange={(e) => setOrderStatus(e.target.value)}
                                        className="searchBox w-full pl-2 pr-2 py-2 border border-gray-300 rounded-md shadow-sm focus:border-transparent touch-manipulation"
                                    >
                                        <option value="">Select Order Status</option>
                                        <option value="all">All</option>
                                        <option value="ordered">Ordered</option>
                                        <option value="pending">Pending</option>
                                    </select>
                                </div>

                                {/* Payment Status */}
                                <div className="mt-5">
                                    <label className="text-left block text-sm font-medium text-gray-700">Payment Status</label>
                                    <select
                                        value={paymentStatus}
                                        onChange={(e) => setPaymentStatus(e.target.value)}
                                        className="searchBox w-full pl-2 pr-2 py-2 border border-gray-300 rounded-md shadow-sm focus:border-transparent touch-manipulation"
                                    >
                                        <option value="">Select Payment Status</option>
                                        <option value="all">All</option>
                                        <option value="paid">Paid</option>
                                        <option value="unpaid">Unpaid</option>
                                    </select>
                                </div>

                                {/* Payment Type */}
                                <div className="mt-5">
                                    <label className="text-left block text-sm font-medium text-gray-700">Payment Type</label>
                                    <select
                                        value={paymentType}
                                        onChange={(e) => setPaymentType(e.target.value)}
                                        className="searchBox w-full pl-2 pr-2 py-2 border border-gray-300 rounded-md shadow-sm focus:border-transparent touch-manipulation"
                                    >
                                        <option value="">Select Payment Type</option>
                                        <option value="all">All</option>
                                        <option value="cash">Cash</option>
                                        <option value="card">Card</option>
                                        <option value="check">Check</option>
                                        <option value="bank_transfer">Bank Transfer</option>
                                    </select>
                                </div>

                                {/* Order Type */}
                                <div className="mt-5">
                                    <label className="text-left block text-sm font-medium text-gray-700">Order Type</label>
                                    <div className="flex gap-3 mt-2">
                                        <button
                                            onClick={() => setOrderType('All')}
                                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${orderType === 'All'
                                                ? 'bg-[#44BC8D] text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                        >
                                            All
                                        </button>
                                        <button
                                            onClick={() => setOrderType('Normal')}
                                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${orderType === 'Normal'
                                                ? 'bg-[#44BC8D] text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                        >
                                            Normal
                                        </button>
                                        <button
                                            onClick={() => setOrderType('PickMe')}
                                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${orderType === 'PickMe'
                                                ? 'bg-[#44BC8D] text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                        >
                                            PickMe
                                        </button>
                                        <button
                                            onClick={() => setOrderType('Uber')}
                                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${orderType === 'Uber'
                                                ? 'bg-[#44BC8D] text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                        >
                                            Uber
                                        </button>
                                    </div>
                                </div>

                                {/* Date */}
                                <div className="mt-5 mb-1">
                                    <label className="block text-sm font-medium leading-6 text-gray-900 text-left">Date</label>
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="block w-full rounded-md border pl-5 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6 touch-manipulation"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {loading ? (
                        <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-white/80 z-50">
                            <Loader />
                        </div>
                    ) : activeTable === 'sales' && saleData.length > 0 ? (
                        <div className="overflow-x-auto p-1 ml-2 sm:ml-4 mr-2 sm:mr-[23px]">

                            <div>
                                <div
                                    className="h-28 mb-4 flex flex-col w-full sm:w-1/2 lg:w-1/3 xl:w-1/4 items-center justify-center rounded-[10px] shadow-lg"
                                    style={{ background: '#1A5B63' }}
                                    data-aos="fade-down"
                                >
                                    <div className="flex flex-col items-center">
                                        <h1 className="text-white font-bold text-center text-[20px] sm:text-[24px] lg:text-[28px] xl:text-[32px]">
                                            {currency} {formatWithCustomCommas(totalServiceCharge)}
                                        </h1>
                                        <p className="text-white text-sm mt-1">Service Charge</p>
                                    </div>
                                </div>
                            </div>

                            <table className="min-w-full bg-white border border-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice Number</th>
                                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Warehouse</th>
                                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Status</th>
                                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Type</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service Charge</th>
                                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grand Total</th>
                                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200 items-center">
                                    {saleData.map((sale) => (
                                        <tr key={sale._id}>
                                            <td className="px-6 text-left py-4 whitespace-nowrap text-m text-gray-900 items-center">
                                                <p className='rounded-[5px] text-center p-[6px] bg-red-100 text-red-500 items-center'>{sale.customer}</p>
                                            </td>
                                            <td className="px-6 text-left py-4 whitespace-nowrap text-m text-gray-900">
                                                <p className='rounded-[5px] text-center p-[6px] bg-purple-100 text-purple-600'>{sale.invoiceNumber || 'N/A'}</p>
                                            </td>
                                            <td className="px-6 text-left py-4 whitespace-nowrap text-m text-gray-900">{sale.warehouse}</td>
                                            <td className="px-6 text-left py-4 whitespace-nowrap text-m text-gray-900">{sale.date}</td>
                                            <td className="px-6 text-left py-4 whitespace-nowrap text-m text-gray-900 items-center">
                                                <p className='rounded-[5px] text-center p-[6px] bg-green-100 text-green-500 items-center'>{sale.orderStatus}</p>
                                            </td>
                                            <td className="px-6 text-left py-4 whitespace-nowrap text-m text-gray-900 items-center">
                                                <p className={`items-center rounded-[5px] text-center p-[6px] ${sale.paymentStatus === 'paid' ? 'bg-green-100 text-green-500 items-center' : sale.paymentStatus === 'Partial' ? 'bg-yellow-100 text-yellow-500 items-center' : 'items-center bg-red-100 text-red-500'}`}>
                                                    {sale.paymentStatus}
                                                </p>
                                            </td>
                                            <td className="px-6 text-left py-4 whitespace-nowrap text-m text-gray-900 items-center">
                                                <p className='rounded-[5px] text-center p-[6px] bg-blue-100 text-blue-500 items-center'> {sale.paymentType.map(pt => pt.type).join(' + ')}</p>
                                            </td>
                                            <td className="px-6 py-4 text-left whitespace-nowrap text-m text-gray-900">{currency}{' '}  {formatWithCustomCommas(sale.serviceChargeValue || 0.00)}</td>
                                            <td className="px-6 text-left py-4 whitespace-nowrap text-m text-gray-900">{currency}{' '} {formatWithCustomCommas(sale.grandTotal)}</td>
                                            <td className="px-6 text-left py-4 whitespace-nowrap text-m text-gray-900">{currency}{' '} {formatWithCustomCommas(sale.paidAmount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : activeTable === 'salesReturn' && combinedProductData.length > 0 ? (
                        <div className="overflow-x-auto p-1 ml-4 mr-[23px]">
                            <table className="min-w-full bg-white border border-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Warehouse</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grand Total</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Return Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {combinedProductData.map((sale) => (
                                        <tr key={sale._id}>
                                            <td className="px-6 py-4 text-left whitespace-nowrap text-m text-gray-900"><p className='rounded-[5px] text-center p-[6px] bg-red-100 text-red-500'>{sale.customer}</p></td>
                                            <td className="px-6 py-4 text-left whitespace-nowrap text-m text-gray-900">{sale.warehouse}</td>
                                            <td className="px-6 py-4 text-left whitespace-nowrap text-m text-gray-900">{sale.date}</td>
                                            <td className="px-6 py-4 text-left whitespace-nowrap text-m text-gray-900">{currency}{' '}  {formatWithCustomCommas(sale.grandTotal)}</td>
                                            <td className="px-6 py-4 text-left whitespace-nowrap text-m text-gray-900">{currency}{' '}  {formatWithCustomCommas(sale.paidAmount)}</td>
                                            <td className="px-6 py-4 text-left whitespace-nowrap text-m text-gray-900">{currency}{' '}  {formatWithCustomCommas(sale.returnAmount ? sale.returnAmount : 0.00)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : activeTable === 'purchase' && purchaseData.length > 0 ? (
                        <div className="overflow-x-auto p-1 ml-4 mr-[23px]">
                            <table className="min-w-full bg-white border border-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Suplier</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Warehouse</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Type</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grand Total</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {purchaseData.map((purchased) => (
                                        <tr key={purchased._id}>
                                            <td className="px-6 py-4 text-left whitespace-nowrap text-m text-gray-900"><p className='rounded-[5px] text-center p-[6px] bg-red-100 text-red-500'>{purchased.supplier}</p></td>
                                            <td className="px-6 py-4 text-left whitespace-nowrap text-m text-gray-900">{purchased.warehouse}</td>
                                            <td className="px-6 py-4 text-left whitespace-nowrap text-m text-gray-900">{purchased.date}</td>
                                            <td className="px-6 py-4 text-left whitespace-nowrap text-m text-gray-900"><p className='rounded-[5px] text-center p-[6px] bg-green-100 text-green-500'>{purchased.orderStatus}</p></td>
                                            <td className="px-6 py-4 text-left whitespace-nowrap text-m text-gray-900">
                                                <p className={`rounded-[5px] text-center p-[6px] ${purchased.paymentStatus === 'paid' ? 'bg-green-100 text-green-500' : purchased.paymentStatus === 'Partial' ? 'bg-yellow-100 text-yellow-500' :
                                                    'bg-red-100 text-red-500'}`}>
                                                    {purchased.paymentStatus}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4 text-left whitespace-nowrap text-m text-gray-900"><p className='rounded-[5px] text-center p-[6px] bg-blue-100 text-blue-500'>{purchased.paymentType}</p></td>
                                            <td className="px-6 py-4 text-left whitespace-nowrap text-m text-gray-900">{currency}{' '}  {formatWithCustomCommas(purchased.grandTotal)}</td>
                                            <td className="px-6 py-4 text-left whitespace-nowrap text-m text-gray-900">{currency}{' '}  {formatWithCustomCommas(purchased.paidAmount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>) :
                        activeTable === 'purchaseReturn' && purchaseReturnData.length > 0 ? (
                            <div className="overflow-x-auto p-1 ml-4 mr-[23px]">
                                <table className="min-w-full bg-white border border-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Suplier</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Warehouse</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Return Type</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Returned Reason</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grand Total</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {purchaseReturnData.map((purchased) => (
                                            <tr key={purchased._id}>
                                                <td className="px-6 py-4 text-left whitespace-nowrap text-m text-gray-900"><p className='rounded-[5px] text-center p-[6px] bg-red-100 text-red-500'>{purchased.supplier}</p></td>
                                                <td className="px-6 py-4 text-left whitespace-nowrap text-m text-gray-900">{purchased.warehouse}</td>
                                                <td className="px-6 py-4 text-left whitespace-nowrap text-m text-gray-900">{purchased.date}</td>
                                                <td className="px-6 py-4 text-left whitespace-nowrap text-m text-gray-900"><p className='rounded-[5px] text-center p-[6px] bg-green-100 text-green-500'>{purchased.returnType}</p></td>
                                                <td className="px-6 py-4 text-lefwhitespace-nowrap text-m text-gray-900"><p className='rounded-[5px] text-center p-[6px] bg-blue-100 text-blue-500'>{purchased.note}</p></td>
                                                <td className="px-6 py-4 text-left whitespace-nowrap text-m text-gray-900">{currency}{' '}  {formatWithCustomCommas(purchased.grandTotal)}</td>
                                                <td className="px-6 py-4 text-left whitespace-nowrap text-m text-gray-900">{currency}{' '}  {formatWithCustomCommas(purchased.paidAmount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>) :
                            <p className='text-center text-gray-700 mt-5'>Not data available</p>}
                </div>
                <div>
                    {error && <p className="text-green-500 mt-5 text-center">{error}</p>}
                </div>
            </div>
        </div >
    );
}

export default ViewReportBody;
