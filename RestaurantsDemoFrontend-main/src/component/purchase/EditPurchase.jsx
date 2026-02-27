

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { handleProductSelect, handleWarehouseChange, handleUpdatePurchase } from '../purchase/PurchaseController'
import '../../styles/role.css';
import { Link, useNavigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { fetchProductDataByWarehouse } from '../pos/utils/fetchByWarehose';
import Decrease from '../../img/down-arrow (1).png';
import Loader from '../utill/Loader';
import formatWithCustomCommas from '../utill/NumberFormate';
import { useCurrency } from '../../context/CurrencyContext';

function EditPurchaseBody() {
    const { currency } = useCurrency()
    const [warehouse, setWarehouse] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState([]);
    const [selectedCategoryProducts, setSelectedCategoryProducts] = useState([]);
    const [selectedBrandProducts, setSelectedBrandProducts] = useState([]);
    const [productBillingHandling, setSearchedProductData] = useState([]);
    const [productData, setProductData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(false);
    const [discountType, setDiscountType] = useState('');
    const [error, setError] = useState('');
    const [responseMessage, setResponseMessage] = useState('');
    const [orderStatus, setOrderStatus] = useState('');
    const [paymentStatus, setPaymentStatus] = useState('');
    const [paymentType, setPaymentType] = useState('');
    const [formattedDate, setFormattedDate] = useState('');
    const [purchaseProduct, setPurchaseProduct] = useState([])
    const [saleReturProductData, setSaleReturProductData] = useState([])
    const { id } = useParams();
    const [selectedDate, setSelectedDate] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const findPurchaseById = async () => {
            try {
                setProgress(true)
                const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/findPurchaseById/${id}`);
                const fetchedProductsQty = response.data.productsData || [];
                const initializedProductsQty = fetchedProductsQty.map(pq => ({
                    ...pq,
                    quantity: pq.quantity || Object.keys(pq.quantity)[0]
                }));
                setSaleReturProductData(initializedProductsQty);
                setPurchaseProduct(response.data);
                setDiscountType(response.data.discountType);
            } catch (error) {
                console.error('Error fetching sale by ID:', error.response ? error.response.data : error.message);
                setError('Cannot load the purchases. Please try again later.');
            }
            finally {
                setProgress(false);
            }
        };
        if (id) {
            findPurchaseById();
        }
    }, [id]);

    const calculateTotal = () => {
        const subtotal = saleReturProductData.reduce((acc, product, index) => {
            const productQty = saleReturProductData[index]?.quantity || 0;
            const productSubtotal = (product.price * productQty);
            return acc + productSubtotal;
        }, 0);

        const discountAmount = discountType === 'percentage'
            ? subtotal * (purchaseProduct.discount / 100)
            : purchaseProduct.discount || 0;

        const shipping = parseFloat(purchaseProduct.shipping) || 0;
        const overallTaxRate = purchaseProduct.tax ? parseFloat(purchaseProduct.tax) / 100 : 0;
        const taxAmount = subtotal * overallTaxRate;
        const total = (subtotal - discountAmount) + taxAmount + shipping;
        return total.toFixed(2);
    };

    const handleOrderStatusChange = (e) => {
        const newOrderStatus = e.target.value;
        setOrderStatus(newOrderStatus);
        setPurchaseProduct((prevData) => ({
            ...prevData,
            orderStatus: newOrderStatus,
        }));
    };

    const handlePaymentTypeChange = (e) => {
        const newPaymentType = e.target.value;
        setPaymentType(newPaymentType);
        setPurchaseProduct((prevData) => ({
            ...prevData,
            paymentType: newPaymentType,
        }));
    };

    const handleDiscountType = (e) => {
        const value = e.target.value;
        setDiscountType(value);
        setPurchaseProduct({
            ...purchaseProduct,
            discountType: value,
        });
    };

    const handleDiscount = (e) => {
        const value = e.target.value;

        if (discountType === 'percentage') {
            const numericValue = parseFloat(value);
            if (isNaN(numericValue) || numericValue < 1 || numericValue > 100) {
                alert('Please enter a percentage value between 1 and 100.');
                return;
            }
        }
        setPurchaseProduct({
            ...purchaseProduct,
            discount: value
        });
    };

    useEffect(() => {
        if (purchaseProduct.date?.iso) {
            const d = new Date(purchaseProduct.date.iso);
            const month = (d.getMonth() + 1).toString().padStart(2, '0');
            const day = d.getDate().toString().padStart(2, '0');
            const year = d.getFullYear();
            setFormattedDate(`${year}-${month}-${day}`);
        } else {
            setFormattedDate('');
        }
    }, [purchaseProduct.date]);

    const handleDateChange = (e) => {
        setSelectedDate(e.target.value);
    };

    const handleTax = (e) => {
        setPurchaseProduct({ ...purchaseProduct, tax: e.target.value });
    };

    const handleShippng = (e) => {
        setPurchaseProduct({ ...purchaseProduct, shipping: e.target.value });
    };

    const handleQtyChange = (index, value) => {
        setSaleReturProductData(prev => {
            const item = prev[index];

            // Get current quantity: treat "" or null/undefined as 0 for math
            const currentQtyRaw = item?.quantity;
            const currentQtyForCalc = (currentQtyRaw === "" || currentQtyRaw == null) ? 0 : currentQtyRaw;

            let newQty;

            if (typeof value === 'number') {
                // Button click: +1 or -1
                newQty = currentQtyForCalc + value;
                newQty = Math.max(0, newQty); // Prevent negative
            } else {
                // Input change (typing)
                if (value === "") {
                    newQty = ""; // Allow empty field
                } else {
                    const parsed = parseInt(value, 10);
                    newQty = isNaN(parsed) ? 0 : Math.max(0, parsed);
                }
            }

            // Calculate subtotal
            const productPrice = item?.price || 0;
            const effectiveQty = newQty === "" ? 0 : newQty;
            const newSubtotal = (productPrice * effectiveQty).toFixed(2);

            return prev.map((p, i) =>
                i === index
                    ? {
                        ...p,
                        quantity: newQty, // Can be "", 0, 1, 2...
                        subtotal: newSubtotal
                    }
                    : p
            );
        });
    };

    useEffect(() => {
        if (purchaseProduct.paymentStatus === 'unpaid') {
            setPaymentType('');
            setPurchaseProduct(prevData => ({
                ...prevData,
                paymentType: '',
            }));
        }
    }, [purchaseProduct.paymentStatus]);

    const handlePaymentStatusChange = (e) => {
        const newPaymentStatus = e.target.value;
        setPaymentStatus(newPaymentStatus);
        setPurchaseProduct((prevData) => ({
            ...prevData,
            paymentStatus: newPaymentStatus,
        }));

        if (newPaymentStatus === 'unpaid') {
            setPaymentType('');
            setPurchaseProduct(prevData => ({
                ...prevData,
                paymentType: '',
            }));
        }
    };

    return (
        <div className='background-white relative left-0 w-full sm:left-[220px] sm:w-[calc(100%-220px)] 2xl:left-[18%] 2xl:w-[82%] min-h-[100vh] p-5'>
            {progress && (
              <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-white/80 z-50">
                <Loader />
              </div>
            )}
            <div className='flex flex-col sm:flex-row mt-20 justify-between items-start sm:items-center gap-3'>
                <div>
                    <h2 className="text-lightgray-300 m-0 p-0 text-2xl">Edit Purchase</h2>
                </div>
                <div>
                    <Link className='px-4 py-1.5 border border-[#35AF87] text-[#35AF87] rounded-md transition-colors duration-300 hover:bg-[#35AF87] hover:text-white' to={'/viewPurchase'}>Back</Link>
                </div>
            </div>
            <div className="bg-white mt-[20px] w-full rounded-2xl px-8 shadow-md pb-20">
                <div className="flex  flex-1 flex-col px-2 py-12 lg:px-8">
                    <form >
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"> {/* Add space between inputs if needed */}
                            {/* warehouse*/}
                            <div className="w-full"> {/* Use flex-1 to allow the field to take full width */}
                                <label className="block text-sm font-medium leading-6 text-gray-900 text-left whitespace-nowrap mb-1">Select warehouse <span className='text-red-500'>*</span></label>
                                <select
                                    id="warehouse"
                                    name="warehouse"
                                    value={purchaseProduct.warehouse}
                                    disabled
                                    onChange={(e) => handleWarehouseChange(e, setWarehouse, fetchProductDataByWarehouse, setProductData, setSelectedCategoryProducts, setSelectedBrandProducts, setSearchedProductData, setLoading)}
                                    className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                >
                                    <option>
                                        {purchaseProduct.warehouse}
                                    </option>
                                </select>
                                {error.username && <p className="text-red-500">{error.username}</p>}
                            </div>

                            {/* customer */}
                            <div className="w-full"> {/* Use flex-1 here as well */}
                                <label className="block text-sm font-medium leading-6 text-gray-900 text-left whitespace-nowrap mb-1">Supplier <span className='text-red-500'>*</span></label>
                                <input
                                    id="customer"
                                    name="customer"
                                    value={purchaseProduct.supplier}
                                    required
                                    placeholder={" Search..."}
                                    className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                />
                            </div>

                            {/* supplier invoice no */}
                            <div className="w-full">
                                <label className="block text-sm font-medium leading-6 text-gray-900 text-left whitespace-nowrap mb-1">
                                    Supplier Invoice No
                                </label>
                                <input
                                    id="invoiceNumber"
                                    name="invoiceNumber"
                                    value={purchaseProduct.invoiceNumber || ""}
                                    onChange={(e) =>
                                        setPurchaseProduct((prev) => ({
                                            ...prev,
                                            invoiceNumber: e.target.value,
                                        }))
                                    }
                                    placeholder="Add supplier invoice number..."
                                    className="w-full pl-2 pr-2 py-2 border border-gray-300 rounded-md shadow-sm focus:border-transparent"
                                />
                            </div>

                            {/*Date*/}
                            <div className="w-full"> {/* Use flex-1 here as well */}
                                <label className="block text-sm font-medium leading-6 text-gray-900 text-left whitespace-nowrap mb-1">Date <span className='text-red-500'>*</span></label>
                                <input
                                    id="date"
                                    name="date"
                                    type="date"
                                    required
                                    value={formattedDate || selectedDate}
                                    onChange={handleDateChange}
                                    disabled
                                    className="block w-full rounded-md border- pl-5 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                />
                            </div>
                        </div>
                    </form>

                    <div>
                        {filteredProducts.length > 0 && (
                            <ul className="absolute left-0 z-10 ml-[82px] w-[1213px] bg-white border border-gray-300 rounded-md shadow-lg">
                                {filteredProducts.map((product) => (
                                    <li
                                        key={product._id}
                                        onClick={() => handleProductSelect(product, setSelectedProduct, setSearchTerm, setFilteredProducts)}
                                        className="cursor-pointer hover:bg-gray-100 px-4 py-4"
                                    >
                                        {product.name}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="mt-10 min-w-full bg-white border rounded-md border-gray-200">
                            <thead className="rounded-md bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock Qty</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchase Qty</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variation Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sub Total</th>
                                </tr>
                            </thead>
                            {saleReturProductData.length > 0 && (
                                <tbody>
                                    {saleReturProductData.map((product, index) => (
                                        <tr key={index}>
                                            <td className="px-6 text-left py-4 whitespace-nowrap text-sm text-gray-500">
                                                {product.name}
                                            </td>

                                            <td className="px-6 py-4 text-left whitespace-nowrap text-sm">
                                                <p className='rounded-[5px] text-center p-[6px] bg-green-100 text-green-500'>{product.stockQty}</p>
                                            </td>

                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <div className="flex items-center">
                                                    {/* Decrement Button */}
                                                    <button
                                                        onClick={() => handleQtyChange(index, -1)} // Decrement
                                                        disabled={saleReturProductData[index]?.quantity <= 1}
                                                        className="px-2 py-2 bg-gray-100 rounded hover:bg-gray-200"
                                                    >
                                                        {/* Use increment image */}
                                                        <img className='w-[16px] h-[16px]' src={Decrease} alt='decrease' />
                                                    </button>

                                                    {/* Input Field for Quantity */}
                                                    <input
                                                        type="number"
                                                        value={saleReturProductData[index]?.quantity ?? ""}
                                                        onChange={(e) => handleQtyChange(index, e.target.value)}
                                                        className="mx-2 w-16 py-[6px] text-center border rounded outline-none focus:ring-1 focus:ring-blue-100"
                                                        min="0"
                                                    />

                                                    {/* Increment Button */}
                                                    <button
                                                        onClick={() => handleQtyChange(index, 1)}
                                                        className="px-2 py-2 bg-gray-100 rounded hover:bg-gray-200"
                                                    >
                                                        {/* Use decrement image */}
                                                        <img className='w-[16px] h-[16px] transform rotate-180' src={Decrease} alt='increase' />
                                                    </button>
                                                </div>
                                            </td>

                                            {/* Product Price */}
                                            <td className="px-6 py-4 text-left whitespace-nowrap text-sm text-gray-500">
                                                {currency}{' '} {formatWithCustomCommas(product.price)}
                                            </td>

                                            {/* Variation Type */}
                                            <td className="px-6 py-4 text-left whitespace-nowrap text-sm text-gray-500">
                                                {product.variationValue ? product.variationValue : 'No Variation'}
                                            </td>

                                            {/* Subtotal */}
                                            <td className="px-6 py-4 text-left whitespace-nowrap text-sm text-gray-500">
                                                {currency}{' '} {formatWithCustomCommas(product.subtotal)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            )}
                        </table>
                    </div>

                    <div className="">
                        {/* DISCOUNT, SHIPPING AND TAX INPUT */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 mt-60">
                            <div className="relative">
                                <label className="block text-sm font-medium leading-6 text-gray-900 text-left">Discount Type :</label>
                                <select
                                    onChange={handleDiscountType}
                                    value={purchaseProduct.discountType}
                                    className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                >
                                    <option value=''>Discount type</option>
                                    <option value='fixed'>Fixed</option>
                                    <option value='percentage'>Percentage</option>
                                </select>
                            </div>
                            <div className='relative'>
                                <label className="block text-sm font-medium leading-6 text-gray-900 text-left">Discount :</label>
                                <input
                                    onChange={handleDiscount}
                                    value={purchaseProduct.discount}
                                    type="text"
                                    placeholder="Discount"
                                    className='block w-full rounded-md border-0 py-2.5 px-2 pr-10 text-gray-900 shadow-sm ring-1 ring-gray-400 placeholder:text-gray-400 focus:ring-gray-400 focus:outline-none sm:text-sm' />
                                <span className="absolute inset-y-0 right-0 flex items-end mb-2 pr-3 text-gray-500">
                                    {discountType === 'percentage' ? '%' : currency}
                                </span>
                            </div>
                            <div className="relative">
                                <label className="block text-sm font-medium leading-6 text-gray-900 text-left">Tax :</label>
                                <input
                                    onChange={handleTax}
                                    value={purchaseProduct.tax}
                                    type="text"
                                    placeholder="Tax"
                                    className="block w-full items-center rounded-md border-0 py-2.5 px-2 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm"
                                />
                                <span className="absolute inset-y-0 right-0 flex items-end mb-2 pr-3 text-gray-500">
                                    %
                                </span>
                            </div>
                            <div className='relative'>
                                <label className="block text-sm font-medium leading-6 text-gray-900 text-left">Shipping :</label>
                                <input
                                    onChange={handleShippng}
                                    value={purchaseProduct.shipping}
                                    type="text"
                                    placeholder="Shipping"
                                    className='block w-full rounded-md border-0 py-2.5 px-2 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm' />
                                <span className="absolute inset-y-0 right-0 flex items-end mb-2 pr-3 text-gray-500">
                                    {currency}
                                </span>
                            </div>
                        </div>

                        {/* Order, Payment Status, and Payment Type Selects */}
                        <div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
                                <div>
                                    <label className="block text-sm font-medium text-left text-gray-700">Status: <span className='text-red-500'>*</span></label>
                                    <select
                                        value={purchaseProduct.orderStatus}
                                        onChange={handleOrderStatusChange}
                                        className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                    >
                                        <option value="">Select Order Status</option>
                                        <option value="pending">Received</option>
                                        <option value="ordered">Ordered</option>
                                        <option value="pending">Pending</option>
                                    </select>
                                </div>

                                {/* Payment Status Select */}
                                <div>
                                    <label className="block text-sm font-medium text-left text-gray-700">Payment Status: <span className='text-red-500'>*</span></label>
                                    <select
                                        value={purchaseProduct.paymentStatus}
                                        onChange={handlePaymentStatusChange}
                                        className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                    >
                                        <option value="">Select Payment Status</option>
                                        <option value="paid">Paid</option>
                                        <option value="unpaid">Unpaid</option>
                                    </select>
                                </div>

                                {/* Payment Type Select */}
                                <div>
                                    <label className="block text-sm font-medium text-left text-gray-700">Payment Type: <span className='text-red-500'>*</span></label>
                                    <select
                                        value={purchaseProduct.paymentType}
                                        onChange={handlePaymentTypeChange}
                                        disabled={purchaseProduct.paymentStatus === "unpaid"}
                                        className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                    >
                                        <option value="">Select Payment Type</option>
                                        <option value="cash">Cash</option>
                                        <option value="card">Card</option>
                                        <option value="check">Check</option>
                                        <option value="bank_transfer">Bank Transfer</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 text-right text-lg font-semibold">
                        Total: {currency} {formatWithCustomCommas(calculateTotal())}
                    </div>
                    <button
                        onClick={() => handleUpdatePurchase(id, calculateTotal(), purchaseProduct.orderStatus, purchaseProduct.paymentStatus, purchaseProduct.paidAmount, purchaseProduct.paymentType, purchaseProduct.shipping, purchaseProduct.discountType, purchaseProduct.discount, purchaseProduct.tax, purchaseProduct.warehouse, purchaseProduct.supplier, purchaseProduct.invoiceNumber, saleReturProductData, setError, setResponseMessage, setProgress, navigate)}
                        className="mt-5 submit w-[200px] text-white rounded py-2 px-4"
                    >
                        Update & Save
                    </button>
                </div>
                {/* Error and Response Messages */}
                <div className="mt-5">
                    <div className="relative">
                        {/* Reserve space for messages */}
                        <div className="absolute top-0 left-0 w-full">
                            {error && (
                                <p className="text-red-600 px-5 py-2 rounded-md bg-red-100 text-center mx-auto max-w-sm">
                                    {error}
                                </p>
                            )}
                            {responseMessage && (
                                <p className="text-color px-5 py-2 rounded-md bg-green-100 text-center mx-auto max-w-sm">
                                    {responseMessage}
                                </p>
                            )}
                        </div>
                        {/* Reserve empty space to maintain layout */}
                        <div className="h-[50px]"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
export default EditPurchaseBody;