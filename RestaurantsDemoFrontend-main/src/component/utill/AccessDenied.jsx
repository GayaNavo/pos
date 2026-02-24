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
import { useNavigate, useLocation } from "react-router-dom";
import { UserContext } from "../../context/UserContext";
import Sidebar from "../utill/SideBar";
import Header from "../utill/Header";
import ReportHeader from "../utill/ReportHeader";

const AccessDenied = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData } = useContext(UserContext);
  const [SidebarToggle, setSidebarToggle] = useState(false);

  // Define report routes (same as MainLayout)
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

  // Check if current pathname is a report route
  const isReportPage = reportRoutes.some(route => location.pathname.startsWith(route));

  return (
    <div className="flex">
      {/* Sidebar */}
      <Sidebar userData={userData} SidebarToggle={SidebarToggle} />

      <div className={`${SidebarToggle ? "ml-64 sm:ml-0" : ""} content w-full transition-all duration-300`}>
        {/* Conditionally render Header or ReportHeader */}
        {isReportPage ? (
          <ReportHeader userData={userData} />
        ) : (
          <Header
            userData={userData}
            SidebarToggle={SidebarToggle}
            setSidebarToggle={setSidebarToggle}
          />
        )}

        {/* Main content */}
        <main className="flex items-center absolute justify-center top-[40px] left-[18%] w-[82%] h-[100vh] px-5 bg-gradient-to-br from-slate-50 via-white to-slate-100 ">
          <div className="max-w-md w-full text-center space-y-8">
            {/* Icon with glow effect */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-red-500 opacity-20 blur-3xl rounded-full animate-pulse"></div>
                <div className="relative bg-white rounded-full p-8 shadow-xl border border-red-100">
                  <svg
                    className="w-20 h-20 text-red-500 mx-auto"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="space-y-4">
              <h1 className="text-5xl font-bold text-slate-900 tracking-tight">
                Access Denied
              </h1>
              <div className="space-y-3">
                <p className="text-slate-600 text-lg leading-relaxed">
                  You don't have permission to view this page.
                </p>
                <p className="text-sm text-slate-500">
                  If you believe this is an error, please contact your system administrator.
                </p>
              </div>
            </div>

            {/* Button */}
            <button
              onClick={() => navigate("/dashboard")}
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 active:scale-100"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              Go Back to Dashboard
            </button>

            {/* Error Code */}
            <div className="pt-8">
              <p className="text-xs font-mono text-slate-400 tracking-widest">
                ERROR CODE: 403
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AccessDenied;
