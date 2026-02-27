

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { handleReturnPurchase } from '../PurchaseController'
import '../../../styles/role.css';
import { Link } from 'react-router-dom';
import { useParams, useNavigate } from 'react-router-dom';
import Decrease from '../../../img/down-arrow (1).png';
import Loader from '../../utill/Loader';
import { useCurrency } from '../../../context/CurrencyContext';
import formatWithCustomCommas from '../../utill/NumberFormate';

function CreatePurchaseReturnBody() {
    const { currency } = useCurrency()
    const [selectedProduct, setSelectedProduct] = useState([]);
    const [error, setError] = useState('');
    const [responseMessage, setResponseMessage] = useState('');
    const [saleProduct, setSaleProduct] = useState([])
    const [progress, setProgress] = useState(false);
    const [note, setNote] = useState('');
    const [reason, setReason] = useState('');
    const [saleReturProductData, setPurchaseReturProductData] = useState([])
    const { id } = useParams();
    const navigate = useNavigate();

    const calculateReturnTotal = () => {
        return saleReturProductData.reduce((total, product) => {
            return total + (product.returnSubtotal || 0);
        }, 0);
    };

    useEffect(() => {
        if (saleReturProductData.length > 0) {
            setSelectedProduct(prevSelectedProduct =>
                prevSelectedProduct.map((product, index) => {
                    const purchasedProduct = saleReturProductData[index];
                    if (purchasedProduct) {
                        return {
                            ...product,
                            taxRate: purchasedProduct.taxRate || 0
                        };
                    }
                    return product;
                })
            );
        }
    }, [saleReturProductData])

    useEffect(() => {
        const findSaleById = async () => {
            setProgress(true)
            try {
                const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/findPurchaseById/${id}`);
                const baseProductData = response.data.productsDetails || [];
                const fetchedProductsQty = response.data.productsData || [];

                const initializedProducts = baseProductData.map(product => ({
                    ...product,
                    selectedVariation: product.selectedVariation || Object.keys(product.variationValues)[0]
                }));

                // Initialize products with purchased quantity and return quantity
                const initializedProductsQty = fetchedProductsQty.map(pq => {
                    const purchasedQty = pq.quantity || 0;
                    return {
                        ...pq,
                        purchasedQuantity: purchasedQty,  
                        returnQuantity: 0,       
                        subtotal: pq.price * purchasedQty, 
                        returnSubtotal: pq.price * 0
                    };
                });

                setPurchaseReturProductData(initializedProductsQty);
                setSelectedProduct(initializedProducts);
                setSaleProduct(response.data);
                setProgress(false)
            } catch (error) {
                console.error('Error fetching sale by ID:', error.response ? error.response.data : error.message);
            }
        };

        if (id) {
            findSaleById();
        }
    }, [id]);

    const handleReasonChange = (e) => {
        const selectedReason = e.target.value;
        setReason(selectedReason);
        if (selectedReason !== 'Other') {
            setNote(selectedReason);
        } else {
            setNote('');
        }
    };

    const updateReturnQuantity = (index, change) => {
        setPurchaseReturProductData(prev => {
            const newList = [...prev];
            const p = { ...newList[index] };
            let qty;

            // Handle empty string (cleared input)
            if (change === '' || change === null) {
                qty = '';
            }
            // Handle increment/decrement buttons (number type)
            else if (typeof change === 'number') {
                const currentQty = typeof p.returnQuantity === 'number' ? p.returnQuantity : 0;
                qty = currentQty + change;
                if (isNaN(qty)) qty = 1;
                // Ensure return qty is between 1 and purchased quantity
                qty = Math.max(1, Math.min(qty, p.purchasedQuantity));
            }
            // Handle direct input (string type with number value)
            else {
                qty = parseInt(change, 10);
                if (isNaN(qty)) {
                    qty = '';
                } else {
                    // Ensure return qty is between 1 and purchased quantity
                    qty = Math.max(1, Math.min(qty, p.purchasedQuantity));
                }
            }

            p.returnQuantity = qty;
            p.returnSubtotal = typeof qty === 'number' ? p.price * qty : 0;

            newList[index] = p;
            return newList;
        });
    };

    const returnTotal = calculateReturnTotal();

    return (
        <div className='background-white absolute top-[80px] left-0 w-full sm:left-[220px] sm:w-[calc(100%-220px)] md:left-[220px] md:w-[calc(100%-220px)] 2xl:left-[18%] 2xl:w-[82%] min-h-[100vh] p-3 sm:p-5'>
            {progress && (
              <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-white/80 z-50">
                <Loader />
              </div>
            )}
            <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4'>
                <div>
                    <h2 className="text-lightgray-300 m-0 p-0 text-xl sm:text-2xl">Create Purchase Return</h2>
                </div>
                <div>
                    <Link className='px-3 py-1.5 sm:px-4 border border-[#35AF87] text-[#35AF87] rounded-md transition-colors duration-300 hover:bg-[#35AF87] hover:text-white text-sm' to={'/viewPurchaseReturns'}>Back</Link>
                </div>
            </div>
            <div className="bg-white mt-5 sm:mt-[50px] w-full rounded-2xl px-3 sm:px-6 lg:px-8 shadow-md pb-8 sm:pb-14">
                <div className="flex flex-1 flex-col px-0 sm:px-2 py-6 sm:py-12">
                    <form >
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 w-full gap-4">
                            {/* warehouse*/}
                            <div className="w-full">
                                <label className="block text-sm font-medium leading-6 text-gray-900 text-left">Select warehouse <span className='text-red-500'>*</span></label>
                                <select
                                    id="warehouse"
                                    name="warehouse"
                                    value={saleProduct.warehouse}
                                    disabled
                                    className="block w-full h-[42px] rounded-md border border-gray-300 py-2 px-3 text-gray-900 shadow-sm focus:border-transparent focus:outline-none text-sm"
                                >
                                    <option value="">{saleProduct.warehouse}</option>
                                </select>
                                {error.username && <p className="text-red-500">{error.username}</p>}
                            </div>

                            {/* customer */}
                            <div className="w-full">
                                <label className="block text-sm font-medium leading-6 text-gray-900 text-left">Suplier <span className='text-red-500'>*</span></label>
                                <input
                                    id="customer"
                                    name="customer"
                                    value={saleProduct.supplier}
                                    required
                                    disabled
                                    className="block w-full h-[42px] rounded-md border border-gray-300 py-2 px-3 text-gray-900 shadow-sm focus:border-transparent focus:outline-none sm:text-sm"
                                />
                            </div>

                            {/*Date*/}
                            <div className="w-full">
                                <label className="block text-sm font-medium leading-6 text-gray-900 text-left">Date <span className='text-red-500'>*</span></label>
                                <input
                                    id="text"
                                    name="text"
                                    type="text"
                                    required
                                    disabled
                                    value={saleProduct.date?.dateOnly || ""}
                                    autoComplete="given-name"
                                    className="block w-full h-[42px] rounded-md border border-gray-300 py-2 px-3 text-gray-900 shadow-sm focus:border-transparent focus:outline-none sm:text-sm"
                                />
                            </div>
                        </div>
                    </form>

                    <div className="overflow-x-auto">
                        <table className="mt-10 min-w-full bg-white border rounded-md border-gray-200">
                            <thead className="rounded-md bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock Qty</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchase Qty</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Return Qty</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sub Total</th>
                                </tr>
                            </thead>
                            {saleReturProductData.length > 0 && (
                                <tbody>
                                    {saleReturProductData.map((product, index) => (
                                        <tr key={index}>
                                            <td className="px-6 py-4 text-left  whitespace-nowrap text-sm text-gray-500">
                                                {product.name}
                                            </td>

                                            <td className="px-6 py-4 text-left whitespace-nowrap text-sm">
                                                <p className='rounded-[5px] text-center p-[6px] bg-green-100 text-green-500'>{product.stockQty}</p>
                                            </td>

                                            <td className="px-6 py-4 text-left whitespace-nowrap text-sm">
                                                <p className='rounded-[5px] text-center p-[6px] bg-blue-100 text-blue-600'>{product.purchasedQuantity}</p>
                                            </td>

                                            <td className="px-6 py-4 text-left whitespace-nowrap text-sm text-gray-500">
                                                <div className="flex items-center gap-2">

                                                    {/* Decrease */}
                                                    <button
                                                        type="button"
                                                        onClick={() => updateReturnQuantity(index, -1)}
                                                        className="w-8 h-8 bg-gray-100 rounded hover:bg-gray-200 flex items-center justify-center"
                                                    >
                                                        <img className="w-4 h-4" src={Decrease} alt="decrease" />
                                                    </button>

                                                    {/* Input – fully clearable */}
                                                    <input
                                                        type="text"
                                                        value={product.returnQuantity ?? ''}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            if (val === '') {
                                                                updateReturnQuantity(index, '');
                                                            } else if (/^\d+$/.test(val)) {
                                                                updateReturnQuantity(index, val);
                                                            }
                                                        }}
                                                        className="w-16 text-center border border-gray-300 rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-gray-400"
                                                    />


                                                    {/* Increase */}
                                                    <button
                                                        type="button"
                                                        onClick={() => updateReturnQuantity(index, 1)}
                                                        className="w-8 h-8 bg-gray-100 rounded hover:bg-gray-200 flex items-center justify-center"
                                                    >
                                                        <img className="w-4 h-4 rotate-180" src={Decrease} alt="increase" />
                                                    </button>

                                                </div>
                                            </td>

                                            {/* Product Price */}
                                            <td className="px-6 py-4 text-left whitespace-nowrap text-sm text-gray-500">
                                                {currency} {formatWithCustomCommas(product.price)}
                                            </td>

                                            {/* Subtotal */}
                                            <td className="px-6 py-4 text-left whitespace-nowrap text-sm text-gray-500">
                                                {currency} {formatWithCustomCommas(product.returnSubtotal)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            )}
                        </table>
                    </div>

                    <div className="">
                        <div className="grid grid-cols-1 gap-4 mt-10">
                            <div className="relative">
                                <label className="block text-left text-sm font-medium text-gray-700">
                                    Reason: <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={reason}
                                    onChange={handleReasonChange}
                                    className="block w-full rounded-md border-0 py-2.5 px-2 pr-10 text-gray-900 shadow-sm ring-1 ring-gray-400 placeholder:text-gray-400 focus:ring-gray-400 focus:outline-none sm:text-sm"
                                >
                                    <option value="">Select a reason</option>
                                    <option value="Damaged">Damaged</option>
                                    <option value="Expired">Expired</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            {reason === 'Other' && (
                                <div className="relative mt-4 ">
                                    <label className="block text-left text-sm font-medium text-gray-700">
                                        Reason: <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        value={note}
                                        type="text"
                                        placeholder="Add a reason for the return"
                                        className="block w-full rounded-md border-0 py-2.5 px-2 pr-10 max-h-28 text-gray-900 shadow-sm ring-1 ring-gray-400 placeholder:text-gray-400 focus:ring-gray-400 focus:outline-none sm:text-sm"
                                        onChange={(e) => setNote(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <div className="mt-8 text-right text-lg font-semibold">
                            Original Paid Amount  :  {currency} {formatWithCustomCommas(saleProduct.paidAmount)}
                        </div>
                        <div className="mt-4 text-right text-lg font-semibold">
                            Original Total  :  {currency} {formatWithCustomCommas(saleProduct.grandTotal)}
                        </div>
                        <div className="mt-4 text-right text-xl font-bold ">
                            Return Total  :  {currency} {formatWithCustomCommas(returnTotal)}
                        </div>
                    </div>

                    <button onClick={() => handleReturnPurchase(id,
                        saleProduct.grandTotal, saleProduct.paidAmount, note, saleProduct.warehouse, saleProduct.supplier, saleReturProductData, saleProduct._id, setError, setResponseMessage, setProgress, navigate)} className="mt-5 submit  w-[200px] text-white rounded py-2 px-4">
                        Return The Sale
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
export default CreatePurchaseReturnBody;
