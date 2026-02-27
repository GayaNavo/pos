

import { useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { X, LogOut, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../../context/UserContext';
import { useCurrency } from '../../context/CurrencyContext';
import formatWithCustomCommas from '../utill/NumberFormate';

const KitchenDisplay = () => {
    const [placedOrders, setPlacedOrders] = useState([]);
    const [liveOrderCount, setLiveOrderCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { clearUserData } = useContext(UserContext);
    const { currency } = useCurrency();

    const fetchPlacedOrders = useCallback(async () => {
        try {
            const response = await axios.get(
                `${process.env.REACT_APP_BASE_URL}/api/getPlacedOrders`
            );
            if (response.data.success) {
                setPlacedOrders(response.data.orders || []);
                setLiveOrderCount(response.data.count || 0);
            }
        } catch (error) {
            console.error('Failed to fetch placed orders:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPlacedOrders();

        const socket = io(process.env.REACT_APP_BASE_URL);
        const handleRefresh = () => fetchPlacedOrders();

        socket.on('newOrder', handleRefresh);
        socket.on('orderPlaced', handleRefresh);
        socket.on('orderUpdated', handleRefresh);
        socket.on('orderDeleted', handleRefresh);
        socket.on('allOrdersDeleted', handleRefresh);
        socket.on('orderStatusChanged', handleRefresh);

        const pollInterval = setInterval(fetchPlacedOrders, 30000);

        return () => {
            clearInterval(pollInterval);
            socket.off('newOrder', handleRefresh);
            socket.off('orderPlaced', handleRefresh);
            socket.off('orderUpdated', handleRefresh);
            socket.off('orderDeleted', handleRefresh);
            socket.off('allOrdersDeleted', handleRefresh);
            socket.off('orderStatusChanged', handleRefresh);
            socket.disconnect();
        };
    }, [fetchPlacedOrders]);

    const handleDeleteSinglePlacedOrder = async (orderId) => {
        try {
            await axios.delete(`${process.env.REACT_APP_BASE_URL}/api/orders/${orderId}`);
            toast.success('Order completed!');
            fetchPlacedOrders();
            const socket = io(process.env.REACT_APP_BASE_URL);
            socket.emit('orderCompleted', orderId);
        } catch (err) {
            toast.error('Failed to delete order');
        }
    };

    const handleDeleteAllPlacedOrders = async () => {
        try {
            await axios.delete(`${process.env.REACT_APP_BASE_URL}/api/deleteAllPlacedOrder`);
            toast.success('All placed orders cleared');
            setPlacedOrders([]);
            setLiveOrderCount(0);
            fetchPlacedOrders();
            const socket = io(process.env.REACT_APP_BASE_URL);
            socket.emit('allOrdersDeleted');
        } catch (err) {
            toast.error('Failed to delete all orders');
        }
    };

    const handleLogout = () => {
        clearUserData();
        sessionStorage.clear();
        navigate('/');
        toast.info('Logged out successfully');
    };

    const handleMarkAsReady = async (orderId) => {
        try {
            await axios.post(`${process.env.REACT_APP_BASE_URL}/api/markOrderAsReady`, { orderId });
            fetchPlacedOrders();
        } catch (err) {
            toast.error('Failed to update order status');
        }
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <ToastContainer position="top-right" autoClose={2000} />

            {/* Header */}
            <div className="bg-gradient-to-r from-[#44BC8D] to-[#1A5B63] text-white px-6 py-4 shadow-lg">
                <div className="flex justify-between items-center max-w-7xl mx-auto">
                    <div className="flex items-center gap-4">
                        <h1 className="text-2xl font-bold">🍳 Kitchen Display</h1>
                        <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
                            {liveOrderCount} Active Order{liveOrderCount !== 1 ? 's' : ''}
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchPlacedOrders}
                            className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition"
                            title="Refresh Orders"
                        >
                            <RefreshCw className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleLogout}
                            className="bg-white/20 hover:bg-red-500/80 px-4 py-2 rounded-lg flex items-center gap-2 transition"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="text-sm font-medium">Logout</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Orders Grid */}
            <div className="max-w-7xl mx-auto p-6">
                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A5B63]"></div>
                    </div>
                ) : placedOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <div className="text-6xl mb-4">🍽️</div>
                        <p className="text-xl font-medium">No active orders</p>
                        <p className="text-sm mt-1">New orders will appear here automatically</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {placedOrders.map((order) => {
                                const ref = order.orderType === 'dine-in'
                                    ? `Table ${order.tableNo}`
                                    : order.orderType === 'takeaway'
                                        ? `Token ${order.tokenNo}`
                                        : `Parcel ${order.parcelNo}`;

                                const placedTime = (() => {
                                    const dateVal = order.placedAt || order.createdAt || order.timestamp;
                                    const dateObj = dateVal ? new Date(dateVal) : new Date();
                                    return isNaN(dateObj.getTime())
                                        ? "Recently"
                                        : dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                })();

                                const isReady = order.status === 'ready';

                                return (
                                    <div
                                        key={order._id}
                                        className={`rounded-xl shadow-md border overflow-hidden transition-all duration-300 ${
                                            isReady
                                                ? 'bg-orange-50 border-orange-300 opacity-75'
                                                : 'bg-white border-gray-200 hover:shadow-lg'
                                        }`}
                                    >
                                        {/* Order Header */}
                                        <div className={`px-5 py-3 flex justify-between items-center transition-colors duration-300 ${
                                            isReady
                                                ? 'bg-gradient-to-r from-orange-500 to-orange-400 text-white'
                                                : 'bg-gradient-to-r from-[#1A5B63] to-[#44BC8D] text-white'
                                        }`}>
                                            <div>
                                                <h3 className="font-bold text-lg">{ref}</h3>
                                                <p className="text-xs text-white/70">Placed at {placedTime}</p>
                                            </div>
                                            <span className="bg-white/20 px-2 py-1 rounded text-xs font-medium">
                                                {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                                            </span>
                                        </div>

                                        {/* Order Items */}
                                        <div className="p-4">
                                            <div className="space-y-3">
                                                {order.items.map((item, idx) => (
                                                    <div key={idx} className="flex justify-between items-start text-sm">
                                                        <div className="flex gap-3">
                                                            <span className="flex-shrink-0 bg-[#E8F5F1] text-[#1A5B63] font-bold px-2 py-0.5 rounded text-xs min-w-[28px] h-fit text-center">
                                                                {item.quantity}
                                                            </span>
                                                            <div>
                                                                <p className="font-semibold text-gray-800 leading-tight">
                                                                    {item.name}
                                                                </p>
                                                                {item.variationValue && (
                                                                    <p className="text-[11px] text-[#35AF87] font-medium mt-0.5">
                                                                        {item.variationValue}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <span className="text-gray-700 font-medium whitespace-nowrap ml-4">
                                                            {currency} {formatWithCustomCommas(item.subtotal || (item.price * item.quantity))}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Total */}
                                            <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                                                <span className="text-sm text-gray-500 font-medium">Total</span>
                                                <span className="text-lg font-bold text-[#1A5B63]">
                                                    {currency} {formatWithCustomCommas(order.totalPrice)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Order Actions */}
                                        <div className="px-4 pb-4 flex gap-2">
                                            <button
                                                onClick={() => handleMarkAsReady(order._id)}
                                                className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-colors duration-300 flex items-center justify-center gap-2 ${
                                                    isReady
                                                        ? 'bg-orange-500 hover:bg-orange-600 text-white'
                                                        : 'bg-[#44BC8D] hover:bg-[#3aa87d] text-white'
                                                }`}
                                            >
                                                {isReady ? '👨‍🍳 Ready' : '✅ Mark as Ready'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default KitchenDisplay;
