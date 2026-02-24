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

import { useState, useEffect, useRef, useContext } from 'react';
import io from 'socket.io-client';
import PayingSection from "./payingSection";
import delSound from '../../../../src/audio/delet pop.mp3';
import notificationBell from '../../../audio/Oder Notification.mp3'; // Update path if needed
import axios from 'axios';
import { useCurrency } from '../../../context/CurrencyContext';
import formatWithCustomCommas from '../../utill/NumberFormate';
import ConfirmationModal from '../../common/deleteConfirmationDialog';
import { UserContext } from '../../../context/UserContext';
import GiftIcon from '../../../img/giftbox.png';
import RestockOrder from '../../../img/reorder.png';
import ViewOrder from '../../../img/checkout.png';
import Pencil from '../../../img/pencil.png'
import { toast } from 'react-toastify';
import { useOrderChannel } from '../../../context/OrderChannelContext';
import { Monitor, Trash2, RefreshCw } from 'lucide-react';
import { silentPrint } from '../utils/silentPrint';

const BillingSection = ({ productBillingHandling, setProductBillingHandling, setProductData, selectedCustomer, setSelectedCustomer, warehouse, setReloadStatus, reloadStatus, setHeldProductReloading, setSelectedCategoryProducts, setSelectedBrandProducts, setSearchedProductData, setError, setFetchRegData, setOrderId, orderId, setPalcedStatus, palcedStatus, handleOpenCustomerDisplay }) => {
    const { currency } = useCurrency();
    const [permissionData, setPermissionData] = useState({});
    const { userData } = useContext(UserContext);
    const [productDetailsForPrinting, setProductDetailsForPrinting] = useState([]);
    const [productDetailsForHolding, setProductDetailsForHolding] = useState([]);
    const [refferenceNumber, setRefferenceNumber] = useState('')
    const [showPayingSec, setShowPayingSection] = useState(false)
    const [showProductHolding, setShowProductHolding] = useState(false)
    const [discountType, setDiscountType] = useState('percentage');
    const [discountSymbole, setDiscountSymbole] = useState(currency);
    const [discount, setDiscount] = useState('')
    const [shipping, setShipping] = useState('')
    const [serviceCharge, setServiceCharge] = useState('')
    const [serviceChargeType, setServiceChargeType] = useState('percentage');
    const [serviceChargeSymbol, setServiceChargeSymbol] = useState(currency);
    const [deliveryNote, setDeliveryNote] = useState('');
    const [tax, setTax] = useState('');
    const [totalItems, setTotalItems] = useState(0);
    const [totalPcs, setTotalPcs] = useState(0);
    const [profit, setProfit] = useState(0);
    const [openAuthModel, setOpenAuthModel] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [specialDiscountPopUp, setSpecialDiscountPopUp] = useState(false);
    const [specialDiscount, setSpecialDiscount] = useState(0);
    const [responseMessage, setResponseMessage] = useState('');
    const [selectedProductIndex, setSelectedProductIndex] = useState(null);
    const [offersData, setOffers] = useState([]);
    const [openOffersModel, setOpenOffersModel] = useState(false);
    const [selectedOffer, setSelectedOffer] = useState('');
    const [offerPercentage, setOfferPercentage] = useState(0);
    const [serviceChargeValue, setServiceChargeValue] = useState(0);
    const [progress, setProgress] = useState(false);
    const adminPasswordRef = useRef(null);
    const discountInputRef = useRef(null);
    const [tableNo, setTableNo] = useState("");
    const [tokenNo, setTokenNo] = useState("");
    const [parcelNo, setParcelNo] = useState("");
    const [kotNote, setKotNote] = useState("");
    const [isFullscreen, setIsFullscreen] = useState(sessionStorage.getItem('isFullscreen'));
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [orderType, setOrderType] = useState("dinein");
    const [orders, setOrders] = useState([]);
    const [activeOrderId, setActiveOrderId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saleToDelete, setSaleToDelete] = useState(null);
    const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const prevOrdersRef = useRef([]);
    const tableNoInputRef = useRef(null);
    const { channel, sendDelete, sendClearAll } = useOrderChannel();
    const customerDisplayChannel = useRef(new BroadcastChannel('pos-customer-display'));

    const BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:4005';

    useEffect(() => {
        if (userData?.permissions) {
            setPermissionData(extractPermissions(userData.permissions));
        }
    }, [userData]);

    const fetchOrders = async () => {
        try {
            const res = await fetch(`${BASE_URL}/api/orders/pending`);

            if (!res.ok) throw new Error('Failed to fetch');

            const data = await res.json();

            if (data.success) {
                const fetchedOrders = data.data || [];
                const previousIds = new Set(prevOrdersRef.current.map(o => o._id));
                const newlyReceived = fetchedOrders.filter(o => !previousIds.has(o._id));

                if (newlyReceived.length > 0) {
                    playNotificationSound();
                    setIsSidebarOpen(true);
                }
                localStorage.setItem('pendingOrders', JSON.stringify(fetchedOrders));
                setOrders(fetchedOrders);
                prevOrdersRef.current = fetchedOrders;
            }
        } catch (err) {
            console.error('Failed to fetch orders:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();

        const socket = io(BASE_URL);
        const handleRefresh = () => fetchOrders();

        socket.on('newOrder', handleRefresh);
        socket.on('orderPlaced', handleRefresh);
        socket.on('orderUpdated', handleRefresh);
        socket.on('orderDeleted', handleRefresh);
        socket.on('allOrdersDeleted', handleRefresh);

        const interval = setInterval(() => {
            fetchOrders();
        }, 5000);

        return () => {
            clearInterval(interval);
            socket.off('newOrder', handleRefresh);
            socket.off('orderPlaced', handleRefresh);
            socket.off('orderUpdated', handleRefresh);
            socket.off('orderDeleted', handleRefresh);
            socket.off('allOrdersDeleted', handleRefresh);
            socket.disconnect();
        };
    }, []);

    useEffect(() => {
        if (reloadStatus) {
            fetchOrders();
            setReloadStatus(false);
        }
    }, [reloadStatus]);

    useEffect(() => {
        fetchOrders();
        const handleMessage = (event) => {
            const { type, pendingOrders, orderId } = event.data || {};

            if (type === 'PENDING_UPDATED' && Array.isArray(pendingOrders)) {
                setOrders(pendingOrders);
                localStorage.setItem('pendingOrders', JSON.stringify(pendingOrders));
                playNotificationSound();
                if (!isSidebarOpen) setIsSidebarOpen(true);
            }

            if (type === 'ORDER_DELETED' && orderId) {
                setOrders(prev => prev.filter(o => o._id !== orderId));
                localStorage.setItem('pendingOrders', JSON.stringify(orders.filter(o => o._id !== orderId)));
            }

            if (type === 'CLEAR_ALL_PENDING') {
                setOrders([]);
                localStorage.removeItem('pendingOrders');
            }
        };

        const channel = new BroadcastChannel('order-channel');
        channel.addEventListener('message', handleMessage);

        return () => {
            channel.removeEventListener('message', handleMessage);
            channel.close();
        };
    }, [palcedStatus]);

    const playNotificationSound = () => {
        const audio = new Audio(notificationBell);
        audio.volume = 0.8;
        audio.play().catch(error => {
            console.warn('Notification sound blocked (user interaction required or autoplay policy):', error);
        });
    };

    useEffect(() => {
        const savedOrders = localStorage.getItem('pendingOrders');
        if (savedOrders) {
            setOrders(JSON.parse(savedOrders));
        } else {
            fetchOrders();
        }
        const handleMessage = (event) => {
            const { type, order, orderId } = event.data;
            if (type === 'NEW_ORDER') {
                setOrders((prevOrders) => {
                    const exists = prevOrders.some(o => o._id === order._id);
                    if (!exists) {
                        playNotificationSound();
                        toast.info(
                            <div>
                                <strong>New Order!</strong><br />
                                {order.tableNo
                                    ? `Table ${order.tableNo}`
                                    : `Token #${order.tokenNo || 'Walk-in'}`}
                                • Rs {parseFloat(order.totalPrice || 0).toFixed(2)}
                            </div>,
                            { autoClose: 5000 }
                        );
                        const updated = [order, ...prevOrders];
                        localStorage.setItem('pendingOrders', JSON.stringify(updated));
                        return updated;
                    }
                    return prevOrders;
                });
                if (!isSidebarOpen) {
                    setIsSidebarOpen(true);
                }
            } else if (type === 'DELETE_ORDER') {
                setOrders((prev) => {
                    const updated = prev.filter(o => o._id !== orderId);
                    localStorage.setItem('pendingOrders', JSON.stringify(updated));
                    return updated;
                });
            } else if (type === 'CLEAR_ALL') {
                setOrders([]);
                localStorage.removeItem('pendingOrders');
            }
        };

        channel.addEventListener('message', handleMessage);

        // Cleanup
        return () => {
            channel.removeEventListener('message', handleMessage);
        };
    }, [isSidebarOpen]);

    useEffect(() => {
        const handleSyncRequest = (event) => {
            if (event.data.type === 'REQUEST_SYNC') {
                broadcastBillingUpdate();
            }
        };
        customerDisplayChannel.current.addEventListener('message', handleSyncRequest);
        return () => {
            customerDisplayChannel.current.removeEventListener('message', handleSyncRequest);
        };
    }, [productBillingHandling, discount, tax, shipping, serviceCharge, serviceChargeType, offerPercentage, currency]);

    const broadcastBillingUpdate = () => {
        const products = productBillingHandling.map(product => {
            const variation = product.selectedVariation
                ? product.variationValues?.[product.selectedVariation]
                : null;
            return {
                name: product.name,
                variationName: variation ? product.selectedVariation : null,
                qty: product.qty,
                subtotal: getRowSubtotal(product)
            };
        });

        customerDisplayChannel.current.postMessage({
            type: 'UPDATE_BILLING',
            payload: {
                products,
                subtotal: calculateBaseTotal(),
                discount: calculateDiscountAmount(calculateBaseTotal()),
                tax: (calculateBaseTotal() * (parseFloat(tax) || 0) / 100),
                shipping: parseFloat(shipping) || 0,
                serviceCharge: serviceChargeValue,
                total: parseFloat(calculateTotalPrice()),
                receivedAmount: 0,
                balance: 0,
                currencySymbol: currency
            }
        });
    };

    useEffect(() => {
        if (productBillingHandling.length > 0) {
            broadcastBillingUpdate();
        }
    }, [productBillingHandling, discount, tax, shipping, serviceCharge, serviceChargeType, offerPercentage, currency, serviceChargeValue]);

    const handleManualResetDisplay = () => {
        customerDisplayChannel.current.postMessage({ type: 'RESET_BILLING' });
        toast.info("Customer display cleared");
    };

    useEffect(() => {
        const handleMessage = (event) => {
            const { type, order, orderId, clearAll } = event.data;

            if (type === 'NEW_ORDER' && order) {
                setOrders((prev) => {
                    const exists = prev.some(o => o._id === order._id);
                    if (!exists) {
                        playNotificationSound();
                        toast.info(
                            <div>
                                <strong>New Order!</strong><br />
                                {order.tableNo ? `Table ${order.tableNo}` : `Token #${order.tokenNo || 'Walk-in'}`}
                                {' • Rs ' + parseFloat(order.totalPrice || 0).toFixed(2)}
                            </div>,
                            { autoClose: 5000 }
                        );

                        const updated = [order, ...prev];
                        localStorage.setItem('pendingOrders', JSON.stringify(updated));
                        return updated;
                    }
                    return prev;
                });

                if (!isSidebarOpen) setIsSidebarOpen(true);
            }

            else if (type === 'DELETE_ORDER' && orderId) {
                setOrders(prev => {
                    const updated = prev.filter(o => o._id !== orderId);
                    localStorage.setItem('pendingOrders', JSON.stringify(updated));
                    return updated;
                });
                toast.success("Order deleted from all devices");
            }

            else if (type === 'CLEAR_ALL' || clearAll) {
                setOrders([]);
                localStorage.removeItem('pendingOrders');
                toast.success("All pending orders cleared everywhere");
                if (isSidebarOpen) setIsSidebarOpen(false);
            }
        };

        channel.addEventListener('message', handleMessage);
        return () => channel.removeEventListener('message', handleMessage);
    }, [channel, isSidebarOpen]);

    useEffect(() => {
        if (orders.length === 0 && isSidebarOpen) {
            setIsSidebarOpen(false);
        }
    }, [orders, isSidebarOpen]);

    const extractPermissions = (permissions) => {
        let extractedPermissions = {};

        Object.keys(permissions).forEach((category) => {
            Object.keys(permissions[category]).forEach((subPermission) => {
                extractedPermissions[subPermission] = permissions[category][subPermission];
            });
        });
        return extractedPermissions;
    };

    useEffect(() => {
        if (specialDiscountPopUp) {
            setTimeout(() => {
                adminPasswordRef.current?.focus();
            }, 100);
        }
    }, [specialDiscountPopUp]);

    const handleAddSpecialDiscount = () => {
        if (selectedProductIndex !== null) {
            const updatedProducts = [...productBillingHandling];
            updatedProducts[selectedProductIndex].specialDiscount = parseFloat(specialDiscount) || 0;
            setProductBillingHandling(updatedProducts);
            setSpecialDiscountPopUp(false);
            setSelectedProductIndex(null);

            setTimeout(() => {
                calculateTotalPrice();
                setSpecialDiscount('');
            }, 0);
        }
    };

    useEffect(() => {
        calculateTotalPrice();
    }, [productBillingHandling]);

    const handleDiscountAccess = async (e) => {
        e.preventDefault();
        if (!username || !password) {
            toast.error('Please enter both username and password.');
            return;
        }
        const data = { username: username, password: password };
        try {
            const response = await fetch(`${process.env.REACT_APP_BASE_URL}/api/getDiscountAccess`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            const result = await response.json();
            const status = result.status;
            sessionStorage.setItem('status', status);
            if (status === 'success') {
                setSpecialDiscountPopUp(true);
                if (discountInputRef.current) {
                    discountInputRef.current.focus();
                }
                toast.success('Access granted successfully!');
            } else {
                toast.error('Access denied. Please check your credentials.');
            }
            setOpenAuthModel(false);
        } catch (error) {
            console.error('There was a problem with your fetch operation:', error);
            toast.error('An error occurred while processing your request.');
        }
    };

    const fetchOfferData = async () => {
        try {
            const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/fetchOffers`, {
                params: {
                    sort: '-createdAt'
                },
            });
            setOffers(response.data.offers);
        } catch (error) {
            setOffers([]);
        } finally {
            //setLoading(false);
        }
    };

    useEffect(() => {
        fetchOfferData();
    }, []);

    const handleOfferChange = (e) => {
        const selectedOfferId = e.target.value;
        setSelectedOffer(selectedOfferId);

        if (selectedOfferId === '') {
            setSelectedOffer('');
            setOfferPercentage(0);
            setOpenOffersModel(false)
        }
        else {
            const selectedOfferObj = offersData.find(offer => offer.offerName === selectedOfferId);
            if (selectedOfferObj) {
                const percentage = selectedOfferObj.percentage;
                console.log(percentage)
                setOfferPercentage(selectedOfferObj.percentage);
                setOpenOffersModel(false)
            }
        }
    };

    useEffect(() => {
        const fetchReferenceNumber = async () => {
            try {
                const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/generateHoldReferenceNo`); // Call new API
                if (response.data && response.data.referenceNo) {
                    setRefferenceNumber(response.data.referenceNo);
                }
            } catch (error) {
                console.error('Error generating reference number:', error);
            }
        };

        if (showProductHolding) {
            fetchReferenceNumber();
        }
    }, [showProductHolding]);

    const handleIncrement = (index) => {
        setProductBillingHandling((prev) => {
            const product = prev[index];
            const variation = product.selectedVariation
                ? product.variationValues[product.selectedVariation]
                : null;
            const availableStock = variation ? variation.productQty : product.stokeQty;
            if (product.isInventory && product.qty >= availableStock) {
                toast.error(`Cannot increase more, only ${availableStock} in stock.`);
                return prev;
            }

            return prev.map((p, i) => (i === index ? { ...p, qty: p.qty + 1 } : p));
        });
    };

    const handleQtyChange = (e, index) => {
        const inputValue = e.target.value;
        const newQty = Number(inputValue);
        const product = productBillingHandling[index];
        const variation = product.selectedVariation
            ? product.variationValues[product.selectedVariation]
            : null;
        const availableStock = variation ? variation.productQty : product.stokeQty;

        if (inputValue === "") {
            setProductBillingHandling((prev) =>
                prev.map((p, i) => (i === index ? { ...p, qty: "" } : p))
            );
            return;
        }
        if (isNaN(newQty) || newQty < 1) {
            toast.error("Quantity must be at least 1.");
            return;
        }
        if (product.isInventory && newQty > availableStock) {
            toast.error(`Cannot enter more than ${availableStock} in stock.`);
            return;
        }
        setProductBillingHandling((prev) =>
            prev.map((p, i) => (i === index ? { ...p, qty: newQty } : p))
        );
    };

    useEffect(() => {
        const adjustQuantitiesForStock = () => {
            setProductBillingHandling((prevProducts) =>
                prevProducts.map((product) => {
                    const variation = product.selectedVariation
                        ? product.variationValues[product.selectedVariation]
                        : null;
                    const availableStock = variation ? variation.productQty : product.stokeQty;
                    if (product.qty > availableStock) {
                        toast.error(
                            `Quantity for "${product.name}" adjusted to available stock (${availableStock}).`
                        );
                        return { ...product, qty: availableStock };
                    }
                    return product;
                })
            );
        };

        adjustQuantitiesForStock();
    }, []);

    const handleDecrement = (index) => {
        setProductBillingHandling((prev) =>
            prev.map((product, i) => {
                if (i === index && product.qty > 1) {
                    return { ...product, qty: product.qty - 1 };
                }
                return product;
            })
        );
    };

    const handleDelete = (index) => {
        setProductBillingHandling((prev) => prev.filter((_, i) => i !== index));
    };

    const getRowSubtotal = (product) => {
        const variation = product.selectedVariation
            ? product.variationValues?.[product.selectedVariation]
            : null;

        const price = parseFloat(variation?.price) || parseFloat(product.price) || 0;
        const qty = product.qty || 0;
        const discount = parseFloat(variation?.discount) || parseFloat(product.discount) || 0;
        const tax = variation?.orderTax !== undefined ? parseFloat(variation.orderTax) : parseFloat(product.tax) || 0;
        const taxType = variation?.taxType || product.taxType || 'inclusive';
        const specialDiscount = parseFloat(product.specialDiscount) || 0;
        const basePriceAfterDiscounts = Math.max(price - discount - specialDiscount, 0);
        const subTotal = basePriceAfterDiscounts * qty;

        if (taxType.toLowerCase() === "exclusive") {
            const taxAmount = (price * qty * tax) / 100;
            return subTotal + taxAmount;
        }
        return subTotal;
    };

    const calculateBaseTotal = () => {
        return productBillingHandling
            .filter(product => product.ptype !== 'Base')
            .reduce((acc, product) => {
                const variation = product.selectedVariation
                    ? product.variationValues?.[product.selectedVariation]
                    : null;

                const price = parseFloat(variation?.price) || parseFloat(product.price) || 0;
                const tax = variation?.orderTax !== undefined ? parseFloat(variation.orderTax) : parseFloat(product.tax) || 0;
                const taxType = variation?.taxType || product.taxType || "inclusive";
                const qty = product.qty || 0;
                const discount = parseFloat(variation?.discount) || parseFloat(product.discount) || 0;
                const specialDiscount = parseFloat(product.specialDiscount) || 0;
                const basePriceAfterDiscounts = Math.max(price - discount - specialDiscount, 0);

                if (isNaN(basePriceAfterDiscounts) || isNaN(tax) || isNaN(qty)) {
                    console.warn(`[WARNING] Skipping product due to NaN values`, { basePriceAfterDiscounts, tax, qty });
                    return acc;
                }

                const subTotal = basePriceAfterDiscounts * qty;
                if (taxType.toLowerCase() === "exclusive") {
                    const taxAmount = (price * qty * tax) / 100;
                    return acc + subTotal + taxAmount;
                }

                return acc + subTotal;
            }, 0);
    };

    const calculateTotalPrice = () => {
        let total = calculateBaseTotal();

        let discountAmount = 0;
        if (discountType === 'fixed') {
            discountAmount = parseFloat(discount) || 0;
        } else if (discountType === 'percentage') {
            discountAmount = (total * (parseFloat(discount) || 0) / 100);
        }

        // Apply additional tax
        const taxAmount = (total * (parseFloat(tax) || 0) / 100);
        const shippingCost = parseFloat(shipping) || 0;

        // Calculate service charge based on type
        let serviceChargeCost = 0;
        if (serviceChargeType === 'fixed') {
            serviceChargeCost = parseFloat(serviceCharge) || 0;
        } else if (serviceChargeType === 'percentage') {
            serviceChargeCost = (total * (parseFloat(serviceCharge) || 0) / 100);
        }

        // Apply the offer percentage
        const offerPercentageDecimal = parseFloat(offerPercentage) / 100;
        const offerDiscountAmount = total * offerPercentageDecimal;
        total = total - discountAmount - offerDiscountAmount + taxAmount + shippingCost + serviceChargeCost;

        return isNaN(total) ? "0.00" : total.toFixed(2);
    };

    useEffect(() => {
        if (!productBillingHandling.length && !serviceCharge) {
            setServiceChargeValue(0);
            return;
        }
        const baseTotal = calculateBaseTotal();
        let serviceChargeCost = 0;

        if (serviceChargeType === 'fixed') {
            serviceChargeCost = parseFloat(serviceCharge) || 0;
        } else if (serviceChargeType === 'percentage') {
            serviceChargeCost = (baseTotal * (parseFloat(serviceCharge) || 0)) / 100;
        }

        setServiceChargeValue(parseFloat(serviceChargeCost.toFixed(2)));
    }, [serviceCharge, serviceChargeType, productBillingHandling,]);

    const calculateDiscountAmount = (baseTotal) => {
        let discountAmount = 0;
        if (discountType === 'fixed') {
            discountAmount = parseFloat(discount) || 0;
        } else if (discountType === 'percentage') {
            discountAmount = (baseTotal * (parseFloat(discount) || 0)) / 100;
        }
        return discountAmount;
    };

    const calculateTaxLessTotal = () => {
        let subtotal = productBillingHandling
            .filter(product => product.ptype !== 'Base')
            .reduce((acc, product) => {
                const variation = product.selectedVariation
                    ? product.variationValues?.[product.selectedVariation]
                    : null;

                const price = parseFloat(variation?.price) || parseFloat(product.price) || 0;
                const discount = variation?.discount !== undefined ? parseFloat(variation.discount) : parseFloat(product.discount) || 0;
                const specialDiscount = parseFloat(product.specialDiscount) || 0;

                const qty = product.qty || 0;

                const netPrice = Math.max(price - discount - specialDiscount, 0) * qty;
                const productSubtotal = netPrice;
                return acc + productSubtotal;
            }, 0);
        const total = subtotal;
        return isNaN(total) ? 0 : total;
    };

    const calculateProfit = () => {
        let subtotal = productBillingHandling
            .filter(product => product.ptype !== 'Base')
            .reduce((acc, product) => {
                const variation = product.selectedVariation
                    ? product.variationValues?.[product.selectedVariation]
                    : null;
                const price = parseFloat(variation?.price) || parseFloat(product.price) || 0;
                const discount = variation?.discount !== undefined
                    ? parseFloat(variation.discount)
                    : parseFloat(product.discount) || 0;

                const specialDiscount = parseFloat(product.specialDiscount) || 0;

                const productCost = variation?.productCost !== undefined
                    ? parseFloat(variation.productCost)
                    : parseFloat(product.productCost) || 0;

                const qty = product.qty || 0;

                const netPrice = Math.max(price - discount - specialDiscount, 0) * qty;
                const productSubtotal = netPrice;
                const totalCost = parseFloat(productCost * qty);

                return acc + (productSubtotal - totalCost);
            }, 0);

        const totalPrice = calculateTaxLessTotal();
        let discountAmount = 0;
        if (discountType === 'fixed') {
            discountAmount = parseFloat(discount) || 0;
        } else if (discountType === 'percentage') {
            discountAmount = (totalPrice * (parseFloat(discount) || 0) / 100);
        }
        const offerDiscountAmount = totalPrice * (parseFloat(offerPercentage) / 100);
        const totalProfit = subtotal - discountAmount - offerDiscountAmount;

        return totalProfit;
    };

    useEffect(() => {
        const calculatedProfit = calculateProfit();
        setProfit(calculatedProfit);
    }, [productBillingHandling, discountType, discount, offerPercentage, calculateTaxLessTotal]);

    const calculateTotalItemsAndPcs = () => {
        let itemsCount = 0;
        let pcsCount = 0;
        productBillingHandling
            .filter(product => product.ptype !== 'Base')
            .forEach(product => {
                if (product.qty > 0) {
                    itemsCount += 1;
                    pcsCount += product.qty;
                }
            });
        return { itemsCount, pcsCount };
    };

    useEffect(() => {
        const { itemsCount, pcsCount } = calculateTotalItemsAndPcs();
        setTotalItems(itemsCount);
        setTotalPcs(pcsCount);
    }, [productBillingHandling]);

    const handleBillReset = () => {
        setProductBillingHandling([]);
        setDiscount('');
        setSelectedOffer('');
        setDiscountType('percentage');
        setOfferPercentage(0);
        setShipping('');
        setServiceCharge('');
        setServiceChargeValue(0);
        setServiceChargeType('percentage');
        setTax('');
        setSelectedCustomer('')
        sessionStorage.removeItem('status');
    };

    const handlePopupClose = () => {
        setShowPayingSection(false);
        setShowProductHolding(false)
    };

    const playSound = () => {
        const audio = new Audio(delSound);
        audio.play().catch((error) => console.error('Audio play failed:', error));
    };

    useEffect(() => {
        if (discountType === 'fixed') {
            return setDiscountSymbole(currency);
        }
        if (discountType === 'percentage') {
            return setDiscountSymbole('%');
        }
    }, [discountType]);

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

    const handleTax = (e) => {
        setTax(e.target.value)
    }

    const handleShippng = (e) => {
        setShipping(e.target.value)
    }

    const handleServiceCharge = (e) => {
        if (!serviceChargeType) {
            toast.error('Please select a service charge type first.');
            return;
        }
        const value = e.target.value;
        if (serviceChargeType === 'percentage') {
            const numericValue = parseFloat(value);
            if (numericValue < 0 || numericValue > 100) {
                toast.error('Please enter a percentage value between 0 and 100.');
                return;
            }
        }
        setServiceCharge(value);
    }

    useEffect(() => {
        if (serviceChargeType === 'fixed') {
            setServiceChargeSymbol(currency);
        } else if (serviceChargeType === 'percentage') {
            setServiceChargeSymbol('%');
        }
    }, [serviceChargeType, currency]);

    const gatherProductDetails = () => {
        return productBillingHandling
            .filter(product => product.ptype !== 'Base')
            .map(product => {
                const variation = product.selectedVariation
                    ? product.variationValues?.[product.selectedVariation]
                    : null;

                const price = variation?.price || parseFloat(product.price) || 0;
                const discount = variation?.discount || parseFloat(product.discount) || 0;
                const tax = variation?.orderTax !== undefined ? parseFloat(variation.orderTax) : parseFloat(product.tax) || 0;
                const taxType = variation?.taxType || product.taxType || 'inclusive';
                const specialDiscount = parseFloat(product.specialDiscount) || 0;
                const productCost = parseFloat(variation?.productCost) || parseFloat(product.productCost) || 0;
                const priceAfterDiscounts = price - discount - specialDiscount;
                const actualSeliingPrice = priceAfterDiscounts + (price * (tax / 100))
                const subTotal = (priceAfterDiscounts * product.qty) + ((price * product.qty * tax) / 100);

                let kotPrintedStatus = product.kotPrinted !== undefined ? product.kotPrinted : false;
                if (product.originalQty !== undefined && product.qty > product.originalQty) {
                    kotPrintedStatus = false;
                }

                return {
                    currentID: product.id,
                    name: product.name,
                    isInventory: product.isInventory,
                    ptype: product.ptype,
                    specialDiscount: specialDiscount,
                    warehouse: product.warehouse || {},
                    variation: product.selectedVariation ? product.selectedVariation : product.variationValue || null,
                    qty: product.qty,
                    discount: discount,
                    tax: tax,
                    taxType: taxType,
                    price: price,
                    actualSeliingPrice,
                    productCost: productCost,
                    subtotal: subTotal,
                    kotPrinted: kotPrintedStatus,
                    originalQty: product.originalQty,
                    offcialProduct: product.offcialProduct !== undefined ? product.offcialProduct : true,
                };
            });
    };

    const handleHoldingProduct = async () => {
        if (orderType === "dinein" && (!tableNo || tableNo.trim() === "")) {
            toast.error("Table number is required for dine-in orders.", {
                autoClose: 2000,
            });
            return;
        }

        if (orderType === "takeaway" && (!tokenNo || tokenNo.trim() === "")) {
            toast.error("Token number is required for takeaway orders.", {
                autoClose: 2000,
            });
            return;
        }

        if (!productDetailsForHolding || productDetailsForHolding.length === 0) {
            toast.error("You must select at least one product to hold.", {
                autoClose: 2000,
            });
            return;
        }

        // Check if any products have kotPrinted flag (editing scenario)
        const isEditing = productDetailsForHolding.some(
            (p) => p.kotPrinted !== undefined
        );

        // Prepare data for API
        const dataToSend = {
            orderType,
            tableNo: orderType === "dinein" ? tableNo.trim() : undefined,
            tokenNo: orderType === "takeaway" ? tokenNo.trim() : undefined,
            products: productDetailsForHolding,
            isEditing: isEditing, // Flag to indicate if this is an edit operation
            kotNote: kotNote.trim() || undefined, // Optional KOT note
        };

        try {
            const response = await axios.post(
                `${process.env.REACT_APP_BASE_URL}/api/holdProducts`,
                dataToSend
            );

            // Print Agent Integration (Silent Printing)
            try {
                const printPromises = [];

                // Add KOT to queue if present
                if (response.data.kotHtml) {
                    printPromises.push(
                        silentPrint("http://localhost:4000/print-kot", response.data.kotHtml)
                    );
                }

                // Add BOT to queue if present
                if (response.data.botHtml) {
                    printPromises.push(
                        silentPrint("http://localhost:4000/print-bot", response.data.botHtml)
                    );
                }

                if (printPromises.length > 0) {
                    await Promise.all(printPromises);
                    console.log("✅ Silent printing completed via agent");
                }
            } catch (agentError) {
                console.warn("⚠️ Print agent unavailable, falling back to browser print:", agentError.message);

                // Fallback to iframe printing if agent fails
                const printHtml = (htmlContent) => {
                    return new Promise((resolve) => {
                        const iframe = document.createElement("iframe");
                        iframe.style.display = "none";
                        document.body.appendChild(iframe);

                        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                        iframeDoc.open();
                        iframeDoc.write(htmlContent);
                        iframeDoc.close();

                        setTimeout(() => {
                            iframe.contentWindow.focus();
                            iframe.contentWindow.print();
                            setTimeout(() => {
                                document.body.removeChild(iframe);
                                resolve();
                            }, 1000);
                        }, 500);
                    });
                };

                if (response.data.kotHtml) {
                    await printHtml(response.data.kotHtml);
                }

                if (response.data.botHtml) {
                    setTimeout(async () => {
                        await printHtml(response.data.botHtml);
                    }, 500);
                }
            }

            if (response.status === 201 || response.status === 200) {
                console.log("Hold successful:", response.data);
                setTableNo("");
                setTokenNo("");
                setKotNote("");

                toast.success("Order held successfully!", { autoClose: 2000 });

                sessionStorage.setItem(
                    "heldProducts",
                    JSON.stringify(productDetailsForHolding)
                );

                handleBillReset();
                setShowProductHolding(false);
                setHeldProductReloading(true);
            }
        } catch (error) {
            console.error("Error saving held products:", error);
            toast.error("Failed to save held products. Please try again.", {
                autoClose: 2000,
            });
        }
    };

    const handleSaveOrder = async () => {
        if (!activeOrderId) return;

        const items = productBillingHandling.map(product => {
            const variation = product.selectedVariation
                ? product.variationValues?.[product.selectedVariation]
                : null;

            return {
                id: product.id,
                name: product.name,
                ptype: product.ptype || (variation ? "Variation" : "Single"),
                offcialProduct: product.offcialProduct ?? true,
                stokeQty: variation ? variation.productQty : product.stokeQty,
                quantity: product.qty,
                price: Number(variation?.price || product.price || 0),
                productCost: Number(product.productCost || 0),
                tax: Number(variation?.orderTax !== undefined ? variation.orderTax : product.tax || 0),
                taxType: variation?.taxType || product.taxType || "none",
                discount: Number(variation?.discount || product.discount || 0),
                isInventory: product.isInventory ?? false,
                warehouse: product.warehouse,
                variationType: product.variationType || null,
                variationValue: product.variationValue || (variation ? product.selectedVariation : null),
                subtotal: Number(getRowSubtotal(product).toFixed(2)),
            };
        });

        const totalPrice = Number(calculateTotalPrice());

        try {
            const response = await axios.put(`${BASE_URL}/api/updateOrder/${activeOrderId}`, {
                items,
                totalPrice,
                tableNumber: tableNo || undefined,
            });

            if (response.data.success) {
                toast.success('Order Re stock and saved successfully!');
                setProductBillingHandling([]);
                setActiveOrderId(null);
                setTableNo('');
                fetchOrders();
            }
        } catch (error) {
            console.error('Error updating order:', error);
            toast.error('Failed to update order. Please try again.');
        }
    };

    const handleDeleteOrder = async () => {
        if (!saleToDelete) return;

        try {
            const response = await axios.delete(`${BASE_URL}/api/orders/${saleToDelete}`);

            if (response.data.success) {
                toast.success("Order deleted successfully!");

                setOrders(prev => {
                    const updated = prev.filter(o => o._id !== saleToDelete);
                    localStorage.setItem('pendingOrders', JSON.stringify(updated));
                    return updated;
                });
                sendDelete(saleToDelete);
                setSaleToDelete(null);
                setIsModalOpen(false);
            } else {
                toast.error(response.data.message || "Delete failed");
                setIsModalOpen(false);
            }
        } catch (error) {
            console.error("Delete error:", error);
            toast.error("Failed to delete order");
            setIsModalOpen(false);
        }
    };

    const handleClearAllOrders = async () => {
        try {
            const response = await axios.delete(`${process.env.REACT_APP_BASE_URL}/api/deleteAllOrder`);

            if (response.data.success) {
                toast.success("All pending orders cleared!");
                setOrders([]);
                localStorage.removeItem('pendingOrders');
                sendClearAll();

                setIsClearAllModalOpen(false);
            } else {
                toast.error("Failed to clear orders");
            }
        } catch (error) {
            console.error("Error clearing all orders:", error);
            toast.error("Failed to clear orders");
            setIsClearAllModalOpen(false);
        }
    };

    useEffect(() => {
        if (showProductHolding && orderType === "dinein" && tableNoInputRef.current) {
            setTimeout(() => {
                tableNoInputRef.current?.focus();
                tableNoInputRef.current?.select();
            }, 100);
        }
    }, [showProductHolding, orderType]);

    return (
        <div className=''>
            <div className='flex border-b pb-2 justify-between h-[100%] overflow-y-auto scroll-container'>
                <div className='flex space-x-4'>
                    <div className="relative">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="px-1 py-1 w-[38px] h-[30px] text-white font-medium rounded-md transition-colors"
                        >
                            <img src={ViewOrder} className='w-[38px] h-[30px]' alt='view Order' />
                        </button>

                        {/* TINY RED BADGE WITH ORDER COUNT */}
                        {orders.length > 0 && (
                            <span className="absolute bottom-2 -right-2 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full shadow-md">
                                {orders.length > 99 ? '99+' : orders.length}
                            </span>
                        )}
                    </div>

                    <button
                        onClick={handleSaveOrder}
                        disabled={productBillingHandling.length === 0}
                        className="px-1 py-1 w-[38px] h-[30px] text-white font-medium rounded-md transition-colors"
                    >
                        <img src={RestockOrder} className='w-[36px] h-[28px]' alt='view Order' />
                    </button>

                    <div className="flex items-center space-x-1 border-l pl-4 border-gray-200">
                        <button
                            onClick={handleOpenCustomerDisplay}
                            className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-md transition-colors"
                            title="Open Customer Display"
                        >
                            <Monitor className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleManualResetDisplay}
                            className="p-1.5 hover:bg-red-50 text-red-600 rounded-md transition-colors"
                            title="Clear Customer Display"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <h2 className="text-lg flex items-center font-semibold text-sm text-gray-500"> {new Date().toLocaleDateString('en-GB')} - {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</h2>
                <div className="flex items-center">
                    <h2 className="text-lg font-semibold text-gray-500 mr-2">{selectedCustomer}</h2>
                    {selectedCustomer && (
                        <button
                            onClick={() => setSelectedCustomer("")}
                            className="text-white bg-gray-500 hover:bg-gray-600 rounded-full w-5 h-5 flex items-center justify-center text-sm"
                            title="Remove selected customer"
                        >
                            ×
                        </button>
                    )}
                </div>
                <button
                    onClick={handleBillReset}
                    className="button-dark-color rounded-md px-1 w-7 h-7 py-1 text-white font-semibold text-sm shadow-md focus:outline-none"
                >
                    ✕
                </button>
            </div>

            <div className="min-h-[280px] lg:min-h-[180px] lg:portrait:min-h-[400px] xl:min-h-[400px] 2xl:min-h-[250px]">
                <div className="overflow-y-auto scroll-container max-h-[275px] lg:max-h-[175px] lg:portrait:max-h-[395px] xl:max-h-[395px] 2xl:max-h-[245px]">
                    <table className="min-w-full table-auto">
                        <thead>
                            <tr>
                                <th className="px-4 py-2 text-left text-gray-500 text-base">Product</th>
                                <th className="px-4 py-2 text-left text-gray-500 text-base">Quantity</th>
                                <th className="px-4 py-2 text-left text-gray-500 text-base">Price</th>
                                <th className="px-4 py-2 text-left text-gray-500 text-base">Sub</th>
                                <th className="px-2 py-2 text-left text-gray-500 text-base text-right"></th>
                            </tr>
                        </thead>
                        {productBillingHandling.length === 0 ? (
                            <div className="text-center">
                                <p className="text-left pl-4">No products</p>
                            </div>
                        ) : (
                            <tbody>
                                {productBillingHandling.length === 0 ? (
                                    <tr>
                                        <td className="text-center" colSpan="5">
                                            No products selected yet.
                                        </td>
                                    </tr>
                                ) : (
                                    productBillingHandling.slice().reverse().map((product, displayIndex) => {
                                        // Calculate the original index based on the display index
                                        const originalIndex = productBillingHandling.length - 1 - displayIndex;
                                        return (
                                            <tr key={originalIndex} className="border-t">
                                                <td className="px-4 py-2 text-sm font-medium text-left">
                                                    {product.name
                                                    }
                                                    {/* Show variation info if the product is a Variation type */}
                                                    {(product.selectedVariation || product.variationValue) && (
                                                        <span className="text-gray-500 text-xs ml-1">
                                                            ({' '}{product.selectedVariation || product.variationValue})
                                                        </span>
                                                    )}
                                                    {/* Edit Button */}
                                                    <button
                                                        onClick={() => {
                                                            const status = sessionStorage.getItem('status');
                                                            setSelectedProductIndex(originalIndex);
                                                            const existingDiscount = product.specialDiscount || 0;
                                                            setSpecialDiscount(existingDiscount);
                                                            if (status === 'success') {
                                                                setSelectedProductIndex(originalIndex);
                                                                setSpecialDiscountPopUp(true);
                                                            } else {
                                                                setSelectedProductIndex(originalIndex);
                                                                setOpenAuthModel(true);
                                                                setUsername('');
                                                                setPassword('');
                                                            }
                                                        }}
                                                    >
                                                        <img
                                                            className="mt-[2px] ml-2 w-[15px] h-[15px]"
                                                            src={Pencil}
                                                            alt="edit"
                                                        />
                                                    </button>
                                                </td>

                                                {/* Quantity Control Section */}
                                                <td className="px-4 py-2 text-sm flex items-center text-left">
                                                    <button
                                                        onClick={() => handleDecrement(originalIndex)}
                                                        className={`px-2 py-1 rounded-md bg-gray-200 text-gray-600`}
                                                    >
                                                        -
                                                    </button>
                                                    <input
                                                        className="w-[30px] text-center mx-2"
                                                        value={product.qty || 1}
                                                        onChange={(e) => handleQtyChange(e, originalIndex)}
                                                    />
                                                    <button
                                                        onClick={() => handleIncrement(originalIndex)}
                                                        className={`px-2 py-1 rounded-md bg-gray-200 text-gray-600`}
                                                    >
                                                        +
                                                    </button>
                                                </td>

                                                {/* Product Price */}
                                                <td className="px-4 py-2 text-sm text-gray-600 text-left">
                                                    {currency} {formatWithCustomCommas(product.price)}
                                                </td>

                                                {/* Total Price = price * qty */}
                                                <td className="px-4 py-2 text-sm text-gray-600 text-left">
                                                    {currency} {formatWithCustomCommas(getRowSubtotal(product))}
                                                </td>

                                                {/* Delete Button */}
                                                <td className="px-2 py-2 text-sm text-gray-600">
                                                    <button
                                                        onClick={() => {
                                                            playSound();
                                                            handleDelete(originalIndex);
                                                        }}
                                                        className="text-red-500 hover:text-red-700"
                                                    >
                                                        <i className="fas fa-trash"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        )}
                    </table>
                </div>
            </div >
            <div className="mt-4 lg:mt-10">
                <div className="px-4 py-0 lg:py-1 text-left text-gray-500 text-base lg:text-xl text-right">
                    <h1>Total Items: {totalItems}</h1>
                </div>
                <div className="px-4 py-0 lg:py-1 text-left text-gray-800 text-base text-right">
                    <h1 className="text-2xl lg:text-3xl">Total : {currency}  {formatWithCustomCommas(calculateTotalPrice())}</h1>
                </div>
            </div>

            {/* Container for Discount, Shipping, and Tax Inputs */}
            <div className={`w-full justify-between mb-1 relative bottom-0 z-10 ${isFullscreen === 'true' ? 'mt-0' : 'mt-5'}`}>
                <div className="flex gap-2 px-[6px] justify-between py-1 mt-0 w-[100%]">
                    <div className="flex flex-col lg:landscape:flex-row xl:flex-row gap-2 w-full">
                        {/* Discount Field */}
                        {permissionData.add_discount && (
                            <div className="w-full lg:landscape:w-1/2 xl:w-1/2">
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={discount}
                                        onChange={handleDiscount}
                                        placeholder="Discount"
                                        className="w-full rounded-lg border outline-none border-[#1A5B63] bg-white py-2 lg:portrait:py-4 xl:py-3 pl-2 pr-10 text-gray-900 shadow-sm focus:border-gray-200 focus:ring-2 focus:ring-gray-400 focus:outline-none transition-all duration-200 sm:text-sm lg:portrait:text-base"
                                    />

                                    {/* Toggle Buttons - flush to the right, full height, no gap */}
                                    <div className="absolute inset-y-0 right-0 flex items-center">
                                        <div className="flex h-full rounded-r-lg border border-l-0 border-[#1A5B63] bg-gray-50 shadow-sm overflow-hidden">
                                            <button
                                                type="button"
                                                onClick={() => setDiscountType('fixed')}
                                                className={`px-4 text-sm font-medium transition-all duration-200 ${discountType === 'fixed'
                                                    ? 'bg-[#1A5B63] text-white'
                                                    : 'text-gray-700 hover:bg-gray-200'
                                                    }`}
                                            >
                                                {currency}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setDiscountType('percentage')}
                                                className={`px-4 text-sm font-medium transition-all duration-200 border-l border-gray-300 ${discountType === 'percentage'
                                                    ? 'bg-[#1A5B63] text-white'
                                                    : 'text-gray-700 hover:bg-gray-200'
                                                    }`}
                                            >
                                                %
                                            </button>
                                        </div>
                                    </div>

                                    {/* Subtle unit indicator - exactly as you wrote */}
                                    <span className="absolute inset-y-0 right-24 flex items-center text-gray-400 pointer-events-none text-sm font-medium">
                                        {discountType === 'percentage' ? '' : ''}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Service Charge Field */}
                        <div className={`w-full lg:landscape:w-1/2 xl:w-1/2 ${permissionData.add_discount ? '' : 'lg:landscape:w-full xl:w-full'}`}>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={serviceCharge}
                                    onChange={handleServiceCharge}
                                    placeholder="Service"
                                    className="w-full rounded-lg border border-[#1A5B63] bg-white py-2 lg:portrait:py-4 xl:py-3 pl-2 pr-10 text-gray-900 shadow-sm focus:border-gray-200 focus:ring-2 focus:ring-gray-400 focus:outline-none transition-all duration-200 sm:text-sm lg:portrait:text-base"
                                />

                                {/* Toggle Buttons - flush to the right, full height, no gap */}
                                <div className="absolute inset-y-0 right-0 flex items-center">
                                    <div className="flex h-full rounded-r-lg border border-l-0 border-[#1A5B63] bg-gray-50 shadow-sm overflow-hidden">
                                        <button
                                            type="button"
                                            onClick={() => setServiceChargeType('fixed')}
                                            className={`px-4 text-sm font-medium transition-all duration-200 ${serviceChargeType === 'fixed'
                                                ? 'bg-[#1A5B63] text-white'
                                                : 'text-gray-700 hover:bg-gray-200'
                                                }`}
                                        >
                                            {currency}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setServiceChargeType('percentage')}
                                            className={`px-4 text-sm font-medium transition-all duration-200  ${serviceChargeType === 'percentage'
                                                ? 'bg-[#1A5B63] text-white'
                                                : 'text-gray-700 hover:bg-gray-200'
                                                }`}
                                        >
                                            %
                                        </button>
                                    </div>
                                </div>

                                {/* Subtle unit indicator - exactly as you wrote */}
                                <span className="absolute inset-y-0 right-24 flex items-center text-gray-400 pointer-events-none text-sm font-medium">
                                    {serviceChargeType === 'percentage' ? '' : ''}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className='flex flex-col lg:landscape:flex-row xl:flex-row w-full gap-2 px-1.5 py-1 mt-0'>
                    {permissionData.assign_offer && (
                        <div className="flex gap-4 w-full lg:landscape:w-auto xl:w-auto">
                            <button
                                onClick={(e) => setOpenOffersModel(true)}
                                className={`flex w-full lg:landscape:w-[145px] xl:w-[145px] items-center justify-center text-white px-4 lg:portrait:px-6 py-1.5 lg:portrait:py-3 xl:py-2 rounded-md hover:opacity-90 text-sm lg:portrait:text-base ${selectedOffer ? 'bg-red-600' : 'bg-[#35AF87]'
                                    }`}
                            >
                                <img className='w-5 h-5 mr-2' src={GiftIcon} alt='GiftIcon' />
                                Offers
                            </button>
                        </div>

                    )}
                    <div className="relative flex-1">
                        <input
                            onChange={handleTax}
                            value={tax}
                            type="text"
                            placeholder="Tax"
                            className="w-full bg-white bg-opacity-[1%] rounded-md border border-[#1A5B63] py-2 lg:portrait:py-4 xl:py-3 px-2 pr-10 text-gray-900 shadow-sm focus:ring-gray-400 focus:border-gray-400 sm:text-sm lg:portrait:text-base"
                        />
                        <span className="absolute inset-y-0 right-3 flex items-center text-gray-500">
                            %
                        </span>
                    </div>

                    <div className="relative flex-1">
                        <input
                            onChange={handleShippng}
                            value={shipping}
                            type="text"
                            placeholder="Delivery Charge"
                            className="w-full bg-white bg-opacity-[1%] rounded-md border border-[#1A5B63] py-2 lg:portrait:py-4 xl:py-3 px-2 pr-10 text-gray-900 shadow-sm focus:ring-gray-400 focus:border-gray-400 sm:text-sm lg:portrait:text-base"
                        />
                        <span className="absolute inset-y-0 right-3 flex items-center text-gray-500">
                            {currency}
                        </span>
                    </div>
                </div>

                {specialDiscountPopUp && (
                    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex justify-center items-center backdrop-blur-xs z-[1000]">
                        <div className="bg-white w-[350px] sm:w-[460px] p-6 rounded-2xl shadow-2xl">
                            <h2 className="text-xl font-semibold text-gray-700 text-center mb-6">
                                Add Discount
                            </h2>
                            <div className="relative mb-4">
                                <label className="block text-left text-sm font-medium text-gray-700">Discount Amount : </label>
                                <input
                                    type="number"
                                    placeholder="Discount"
                                    value={specialDiscount}
                                    onChange={(e) => setSpecialDiscount(e.target.value)}
                                    ref={discountInputRef}
                                    className="w-full border border-gray-300 p-3 pl-5 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#35AF87]"
                                    required
                                />
                            </div>
                            <div className="flex justify-between">
                                <button
                                    onClick={handleAddSpecialDiscount}
                                    className="submit w-1/2 mr-2 text-white px-4 py-2 rounded-lg shadow-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                >
                                    Add
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSpecialDiscountPopUp(false)}
                                    className="bg-gray-500 w-1/2 text-white px-4 py-2 rounded-lg shadow-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {openAuthModel && (
                    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex justify-center items-center backdrop-blur-xs z-[1000]">
                        <div className="bg-white w-[350px] sm:w-[460px] p-6 rounded-2xl shadow-2xl">
                            <h2 className="text-lg font-semibold text-gray-700 text-center mb-6">
                                Get access for discount
                            </h2>
                            <label className="block text-left text-sm font-medium text-gray-700">Username</label>
                            <div className="relative mb-4">
                                <input
                                    type="email"
                                    placeholder="hello@gmail.com"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full border border-gray-300 p-3 pl-5 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#35AF87]"
                                    required
                                />
                            </div>

                            <label className="block text-left text-sm font-medium text-gray-700">Admin Password</label>
                            <div className="relative mb-4">
                                <input
                                    type="password"
                                    placeholder="x x x x x x x"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full border border-gray-300 p-3 pl-5 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#35AF87]"
                                    required
                                    autoComplete="new-password"
                                    name={`password-${Math.random()}`}
                                />
                            </div>
                            <div className="flex justify-between">
                                <button
                                    onClick={handleDiscountAccess}
                                    className="submit w-1/2 mr-2 text-white px-4 py-2 rounded-lg shadow-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                >
                                    login
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setOpenAuthModel(false)}
                                    className="bg-gray-500 w-1/2 text-white px-4 py-2 rounded-lg shadow-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {openOffersModel && (
                    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex justify-center items-center backdrop-blur-xs z-[1000]">
                        <div className="bg-white w-[350px] sm:w-[460px] p-6 rounded-2xl shadow-2xl">
                            <button
                                onClick={(e) => setOpenOffersModel(false)}
                                className="flex justify-last bold text-gray-500 hover:text-gray-700"
                            >
                                ✕
                            </button>
                            <h2 className="text-xl font-semibold text-gray-700 text-center mb-4">
                                Select the Offer
                            </h2>
                            <div className="relative mb-4">
                                <label className="block text-left text-sm font-medium text-gray-700">Offer: </label>
                                <select
                                    value={selectedOffer}
                                    onChange={handleOfferChange}
                                    className="w-full border border-gray-300 p-3 pl-5 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#35AF87]"
                                >
                                    <option value="">Select the Offer</option>
                                    {offersData.map((offer, index) => (
                                        <option key={index} value={offer.id}>
                                            {offer.offerName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {/* Buttons Section */}
                <div className="flex flex-col lg:landscape:flex-row xl:flex-row gap-2 px-1.5 py-1 mt-0 w-[100%]">
                    <button
                        onClick={() => {
                            const ProductHoldList = gatherProductDetails();
                            if (ProductHoldList.length > 0) {
                                setShowProductHolding(true);
                                setProductDetailsForHolding(ProductHoldList);
                                sessionStorage.removeItem("status");
                            } else {
                                toast.error("No product data available.", { autoClose: 2000 });
                            }
                        }}
                        className="button-dark-color w-full lg:landscape:w-[32.5%] xl:w-[32.5%] rounded-md px-2 lg:portrait:px-4 xl:px-4 py-2 lg:portrait:py-4 xl:py-3 text-white font-semibold text-xs lg:portrait:text-base xl:text-sm shadow-md focus:outline-none"
                    >
                        Hold
                    </button>
                    <button
                        onClick={async () => {
                            if (!activeOrderId) {
                                toast.error("No order selected");
                                return;
                            }

                            setLoading(true);

                            try {
                                const updatedItems = productBillingHandling.map(product => {
                                    const variation = product.selectedVariation
                                        ? product.variationValues?.[product.selectedVariation]
                                        : null;

                                    const price = parseFloat(variation?.price || product.price || 0);
                                    const discount = parseFloat(variation?.discount || product.discount || 0);
                                    const tax = variation?.orderTax !== undefined
                                        ? parseFloat(variation.orderTax)
                                        : parseFloat(product.tax || 0);
                                    const taxType = variation?.taxType || product.taxType || 'inclusive';
                                    const specialDiscount = parseFloat(product.specialDiscount || 0);
                                    const productCost = parseFloat(variation?.productCost || product.productCost || 0);
                                    const currentQty = product.qty;

                                    const priceAfterDiscounts = price - discount - specialDiscount;
                                    const actualSellingPrice = priceAfterDiscounts + (price * (tax / 100));
                                    const subTotal = (priceAfterDiscounts * currentQty) + ((price * currentQty * tax) / 100);

                                    return {
                                        id: product.id,
                                        name: product.name,
                                        ptype: product.ptype || (variation ? "Variation" : "Single"),
                                        offcialProduct: product.offcialProduct ?? true,
                                        stokeQty: variation ? variation.productQty : product.stokeQty,
                                        quantity: currentQty,
                                        price: price,
                                        productCost: productCost,
                                        tax: tax,
                                        taxType: taxType,
                                        discount: discount,
                                        specialDiscount: specialDiscount,
                                        isInventory: product.isInventory ?? false,
                                        warehouse: product.warehouse || {},
                                        variationType: product.variationType || null,
                                        variationValue: product.selectedVariation || null,
                                        subtotal: subTotal,
                                        actualSellingPrice: actualSellingPrice,
                                        kotPrinted: product.kotPrinted || false,
                                        originalQty: product.originalQty
                                    };
                                });

                                const totalPrice = updatedItems.reduce((sum, item) => sum + item.subtotal, 0);

                                const res = await fetch(`${process.env.REACT_APP_BASE_URL}/api/placeOrderAndPrintKOT`, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                        orderId: activeOrderId,
                                        items: updatedItems,
                                        totalPrice: totalPrice
                                    }),
                                });

                                const result = await res.json();

                                if (result.success) {
                                    // Print Agent Integration (Silent Printing)
                                    try {
                                        const printPromises = [];

                                        // Add KOT to queue if present
                                        if (result.kotHtml) {
                                            printPromises.push(
                                                silentPrint("http://localhost:4000/print-kot", result.kotHtml)
                                            );
                                        }

                                        // Add BOT to queue if present
                                        if (result.botHtml) {
                                            printPromises.push(
                                                silentPrint("http://localhost:4000/print-bot", result.botHtml)
                                            );
                                        }

                                        if (printPromises.length > 0) {
                                            await Promise.all(printPromises);
                                            console.log("✅ Silent printing completed via agent");
                                        }
                                    } catch (agentError) {
                                        console.warn("⚠️ Print agent unavailable, falling back to browser print:", agentError.message);

                                        // Fallback helper function to create and print iframe
                                        const printTicket = (html, ticketType) => {
                                            const printFrame = document.createElement("iframe");
                                            printFrame.style.position = "fixed";
                                            printFrame.style.right = "0";
                                            printFrame.style.bottom = "0";
                                            printFrame.style.width = "0";
                                            printFrame.style.height = "0";
                                            printFrame.style.border = "none";
                                            document.body.appendChild(printFrame);

                                            const printDoc = printFrame.contentWindow.document;
                                            printDoc.open();
                                            printDoc.write(html);
                                            printDoc.close();

                                            setTimeout(() => {
                                                printFrame.contentWindow.focus();
                                                printFrame.contentWindow.print();
                                                setTimeout(() => {
                                                    document.body.removeChild(printFrame);
                                                }, 1000);
                                            }, 300);
                                        };

                                        // Print KOT if present
                                        if (result.kotHtml) {
                                            printTicket(result.kotHtml, 'KOT');
                                        }

                                        // Print BOT if present (with slight delay to avoid conflicts)
                                        if (result.botHtml) {
                                            setTimeout(() => {
                                                printTicket(result.botHtml, 'BOT');
                                            }, 500);
                                        }
                                    }

                                    setOrders(prev => {
                                        const updated = prev.filter(o => o._id !== activeOrderId);
                                        localStorage.setItem('pendingOrders', JSON.stringify(updated));
                                        return updated;
                                    });
                                    channel.postMessage({ type: 'DELETE_ORDER', orderId: activeOrderId });

                                    const ticketsGenerated = [];
                                    if (result.kotHtml) ticketsGenerated.push('KOT');
                                    if (result.botHtml) ticketsGenerated.push('BOT');
                                    const ticketMessage = ticketsGenerated.length > 0
                                        ? `Order Placed & ${ticketsGenerated.join(' + ')} Printed!`
                                        : "Order Placed!";

                                    toast.success(ticketMessage);
                                    setPalcedStatus(true);
                                    setActiveOrderId(null);
                                    fetchOrders();
                                    handleBillReset();
                                } else {
                                    toast.error(result.message || "Failed to place order");
                                }
                            } catch (err) {
                                console.error("Place order error:", err);
                                toast.error("Connection failed. Please try again.");
                            } finally {
                                setLoading(false);
                            }
                        }}
                        disabled={loading}
                        className={`button-dark-color w-full lg:landscape:w-[32.5%] xl:w-[32.5%] rounded-md px-2 lg:portrait:px-4 xl:px-4 py-2 lg:portrait:py-4 xl:py-3 text-white font-semibold text-xs lg:portrait:text-base xl:text-sm shadow-md focus:outline-none transition-all
        ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-lg'}`}
                    >
                        {loading ? (
                            <div className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Placing...</span>
                            </div>
                        ) : (
                            "Place Order"
                        )}
                    </button>
                    <button
                        onClick={() => {
                            setShowPayingSection(true);
                            setResponseMessage('')
                            const productDetails = gatherProductDetails();
                            setProductDetailsForPrinting(productDetails);
                            sessionStorage.removeItem('status');
                        }}
                        className="button-bg-color w-full lg:landscape:w-[32.5%] xl:w-[32.5%] rounded-md px-2 lg:portrait:px-4 xl:px-4 py-2 lg:portrait:py-4 xl:py-3 text-white font-semibold text-xs lg:portrait:text-base xl:text-sm shadow-md focus:outline-none"
                    >
                        Pay Now
                    </button>
                </div>
            </div>

            {/* PAYING SECTION */}
            <div>
                {showPayingSec && (
                    <PayingSection
                        handlePopupClose={handlePopupClose}
                        totalItems={totalItems}
                        totalPcs={totalPcs}
                        profit={profit}
                        tax={tax}
                        shipping={shipping}
                        serviceCharge={serviceCharge}
                        serviceChargeType={serviceChargeType}
                        deliveryNote={deliveryNote}
                        discount={discount}
                        discountValue={calculateDiscountAmount(calculateBaseTotal())}
                        productDetails={productDetailsForPrinting}
                        handleBillReset={handleBillReset}
                        setSelectedCategoryProducts={setSelectedCategoryProducts}
                        setSelectedBrandProducts={setSelectedBrandProducts}
                        setSearchedProductData={setSearchedProductData}
                        setProductData={setProductData}
                        selectedCustomer={selectedCustomer}
                        discountType={discountType}
                        warehouse={warehouse}
                        responseMessage={responseMessage}
                        setResponseMessage={setResponseMessage}
                        setReloadStatus={setReloadStatus}
                        offerPercentage={offerPercentage}
                        calculateTotalPrice={calculateTotalPrice}
                        setError={setError}
                        setProgress={setProgress}
                        setSelectedOffer={setSelectedOffer}
                        setFetchRegData={setFetchRegData}
                        orderId={orderId || activeOrderId}
                        setOrderId={setOrderId}
                        serviceChargeValue={serviceChargeValue}
                        customerDisplayChannel={customerDisplayChannel}
                    />
                )}
            </div>

            {/* Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-[9998]"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* LIVE ORDERS SIDEBAR – FULLY WORKING */}
            <div
                className={`fixed top-0 right-0 w-full sm:w-[90%] md:w-[75%] lg:w-[60%] xl:w-[45%] 2xl:w-[38%] h-screen bg-gradient-to-br from-gray-50 to-white shadow-2xl z-[9999] 
                transform transition-transform duration-300 ease-in-out 
                ${isSidebarOpen ? "translate-x-0" : "translate-x-full"}`}
            >
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 sm:p-5 md:p-6 bg-gradient-to-r from-[#1A5B63] to-[#145a54] text-white">
                        <h2 className="text-lg sm:text-xl md:text-2xl font-bold flex items-center">
                            Live Orders ({orders.length})
                        </h2>
                        <button
                            onClick={() => setIsSidebarOpen(false)}
                            className="hover:bg-white/20 rounded-full p-1.5 sm:p-2 transition"
                        >
                            <svg className="w-5 h-5 sm:w-6 md:w-7 sm:h-6 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Content – This is the part that was broken */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-6 bg-gray-50">
                        {loading ? (
                            <div className="text-center py-12 sm:py-16">
                                <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-4 border-[#1A5B63] mx-auto"></div>
                                <p className="text-gray-600 mt-4 text-sm sm:text-base">Loading orders...</p>
                            </div>
                        ) : orders.length === 0 ? (
                            <div className="text-center-text-center py-12 sm:py-16">
                                <div className="bg-gray-200 border-2 border-dashed rounded-xl w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 mx-auto mb-4 sm:mb-6" />
                                <p className="text-xl sm:text-2xl font-semibold text-gray-600">No pending orders</p>
                                <p className="text-gray-500 mt-2 text-sm sm:text-base">Waiting for new orders...</p>
                            </div>
                        ) : (
                            <div className="space-y-3 sm:space-y-4">
                                {orders.map((order) => (
                                    <div
                                        key={order._id}
                                        className="relative p-4 sm:p-5 md:p-6 bg-white rounded-xl shadow-lg border-l-4 border-[#35AF87] hover:shadow-2xl transition-all cursor-pointer group overflow-hidden"
                                        onClick={(e) => {
                                            if (e.target.closest('.delete-order-btn')) return;

                                            const loadedItems = order.items.map(item => {
                                                const baseItem = {
                                                    ...item,
                                                    qty: item.quantity || 1,
                                                    quantity: item.quantity || 1,
                                                    subtotal: (item.price || 0) * (item.quantity || 1)
                                                };

                                                const variationValue = item.variationValue || item.selectedVariation;
                                                const isRealVariation = variationValue &&
                                                    variationValue !== "No variations" &&
                                                    variationValue.trim() !== "";

                                                return {
                                                    ...baseItem,
                                                    currentID: item.currentID || item._id || item.productId,
                                                    ptype: isRealVariation ? "Variation" : "Single",
                                                    variationValue: isRealVariation ? variationValue : undefined,
                                                    selectedVariation: isRealVariation ? variationValue : null,

                                                    variationValues: isRealVariation ? {
                                                        [variationValue]: {
                                                            price: item.price || 0,
                                                            productQty: item.stokeQty || 0,
                                                            productCost: item.productCost || 0,
                                                            discount: item.discount || 0,
                                                            orderTax: item.tax || 0,
                                                            taxType: item.taxType || "inclusive"
                                                        }
                                                    } : {}
                                                };
                                            });

                                            setProductBillingHandling(loadedItems);
                                            setActiveOrderId(order._id);
                                            setOrderType(order.orderType === "dine-in" ? "dinein" : order.orderType);
                                            setTableNo(order.tableNo || "");
                                            setTokenNo(order.tokenNo || "");
                                            setParcelNo(order.parcelNo || "");
                                            setIsSidebarOpen(false);

                                            toast.success(`Order loaded successfully!`);
                                        }}
                                    >
                                        {/* Hover overlay */}
                                        <div className="absolute inset-0 bg-[#35AF87] opacity-0 group-hover:opacity-10 transition-opacity rounded-xl" />
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSaleToDelete(order._id);
                                                setIsModalOpen(true);
                                            }}
                                            className="delete-order-btn absolute top-1 left-1 w-6 h-6 flex items-center justify-center rounded-full text-red-500 hover:bg-red-100 transition-all z-10 hover:scale-110"
                                            title="Delete Order"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>

                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold text-base sm:text-lg md:text-xl text-gray-800">
                                                    {order.orderType === "dine-in" && order.tableNo
                                                        ? `Table No ${order.tableNo}`
                                                        : order.orderType === "takeaway" && order.tokenNo
                                                            ? `Token No ${order.tokenNo}`
                                                            : order.orderType === "delivery" && order.parcelNo
                                                                ? `Parcel No ${order.parcelNo}`
                                                                : "Walk-in"
                                                    }
                                                </p>
                                                <p className="text-xs sm:text-sm text-left text-gray-600 mt-1">
                                                    {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}
                                                </p>
                                                <p className="text-xs text-left text-gray-500 mt-2">
                                                    {new Date(order.timestamp).toLocaleTimeString("en-LK", {
                                                        timeZone: "Asia/Colombo",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                        hour12: true
                                                    })}
                                                </p>

                                            </div>
                                            <div className="text-right">
                                                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-[#35AF87]">
                                                    Rs {order.totalPrice?.toFixed(2) || '0.00'}
                                                </p>
                                                <span className="inline-block mt-2 px-3 sm:px-4 py-1 sm:py-1.5 text-xs sm:text-sm font-bold text-white bg-orange-500 rounded-full">
                                                    PENDING
                                                </span>
                                            </div>
                                        </div>

                                        {/* Preview items */}
                                        {order.items && order.items.length > 0 && (
                                            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200">
                                                {order.items.slice(0, 3).map((item, i) => (
                                                    <p key={i} className="text-xs sm:text-sm text-gray-700 truncate">
                                                        <span className="font-semibold">{item.quantity}x</span> {item.name}
                                                        {item.variationValue && ` (${item.variationValue})`}
                                                    </p>
                                                ))}
                                                {order.items.length > 3 && (
                                                    <p className="text-xs text-gray-500 mt-2">
                                                        ...and {order.items.length - 3} more
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                        {/* Order Type */}
                                        {order.orderType && (
                                            <p className="text-xs sm:text-sm absolute bottom-3 sm:bottom-4 left-3 sm:left-4 font-semibold mt-2 inline-flex items-center gap-2 text-[#1A5B63]">
                                                {/* Icon based on order type */}
                                                {order.orderType === "dine-in" && (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3v18m6-10H6" />
                                                    </svg>
                                                )}
                                                {order.orderType === "takeaway" && (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 7h18l-1.5 12h-15L3 7z" />
                                                    </svg>
                                                )}
                                                {order.orderType === "delivery" && (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 13l2-2h13l3 3m-5 5a2 2 0 110-4 2 2 0 010 4zm-10 0a2 2 0 110-4 2 2 0 010 4z" />
                                                    </svg>
                                                )}

                                                <span className="uppercase tracking-wide">
                                                    {order.orderType.replace("-", " ")}
                                                </span>
                                            </p>
                                        )}


                                        {/* Click hint */}
                                        <div className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                            <span className="text-[#16796E] text-xs sm:text-sm font-bold px-3 sm:px-4 py-1.5 sm:py-2 rounded-full">
                                                Click to Load
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex justify-between p-4 sm:p-5 bg-[#1A5B63] text-white text-center border-t-4 border-[#145a54]">
                        <span className="text-base sm:text-lg md:text-xl font-bold">
                            Live • {orders.length} pending order{orders.length !== 1 ? 's' : ''}
                        </span>
                        {orders.length > 0 && (
                            <button
                                onClick={() => setIsClearAllModalOpen(true)}
                                className="px-3 sm:px-4 py-1.5 sm:py-2 hover:bg-white hover:text-[#1A5B63] border-2 border-white rounded-3xl font-semibold text-white transition text-xs sm:text-sm md:text-base"
                            >
                                Clear All
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Dark overlay when sidebar is open */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-60 z-[9998]"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/*PRODUCT HOLDING POP UP*/}
            <ConfirmationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={handleDeleteOrder}
                message="Are you sure you want to delete this order?"
            />

            <ConfirmationModal
                isOpen={isClearAllModalOpen}
                onClose={() => setIsClearAllModalOpen(false)}
                onConfirm={handleClearAllOrders}
                message="Are you sure you want to clear ALL pending orders?"
            />

            <div className="min-h-screen bg-white flex items-center justify-center p-4">
                {/* PRODUCT HOLDING POP UP - FINAL AUTOMATIC VERSION */}
                {showProductHolding && productDetailsForHolding && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                        <div className="bg-white w-[760px] max-h-[90vh] overflow-y-auto scroll-container p-8 rounded-2xl shadow-2xl z-50 transform transition-all duration-300 ease-out">
                            <h1 className="text-2xl font-bold text-gray-700 mb-6">
                                Place this product in the table
                            </h1>

                            {orderType === "dinein" && (
                                <div className="mt-8">
                                    <label className="block text-sm text-left font-semibold leading-6 text-gray-700 mb-2">
                                        Table No
                                    </label>
                                    <input
                                        ref={tableNoInputRef}
                                        value={tableNo}
                                        type="text"
                                        onChange={(e) => setTableNo(e.target.value)}
                                        placeholder="Table No"
                                        className="block w-full mb-8 rounded-xl border border-gray-300 py-3 px-4 text-gray-900 shadow-sm placeholder:text-gray-400 focus:ring-2 focus:ring-gray-200 focus:border-gray-200 focus:outline-none transition-colors"
                                    />
                                </div>
                            )}

                            {/* Table of Products */}
                            <div className="overflow-y-auto scroll-container max-h-[300px] rounded-xl border border-gray-200 shadow-sm mb-8">
                                <table className="w-full table-auto border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-200">
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                                                Product Name
                                            </th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                                                Quantity
                                            </th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                                                Price
                                            </th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                                                Sub Total
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {productDetailsForHolding.map((product, index) => {
                                            const price = parseFloat(product.price) || 0;
                                            const quantity = parseInt(product.qty, 10) || 0;
                                            return (
                                                <tr
                                                    key={index}
                                                    className="hover:bg-gray-50 transition-colors"
                                                >
                                                    <td className="px-6 py-4 text-left font-medium text-gray-900">
                                                        {product.name}
                                                    </td>
                                                    <td className="px-6 py-4 text-left">
                                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                                            {quantity}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-left font-medium text-gray-900">
                                                        {currency} {formatWithCustomCommas(price)}
                                                    </td>
                                                    <td className="px-6 py-4 text-left font-semibold text-gray-700">
                                                        {currency}{" "}
                                                        {formatWithCustomCommas(getRowSubtotal(product))}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                {productDetailsForHolding.length > 3 && (
                                    <div className="absolute bottom-24 right-10">
                                        <div className="bg-white p-2 rounded-full shadow-md animate-bounce">
                                            <i className="fas fa-chevron-down text-gray-600"></i>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* KOT Note Section */}
                            <div className="mt-6">
                                <label className="block text-sm text-left font-semibold leading-6 text-gray-700 mb-2">
                                    Note for Kitchen (Optional)
                                </label>
                                <textarea
                                    value={kotNote}
                                    onChange={(e) => setKotNote(e.target.value)}
                                    placeholder="Add any special instructions or notes for the kitchen..."
                                    rows={3}
                                    className="block w-full rounded-xl border border-gray-300 py-3 px-4 text-gray-900 shadow-sm placeholder:text-gray-400 focus:ring-2 focus:ring-gray-200 focus:border-gray-200 focus:outline-none transition-colors resize-none"
                                />
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-4 justify-end mt-6">
                                <button
                                    className="px-6 py-3 bg-white outline-none border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                                    onClick={handlePopupClose}
                                    type="button"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleHoldingProduct}
                                    className=" px-8 py-3 bg-[#1A5B63] text-white rounded-xl font-semibold transition-all duration-200 focus:ring-2 focus:ring-offset-2 shadow-lg hover:shadow-xl w-[160px] text-center"
                                >
                                    <i className="fas fa-hands-helping"></i> Hold
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
};
export default BillingSection;
