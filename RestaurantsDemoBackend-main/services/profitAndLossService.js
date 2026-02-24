const moment = require('moment-timezone');

const getSriLankanDateRange = (type = 'today') => {
    const timezone = 'Asia/Colombo';
    const now = moment().tz(timezone);

    let startDate, endDate;

    switch (type) {
        case 'today':
            startDate = now.clone().startOf('day');
            endDate = now.clone().endOf('day');
            break;
        case 'lastweek':
            endDate = now.clone().endOf('day');
            startDate = now.clone().subtract(7, 'days').startOf('day');
            break;
        case 'lastMonth':
            endDate = now.clone().endOf('day');
            startDate = now.clone().subtract(1, 'month').startOf('day');
            break;
        case 'lastYear':
            endDate = now.clone().endOf('day');
            startDate = now.clone().subtract(1, 'year').startOf('day');
            break;
        default:
            startDate = now.clone().startOf('day');
            endDate = now.clone().endOf('day');
    }

    return {
        startOfDay: startDate.utc().toDate(),
        endOfDay: endDate.utc().toDate()
    };
};


const calculateReportValues = (sales, saleReturns, expenses) => {
    const totalSalesAmount = sales.reduce((total, sale) => total + parseFloat(sale.grandTotal || 0), 0);
    const totalProfitAmount = sales.reduce((total, sale) => total + parseFloat(sale.pureProfit || 0), 0);
    const totalSaleReturnAmount = saleReturns.reduce((total, sale) => total + parseFloat(sale.returnAmount || 0), 0);
    const totalExpensesAmount = expenses.reduce((total, expense) => total + parseFloat(expense.amount || 0), 0);
    const totalLossFromReturns = saleReturns.reduce((total, sale) => {
        if (sale.productsData && Array.isArray(sale.productsData)) {
            return total + sale.productsData.reduce((sum, product) => {
                if (product.returnStatus === false) {
                    const qty = parseFloat(product.returnQty || 0);
                    const cost = parseFloat(product.productCost || 0);
                    sum += qty * cost;
                }
                return sum;
            }, 0);
        }
        return total;
    }, 0);

    const { totalCard, totalCash, totalBankTransfer, totalCheque } = sales.reduce((acc, sale) => {
        if (sale.paymentType && Array.isArray(sale.paymentType)) {
            sale.paymentType.forEach(payment => {
                const amount = Number(payment.amount) || 0;
                const cashBalance = parseFloat(sale.cashBalance || 0);
                switch (payment.type) {
                    case 'card':
                        acc.totalCard += amount; break;
                    case "cash":
                        // Only adjust if cashBalance is negative
                        if (cashBalance < 0) {
                            acc.totalCash += amount + cashBalance; // reduce if negative
                        } else {
                            acc.totalCash += amount;
                        }
                        break;
                    case 'bank_transfer':
                        acc.totalBankTransfer += amount; break;
                    case 'cheque':
                        acc.totalCheque += amount; break;
                    default: break;
                }
            });
        }
        return acc;
    }, { totalCard: 0, totalCash: 0, totalBankTransfer: 0 });

    const { total, totalTaxAmount } = sales.reduce((totals, sale) => {
        if (sale && sale.productsData) {
            let saleSubtotal = 0;
            let saleTaxAmount = 0;

            sale.productsData.forEach(product => {
                const quantity = parseInt(product.quantity || 0, 10);
                const taxRate = parseFloat(product.taxRate || 0);
                const price = parseFloat(product.price || 0);
                const productCost = parseFloat(product.productCost || 0);
                const discount = parseFloat(product.discount || 0);
                const specialDiscount = parseFloat(product.specialDiscount || 0);
                const discountedPrice = price - discount - specialDiscount;

                let subTotal = discountedPrice * quantity;

                // only add tax for exclusive
                if (product.taxType?.toLowerCase() === "exclusive") {
                    const productTax = price * quantity * taxRate;
                    subTotal += productTax;
                    saleTaxAmount += productTax;
                }

                saleSubtotal += subTotal;
            });


            let saleTax = 0;
            if (sale.tax) {
                saleTax = (parseFloat(sale.tax) / 100) * saleSubtotal;
            }

            saleSubtotal += saleTax;
            saleTaxAmount += saleTax;

            totals.total += saleSubtotal;
            totals.totalTaxAmount += saleTaxAmount;
        }
        return totals;
    }, { total: 0, totalTaxAmount: 0 });


    const { grandTotal, totalDiscountAmount } = sales.reduce((totals, sale) => {
        if (sale && sale.productsData) {
            let saleSubtotal = 0;
            let productDiscounts = 0;

            sale.productsData.forEach(product => {
                const quantity = parseInt(product.quantity || 0, 10);
                const price = parseFloat(product.price || 0);
                const tax = parseFloat(product.taxRate || 0);
                const discount = parseFloat(product.discount || 0);
                const specialDiscount = parseFloat(product.specialDiscount || 0);
                const discountedPrice = price - discount - specialDiscount;
                let subTotal = discountedPrice * quantity;

                if (product.taxType?.toLowerCase() === "exclusive") {
                    subTotal += price * quantity * tax;
                }

                saleSubtotal += subTotal;
                productDiscounts += (discount + specialDiscount) * quantity;
            });

            let saleDiscount = 0;
            if (sale.discount) {
                saleDiscount = parseFloat(sale.discountValue || 0);

            }
            const offerDiscount = saleSubtotal * (parseFloat(sale.offerPercentage || 0) / 100);
            totals.grandTotal += saleSubtotal;
            totals.totalDiscountAmount += productDiscounts + saleDiscount + offerDiscount;
        }
        return totals;
    }, { grandTotal: 0, totalDiscountAmount: 0 });

    let totalLoss = totalLossFromReturns + totalExpensesAmount;
    let netProfit = totalProfitAmount - totalLoss;
    netProfit = Math.max(0, netProfit);
    totalLoss = Math.max(0, totalLoss);
    const totalProfitLoss = totalProfitAmount + totalLoss;
    const profitPercentage = totalProfitLoss > 0
        ? ((totalProfitAmount / totalProfitLoss) * 100).toFixed(3)
        : "0.000";

    const lossPercentage = totalProfitLoss > 0
        ? ((totalLoss / totalProfitLoss) * 100).toFixed(3)
        : "0.000";


    return {
        totalSales: totalSalesAmount,
        totalProfit: totalProfitAmount,
        totalSaleReturn: totalSaleReturnAmount,
        totalExpenses: totalExpensesAmount,

        // Loss and Net calculations
        netLoss: totalLoss,
        netProfit: netProfit,
        profitPercentage: profitPercentage,
        lossPercentage: lossPercentage,

        // Other calculations
        totalTaxAmount: totalTaxAmount,
        totalDiscountAmount: totalDiscountAmount,
        totalCard: totalCard,
        totalCash: totalCash,
        totalBankTransfer: totalBankTransfer,
        totalCheque: totalCheque,
    };
};

module.exports = { getSriLankanDateRange, calculateReportValues };

