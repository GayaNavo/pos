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

import React, { forwardRef } from 'react';

const PrintZbill = forwardRef(({ companyDetails, zReadingData, registerData, currency, formatCurrency }, ref) => {

  const groupRegistersByCashier = (registers) => {
    return registers.reduce((acc, register) => {
      const key = `${register.cashierName} - ${register.cashRegisterID}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(register);
      return acc;
    }, {});
  };

  const groupedRegisters = groupRegistersByCashier(zReadingData?.registers || []);

  return (
    <div ref={ref} className="p-2 pb-4 pt-2 bg-white text-gray-800 w-[80mm] font-sans">
      {/* Company Header - Compact */}
      <div className="text-center mb-2 border-b border-gray-300 pb-2">
        {companyDetails.logo && (
          <img
            src={companyDetails.logo}
            className="w-10 h-10 mx-auto mb-1"
            alt="logo"
          />
        )}
        <h1 className="text-lg font-bold">{companyDetails.name}</h1>
        <p className="text-xs text-gray-600">Z Reading Report</p>
      </div>

      {/* Summary Section */}
      <div className="mb-3">
        <div className="flex justify-between text-sm py-1 border-b border-gray-200">
          <span className="font-semibold flex items-center">Date:</span>
          <span>{new Date(zReadingData?.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Payment Summary */}
      <div className="my-3 p-2 rounded">
        <h3 className="text-sm font-bold mb-1 flex items-center">
          Payment Summary
        </h3>

        <div className="flex justify-between text-xs py-1">
          <span className="flex items-center">Cash Hand In:</span>
          <span className="font-medium">{currency} {formatCurrency(zReadingData?.totalCashHandIn || 0)}</span>
        </div>

        <div className="flex justify-between text-xs py-1">
          <span className="flex items-center">Cash Payments:</span>
          <span className="font-medium">{currency} {formatCurrency(zReadingData?.totalCash || 0)}</span>
        </div>

        <div className="flex justify-between text-xs py-1">
          <span className="flex items-center">Card Payments:</span>
          <span className="font-medium">{currency} {formatCurrency(zReadingData?.totalCard || 0)}</span>
        </div>

        <div className="flex justify-between text-xs py-1">
          <span className="flex items-center">Bank Transfers:</span>
          <span className="font-medium">{currency} {formatCurrency(zReadingData?.totalBank || 0)}</span>
        </div>

        <div className="flex justify-between text-xs py-1">
          <span className="flex items-center">Discounts:</span>
          <span className="font-medium">{currency} {formatCurrency(zReadingData?.totalDiscount || 0)}</span>
        </div>

        <div className="flex justify-between text-xs py-1">
          <span className="flex items-center">Cash Variance:</span>
          <span className={`font-medium ${zReadingData?.totalVariance <= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {currency} {formatCurrency(zReadingData?.totalVariance || 0)}
          </span>
        </div>
      </div>

      {/* Grand Total */}
      <div className="my-3 p-2 text-black rounded text-center">
        <p className="text-xs uppercase font-semibold">Grand Total</p>
        <p className="text-xl font-bold">
          {currency} {formatCurrency(zReadingData?.totalGrandTotal || 0)}
        </p>
      </div>

      {/* Per-Cashier Breakdown */}
      <div className="mt-4">
        <h3 className="text-sm font-bold mb-1 border-b border-gray-300 pb-1">
          Breakdown by Cashier
        </h3>

        {Object.entries(groupedRegisters).map(([key, regs], index) => {
          const subTotals = regs.reduce(
            (totals, r) => {
              totals.cash += r.cashPaymentAmount || 0;
              totals.card += r.cardPaymentAmount || 0;
              totals.bank += r.bankTransferPaymentAmount || 0;
              totals.discount += r.totalDiscountAmount || 0;
              totals.totalProfitAmount += r.totalProfitAmount || 0;
              totals.variance += r.cashVariance || 0;
              totals.cashHandIn += r.cashHandIn || 0;
              return totals;
            },
            { cash: 0, card: 0, bank: 0, discount: 0, totalProfitAmount: 0, variance: 0, cashHandIn: 0 }
          );

          return (
            <div key={index} className="mt-2 border border-gray-300 rounded p-1 text-xs">
              <p className="font-semibold mb-1">{key}</p>

              <div className="mb-2">
                {regs.map((r, i) => (
                  <div key={i} className="mb-1 border-b border-dashed border-gray-200 pb-1">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Opened:</span>
                      <span>
                        {(r.openedTime)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Closed:</span>
                      <span>
                        {(r.closedTime)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between"><span>Cash:</span><span>{currency} {formatCurrency(subTotals.cash)}</span></div>
              <div className="flex justify-between"><span>Card:</span><span>{currency} {formatCurrency(subTotals.card)}</span></div>
              <div className="flex justify-between"><span>Bank:</span><span>{currency} {formatCurrency(subTotals.bank)}</span></div>
              <div className="flex justify-between"><span>Discount:</span><span>{currency} {formatCurrency(subTotals.discount)}</span></div>
              <div className="flex justify-between">
                <span>Variance:</span>
                <span className={subTotals.variance <= 0 ? 'text-green-600' : 'text-red-600'}>
                  {currency} {formatCurrency(subTotals.variance)}
                </span>
              </div>
              <div className="flex justify-between"><span>Cash Hand In:</span><span>{currency} {formatCurrency(subTotals.cashHandIn)}</span></div>
            </div>
          );
        })}
      </div>

      {/* Cashier Info */}
      {zReadingData?.registers?.[0]?.cashierName && (
        <div className="text-xs mt-2 flex items-center justify-center">
          Cashier: {zReadingData.registers[0].cashierName}
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 pt-2 text-center text-xs text-gray-600 border-t border-gray-300">
        <p>{companyDetails.mobile} • {companyDetails.email}</p>
        <p>Printed: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
      </div>
    </div>
  );
});

export default PrintZbill;
