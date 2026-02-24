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