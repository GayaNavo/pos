import { createContext, useContext } from 'react';

const OrderChannelContext = createContext();

export const OrderChannelProvider = ({ children }) => {
    const channel = new BroadcastChannel('pos-orders-channel');

    const sendOrder = (order) => {
        channel.postMessage({ type: 'NEW_ORDER', order });
    };

    const sendDelete = (orderId) => {
        channel.postMessage({ type: 'DELETE_ORDER', orderId });
    };

    const sendClearAll = () => {
        channel.postMessage({ type: 'CLEAR_ALL' });
    };

    return (
        <OrderChannelContext.Provider value={{ sendOrder, sendDelete, sendClearAll, channel }}>
            {children}
        </OrderChannelContext.Provider>
    );
};

export const useOrderChannel = () => useContext(OrderChannelContext);