

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { handleProductSelect, handleProductSearch, handleCustomerSearch, getDiscount, handleCustomerSelect, handleWarehouseChange, handleVariationChange, getQty, getPriceRange, handleDelete, handleQtyChange, getTax, getTaxType, handleRemoveVariation } from '../sales/SaleController'
import { handleSaveQuatation, handleSaveAndPrintQuatation } from './QuatationController'
import '../../styles/role.css';
import { Link, useNavigate } from 'react-router-dom';
import { fetchProductDataByWarehouse } from '../pos/utils/fetchByWarehose';
import Decrease from '../../img/down-arrow (1).png'
import Loader from '../utill/Loader';
import User from '../../img/add-user (1).png';
import { isValidMobileInput, isAllowedKey } from '../utill/MobileValidation';
import { useCurrency } from '../../context/CurrencyContext';
import formatWithCustomCommas from '../utill/NumberFormate';
import { toast } from 'react-toastify';
import ReactToPrint from 'react-to-print';
import PrintQuotation from './PrintQuotation';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

function CreateQuatationBody() {
    const { currency } = useCurrency()
    const [warehouseData, setWarehouseData] = useState([]);
    const [warehouse, setWarehouse] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchCustomer, setSearchCustomer] = useState('');
    const [filteredCustomer, setFilteredCustomer] = useState([])
    const [selectedCustomer, setSelectedCustomer] = useState([])
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState([]);
    const [date, setDate] = useState('')
    const [selectedCategoryProducts, setSelectedCategoryProducts] = useState([]);
    const [selectedBrandProducts, setSelectedBrandProducts] = useState([]);
    const [productBillingHandling, setSearchedProductData] = useState([]);
    const [productData, setProductData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [discountType, setDiscountType] = useState('');
    const [discountSymbole, setDiscountSymbole] = useState(currency);
    const [discount, setDiscount] = useState('')
    const [shipping, setShipping] = useState('')
    const [serviceCharge, setServiceCharge] = useState('');
    const [serviceChargeValue, setServiceChargeValue] = useState(0);
    const [serviceChargeType, setServiceChargeType] = useState('fixed');
    const [serviceChargeSymbol, setServiceChargeSymbol] = useState(currency);
    const [tax, setTax] = useState('')
    const [error, setError] = useState('');
    const [responseMessage, setResponseMessage] = useState('');
    const [orderStatus, setOrderStatus] = useState('');
    const [paymentStatus, setPaymentStatus] = useState('');
    const [paymentType, setPaymentType] = useState('');
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [statusOfQuatation, setStatusOfQuatation] = useState(false)
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [mobile, setMobile] = useState('');
    const [note, setNote] = useState('');
    const [progress, setProgress] = useState(false);
    const navigate = useNavigate()
    const printRef = useRef();
    const [companyDetails, setCompanyDetails] = useState({
        name: '',
        address: '',
        mobile: '',
        email: '',
        logo: ''
    });

    // Initial page load
    useEffect(() => {
        const timer = setTimeout(() => {
            setLoading(false);
        }, 200);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const fetchAllWarehouses = async () => {
            try {
                const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/fetchWarehouses`);
                console.log('All Warehouses Response:', response.data);
                setWarehouseData(response.data.warehouses || []);
            } catch (error) {
                console.error('Failed to fetch all warehouses:', error);
            }
        };

        const fetchCompanyDetails = async () => {
            try {
                const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/getSettings`);
                if (response.data) {
                    setCompanyDetails({
                        name: response.data.companyName || '',
                        address: response.data.address || '',
                        mobile: response.data.companyMobile || '',
                        email: response.data.email || '',
                        logo: response.data.logo || ''
                    });
                }
            } catch (error) {
                console.error('Failed to fetch company details:', error);
            }
        };

        fetchAllWarehouses();
        fetchCompanyDetails();
    }, []);

    useEffect(() => {
        const today = new Date();
        const formattedDate = today.toISOString().split('T')[0];
        setDate(formattedDate);
    }, []);

    const calculateTotal = () => {
        const productTotal = selectedProduct.reduce((total, product) => {
            const productPrice = Number(getPriceRange(product, product.selectedVariation));
            const productQty = product.ptype === "Variation" && product.selectedVariation
                ? product.variationValues?.[product.selectedVariation]?.barcodeQty || 0
                : product.barcodeQty || 0;
            const taxType = getTaxType(product, product.selectedVariation) || 'inclusive';
            const taxRate = product.orderTax ? product.orderTax / 100 : getTax(product, product.selectedVariation) / 100;
            const discount = Number(getDiscount(product, product.selectedVariation));
            const discountedPrice = Math.max(productPrice - discount, 0);
            const baseSubtotal = discountedPrice * productQty;

            const taxAmount = taxType.toLowerCase() === "exclusive"
                ? (productPrice * productQty * taxRate)
                : 0;

            return total + baseSubtotal + taxAmount;
        }, 0);
        let discountValue = 0;
        if (discountType === 'fixed') {
            discountValue = Number(discount);
        } else if (discountType === 'percentage') {
            discountValue = (productTotal * Number(discount)) / 100;
        }

        const shippingValue = Number(shipping);

        // Calculate service charge based on type
        let serviceChargeValue = 0;
        if (serviceChargeType === 'fixed') {
            serviceChargeValue = Number(serviceCharge);
        } else if (serviceChargeType === 'percentage') {
            serviceChargeValue = (productTotal * Number(serviceCharge)) / 100;
        }

        const globalTaxRate = Number(tax) / 100;
        const globalTax = productTotal * globalTaxRate;
        const grandTotal = productTotal - discountValue + shippingValue + serviceChargeValue + globalTax;
        return grandTotal;
    };

    const handleDiscountType = (e) => {
        setDiscountType(e.target.value)
    }

    const handleDiscount = (e) => {
        if (!discountType) {
            toast.error('Please select a discount type first.');
            return;
        }
        const value = e.target.value;
        if (discountType === 'percentage') {
            const numericValue = parseFloat(value);
            if (numericValue < 1 || numericValue > 100) {
                toast.error('Please enter a percentage value between 1 and 100.');
                return;
            }
        }
        setDiscount(value);
    };

    useEffect(() => {
        if (discountType === 'fixed') {
            return setDiscountSymbole(currency);
        }
        if (discountType === 'percentage') {
            return setDiscountSymbole('%');
        }
    }, [discountType]);

    const calculateBaseTotal = () => {
        return selectedProduct.reduce((total, product) => {
            const productPrice = Number(getPriceRange(product, product.selectedVariation));
            const productQty = product.ptype === "Variation" && product.selectedVariation
                ? product.variationValues?.[product.selectedVariation]?.barcodeQty || 0
                : product.barcodeQty || 0;
            const taxType = getTaxType(product, product.selectedVariation) || 'inclusive';
            const taxRate = product.orderTax ? product.orderTax / 100 : getTax(product, product.selectedVariation) / 100;
            const discount = Number(getDiscount(product, product.selectedVariation));
            const discountedPrice = Math.max(productPrice - discount, 0);
            const baseSubtotal = discountedPrice * productQty;

            const taxAmount = taxType.toLowerCase() === "exclusive"
                ? (productPrice * productQty * taxRate)
                : 0;

            return total + baseSubtotal + taxAmount;
        }, 0);
    };

    useEffect(() => {
        const baseTotal = calculateBaseTotal();

        let calculatedServiceCharge = 0;

        if (serviceChargeType === 'fixed') {
            calculatedServiceCharge = parseFloat(serviceCharge) || 0;
        } else if (serviceChargeType === 'percentage') {
            calculatedServiceCharge = (baseTotal * (parseFloat(serviceCharge) || 0)) / 100;
        }

        setServiceChargeValue(parseFloat(calculatedServiceCharge.toFixed(2)));
    }, [serviceCharge, serviceChargeType, selectedProduct]);

    const handleTax = (e) => {
        setTax(e.target.value)
    }

    const handleShippng = (e) => {
        setShipping(e.target.value)
    }

    const handleServiceCharge = (e) => {
        setServiceCharge(e.target.value)
    }

    const handleServiceChargeType = (e) => {
        setServiceChargeType(e.target.value);
    }

    useEffect(() => {
        if (serviceChargeType === 'fixed') {
            setServiceChargeSymbol(currency);
        } else if (serviceChargeType === 'percentage') {
            setServiceChargeSymbol('%');
        }
    }, [serviceChargeType, currency]);

    const togglePopup = () => {
        setName('');
        setMobile('');
        setAddress('');
        setIsPopupOpen(!isPopupOpen);
    }

    const handleClose = () => {
        setName('');
        setMobile('');
        setAddress('');
        setIsPopupOpen(!isPopupOpen);
    };

    useEffect(() => {
        if (error) {
            toast.error(error, { position: "top-right" });
        }
    }, [error]);

    useEffect(() => {
        if (responseMessage) {
            toast.success(responseMessage, { position: "top-right" });
        }
    }, [responseMessage]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setResponseMessage('');
        setProgress(true);

        try {

            // Mobile number validation
            const mobileRegex = /^0\d{9}$/;
            if (!mobileRegex.test(mobile)) {
                const errorMsg = 'Invalid mobile number. Format: 0xxxxxxxxx';
                setError(errorMsg);
                console.error(errorMsg);
                return;
            }

            // Customer data
            const customerData = {
                name,
                mobile,
                address,
            };
            const response = await axios.post(`${process.env.REACT_APP_BASE_URL}/api/createCustomer`, customerData);

            if (response.data && response.data.message) {
                setResponseMessage(response.data.message);

                setTimeout(() => {
                    navigate('/createQuotation');
                    setIsPopupOpen(!isPopupOpen);
                }, 1000);
            } else {
                setTimeout(() => {
                    navigate('/createQuotation');
                    setIsPopupOpen(!isPopupOpen);
                }, 1000);
                setResponseMessage('Customer created successfully.');
                console.log('Success: Customer created.');
            }
        } catch (error) {
            const errorMessage =
                error.response?.data?.message || 'An error occurred while adding the customer.please try again.';
            setError(errorMessage || 'Error creating customer.');
            console.error('Error:', errorMessage, error);
        }
        finally {
            setProgress(false);
        }
    };

    useEffect(() => {
        if (paymentStatus === 'unpaid') {
            setPaymentType('');
        }
    }, [paymentStatus]);

    const handlePaymentStatusChange = (e) => {
        const newPaymentStatus = e.target.value;
        setPaymentStatus(newPaymentStatus);

        if (newPaymentStatus === 'unpaid') {
            setPaymentType('');
        }
    };

    const handleShareWhatsApp = async () => {
        try {
            toast.info('Generating PDF...', { autoClose: 2000 });

            // Get the print component element
            const element = printRef.current;
            console.log('Print element:', element);

            if (!element) {
                console.error('Print element not found');
                toast.error('Unable to generate PDF. Please try again.');
                return;
            }

            // Ensure element is rendered
            await new Promise(resolve => setTimeout(resolve, 100));

            // Generate canvas from the print component
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: true,
                backgroundColor: '#ffffff',
                allowTaint: true
            });

            console.log('Canvas generated:', canvas.width, 'x', canvas.height);

            // Calculate PDF dimensions for 80mm width
            const imgWidth = 80; // 80mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            // Create PDF
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: [80, imgHeight + 10]
            });

            const imgData = canvas.toDataURL('image/png');
            pdf.addImage(imgData, 'PNG', 0, 5, imgWidth, imgHeight);

            // Generate blob
            const pdfBlob = pdf.output('blob');
            const fileName = `Quotation_${selectedCustomer[0]?.name || 'Customer'}_${date}.pdf`;

            console.log('PDF generated:', fileName, pdfBlob.size, 'bytes');

            // Check if mobile device
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

            // Try to use Web Share API on mobile (works on mobile devices)
            if (isMobile && navigator.share && navigator.canShare && navigator.canShare({ files: [new File([pdfBlob], fileName, { type: 'application/pdf' })] })) {
                const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
                await navigator.share({
                    files: [file],
                    title: 'Quotation',
                    text: `Quotation for ${selectedCustomer[0]?.name || 'Customer'}`
                });
                toast.success('Shared successfully!');
            } else {
                // Desktop/Fallback: Download PDF and open WhatsApp Web
                const url = URL.createObjectURL(pdfBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                // Get customer phone number if available
                const customerPhone = selectedCustomer[0]?.mobile?.replace(/[^0-9]/g, '') || '';
                const whatsappUrl = customerPhone
                    ? `https://wa.me/${customerPhone}?text=${encodeURIComponent('Please find attached the quotation PDF')}`
                    : 'https://web.whatsapp.com/';

                toast.success('PDF downloaded! Opening WhatsApp...', { autoClose: 3000 });

                // Open WhatsApp Web
                setTimeout(() => {
                    window.open(whatsappUrl, '_blank');
                }, 500);
            }
        } catch (error) {
            console.error('Error sharing PDF:', error);
            toast.error(`Failed to generate PDF: ${error.message}`);
        }
    };

    const handleClearForm = () => {
        setWarehouse('');
        setSearchTerm('');
        setSearchCustomer('');
        setFilteredCustomer([]);
        setSelectedCustomer([]);
        setFilteredProducts([]);
        setSelectedProduct([]);
        setSelectedCategoryProducts([]);
        setSelectedBrandProducts([]);
        setSearchedProductData([]);
        setDiscountType('');
        setDiscountSymbole(currency);
        setDiscount('');
        setShipping('');
        setServiceCharge('');
        setServiceChargeType('fixed');
        setServiceChargeSymbol(currency);
        setTax('');
        setOrderStatus('');
        setPaymentStatus('');
        setPaymentType('');
        setName('');
        setNote('');
        setAddress('');
        setMobile('');
        setError('');
        setResponseMessage('');

        // Reset date to today
        const today = new Date();
        const formattedDate = today.toISOString().split('T')[0];
        setDate(formattedDate);

        toast.success('Form cleared successfully!', { autoClose: 2000 });
    };

    return (
        <div className='background-white relative left-[18%] w-[82%] min-h-[100vh] p-5'>
            {(loading || progress) && (
                <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-white/80 z-50">
                    <Loader />
                </div>
            )}
            <div className='mt-20 flex justify-between items-center'>
                <div>
                    <h2 className="text-lightgray-300 m-0 p-0 text-2xl">Create Quotation</h2>
                </div>
                <div>
                    <Link className='px-4 py-1.5 border border-[#35AF87] text-[#35AF87] rounded-md transition-colors duration-300 hover:bg-[#35AF87] hover:text-white' to={'/viewQuotation'}>Back</Link>
                </div>
            </div>
            <div className="bg-white mt-[20px] w-full rounded-2xl px-8 shadow-md pb-10">
                <div className="flex  flex-1 flex-col px-2 py-12 lg:px-8">
                    <form >
                        <div className="flex flex-col md:flex-row w-full md:space-x-5 space-y-5 md:space-y-0 items-end">
                            {/* warehouse*/}
                            <div className="flex-1 w-full">
                                <label className="block text-sm font-medium leading-6 text-gray-900 text-left whitespace-nowrap">
                                    Select warehouse <span className="text-red-500">*</span>
                                </label>
                                <select
                                    id="warehouse"
                                    name="warehouse"
                                    value={warehouse}

                                    onChange={(e) =>
                                        handleWarehouseChange(
                                            e,
                                            setWarehouse,
                                            fetchProductDataByWarehouse,
                                            setProductData,
                                            setSelectedCategoryProducts,
                                            setSelectedBrandProducts,
                                            setSearchedProductData,
                                            setLoading
                                        )
                                    }
                                    className="block w-full rounded-md pl-3 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                >
                                    <option value="" disabled>
                                        Select W...
                                    </option>
                                    {warehouseData.map((wh) => (
                                        <option key={wh.name} value={wh.name}>
                                            {wh.name}
                                        </option>
                                    ))}
                                </select>
                                {error.username && <p className="text-red-500">{error.username}</p>}
                            </div>


                            {/* customer */}
                            <div className="flex-1 w-full relative"> {/* Use flex-1 here as well */}
                                <label className="block text-sm font-medium leading-6 text-gray-900 text-left whitespace-nowrap">Customer <span className='text-red-500'>*</span></label>
                                <div className="flex items-center rounded-md shadow-sm ring-1 ring-inset ring-gray-400 bg-white">
                                    <input
                                        id="customer"
                                        name="customer"
                                        value={searchCustomer}
                                        required
                                        onChange={(e) => handleCustomerSearch(e, setSearchCustomer, setFilteredCustomer)}
                                        placeholder={searchCustomer ? "" : "Search..."}
                                        className="w-full pl-3 pr-2 py-2 rounded-l-md border-0 focus:outline-none sm:text-sm sm:leading-6 bg-transparent"
                                    />
                                    {/* Add Customer Button */}
                                    <button
                                        type="button"
                                        onClick={togglePopup}
                                        className="flex items-center justify-center px-2 py-2 bg-gray-200 hover:bg-gray-100 rounded-r-md border-0 min-w-[40px]"
                                    >
                                        <img
                                            className="w-5 h-5"
                                            src={User}
                                            alt="user"
                                        />
                                    </button>
                                </div>

                                {filteredCustomer.length > 0 && (
                                    <ul className="absolute z-10 mt-1 w-[345px] bg-white border border-gray-300 rounded-md shadow-lg">
                                        {filteredCustomer.map((customer) => (
                                            <li
                                                key={customer._id}
                                                onClick={() => handleCustomerSelect(customer, setSelectedCustomer, setSearchCustomer, setFilteredCustomer)}
                                                className="cursor-pointer hover:bg-gray-100 px-4 py-4 text-left"
                                            >
                                                {customer.name}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            {/*Date*/}
                            <div className="flex-1 w-full"> {/* Use flex-1 here as well */}
                                <label className="block text-sm font-medium leading-6 text-gray-900 text-left whitespace-nowrap">Date <span className='text-red-500'>*</span></label>
                                <input
                                    id="date"
                                    name="date"
                                    type="date"
                                    required
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    autoComplete="given-name"
                                    className="block w-full rounded-md border- pl-5 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                />
                            </div>
                        </div>
                    </form>

                    <div className="flex-1 mt-5 relative">
                        {/* Input Field */}
                        <label className="block text-sm font-medium leading-6 text-gray-900 text-left">
                            Search Products
                        </label>
                        <input
                            id="text"
                            name="text"
                            type="text"
                            required
                            value={searchTerm}
                            onChange={(e) => handleProductSearch(e, setSearchTerm, setFilteredProducts, warehouse)}
                            placeholder="Search..."
                            className={`block w-full rounded-md border-0 py-2.5 pl-10 pr-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6 ${!warehouse ? "bg-gray-100 cursor-not-allowed" : ""
                                }`}
                            disabled={!warehouse}
                        />

                        {/* Dropdown List */}
                        {filteredProducts.length > 0 && (
                            <ul className="absolute left-0 z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1">
                                {filteredProducts.map((product) => (
                                    <li
                                        key={product._id}
                                        onClick={() => handleProductSelect(product, setSelectedProduct, setSearchTerm, setFilteredProducts)}
                                        className="cursor-pointer hover:bg-gray-100 text-left  px-4 py-2"
                                    >
                                        {product.name}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="overflow-x-auto">
                        {selectedProduct.length > 0 && (
                            <table className="mt-10 min-w-full bg-white border border-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock Qty</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchase Qty</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">tax</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sub Total</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variation</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {selectedProduct.length === 0 ? (
                                        <tr>
                                            <td colSpan="9" className="px-6 py-8 text-center text-sm text-gray-500">
                                                No products added yet. Search and select products to add them here.
                                            </td>
                                        </tr>
                                    ) : (
                                        selectedProduct.map((product, index) => (
                                            <tr key={`${product._id}-${product.selectedVariation}-${index}`} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 text-left whitespace-nowrap text-sm text-gray-900 font-medium">
                                                    {product.name}
                                                </td>

                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <p className='rounded-[5px] text-center p-[6px] bg-green-100 text-green-600 font-semibold'>
                                                        {product.productQty || getQty(product, product.selectedVariation)}
                                                    </p>
                                                </td>

                                                <td className="px-6 py-4 text-left whitespace-nowrap text-sm text-gray-500">
                                                    <div className="flex items-center">
                                                        <button
                                                            onClick={() => handleQtyChange(index, product.selectedVariation, setSelectedProduct, -1)}
                                                            className="px-2 py-2 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                                                        >
                                                            <img className='w-[16px] h-[16px]' src={Decrease} alt='decrease' />
                                                        </button>

                                                        <input
                                                            type="number"
                                                            value={
                                                                product.ptype === "Variation"
                                                                    ? product.variationValues[product.selectedVariation]?.barcodeQty ?? 0
                                                                    : product.barcodeQty ?? 0
                                                            }
                                                            onChange={(e) =>
                                                                handleQtyChange(
                                                                    index,
                                                                    product.selectedVariation,
                                                                    setSelectedProduct,
                                                                    e.target.value
                                                                )
                                                            }
                                                            className="mx-2 w-16 py-[6px] text-center border rounded outline-none border-gray-300 focus:ring-1 focus:ring-gray-300"
                                                            min="0"
                                                        />

                                                        <button
                                                            onClick={() => handleQtyChange(index, product.selectedVariation, setSelectedProduct, 1)}
                                                            className="px-2 py-2 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                                                        >
                                                            <img className='w-[16px] h-[16px] transform rotate-180' src={Decrease} alt='increase' />
                                                        </button>
                                                    </div>
                                                </td>

                                                {/* Product Price */}
                                                <td className="px-6 py-4 text-left whitespace-nowrap text-sm text-gray-700 font-medium">
                                                    {currency} {formatWithCustomCommas(getPriceRange(product, product.selectedVariation))}
                                                </td>

                                                {/* Display Product Tax */}
                                                <td className="px-6 py-4 text-left whitespace-nowrap text-sm text-gray-600">
                                                    {product.orderTax
                                                        ? `${product.orderTax}%`
                                                        : `${getTax(product, product.selectedVariation)}%`}
                                                </td>

                                                {/* Display Product Discount */}
                                                <td className="px-6 py-4 text-left whitespace-nowrap text-sm text-gray-600">
                                                    {currency} {formatWithCustomCommas(product.discount
                                                        ? `${product.discount}`
                                                        : `${getDiscount(product, product.selectedVariation)}`)}
                                                </td>

                                                {/* Subtotal */}
                                                <td className="px-6 py-4 text-left whitespace-nowrap text-sm text-gray-700 font-semibold">
                                                    {currency} {
                                                        (() => {
                                                            const price = getPriceRange(product, product.selectedVariation);
                                                            const quantity = product.variationValues?.[product.selectedVariation]?.barcodeQty ||
                                                                product.barcodeQty ||
                                                                0;
                                                            const taxType = getTaxType(product, product.selectedVariation) || "inclusive";
                                                            const taxRate = product.orderTax
                                                                ? product.orderTax / 100
                                                                : getTax(product, product.selectedVariation) / 100;
                                                            const discount = getDiscount(product, product.selectedVariation);
                                                            const discountedPrice = Math.max(price - discount, 0);

                                                            // Base subtotal
                                                            const baseSubtotal = discountedPrice * quantity;

                                                            // Add tax only if exclusive
                                                            const taxAmount =
                                                                taxType.toLowerCase() === "exclusive"
                                                                    ? price * quantity * taxRate
                                                                    : 0;

                                                            const subtotal = baseSubtotal + taxAmount;
                                                            return formatWithCustomCommas(subtotal);
                                                        })()
                                                    }
                                                </td>

                                                {/* Variations Column */}
                                                <td className="px-6 py-4 text-left whitespace-nowrap text-sm text-gray-500">
                                                    {product.ptype === 'Variation' && product.variationValues ? (
                                                        <div className="flex items-center justify-left gap-2">
                                                            {/* Current Variation Display */}
                                                            <div className="flex items-center gap-2">
                                                                <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-md text-sm font-medium">
                                                                    {product.selectedVariation}
                                                                </span>
                                                            </div>

                                                            {/* Add New Variation Dropdown */}
                                                            {Object.keys(product.variationValues).length > (product.addedVariations || []).length && (
                                                                <select
                                                                    onChange={(e) => {
                                                                        if (e.target.value) {
                                                                            handleVariationChange(index, e.target.value, setSelectedProduct);
                                                                            e.target.value = "";
                                                                        }
                                                                    }}
                                                                    className="w-[130px] border py-1.5 px-2 border-gray-300 rounded-md shadow-sm outline-none border-gray-300 focus:ring-1 focus:ring-gray-300 transition-colors"
                                                                    defaultValue=""
                                                                >
                                                                    <option value="" disabled>+ Add More</option>
                                                                    {Object.keys(product.variationValues)
                                                                        .filter(variationKey => !(product.addedVariations || []).includes(variationKey))
                                                                        .map((variationKey) => (
                                                                            <option key={variationKey} value={variationKey}>
                                                                                {variationKey}
                                                                            </option>
                                                                        ))}
                                                                </select>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400 italic">No Variations</span>
                                                    )}
                                                </td>

                                                {/* Delete Action */}
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    <button
                                                        onClick={() => {
                                                            // If it's a variation product and there are multiple variations added, use remove function
                                                            if (product.ptype === 'Variation' && (product.addedVariations || []).length > 1) {
                                                                handleRemoveVariation(index, setSelectedProduct);
                                                            } else {
                                                                handleDelete(index, selectedProduct, setSelectedProduct);
                                                            }
                                                        }}
                                                        className="text-red-500 hover:text-red-700 font-bold py-1 px-2 transition-colors"
                                                        title="Remove product"
                                                    >
                                                        <i className="fas fa-trash mr-1"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>

                    <div className="">
                        {/* DISCOUNT, SHIPPING AND TAX INPUT */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4 mt-60">
                            <div className="relative">
                                <label className="block text-left text-sm font-medium text-gray-700 mb-1">Discount Type:</label>
                                <select
                                    onChange={handleDiscountType}
                                    value={discountType}
                                    className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                >
                                    <option value=''>Discount</option>
                                    <option value='fixed'>Fixed</option>
                                    <option value='percentage'>Percentage</option>
                                </select>
                            </div>
                            <div className='relative'>
                                <label className="block text-left text-sm font-medium text-gray-700 mb-1">Discount:</label>
                                <input
                                    onChange={handleDiscount}
                                    value={discount}
                                    type="text"
                                    placeholder="Discount"
                                    className='block w-full rounded-md border-0 py-2.5 px-2 pr-10 text-gray-900 shadow-sm ring-1 ring-gray-400 placeholder:text-gray-400 focus:ring-gray-400 focus:outline-none sm:text-sm' />
                                <span className="absolute inset-y-0 right-0 flex items-end mb-2 pr-3 text-gray-500">
                                    {discountSymbole}
                                </span>
                            </div>
                            <div className="relative">
                                <label className="block text-left text-sm font-medium text-gray-700 mb-1">Tax:</label>
                                <input
                                    onChange={handleTax}
                                    value={tax}
                                    type="text"
                                    placeholder="Tax"
                                    className="block w-full rounded-md border-0 py-2.5 px-2 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm"
                                />
                                <span className="absolute inset-y-0 right-0 flex items-end mb-2  pr-3 text-gray-500">
                                    %
                                </span>
                            </div>
                            <div className='relative'>
                                <label className="block text-left text-sm font-medium text-gray-700 mb-1">Shipping:</label>
                                <input
                                    onChange={handleShippng}
                                    value={shipping}
                                    type="text"
                                    placeholder="Shipping"
                                    className='block w-full rounded-md border-0 py-2.5 px-2 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm' />
                                <span className="absolute inset-y-0 right-0 flex items-end mb-2  pr-3 text-gray-500">
                                    {currency}
                                </span>
                            </div>
                            <div>
                                <label className="block text-left text-sm font-medium text-gray-700 mb-1">Service Type:</label>
                                <select
                                    value={serviceChargeType}
                                    onChange={handleServiceChargeType}
                                    className='block w-full rounded-md border-0 py-2.5 px-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm'
                                >
                                    <option value="fixed">Fixed</option>
                                    <option value="percentage">Percentage</option>
                                </select>
                            </div>
                            <div className='relative'>
                                <label className="block text-left text-sm font-medium text-gray-700 mb-1">Service Charge:</label>
                                <input
                                    onChange={handleServiceCharge}
                                    value={serviceCharge}
                                    type="text"
                                    placeholder="Service"
                                    className='block w-full rounded-md border-0 py-2.5 px-2 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm' />
                                <span className="absolute inset-y-0 right-0 flex items-end mb-2  pr-3 text-gray-500">
                                    {serviceChargeSymbol}
                                </span>
                            </div>
                        </div>

                        {/* Order, Payment Status, and Payment Type Selects */}
                        <div className="grid grid-cols-3 gap-4 mt-10">
                            <div>
                                <label className="block text-left text-sm font-medium text-gray-700">Order Status: <span className='text-red-500'>*</span></label>
                                <select
                                    value={orderStatus}
                                    onChange={(e) => setOrderStatus(e.target.value)}
                                    className="searchBox w-full pl-10 pr-2 py-2 border border-gray-300 rounded-md shadow-sm focus:border-transparent"
                                >
                                    <option value="">Select Order Status</option>
                                    <option value="ordered">Sent</option>
                                    <option value="pending">Pending</option>
                                </select>
                            </div>

                            {/* Payment Status Select */}
                            <div>
                                <label className="block text-left text-sm font-medium text-gray-700">Payment Status: <span className='text-red-500'>*</span></label>
                                <select
                                    value={paymentStatus}
                                    onChange={handlePaymentStatusChange}
                                    className="searchBox w-full pl-10 pr-2 py-2 border border-gray-300 rounded-md shadow-sm focus:border-transparent"
                                >
                                    <option value="">Select Payment Status</option>
                                    <option value="paid">Paid</option>
                                    <option value="unpaid">Unpaid</option>
                                </select>
                            </div>

                            {/* Payment Type Select */}
                            <div>
                                <label className="block text-left text-sm font-medium text-gray-700">Payment Type: <span className='text-red-500'>*</span></label>
                                <select
                                    value={paymentType}
                                    onChange={(e) => setPaymentType(e.target.value)}
                                    className="searchBox w-full pl-10 pr-2 py-2 border border-gray-300 rounded-md shadow-sm focus:border-transparent"
                                    disabled={paymentStatus === "unpaid"}
                                >
                                    <option value="">Select Payment Type</option>
                                    <option value="cash">Cash</option>
                                    <option value="card">Card</option>
                                    <option value="check">Check</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                </select>
                            </div>
                        </div>
                        <div className="w-full mt-10">
                            <label className="block text-left text-sm font-medium text-gray-700 mb-1">
                                Note
                            </label>

                            <textarea
                                onChange={(e) => setNote(e.target.value)}
                                value={note}
                                placeholder="Add some note about your quotation..."
                                rows={4}
                                className="block w-full rounded-md border-0 py-2.5 px-2 
               text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 
               placeholder:text-gray-400 focus:ring-2 focus:ring-inset 
               focus:ring-gray-400 focus:outline-none sm:text-sm
               resize-none text-left align-top leading-5"
                            />
                        </div>

                    </div>
                    <div className="mt-4 text-right text-lg font-semibold">
                        Total: {currency} {formatWithCustomCommas(calculateTotal())}
                    </div>
                    <div className="container mx-auto text-left">
                        <div className='mt-10 flex flex-wrap justify-start gap-4'>
                            <button onClick={() => handleSaveQuatation(
                                calculateTotal().toFixed(2), orderStatus, paymentStatus, paymentType, shipping, serviceCharge, serviceChargeValue, serviceChargeType, discountType, discount, tax, warehouse, selectedCustomer, selectedProduct, date, note, setResponseMessage, setError, setProgress, statusOfQuatation, navigate)} className="mt-5 submit  w-[200px] text-white rounded py-2 px-4">
                                Save Quotation
                            </button>
                            <ReactToPrint
                                trigger={() => (
                                    <button className="mt-5 submit w-[200px] text-white rounded py-2 px-4">
                                        Print Quotation
                                    </button>
                                )}
                                content={() => printRef.current}
                                onBeforeGetContent={async () => {
                                    // Save quotation first before printing
                                    const success = await handleSaveAndPrintQuatation(
                                        calculateTotal().toFixed(2),
                                        orderStatus,
                                        paymentStatus,
                                        paymentType,
                                        shipping,
                                        serviceCharge,
                                        serviceChargeType,
                                        discountType,
                                        discount,
                                        tax,
                                        warehouse,
                                        selectedCustomer,
                                        selectedProduct,
                                        date,
                                        note,
                                        setResponseMessage,
                                        setError,
                                        setProgress,
                                        statusOfQuatation
                                    );
                                    if (!success) {
                                        return Promise.reject('Failed to save quotation');
                                    }
                                    return Promise.resolve();
                                }}
                                onPrintError={(error) => {
                                    console.error('Print error:', error);
                                }}
                                onAfterPrint={() => {
                                    // Navigate to view quotation after printing
                                    navigate('/viewQuotation');
                                }}
                            />
                            <button onClick={handleShareWhatsApp} className="mt-5 submit w-[200px] text-white rounded py-2 px-4">
                                <i className="fab fa-whatsapp mr-2"></i>
                                Share
                            </button>
                            <button onClick={handleClearForm} className="mt-5 bg-gray-500 hover:bg-gray-600 w-[200px] text-white rounded py-2 px-4">
                                Clear
                            </button>
                        </div>
                    </div>
                </div>

                {isPopupOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
                        <div className="bg-white w-[800px] h-[62cdb0px] overflow-auto p-8 pt-4 rounded-md shadow-lg mt-28 mb-10" data-aos="fade-down">
                            <form onSubmit={handleSubmit}>
                                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
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

                                        {/* Mobile number field */}
                                        <div className="mt-5">
                                            <label htmlFor="mobile" className="block text-sm font-medium leading-6 text-gray-900 text-left">
                                                Mobile number <span className='text-red-500'>*</span>
                                            </label>
                                            <div className="mt-0">
                                                <input
                                                    id="mobile"
                                                    name="mobile"
                                                    type="text"
                                                    required
                                                    placeholder='0 xx xxxx xxx'
                                                    value={mobile}
                                                    onChange={(e) => {
                                                        const inputValue = e.target.value;
                                                        if (isValidMobileInput(inputValue)) {
                                                            setMobile(inputValue);
                                                        }
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (!isAllowedKey(e.key)) {
                                                            e.preventDefault();
                                                        }
                                                    }}
                                                    maxLength={10}
                                                    className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                                />
                                                <p className="text-gray-500 text-left text-xs mt-1">
                                                    Must start with 0 and be exactly 10 digits
                                                </p>
                                            </div>


                                            <div className="mt-5">
                                                <label className="block text-sm font-medium leading-6 text-gray-900 text-left">Address </label>
                                                <textarea
                                                    id="address"
                                                    name="address"
                                                    type="text"
                                                    placeholder='No 46,Rock view Garden Thennekumbura'
                                                    value={address}
                                                    onChange={(e) => setAddress(e.target.value)}
                                                    autoComplete="given-name"
                                                    className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="container mx-auto text-left">
                                    <div className='mt-10 flex justify-start'>
                                        <button
                                            type='submit'
                                            className={`button-bg-color  button-bg-color:hover flex-none rounded-md bg-indigo-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 w-[100px] text-center focus-visible:outline-offset-2 focus-visible:outline-indigo-50`}
                                        >
                                            Save
                                        </button>

                                        <button
                                            type="button"
                                            className="inline-flex ml-2 justify-center rounded-md bg-gray-600 py-2.5 px-4 text-sm font-medium text-white shadow-sm hover:bg-gray-500 focus:outline-none focus:ring-2 w-[100px]  focus:ring-gray-500 focus:ring-offset-2"
                                            onClick={handleClose}
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Hidden Print Component - positioned off-screen for PDF generation */}
                <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
                    <PrintQuotation
                        ref={printRef}
                        selectedCustomer={selectedCustomer}
                        selectedProduct={selectedProduct}
                        date={date}
                        discount={discount}
                        note={note}
                        discountType={discountType}
                        tax={tax}
                        shipping={shipping}
                        serviceCharge={serviceCharge}
                        serviceChargeType={serviceChargeType}
                        total={calculateTotal()}
                        orderStatus={orderStatus}
                        paymentStatus={paymentStatus}
                        paymentType={paymentType}
                        currency={currency}
                        companyDetails={companyDetails}
                        formatWithCustomCommas={formatWithCustomCommas}
                        getPriceRange={getPriceRange}
                        getQty={getQty}
                        getDiscount={getDiscount}
                        getTax={getTax}
                        getTaxType={getTaxType}
                    />
                </div>
            </div>
        </div>
    );
}
export default CreateQuatationBody;
