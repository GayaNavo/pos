import React from 'react';
import ReactDOM from 'react-dom/client'; // Updated for React 18
import { UserProvider } from './context/UserContext';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { OrderChannelProvider } from './context/OrderChannelContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <UserProvider>
    <OrderChannelProvider>
      <App />
    </OrderChannelProvider>
  </UserProvider>
);

reportWebVitals();
