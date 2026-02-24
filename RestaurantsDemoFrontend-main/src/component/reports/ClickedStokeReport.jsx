// ClickedStokeReport.jsx
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

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import '../../styles/role.css';
import Loader from '../utill/Loader';
import { useParams } from 'react-router-dom';
import { handleExportPdf } from '../../component/utill/ExportingPDF';
import { useCurrency } from '../../context/CurrencyContext';
import formatWithCustomCommas from '../utill/NumberFormate';

function ClickedStokeReport() {
  const { currency } = useCurrency();
  const [saleData, setSaleData] = useState([]);
  const [saleReturnData, setSaleReturnData] = useState([]);
  const [purchaseData, setPurchaseData] = useState([]);
  const [purchaseReturnData, setPurchaseReturnData] = useState([]);
  const [activeTable, setActiveTable] = useState('sales'); // sales | salesReturn | purchase | purchaseReturn
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [range, setRange] = useState('all'); // all | today | month
  const { id } = useParams();

  useEffect(() => {
    let ignore = false;
    const fetchReportData = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_BASE_URL}/api/findProductDetailsById/${id}`
        );
        if (ignore) return;
        const d = response?.data?.data || {};
        setSaleData(Array.isArray(d.sales) ? d.sales : []);
        setSaleReturnData(Array.isArray(d.saleReturns) ? d.saleReturns : []);
        setPurchaseData(Array.isArray(d.purchases) ? d.purchases : []);
        setPurchaseReturnData(Array.isArray(d.purchaseReturns) ? d.purchaseReturns : []);
      } catch (err) {
        if (ignore) return;
        setError(
          err?.response?.data?.message || err?.message || 'Failed to fetch report data'
        );
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    fetchReportData();
    return () => {
      ignore = true;
    };
  }, [id]);

  // ---- Date helpers ----
  const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const isSameMonth = (a, b) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

  const filterByRange = (rows) => {
    if (!Array.isArray(rows)) return [];
    if (range === 'all') return rows;
    const now = new Date();
    return rows.filter((r) => {
      const dt = r?.date ? new Date(r.date) : null;
      if (!dt || isNaN(dt)) return false;
      return range === 'today' ? isSameDay(dt, now) : isSameMonth(dt, now);
    });
  };

  // ---- Filtered datasets ----
  const filteredSales = useMemo(() => filterByRange(saleData), [saleData, range]);
  const filteredSalesReturns = useMemo(
    () => filterByRange(saleReturnData),
    [saleReturnData, range]
  );
  const filteredPurchases = useMemo(
    () => filterByRange(purchaseData),
    [purchaseData, range]
  );
  const filteredPurchaseReturns = useMemo(
    () => filterByRange(purchaseReturnData),
    [purchaseReturnData, range]
  );

  const dataForActive = {
    sales: filteredSales,
    salesReturn: filteredSalesReturns,
    purchase: filteredPurchases,
    purchaseReturn: filteredPurchaseReturns,
  }[activeTable];

  // ---- Exporters (respect filter) ----
  const exportMap = {
    sales: () =>
      handleExportPdf({
        data: filteredSales,
        currency,
        title: 'Sales Report',
        summaryTitle: 'Sales Summary',
        tableColumns: ['Warehouse', 'Date', 'Payment Status', 'Status', 'Grand Total', 'Paid'],
        dataKeys: ['warehouse', 'date', 'paymentStatus', 'orderStatus', 'grandTotal', 'paidAmount'],
      }),
    salesReturn: () =>
      handleExportPdf({
        data: filteredSalesReturns,
        currency,
        title: 'Sales Return Report',
        summaryTitle: 'Sales Return Summary',
        tableColumns: ['Warehouse', 'Date', 'Grand Total', 'Paid Amount', 'Return Amount', 'Note'],
        dataKeys: ['warehouse', 'date', 'grandTotal', 'paidAmount', 'returnAmount', 'note'],
      }),
    purchase: () =>
      handleExportPdf({
        data: filteredPurchases,
        currency,
        title: 'Purchase Report',
        summaryTitle: 'Purchase Summary',
        tableColumns: ['Supplier', 'Warehouse', 'Date', 'Grand Total', 'Paid Amount', 'Order Status'],
        dataKeys: ['supplier', 'warehouse', 'date', 'grandTotal', 'paidAmount', 'orderStatus'],
      }),
    purchaseReturn: () =>
      handleExportPdf({
        data: filteredPurchaseReturns,
        currency,
        title: 'Purchase Return Report',
        summaryTitle: 'Purchase Return Summary',
        tableColumns: ['Supplier', 'Warehouse', 'Date', 'Grand Total', 'Paid Amount', 'Note'],
        dataKeys: ['supplier', 'warehouse', 'date', 'grandTotal', 'paidAmount', 'note'],
      }),
  };

  const formatDate = (iso) => (iso ? new Date(iso).toLocaleDateString('en-CA') : '');

  const PaymentBadge = ({ value }) => {
    const v = String(value || '').toLowerCase();
    const cls =
      v === 'paid'
        ? 'bg-green-100 text-green-600'
        : v === 'partial'
        ? 'bg-yellow-100 text-yellow-600'
        : 'bg-red-100 text-red-600';
    return <p className={`rounded-[5px] text-center p-[6px] ${cls}`}>{value}</p>;
  };

  const StatusBadge = ({ value }) => (
    <p className="rounded-[5px] text-center p-[6px] bg-green-100 text-green-600">{value}</p>
  );

  const NoRows = () => (
    <div className="p-10 text-center text-gray-500">No records found for this range.</div>
  );

  return (
    <div className="relative bg-white absolute top-[80px] left-[18%] w-[82%] min-h-screen px-5">
      {/* Header row: Title, Tabs, Range, Export */}
      <div className="mt-5">

        
        <div className="ml-6 mt-16 flex items-center justify-between pr-10">
          <h1 className="m-0 p-0 text-2xl text-gray-700">Stock Product Details</h1>

          {/* Export */}
            <button
              onClick={exportMap[activeTable]}
              className="submit rounded-md px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm w-40 text-center disabled:opacity-50"
              disabled={!dataForActive || dataForActive.length === 0}
            >
              Export as PDF
            </button>
        </div>

        <div className="flex items-center mt-7 gap-6">
            {/* Tabs */}
            <div className="space-x-2">
              {[
                ['sales', 'Sale'],
                ['purchase', 'Purchase'],
                ['salesReturn', 'Sale Return'],
                ['purchaseReturn', 'Purchase Return'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  className={`px-5 ${
                    activeTable === key ? 'text-gray-800' : 'text-gray-500'
                  } hover:text-gray-700`}
                  onClick={() => setActiveTable(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Range selector (All / Today / This Month) */}
            {/* <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="block rounded-md border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-gray-400"
              title="Filter by range"
            >
              <option value="all">All</option>
              <option value="today">Today</option>
              <option value="month">This Month</option>
            </select> */}

            
          </div>

        {/* Body */}
        {loading ? (
            <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-white/80 z-50">
                <Loader />
            </div>
        ) : (
          <>
            {/* SALES */}
            {activeTable === 'sales' &&
              (filteredSales.length === 0 ? (
                <NoRows />
              ) : (
                <div className="overflow-x-auto p-6">
                  <table className="min-w-full bg-white border border-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Warehouse
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Payment Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Grand Total
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Paid
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredSales.map((sale) => (
                        <tr key={sale._id}>
                          <td className="px-6 py-4 text-left whitespace-nowrap text-base text-gray-900">
                            <p className="rounded-[5px] text-center p-[6px] bg-red-100 text-red-600">
                              {sale.customer}
                            </p>
                          </td>
                          <td className="px-6 py-4 text-left whitespace-nowrap text-base text-gray-900">
                            {sale.warehouse}
                          </td>
                           <td className="px-6 py-4 whitespace-nowrap text-m text-gray-900">{new Date(sale.date).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-left whitespace-nowrap text-base text-gray-900">
                            <StatusBadge value={sale.orderStatus} />
                          </td>
                          <td className="px-6 py-4 text-left whitespace-nowrap text-base text-gray-900">
                            <PaymentBadge value={sale.paymentStatus} />
                          </td>
                          <td className="px-6 py-4 text-left whitespace-nowrap text-base text-gray-900">
                            {currency} {formatWithCustomCommas(sale.grandTotal ?? 0)}
                          </td>
                          <td className="px-6 py-4 text-left whitespace-nowrap text-base text-gray-900">
                            {currency} {formatWithCustomCommas(sale.paidAmount ?? 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}

            {/* SALES RETURN */}
            {activeTable === 'salesReturn' &&
              (filteredSalesReturns.length === 0 ? (
                <NoRows />
              ) : (
                <div className="overflow-x-auto p-6">
                  <table className="min-w-full bg-white border border-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Warehouse
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Grand Total
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Paid Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Return Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Note
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredSalesReturns.map((sale) => (
                        <tr key={sale._id}>
                          <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">
                            <p className="rounded-[5px] text-center p-[6px] bg-red-100 text-red-600">
                              {sale.customer}
                            </p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">
                            {sale.warehouse}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-m text-gray-900">{new Date(sale.date).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-left whitespace-nowrap text-base text-gray-900">
                            {currency} {formatWithCustomCommas(sale.grandTotal ?? 0)}
                          </td>
                          <td className="px-6 py-4 text-left whitespace-nowrap text-base text-gray-900">
                            {currency} {formatWithCustomCommas(sale.paidAmount ?? 0)}
                          </td>
                          <td className="px-6 py-4 text-left whitespace-nowrap text-base text-gray-900">
                            {currency} {formatWithCustomCommas(sale.returnAmount ?? 0)}
                          </td>
                          <td className="px-6 py-4 text-left whitespace-nowrap text-base text-gray-900">
                            {sale.note}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}

            {/* PURCHASE */}
            {activeTable === 'purchase' &&
              (filteredPurchases.length === 0 ? (
                <NoRows />
              ) : (
                <div className="overflow-x-auto p-6">
                  <table className="min-w-full bg-white border border-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Supplier
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Warehouse
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Payment Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Grand Total
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Paid
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredPurchases.map((p) => (
                        <tr key={p._id}>
                          <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">
                            <p className="rounded-[5px] text-center p-[6px] bg-red-100 text-red-600">
                              {p.supplier}
                            </p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">
                            {p.warehouse}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-m text-gray-900">{new Date(p.date).toLocaleDateString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">
                            <StatusBadge value={p.orderStatus} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">
                            <PaymentBadge value={p.paymentStatus} />
                          </td>
                          <td className="px-6 py-4 text-left whitespace-nowrap text-base text-gray-900">
                            {currency} {formatWithCustomCommas(p.grandTotal ?? 0)}
                          </td>
                          <td className="px-6 py-4 text-left whitespace-nowrap text-base text-gray-900">
                            {currency} {formatWithCustomCommas(p.paidAmount ?? 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}

            {/* PURCHASE RETURN */}
            {activeTable === 'purchaseReturn' &&
              (filteredPurchaseReturns.length === 0 ? (
                <NoRows />
              ) : (
                <div className="overflow-x-auto p-6">
                  <table className="min-w-full bg-white border border-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Supplier
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Warehouse
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Grand Total
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Paid
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Note
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredPurchaseReturns.map((p) => (
                        <tr key={p._id}>
                          <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">
                            <p className="rounded-[5px] text-center p-[6px] bg-red-100 text-red-600">
                              {p.supplier}
                            </p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">
                            {p.warehouse}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">
                            <td className="px-6 py-4 whitespace-nowrap text-m text-gray-900">{new Date(p.date).toLocaleDateString()}</td>
                          </td>
                          <td className="px-6 py-4 text-left whitespace-nowrap text-base text-gray-900">
                            {currency} {formatWithCustomCommas(p.grandTotal ?? 0)}
                          </td>
                          <td className="px-6 py-4 text-left whitespace-nowrap text-base text-gray-900">
                            {currency} {formatWithCustomCommas(p.paidAmount ?? 0)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">
                            {p.note}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
          </>
        )}

        {error && <p className="text-red-500 mt-5 text-center">{error}</p>}
      </div>
    </div>
  );
}

export default ClickedStokeReport;
