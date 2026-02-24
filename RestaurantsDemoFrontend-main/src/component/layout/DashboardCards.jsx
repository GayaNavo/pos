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

import React, { useState, useEffect, useContext } from "react";
import { FaMoneyBill, FaCartPlus, FaExchangeAlt } from "react-icons/fa";
import "../../styles/dashboardBody.css";
import Loader from '../utill/Loader';
import AOS from "aos";
import axios from "axios";
import "aos/dist/aos.css";
import bgrnd from "../../img/sales-kpis.png";
import bgrndtwo from "../../img/analysis.jpg";
import bgrndthree from "../../img/Ecommerce-Retail-Business-PNG-Image.png";
import bgrndfour from "../../img/Data-Analysis-explained.jpg";
import QuantityAlertTable from "../reports/quantityAlertTable";
import { Link } from "react-router-dom";
import CombinedSalesChart from "../layout/salesChart";
import CombinedProfitAndLostChart from "../layout/profitAndLostChart";
import { useCurrency } from "../../context/CurrencyContext";
import { UserContext } from "../../context/UserContext";

const DashboardBody = ({ }) => {
  const { userData } = useContext(UserContext);
  const [totalSaleAmount, setTotalSale] = useState(0);
  const [totalSaleReturnAmount, setTotalSaleReturn] = useState(0);
  const [totalPurchaseAmount, setTotalPurchase] = useState(0);
  const [totalPurchaseReturnAmount, setTotalPurchaseReturn] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [todayExpensesAmount, setTodayExpenses] = useState(0);
  const [todaySale, setTodaySale] = useState([]); // State for today's sales
  const [todayProfit, setTodayProfit] = useState([]);
  const [totalProfit, setTotalProfit] = useState([]);
  const [todayPurchase, setTodayPurchase] = useState([]); // State for today's purchases
  const [warehouse, setWarehouse] = useState(["all"]);
  const [todaySaleReturn, setTodaySaleReturn] = useState(0);
  const [todayPurchaseReturn, setTodayPurchaseReturn] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [stokeData, setStokeData] = useState({});
  const [searchedStokeReport, setSearchedStokeReport] = useState(null);
  const [zBillData, setZBillData] = useState([]);
  const { currency } = useCurrency();
  const ProductIcon =
    "https://cdn0.iconfinder.com/data/icons/creative-concept-1/128/PACKAGING_DESIGN-512.png";

  const combinedProductData =
    Array.isArray(searchedStokeReport) && searchedStokeReport.length > 0
      ? searchedStokeReport
      : Array.isArray(stokeData) && stokeData.length > 0
        ? stokeData
        : [];

  const [permissionData, setPermissionData] = useState({});

  useEffect(() => {
    if (userData) {
      console.log("UserData received in useEffect:", userData);

      const permissions = userData?.permissions || {};

      const hasAnyPermission = (permissionKey) => {
        const subPermissions = permissions[permissionKey] || {};
        return Object.values(subPermissions).some(Boolean);
      };

      setPermissionData({
        manageProducts: hasAnyPermission("manageProducts"),
        manageBaseUnits: hasAnyPermission("manageBaseUnits"),
        manageUnits: hasAnyPermission("manageUnits"),
        manageVariation: hasAnyPermission("manageVariation"),
        manageBrands: hasAnyPermission("manageBrands"),
        manageProductCategories: hasAnyPermission("manageCategory"),
        manageBarcodePrint: hasAnyPermission("manageBarcodePrint"),
        manageCustomers: hasAnyPermission("manageCustomers"),
        manageUsers: hasAnyPermission("manageUsers"),
        manageSuppliers: hasAnyPermission("manageSuppliers"),
        manageWarehouse: hasAnyPermission("manageWarehouse"),
        manageTransfer: hasAnyPermission("manageTransfer"),
        manageSales: hasAnyPermission("manageSales"),
        manageSaleReturns: hasAnyPermission("manageSaleReturns"),
        managePurchases: hasAnyPermission("managePurchases"),
        managePurchaseReturns: hasAnyPermission("managePurchaseReturns"),
        manageQuotations: hasAnyPermission("manageQuotations"),
        manageCurrency: hasAnyPermission("manageCurrency"),
        manageRolesAndPermissions: hasAnyPermission(
          "manageRolesAndPermissions"
        ),
        manageReports: hasAnyPermission("manageReports"),
        manageAdjustments: hasAnyPermission("manageAdjustments"),
        manageLanguage: hasAnyPermission("manageLanguage"),
        manageSettings: hasAnyPermission("manageSettings"),
        manageMailSettings: hasAnyPermission("manageMailSettings"),
        manageReceiptSettings: hasAnyPermission("manageReceiptSettings"),
        managePrefixesSettings: hasAnyPermission("managePrefixesSettings"),
        managePOS: hasAnyPermission("managePOS"),

        // Extract specific "create" permissions from parent manage permissions
        // create_product: permissions.manageProducts?.create_product || false,
        // create_sale: permissions.manageSales?.create_sale || false,
        view_sale: permissions.manageSales?.view_sale || false,
        view_purchase: permissions.managePurchases?.view_purchase || false,
        view_sl_return: permissions.manageSaleReturns?.view_sl_return || false,
        view_pur_return:
          permissions.managePurchaseReturns?.view_pur_return || false,
        
      });
    }
  }, [userData]);

  useEffect(() => {
    const fetchReportData = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/getReportData/${warehouse}`);
        const { totals } = response.data.data;
        setTotalSale(totals.totalSale);
        setTotalSaleReturn(totals.totalSaleReturn);
        setTotalPurchase(totals.totalPurchase);
        setTotalPurchaseReturn(totals.totalPurchaseReturn);
        setTodaySale(totals.todaySale);
        setTodayPurchase(totals.todayPurchase);
        setTodaySaleReturn(totals.todaySaleReturn);
        setTodayPurchaseReturn(totals.todayPurchaseReturn);
        setTotalExpenses(totals.totalExpenses);
        setTodayExpenses(totals.todayExpenses);
        setTotalProfit(totals.totalProfit);
        setTodayProfit(totals.todayProfit);
        setError(null);

      } catch (error) {
        console.error('Error fetching report data:', error);
        setError('Failed to fetch report data');
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [warehouse]);

  useEffect(() => {
    AOS.init({
      duration: 1000, // Animation duration in milliseconds
      easing: "ease-in-out", // Easing function
      once: true, // Whether animation should happen only once
    });
  }, []);

  useEffect(() => {
    const fetchReportData = async () => {
      setLoading(true);
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_BASE_URL}/api/findStokeReport/all`
        );
        if (
          response.data &&
          response.data.products &&
          Array.isArray(response.data.products)
        ) {
          setStokeData(response.data.products);
          setError(null);
        } else {
          setStokeData([]);
        }
      } catch (err) {
        setError("Failed to fetch report data");
      } finally {
        setLoading(false);
      }
    };
    fetchReportData();
  }, []);

  useEffect(() => {
    const fetchZBillData = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/zreading`, {
          params: {
            'page[number]': 1,
            'page[size]': 5,
          },
        });
        const rawData = response.data.data;
        const recentData = rawData.slice(0, 5);
        
        const processedData = recentData.map(z => {
          let totalCashHandIn = 0;
          let totalCard = 0;
          let totalCash = 0;
          let totalBank = 0;
          let totalVariance = 0;
          let totalDiscount = 0;
          let totalProfit = 0;
          let grandTotal = 0;
          let openedTime = z.registers[0]?.openedTime || '';
          let closedTime = z.registers[0]?.closedTime || '';
          let username = z.registers[0]?.cashierName || 'Unknown';
          
          z.registers.forEach(r => {
            totalCashHandIn += r.cashHandIn || 0;
            totalCard += r.cardPaymentAmount || 0;
            totalCash += r.cashPaymentAmount || 0;
            totalBank += r.bankTransferPaymentAmount || 0;
            totalVariance += r.cashVariance || 0;
            totalDiscount += r.totalDiscountAmount || 0;
            totalProfit += r.totalProfitAmount || 0;
            grandTotal += r.grandTotal || 0;
          });
          
          return {
            id: z._id,
            date: new Date(z.createdAt).toLocaleDateString(),
            openTime: new Date(openedTime).toLocaleTimeString(),
            closeTime: closedTime ? new Date(closedTime).toLocaleTimeString() : '-',
            username,
            cashHandIn: totalCashHandIn,
            cardPayment: totalCard,
            cashPayment: totalCash,
            bankTransfer: totalBank,
            cashVariance: totalVariance,
            discount: totalDiscount,
            profit: totalProfit,
            total: grandTotal
          };
        });
        
        setZBillData(processedData);
      } catch (error) {
        console.error('Error fetching Z Bill data:', error);
      }
    };
    fetchZBillData();
  }, []);

  return (
    <div className="dashBody min-h-full">
      {loading ? (
        <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-white/80 z-50">
          <Loader />
        </div>
      ) : (
        <div>
          <div className=" p-4 ">
            <div className="grid gap-4 sm:grid-cols-1 mt-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <Link
                to={permissionData.view_sale ? "/viewSale" : "#"}
                className={`${!permissionData.view_sale ? "cursor-not-allowed" : ""
                  }`}
              >
                <div
                  className="h-28 flex flex-col items-center justify-center rounded-[10px] shadow-lg relative"
                  style={{
                    background: " #1A5B63",
                  }}
                  data-aos="fade-up"
                >
                  <div
                    className="absolute inset-0 bg-no-repeat bg-cover opacity-5"
                    style={{ backgroundImage: `url(${bgrndthree})` }}
                  ></div>
                  <div className="flex flex-row items-start space-x-4">

                    {/* Shopping Cart Icon */}
                    <div className="flex flex-col items-start">
                      <h1 className="text-white font-bold text-center text-[10px] sm:text-[20px] md:text-[20px] lg:text-[24px] xl:text-[28px]">
                        {currency}&nbsp;{todaySale}
                      </h1>
                      <p className="text-white text-sm">Today Sale</p>{" "}
                      {/* Sale label */}
                    </div>
                  </div>
                </div>
              </Link>

              <Link
                to={permissionData.view_purchase ? "/viewPurchase" : "#"}
                className={`${!permissionData.view_purchase ? "cursor-not-allowed" : ""
                  }`}
              >
                <div
                  className="h-28 flex flex-col items-center justify-center rounded-[10px] shadow-lg relative"
                  style={{
                    background: " #44BC8D",
                  }}
                  data-aos="fade-up"
                >
                  <div
                    className="absolute inset-0 bg-no-repeat bg-cover opacity-5"
                    style={{ backgroundImage: `url(${bgrndfour})` }}
                  ></div>
                  <div className="flex flex-row items-start space-x-4">

                    {/* Shopping Cart Icon */}
                    <div className="flex flex-col items-start">
                      <h1 className="text-white font-bold text-center text-[10px] sm:text-[20px] md:text-[20px] lg:text-[24px] xl:text-[28px]">
                        {currency}&nbsp;{todayPurchase}
                      </h1>
                      <p className="text-white text-sm">Today Purchase</p>{" "}
                      {/* Sale label */}
                    </div>
                  </div>
                </div>
              </Link>

              <Link
                to={
                  permissionData.view_pur_return ? "/viewPurchaseReturns" : "#"
                }
                className={`${!permissionData.view_pur_return ? "cursor-not-allowed" : ""
                  }`}
              >
                <div
                  className="h-28 flex flex-col items-center justify-center rounded-[10px] shadow-lg relative"
                  style={{
                    background: " #1A5B63",
                  }}
                  data-aos="fade-up"
                >
                  {/* Background Image */}
                  <div
                    className="absolute inset-0 bg-no-repeat bg-cover opacity-[5%]"
                    style={{ backgroundImage: `url(${bgrnd})` }}
                  ></div>
                  <div className="flex flex-row items-start space-x-4">

                    {/* Shopping Cart Icon */}
                    <div className="flex flex-col items-start">
                      <h1 className="text-white font-bold text-center text-[10px] sm:text-[20px] md:text-[20px] lg:text-[24px] xl:text-[28px]">
                        {currency}&nbsp; {todayPurchaseReturn}
                      </h1>
                      <p className="text-white text-sm">
                        Today Purchase Return
                      </p>{" "}
                      {/* Sale label */}
                    </div>
                  </div>
                </div>
              </Link>

              <Link
                to={permissionData.view_sl_return ? "/viewSaleReturns" : "#"}
                className={`${!permissionData.view_sl_return ? "cursor-not-allowed" : ""
                  }`}
              >
                <div
                  className="h-28 flex flex-col items-center justify-center rounded-[10px] shadow-md relative"
                  style={{
                    background: " #44BC8D",
                  }}
                  data-aos="fade-up"
                >
                  {/* Background Image */}
                  <div
                    className="absolute inset-0 bg-no-repeat bg-cover opacity-10"
                    style={{ backgroundImage: `url(${bgrnd})` }}
                  ></div>

                  <div className="flex flex-row items-start space-x-4">

                    {/* Shopping Cart Icon */}
                    <div className="flex flex-col items-start">
                      <h1 className="text-white font-bold text-center text-[10px] sm:text-[20px] md:text-[20px] lg:text-[24px] xl:text-[28px]">
                        {currency} &nbsp;{todaySaleReturn}
                      </h1>
                      <p className="text-white text-sm">Today Sale Return</p>{" "}
                      {/* Sale label */}
                    </div>
                  </div>
                </div>
              </Link>

              <Link
                to={permissionData.view_sale ? "/viewSale" : "#"}
                className={`${!permissionData.view_sale ? "cursor-not-allowed" : ""
                  }`}
              >
                <div
                  className="h-28 flex items-center justify-center rounded-[10px] shadow-lg relative"
                  style={{ backgroundColor: "#1A5B63" }}
                  data-aos="fade-down"
                >
                  {/* Background Image */}
                  <div
                    className="absolute inset-0 bg-no-repeat bg-cover opacity-10"
                    style={{ backgroundImage: `url(${bgrnd})` }}
                  ></div>

                  {/* Content */}
                  <div className="flex flex-row items-start space-x-4 relative z-10">
                    <div className="flex flex-col items-start">
                      <h1 className="text-white font-bold text-center text-[10px] sm:text-[20px] md:text-[20px] lg:text-[24px] xl:text-[28px]">
                        {currency} &nbsp; {totalSaleAmount}
                      </h1>
                      <p className="text-white text-sm">Sale</p>{" "}
                      {/* Sale label */}
                    </div>
                  </div>
                </div>
              </Link>

              <Link
                to={permissionData.view_purchase ? "/viewPurchase" : "#"}
                className={`${!permissionData.view_purchase ? "cursor-not-allowed" : ""
                  }`}
              >
                <div
                  className="h-28 flex flex-col items-center justify-center rounded-[10px] shadow-lg relative"
                  style={{
                    background: " #1A5B63",
                  }}
                  data-aos="fade-down"
                >
                  {/* Background Image */}
                  <div
                    className="absolute inset-0 bg-no-repeat bg-cover opacity-[2%]"
                    style={{ backgroundImage: `url(${bgrndtwo})` }}
                  ></div>

                  <div className="flex flex-row items-start space-x-4">

                    {/* Shopping Cart Icon */}
                    <div className="flex flex-col items-start">
                      <h1 className="text-white font-bold text-center text-[10px] sm:text-[20px] md:text-[20px] lg:text-[24px] xl:text-[28px]">
                        {currency} &nbsp; {totalPurchaseAmount}
                      </h1>
                      <p className="text-white text-sm">Purchase</p>{" "}
                      {/* Sale label */}
                    </div>
                  </div>
                </div>
              </Link>

              <Link
                to={permissionData.view_sl_return ? "/viewSaleReturns" : "#"}
                className={`${!permissionData.view_sl_return ? "cursor-not-allowed" : ""
                  }`}
              >
                <div
                  className="h-28 flex flex-col items-center justify-center rounded-[10px] shadow-lg relative"
                  style={{
                    background: " #44BC8D",
                  }}
                  data-aos="fade-down"
                >
                  {/* Background Image */}
                  <div
                    className="absolute inset-0 bg-no-repeat bg-cover opacity-5"
                    style={{ backgroundImage: `url(${bgrndthree})` }}
                  ></div>
                  <div className="flex flex-row items-start space-x-4">

                    {/* Shopping Cart Icon */}
                    <div className="flex flex-col items-start">
                      <h1 className="text-white font-bold text-center text-[10px] sm:text-[20px] md:text-[20px] lg:text-[24px] xl:text-[28px]">
                        {currency}&nbsp; {totalSaleReturnAmount}
                      </h1>
                      <p className="text-white text-sm">Sale Return</p>{" "}
                      {/* Sale label */}
                    </div>
                  </div>
                </div>
              </Link>

              <Link
                to={
                  permissionData.view_pur_return ? "/viewPurchaseReturns" : "#"
                }
                className={`${!permissionData.view_pur_return ? "cursor-not-allowed" : ""
                  }`}
              >
                <div
                  className="h-28 flex flex-col items-center justify-center rounded-[10px] shadow-lg relative"
                  style={{
                    background: " #1A5B63",
                  }}
                  data-aos="fade-down"
                >
                  <div
                    className="absolute inset-0 bg-no-repeat bg-cover opacity-5"
                    style={{ backgroundImage: `url(${bgrndfour})` }}
                  ></div>
                  <div className="flex flex-row items-start space-x-4">

                    {/* Shopping Cart Icon */}
                    <div className="flex flex-col items-start">
                      <h1 className="text-white font-bold text-center text-[10px] sm:text-[20px] md:text-[20px] lg:text-[24px] xl:text-[28px]">
                        {currency} &nbsp; {totalPurchaseReturnAmount}
                      </h1>
                      <p className="text-white text-sm">Purchase Return</p>{" "}
                      {/* Sale label */}
                    </div>
                  </div>
                </div>
              </Link>
            </div>
            <div>
              {error && (
                <p className="text-green-500 mt-5 text-center">{error}</p>
              )}
            </div>
          </div>
          <div
            className="mt-8 ml-5 mr-5 bg-white rounded-lg shadow-md overflow-hidden"
            data-aos="fade-down"
          >
            {/* Teal Header */}
            <div className="bg-[#2D8A7E] py-4">
              <h2 className="text-xl font-semibold text-center text-white">
                Sales & Purchases
              </h2>
            </div>
            {/* Chart Content */}
            <div className="p-6">
              <CombinedSalesChart />
            </div>
          </div>

          <div
            className="mt-8 ml-5 mr-5 bg-white rounded-lg shadow-md overflow-hidden"
            data-aos="fade-down"
          >
            {/* Teal Header */}
            <div className="bg-[#2D8A7E] py-4">
              <h2 className="text-xl font-semibold text-center text-white">
                Stock Alert Report
              </h2>
            </div>
            {/* Table Content */}
            <div className="max-h-96 overflow-auto">
              <QuantityAlertTable
                combinedProductData={combinedProductData}
                loading={loading}
                ProductIcon={ProductIcon}
              />
            </div>
          </div>

          <div
            className="mt-8 ml-5 mr-5 bg-white rounded-lg shadow-md overflow-hidden"
            data-aos="fade-down"
          >
            {/* Teal Header */}
            <div className="bg-[#2D8A7E] py-4">
              <h2 className="text-xl font-semibold text-center text-white">
                Z Bill
              </h2>
            </div>
            {/* Table Content with Horizontal Scroll */}
            <div className="overflow-x-auto pt-6 pb-4">
              <table className="min-w-full bg-white">
                <thead>
                  <tr className="bg-gray-50 border border-gray-300 rounded-lg">
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">DATE</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">OPEN TIME</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">CLOSE TIME</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">USERNAME</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">CASH HAND IN</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">CARD PAYMENT</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">CASH PAYMENT</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">BANK TRANSFER</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">CASH VARIANCE</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">DISCOUNT</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">PROFIT</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">TOTAL</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {zBillData.length > 0 ? (
                    zBillData.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">{item.date}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-center">{item.openTime}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-center">{item.closeTime}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">{item.username}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-[#A8D8F0] text-[#2D6A8A]">
                            {currency} {item.cashHandIn.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-[#A8E6CF] text-[#2D8A7E]">
                            {currency} {item.cardPayment.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-[#A8E6CF] text-[#2D8A7E]">
                            {currency} {item.cashPayment.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-[#A8E6CF] text-[#2D8A7E]">
                            {currency} {item.bankTransfer.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-[#FFB8B8] text-[#8A2D2D]">
                            {currency} {item.cashVariance.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-[#A8E6CF] text-[#2D8A7E]">
                            {currency} {item.discount.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-[#A8D8F0] text-[#2D6A8A]">
                            {currency} {item.profit.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-[#A8E6CF] text-[#2D8A7E]">
                            {currency} {item.total.toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="12" className="px-6 py-8 text-center text-gray-500">
                        No Z Bill data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardBody;
