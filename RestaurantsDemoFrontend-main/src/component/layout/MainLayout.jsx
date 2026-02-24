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

import React, { useContext, useState } from "react";
import { useLocation } from "react-router-dom";  // Import useLocation
import Header from "../utill/Header";
import ReportHeader from "../utill/ReportHeader";  // Import ReportHeader
import Sidebar from "../utill/SideBar";
import { UserContext } from "../../context/UserContext";
import { useSidebar } from "../../context/SidebarContext";
import { Outlet } from "react-router-dom";
import "../../styles/sidebar.css";  // Import sidebar styles for layout

const MainLayout = () => {
  const [SidebarToggle, setSidebarToggle] = useState(false);
  const { sidebarHidden, setSidebarHidden } = useSidebar();
  const { userData } = useContext(UserContext);
  const location = useLocation();  //current location object

  // Defining the routes where ReportHeader should be shown
  const reportRoutes = [
    '/viewReport',
    '/customerReport',
    '/viewCustomerRep/',
    '/suplierReport',
    '/viewSuplierRep/',
    '/viewStokeRep',
    '/quantityAlertRep',
    '/viewRegisterRep',
    '/clickedStokeRep/',
    '/profitAndLostReport'
  ];

  // Check if the current pathname matches any of the report routes
  const isReportPage = reportRoutes.some(route => location.pathname.startsWith(route));

  return (
    <div className={`flex ${sidebarHidden ? 'sidebar-hidden' : ''}`}>
      <Sidebar userData={userData} SidebarToggle={SidebarToggle} sidebarHidden={sidebarHidden} />
      <div className="content w-full transition-all duration-300">
        {/* Conditionally render Header or ReportHeader based on isReportPage */}
        {isReportPage ? (
          <ReportHeader 
            userData={userData}
            sidebarHidden={sidebarHidden}
            setSidebarHidden={setSidebarHidden}
          />
        ) : (
          <Header
            userData={userData}
            SidebarToggle={SidebarToggle}
            setSidebarToggle={setSidebarToggle}
            sidebarHidden={sidebarHidden}
            setSidebarHidden={setSidebarHidden}
          />
        )}
        <main><Outlet /></main>
      </div>
    </div>
  );
};

export default MainLayout;
