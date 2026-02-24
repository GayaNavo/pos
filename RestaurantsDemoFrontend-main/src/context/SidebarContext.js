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

import React, { createContext, useContext, useState } from 'react';

const SidebarContext = createContext();

export const SidebarProvider = ({ children }) => {
  const [sidebarHidden, setSidebarHidden] = useState(false);

  const hideSidebar = () => setSidebarHidden(true);
  const showSidebar = () => setSidebarHidden(false);
  const toggleSidebar = () => setSidebarHidden(prev => !prev);

  return (
    <SidebarContext.Provider value={{ 
      sidebarHidden, 
      setSidebarHidden, 
      hideSidebar, 
      showSidebar, 
      toggleSidebar 
    }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

export default SidebarContext;
