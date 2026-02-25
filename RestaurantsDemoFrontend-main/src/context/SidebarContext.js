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

