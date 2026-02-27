

import axios from 'axios';
import { toast } from 'react-toastify';
import { generateBillNumber } from '../pos/utils/invoiceNumber';
import { silentPrint } from '../pos/utils/silentPrint';

export const handleProductSearch = async (e, setSearchTerm, setFilteredProducts, warehouse, saleProductWarehouse) => {
    const keyword = e.target.value;
    const resolvedWarehouse = warehouse ? warehouse : saleProductWarehouse;
    setSearchTerm(keyword);

    if (keyword.length > 0) {
        try {
            const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/searchProductByName`, {
                params: {
                    name: keyword,
                    warehouse: resolvedWarehouse?._id || resolvedWarehouse,
                },
            });
            setFilteredProducts(response.data.products);
        } catch (error) {
            console.error('Error fetching product:', error);
            setFilteredProducts([]);
        }
    } else {
        setFilteredProducts([]);
        console.log('Search term is empty, cleared filtered products');
    }
};

//HANDLE SEARCH CUSTOMERS
export const handleCustomerSearch = async (e, setSearchCustomer, setFilteredCustomer) => {
    const keyword = e.target.value;
    setSearchCustomer(keyword);
    if (keyword.length > 0) {
        try {
            const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/searchCustomerByName`, {
                params: { name: keyword },
            });
            setFilteredCustomer(response.data.customer); // assuming response data has a customer field
        } catch (error) {
            console.error('Error fetching customer:', error);
            setFilteredCustomer([]);
        }
    } else {
        setFilteredCustomer([]);
    }
};

//HANDLE WAREHOUSE CHANGE
export const handleWarehouseChange = (
    e,
    setWarehouse,
    existingWarehouse,
    fetchProductDataByWarehouse,
    setProductData,
    setSelectedCategoryProducts,
    setSelectedBrandProducts,
    setSearchedProductData,
    setLoading,
    warehouseList
) => {
    const selectedWarehouseId = e ? e.target.value : existingWarehouse;

    setWarehouse(selectedWarehouseId);

    fetchProductDataByWarehouse(
        selectedWarehouseId,
        setProductData,
        setSelectedCategoryProducts,
        setSelectedBrandProducts,
        setSearchedProductData,
        setLoading
    );
};

//HANDLE CUSTOMER SELECT
export const handleCustomerSelect = (customer, setSelectedCustomer, setSearchCustomer, setFilteredCustomer) => {
    setSelectedCustomer(customer);
    setSearchCustomer(customer.name);
    setFilteredCustomer([]);
};


export const handleProductSelect = (product, setSelectedProduct, setSearchTerm, setFilteredProducts, warehouse) => {
    setSelectedProduct((prevProducts) => {
        if (product.ptype === 'Variation' && product.variationValues) {
            // Check if this product is already added (any variation)
            const existingProduct = prevProducts.find(p => p._id === product._id);

            if (existingProduct) {
                toast.error("This product is already added. Use the variation selector to add different variations.");
                return prevProducts;
            }

            const firstVariation = Object.keys(product.variationValues)[0];

            const newProduct = {
                ...product,
                selectedVariation: firstVariation,
                barcodeFormat: product.barcode,
                barcodeQty: 0,
                selectedWarehouseId: warehouse?._id || warehouse,
                addedVariations: [firstVariation], // Track which variations are added
                variationValues: {
                    ...product.variationValues,
                    [firstVariation]: {
                        ...product.variationValues[firstVariation],
                        barcodeQty: 0
                    }
                }
            };

            return [...prevProducts, newProduct];
        } else {
            const existingProduct = prevProducts.find(p => p._id === product._id);

            if (existingProduct) {
                toast.error("This product is already added.");
                return prevProducts;
            }

            const newProduct = {
                ...product,
                barcodeFormat: product.barcode,
                barcodeQty: 0,
                selectedWarehouseId: warehouse?._id || warehouse,
            };

            return [...prevProducts, newProduct];
        }
    });

    setSearchTerm('');
    setFilteredProducts([]);
};

export const handleVariationChange = (index, variation, setSelectedProduct) => {
    setSelectedProduct((prevProducts) => {
        const currentProduct = prevProducts[index];

        const isVariationAdded = currentProduct.addedVariations?.includes(variation);

        if (isVariationAdded) {
            toast.error(`The variation "${variation}" is already added.`);
            return prevProducts;
        }

        const isInventory = currentProduct.isInventory;
        const stockQty = currentProduct.variationValues[variation]?.productQty || 0;

        let newPurchaseQty = 0;

        const updatedAddedVariations = [...(currentProduct.addedVariations || []), variation];
        const updatedProducts = prevProducts.map((product) => {
            if (product._id === currentProduct._id) {
                return {
                    ...product,
                    addedVariations: updatedAddedVariations
                };
            }
            return product;
        });

        const newVariationProduct = {
            ...currentProduct,
            selectedVariation: variation,
            addedVariations: updatedAddedVariations,
            barcodeQty: newPurchaseQty,
            variationValues: {
                ...currentProduct.variationValues,
                [variation]: {
                    ...currentProduct.variationValues[variation],
                    barcodeQty: newPurchaseQty
                }
            }
        };
        updatedProducts.splice(index + 1, 0, newVariationProduct);
        return updatedProducts;
    });
};

export const handleRemoveVariation = (index, setSelectedProduct) => {
    setSelectedProduct((prevProducts) => {
        const productToRemove = prevProducts[index];
        const removedVariation = productToRemove.selectedVariation;
        const updatedAddedVariations = (productToRemove.addedVariations || []).filter(v => v !== removedVariation);
        const updatedProducts = prevProducts
            .filter((_, i) => i !== index)
            .map(product => {
                if (product._id === productToRemove._id) {
                    return {
                        ...product,
                        addedVariations: updatedAddedVariations
                    };
                }
                return product;
            });

        return updatedProducts;
    });
};

export const getQty = (product, selectedVariation) => {
    // If the product has variations
    if (product.variationValues && selectedVariation) {
        const variationQty = Number(product.variationValues[selectedVariation]?.productQty);
        return !isNaN(variationQty) && variationQty > 0 ? variationQty : 0;
    }
    const singleProductQty = Number(product.productQty);
    return !isNaN(singleProductQty) && singleProductQty > 0 ? singleProductQty : 0;
};

// CALCULATE SINGLE & VARIATION PRODUCT PRICE
export const getPriceRange = (product, selectedVariation) => {
    if (product.variationValues) {
        // If a variation is selected, return the price of that variation
        if (selectedVariation && product.variationValues[selectedVariation]) {
            const variationPrice = Number(product.variationValues[selectedVariation].productPrice);
            return !isNaN(variationPrice) ? `${variationPrice}` : 'Price not available';
        }
        // Otherwise, return the minimum price of all variations
        const prices = Object.values(product.variationValues)
            .map(variation => Number(variation.productPrice))
            .filter(price => !isNaN(price));

        if (prices.length > 0) {
            const minPrice = Math.min(...prices);
            return minPrice;
        }
    }
    const singlePrice = Number(product.productPrice);
    return !isNaN(singlePrice) && singlePrice > 0 ? `${singlePrice}` : 'Price not available';
};

export const getProductCost = (product, selectedVariation) => {
    if (product.variationValues) {
        // If a variation is selected, return the price of that variation
        if (selectedVariation && product.variationValues[selectedVariation]) {
            const variationPrice = Number(product.variationValues[selectedVariation].productCost);
            return !isNaN(variationPrice) ? `${variationPrice}` : 0;
        }
        // Otherwise, return the minimum price of all variations
        const prices = Object.values(product.variationValues)
            .map(variation => Number(variation.productCost))
            .filter(price => !isNaN(price));

        if (prices.length > 0) {
            const minPrice = Math.min(...prices);
            return minPrice;
        }
    }
    const singlePrice = Number(product.productCost);
    return !isNaN(singlePrice) && singlePrice > 0 ? `${singlePrice}` : 0;
};

//REMOVE PRODUCT FROM LIST
export const handleDelete = (index, selectedProduct, setSelectedProduct) => {
    // Ensure selectedProduct is an array before performing filter
    if (Array.isArray(selectedProduct)) {
        const updatedProducts = selectedProduct.filter((_, i) => i !== index); // Exclude the product at the given index
        setSelectedProduct(updatedProducts); // Update the state with the new product list
    } else {
        console.error("selectedProduct is not an array:", selectedProduct);
    }
};

// HANDLE QUANTITY CHANGING
export const handleQtyChange = (index, selectedVariation, setSelectedProduct, value) => {
    setSelectedProduct((prevProducts) =>
        prevProducts.map((product, i) => {
            if (i !== index) return product;

            const isInventory = product.isInventory;

            // Variation product handling
            if (product.variationValues && selectedVariation) {
                const variation = product.variationValues[selectedVariation];
                const currentQty = variation?.barcodeQty ?? 0;
                const stockQty = variation?.productQty ?? 0;

                let newQty;

                if (typeof value === "number") {
                    // Increment/Decrement
                    newQty = Math.max(0, currentQty + value);
                } else {
                    if (value === "") {
                        return {
                            ...product,
                            barcodeQty: "",
                            variationValues: {
                                ...product.variationValues,
                                [selectedVariation]: {
                                    ...variation,
                                    barcodeQty: "",
                                },
                            },
                        };
                    }

                    const parsedValue = parseInt(value, 10);
                    if (isNaN(parsedValue)) return product;
                    newQty = Math.max(0, parsedValue);
                }

                // Only enforce stockQty if inventory is ON
                if (isInventory && newQty > stockQty) {
                    alert(`Cannot exceed stock quantity of ${stockQty} for this variation.`);
                    newQty = stockQty;
                }

                return {
                    ...product,
                    barcodeQty: newQty,
                    variationValues: {
                        ...product.variationValues,
                        [selectedVariation]: {
                            ...variation,
                            barcodeQty: newQty,
                        },
                    },
                };
            }

            // Single product handling
            else {
                const currentQty = product.barcodeQty ?? 0;
                const stockQty = product.productQty ?? 0;

                let newQty;

                if (typeof value === "number") {
                    newQty = Math.max(0, currentQty + value);
                } else {
                    if (value === "") {
                        // Allow clearing the input
                        return { ...product, barcodeQty: "" };
                    }

                    const parsedValue = parseInt(value, 10);
                    if (isNaN(parsedValue)) return product;
                    newQty = Math.max(0, parsedValue);
                }

                if (isInventory && newQty > stockQty) {
                    alert(`Cannot exceed stock quantity of ${stockQty} for this product.`);
                    newQty = stockQty;
                }

                return { ...product, barcodeQty: newQty };
            }
        })
    );
};

//GET TAX
export const getTax = (product, selectedVariation) => {
    if (product.variationValues && selectedVariation && product.variationValues[selectedVariation]) {
        const variationTax = Number(product.variationValues[selectedVariation].orderTax);
        return !isNaN(variationTax) ? variationTax : 0;
    }
    return 0;
};

//HANDLE DISCOUNT TYPE
export const handleDiscount = (e, discountType, setDiscount) => {
    if (!discountType) {
        alert('Please select a discount type first.');
        return;
    }
    const value = e.target.value;
    if (discountType === 'percentage') {
        const numericValue = parseFloat(value);
        if (numericValue < 1 || numericValue > 100) {
            alert('Please enter a percentage value between 1 and 100.');
            return;
        }
    }
    setDiscount(value);
};

// CALCULATE SINGLE & VARIATION PRODUCT DISCOUNT
export const getDiscount = (product, selectedVariation) => {
    if (product.variationValues) {
        // If a variation is selected, return the discount of that variation
        if (selectedVariation && product.variationValues[selectedVariation]) {
            const variationDiscount = Number(product.variationValues[selectedVariation].discount);
            return !isNaN(variationDiscount) ? `${variationDiscount}` : 0;
        }
        // Otherwise, return the minimum discount of all variations
        const discounts = Object.values(product.variationValues)
            .map(variation => Number(variation.discount))
            .filter(discount => !isNaN(discount));
        if (discounts.length > 0) {
            const minDiscount = Math.min(...discounts);
            return minDiscount;
        }
    }
    const singleDiscount = Number(product.discount);
    return !isNaN(singleDiscount) && singleDiscount > 0 ? `${singleDiscount}` : 0;
};

// GET TAX TYPE (variation first, then fallback to product)
export const getTaxType = (product, selectedVariation) => {
    if (
        product?.variationValues &&
        selectedVariation &&
        product.variationValues[selectedVariation]
    ) {
        const variationTaxType = product.variationValues[selectedVariation].taxType;

        if (variationTaxType && typeof variationTaxType === 'string') {
            return variationTaxType;
        }
    }
    return product?.taxType && typeof product.taxType === 'string'
        ? product.taxType
        : 'none';
};


export const handleSave = async (grandTotal, profit, orderStatus, paymentStatus, paymentType, amounts, shipping, serviceCharge, serviceChargeValue, serviceChargeType, discountType, discount, discountValue, deliveryNote, tax, selectedWarehouses, selectedCustomer, selectedProduct, preFix, offerPercentage, setInvoiceNumber, setResponseMessage, setError, setProgress, setInvoiceData, note, cashBalance, handlePrintAndClose, shouldPrint = false, shouldPrintKOT = false, cashierID, RegisterID, setFetchRegData, orderId, setOrderId, orderType = 'Normal', kotNote = '') => {
    setResponseMessage('');
    const invoiceNumber = generateBillNumber();
    setInvoiceNumber(invoiceNumber);
    const totalAmount = Number(grandTotal) || 0;
    const profitAmount = Number(profit) || 0;
    let paidAmount = Object.values(amounts).reduce((sum, value) => sum + (Number(value) || 0), 0);
    const balance = totalAmount - paidAmount;
    const normalizedPaymentStatus = paymentStatus?.toLowerCase();

    const hasZeroQuantity = selectedProduct.some(product => {
        const quantity = product.ptype === "Variation"
            ? (product.variationValues?.[product.selectedVariation]?.barcodeQty ?? product.barcodeQty)
            : product.barcodeQty;
        return quantity === 0 || quantity === "" || !quantity;
    });

    if (hasZeroQuantity) {
        toast.error('Cannot save sale. All products must have a quantity greater than 0.', {
            autoClose: 2000,
            className: "custom-toast"
        });
        setProgress(false);
        return;
    }

    if (normalizedPaymentStatus === 'paid' && balance > 0) {
        toast.error("Payment status is 'Paid', but there's still a balance remaining. Please adjust the payment amount.");
        setProgress(false);
        return;
    }
    const numberRegex = /^[0-9]*(\.[0-9]+)?$/;
    if (paidAmount) {
        if (paidAmount >= totalAmount) {
            paidAmount = grandTotal;
        } else {
            paidAmount = paidAmount;
        }
    }
    if (!numberRegex.test(tax)) {
        toast.error('Tax must be a valid number', { autoClose: 2000 }, { className: "custom-toast" });
        setProgress(false);
        return;
    }
    if (!numberRegex.test(discount)) {
        toast.error('Discount must be a valid number', { autoClose: 2000 }, { className: "custom-toast" });
        setProgress(false);
        return;
    }
    if (!numberRegex.test(shipping)) {
        toast.error('Shipping must be a valid number', { autoClose: 2000 }, { className: "custom-toast" });
        setProgress(false);
        return;
    }
    if (!numberRegex.test(serviceCharge)) {
        toast.error('Service Charge must be a valid number', { autoClose: 2000 }, { className: "custom-toast" });
        setProgress(false);
        return;
    }
    if (!selectedCustomer) {
        toast.error('Customer information is required', { autoClose: 2000 }, { className: "custom-toast" });
        setProgress(false);
        return;
    }

    if (!paymentStatus) {
        toast.error('Payment Status is required', { autoClose: 2000 }, { className: "custom-toast" });
        setProgress(false);
        return;
    }
    if (!paymentType) {
        toast.error('Payment Type is required', { autoClose: 2000 }, { className: "custom-toast" });
        setProgress(false);
        return;
    }

    const paymentTypesArray = Object.keys(paymentType)
        .filter((type) => paymentType[type] && Number(amounts[type]) > 0)
        .map((type) => ({ type, amount: Number(amounts[type]) }));

    const cashierUsername = sessionStorage.getItem('name');
    const defaultWarehouse = sessionStorage.getItem('defaultWarehouse') || 'Unknown';
    const cashRegisterKey = cashierID ? cashierID : sessionStorage.getItem('cashierUsername');
    const cashRegisterID = RegisterID ? RegisterID : sessionStorage.getItem('cashRegisterID');

    const productsData = selectedProduct.map(product => {
        const currentID = product._id;
        const isInventory = product.isInventory;
        const ptype = product.ptype;
        const variationValue = product.selectedVariation;
        const price = product.price || getPriceRange(product, product.selectedVariation);
        const productCost = parseFloat(product.productCost || getProductCost(product, product.selectedVariation));
        const discount = product.discount || getDiscount(product, product.selectedVariation);
        const specialDiscount = product.specialDiscount || 0;
        const quantity = product.barcodeQty || 0;
        const taxType = product.taxType || getTaxType(product, product.selectedVariation) || 'inclusive';
        const taxRate = product.orderTax ? product.orderTax / 100 : getTax(product, product.selectedVariation) / 100;
        const discountedPrice = Math.max(price - discount - specialDiscount, 0);
        const baseSubtotal = discountedPrice * quantity;
        const taxAmount = price * quantity * taxRate;
        const subtotal =
            taxType?.toLowerCase() === "exclusive"
                ? baseSubtotal + taxAmount
                : baseSubtotal;
        const productProfit = (((price - discount - specialDiscount) * quantity) - (productCost * quantity)) || 0;
        const warehouseId = product.selectedWarehouseId || product.warehouseId || defaultWarehouse;
        const stockQty = isInventory ? product.productQty - quantity : product.productQty + quantity;
        const offcialProduct = product.offcialProduct !== undefined ? product.offcialProduct : true;

        // Debug logging
        console.log('Product mapping:', { 
            name: product.name, 
            _id: product._id, 
            currentID, 
            category: product.category 
        });

        return {
            currentID,
            ptype,
            isInventory,
            variationValue: variationValue || 'No variations',
            name: product.name,
            price,
            productCost,
            discount,
            specialDiscount,
            quantity,
            stockQty,
            taxType,
            taxRate,
            subtotal,
            productProfit,
            offcialProduct,
            warehouse: warehouseId,
        };
    });

    const commonSaleData = {
        customer: selectedCustomer || 'Walk-in Customer',
        warehouse: defaultWarehouse,
        tax,
        discountType: discountType || 'fixed',
        discount,
        discountValue,
        deliveryNote,
        shipping,
        serviceCharge,
        serviceChargeValue,
        serviceChargeType: serviceChargeType || 'fixed',
        paymentStatus,
        paymentType: paymentTypesArray,
        orderStatus: orderStatus || 'ordered',
        paidAmount,
        grandTotal: totalAmount,
        pureProfit: profitAmount,
        cashierUsername: cashierUsername || 'Unknown',
        cashRegisterKey,
        cashRegisterID,
        offerPercentage,
        invoiceNumber,
        note,
        cashBalance,
        orderId: orderId || '',
        orderType: orderType || 'Normal',
        kotNote: kotNote || '',
    };

    const finalSaleData = {
        ...commonSaleData,
        productsData,
    };
    console.log(finalSaleData);
    try {
        let endpoint = '';
        let isPosSale = false;

        if (window.location.pathname === '/posSystem') {
            endpoint = '/api/createSale';
            finalSaleData.saleType = 'POS';
            isPosSale = true;
        } else if (window.location.pathname === '/createSale') {
            endpoint = '/api/createNonPosSale';
            finalSaleData.saleType = 'Non-POS';
        } else {
            setError('Unknown sale route!');
            setProgress(false);
            return;
        }

        const response = await axios.post(`${process.env.REACT_APP_BASE_URL}${endpoint}`, finalSaleData);
        if (response.data.status === 'success') {
            // Debug logging
            console.log('=== Sale Response Debug ===');
            console.log('Has kotHtml:', !!response.data.kotHtml);
            console.log('Has botHtml:', !!response.data.botHtml);
            console.log('shouldPrintKOT:', shouldPrintKOT);
            console.log('=========================');
            
            if (isPosSale) {
                setFetchRegData(true);
            }
            setInvoiceData(response.data);
            if (shouldPrint) {
                // Helper: fallback function to use the browser's print dialog
                const fallbackToIframe = () => {
                    const iframe = document.createElement("iframe");
                    iframe.style.display = "none";
                    document.body.appendChild(iframe);
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                    iframeDoc.open();
                    iframeDoc.write(response.data.html); // Main bill
                    iframeDoc.close();

                    // toast.info("Silent agent unavailable. Regular print flow used.", {
                    //     autoClose: 2000,
                    //     className: "custom-toast",
                    // });

                    setTimeout(() => {
                        iframe.contentWindow.focus();
                        iframe.contentWindow.print();

                        // KOT printing logic
                        if (shouldPrintKOT && response.data.kotHtml) {
                            const kotIframe = document.createElement("iframe");
                            kotIframe.style.display = "none";
                            document.body.appendChild(kotIframe);
                            const kotDoc = kotIframe.contentDocument || kotIframe.contentWindow.document;
                            kotDoc.open();
                            kotDoc.write(response.data.kotHtml); // KOT bill
                            kotDoc.close();

                            setTimeout(() => {
                                kotIframe.contentWindow.focus();
                                kotIframe.contentWindow.print();
                                setTimeout(() => document.body.removeChild(kotIframe), 1000);
                            }, 500);
                        }

                        // BOT printing logic
                        if (shouldPrintKOT && response.data.botHtml) {
                            const botIframe = document.createElement("iframe");
                            botIframe.style.display = "none";
                            document.body.appendChild(botIframe);
                            const botDoc = botIframe.contentDocument || botIframe.contentWindow.document;
                            botDoc.open();
                            botDoc.write(response.data.botHtml); // BOT bill
                            botDoc.close();

                            setTimeout(() => {
                                botIframe.contentWindow.focus();
                                botIframe.contentWindow.print();
                                setTimeout(() => document.body.removeChild(botIframe), 1000);
                            }, 1000); // Delay BOT to avoid conflicts
                        }

                        setTimeout(() => {
                            document.body.removeChild(iframe);
                            handlePrintAndClose();
                        }, 1000);
                    }, 500);
                };
                // Send to print agent with dual printer support
                try {
                    const printPromises = [];

                    // Always print system bill
                    printPromises.push(
                        silentPrint("http://localhost:4000/print", response.data.html)
                    );

                    // Print KOT bill if requested and available
                    if (shouldPrintKOT && response.data.kotHtml) {
                        printPromises.push(
                            silentPrint("http://localhost:4000/print-kot", response.data.kotHtml)
                        );
                    }

                    // Print BOT bill if requested and available
                    if (shouldPrintKOT && response.data.botHtml) {
                        printPromises.push(
                            silentPrint("http://localhost:4000/print-bot", response.data.botHtml)
                        );
                    }

                    await Promise.all(printPromises);

                    handlePrintAndClose();

                    // Dynamic success message
                    const ticketsGenerated = [];
                    if (shouldPrintKOT && response.data.kotHtml) ticketsGenerated.push('KOT');
                    if (shouldPrintKOT && response.data.botHtml) ticketsGenerated.push('BOT');

                    const successMessage = ticketsGenerated.length > 0
                        ? `System bill and ${ticketsGenerated.join(' + ')} printed successfully.`
                        : "System bill printed successfully.";

                    toast.success(successMessage, {
                        autoClose: 2000,
                        className: "custom-toast",
                    });

                    if (isPosSale) {
                        setFetchRegData(true);
                    }
                } catch (silentErr) {
                    console.error("Silent print error:", silentErr);
                    fallbackToIframe();
                }
            } else {
                handlePrintAndClose();
            }

            toast.success('Sale created successfully!', {
                autoClose: 2000,
                className: "custom-toast"
            });
            setFetchRegData(true);
        }
    } catch (error) {
        console.error('Error creating sale:', error);
        if (error.response) {
            const errorMessage = error.response.data.message;
            if (errorMessage === "Please choose products from the default warehouse.") {
                alert(errorMessage);
            } else {
                toast.error(errorMessage || 'An error occurred on the server', { autoClose: 2000, className: "custom-toast" });
            }
        } else if (error.request) {
            toast.error('No response received from server. Please try again later.', { autoClose: 2000, className: "custom-toast" });
        } else {
            toast.error(error.message || 'An unexpected error occurred.', { autoClose: 2000, className: "custom-toast" });
        }
        setProgress(false);
    } finally {
        setProgress(false);
    }
};

//HANDLE UPDATE SALE
export const handleUpdateSale = async (id, grandTotal, profit, orderStatus, paymentStatus, paymentType, amounts, shipping, serviceCharge, serviceChargeType, discountType, discount, tax, warehouse, selectedCustomer, productData, offerPercentage, setError, setResponseMessage, setProgress, navigate, orderType = 'Normal') => {
    setError('');
    setResponseMessage('');
    setProgress(true);

    if (!Array.isArray(productData)) {
        console.error('Invalid productData:', productData);
        toast.error('Invalid sale data format. Expected an array.');
        setProgress(false);
        return;
    }

    const hasZeroQuantity = productData.some(product => {
        const qty = Number(product.quantity) || 0;
        return qty <= 0;
    });

    if (hasZeroQuantity) {
        toast.error('Cannot update sale. All products must have a quantity of at least 1.', {
            autoClose: 2000,
            className: 'custom-toast',
        });
        setProgress(false);
        return;
    }

    const totalAmount = Number(grandTotal) || 0;
    const profitAmount = Number(profit) || 0;
    const normalizedPaymentStatus = paymentStatus?.toLowerCase();

    let paidAmount = 0;
    let actualPaid = 0;
    let balance = 0;
    let formattedPaymentType = [];
    let updatedPaymentStatus = paymentStatus;

    if (normalizedPaymentStatus === "unpaid") {
        paidAmount = 0;
        actualPaid = 0;
        balance = totalAmount;
        formattedPaymentType = [];
    } else {
        paidAmount = Object.values(amounts).reduce(
            (sum, value) => sum + (Number(value) || 0),
            0
        );

        if (!paymentType || !Array.isArray(paymentType) || paymentType.length === 0) {
            toast.error("Payment type is required when payment status is not 'unpaid'");
            setProgress(false);
            return;
        }

        formattedPaymentType = paymentType
            .map(({ type, amount }) => ({
                type,
                amount: Number(amount),
            }))
            .filter(({ amount }) => amount > 0);

        balance = totalAmount - paidAmount;

        if (balance < 0) {
            actualPaid = totalAmount;
            balance = 0;
        } else {
            actualPaid = paidAmount;
        }

        if (normalizedPaymentStatus === "paid" && balance > 0) {
            toast.error("Payment status is 'Paid', but there's still a balance remaining.");
            setProgress(false);
            return;
        }

        updatedPaymentStatus = paidAmount >= totalAmount ? "paid" : "partial";
    }

    const cashierUsername = sessionStorage.getItem('cashierUsername');

    const numberRegex = /^[0-9]*(\.[0-9]+)?$/;
    if (!numberRegex.test(tax)) {
        toast.error('Tax must be a valid number');
        setProgress(false);
        return;
    }
    if (!numberRegex.test(discount)) {
        toast.error('Discount must be a valid number');
        setProgress(false);
        return;
    }
    if (!numberRegex.test(shipping)) {
        toast.error('Shipping must be a valid number');
        setProgress(false);
        return;
    }
    if (!paymentStatus) {
        toast.error('Payment Status is required');
        setProgress(false);
        return;
    }
    if (!warehouse) {
        toast.error('Warehouse is required');
        setProgress(false);
        return;
    }

    const commonSaleData = {
        selectedCustomer,
        warehouse: warehouse || null,
        tax,
        discountType,
        discount,
        shipping,
        serviceCharge,
        serviceChargeType: serviceChargeType || 'fixed',
        paymentStatus: updatedPaymentStatus,
        paymentType: formattedPaymentType,
        orderStatus,
        paidAmount: actualPaid,
        pureProfit: profitAmount,
        grandTotal: totalAmount,
        cashierUsername: cashierUsername ? cashierUsername : 'unknown',
        offerPercentage,
        cashBalance: balance,
        orderType: orderType || 'Normal',
    };

    const productsData = productData.map(product => {
        const currentID = product.currentID ? product.currentID : product._id;
        const ptype = product.ptype;
        const isInventory = product.isInventory;
        const variationValue = product.variationValue ? product.variationValue : product.selectedVariation;
        const price = product.productPrice ? product.productPrice : product.price || getPriceRange(product, product.selectedVariation);
        const productCost = product.producrCost ? product.producrCost : getProductCost(product, product.selectedVariation);
        const quantity = product.quantity || 0;
        const discount = getDiscount(product, product.selectedVariation) || 0;
        const specialDiscount = product.specialDiscount || 0;
        const taxRate = product.taxRate ? product.taxRate : getTax(product, product.selectedVariation) / 100;
        const discountedPrice = price - discount - specialDiscount;
        const taxType = product.taxType || getTaxType(product, product.selectedVariation) || 'inclusive';
        let subtotal = discountedPrice * quantity;
        if (taxType?.toLowerCase() === "exclusive" && taxRate > 0) {
            subtotal += price * quantity * taxRate;
        }
        const productProfit = (((price - discount - specialDiscount) * quantity) - (productCost * quantity)) || 0;
        const warehouse = product.warehouse || null;
        const offcialProduct = product.offcialProduct !== undefined ? product.offcialProduct : true;

        return {
            currentID,
            ptype,
            isInventory,
            variationValue: variationValue ? variationValue : 'No variations',
            name: product.name,
            price,
            productCost,
            productProfit,
            quantity,
            discount,
            specialDiscount,
            taxType,
            taxRate,
            subtotal,
            offcialProduct,
            warehouse,
        };
    });

    const updatedSaleData = {
        ...commonSaleData,
        productsData,
    };
    try {
        await axios.put(`${process.env.REACT_APP_BASE_URL}/api/updateSale/${id}`, updatedSaleData);
        toast.success('Sale updated successfully!', { autoClose: 2000 }, { className: "custom-toast" });
        navigate('/viewSale');
    } catch (error) {
        console.error('Error updating sale:', error);
        if (error.response) {
            console.error('Error details:', error.response.data);
            toast.error(
                error.response.data.message || 'An error occurred on the server',
                { autoClose: 2000 },
                { className: "custom-toast" }
            );
        } else if (error.request) {
            console.error('No response received:', error.request);
            toast.error(
                'No response received from server. Please try again later.',
                { autoClose: 2000 },
                { className: "custom-toast" }
            );
        } else {
            console.error('Request setup error:', error.message);
            toast.error(
                error.message || 'An unexpected error occurred.',
                { autoClose: 2000 },
                { className: "custom-toast" }
            );
        }
        setProgress(false);
    } finally {
        setProgress(false);
    }
};

//HANDLE THE RETURN OF SALE
export const handleReturnSale = async (id, grandTotal, paidAmount, returnAmount, warehouse, customer, selectedProduct, date, note, setError, setResponseMessage, setProgress, navigate) => {
    setError('')
    setResponseMessage('')
    setProgress(true)

    if (typeof setLoading === 'function') {
        setProgress(true);
    } else {
        console.warn('setLoading is not a function. Skipping setLoading invocation.');
    }

    const commonSaleData = {
        id,
        date,
        customer,
        warehouse: warehouse || null,
        grandTotal,
        paidAmount,
        returnAmount,
        note
    };

    // Create products data array
    const productsData = selectedProduct.map(product => {
        const currentID = product.currentID;
        const ptype = product.ptype;
        const variationValue = product.variationValue;
        const selectedVariation = product.selectedVariation;
        const price = product.price;
        const productCost = product.productCost || 0;
        const quantity = product.quantity;
        const returnQty = product.returnQty ? product.returnQty : 0;
        const taxRate = product.taxRate * 100;
        const subtotal = product.subtotal;
        const discount = product.discount;
        const warehouse = product.warehouse || null;
        const restocking = product.restocking;

        return {
            currentID,
            variationValue,
            selectedVariation,
            ptype,
            name: product.name,
            price,
            productCost,
            quantity,
            returnQty,
            discount,
            taxRate,
            subtotal,
            warehouse,
            returnStatus: restocking
        };
    });

    const finalSaleData = {
        ...commonSaleData,
        productsData,
    };
    console.log('Final sale data:', finalSaleData);
    try {
        const response = await axios.post(`${process.env.REACT_APP_BASE_URL}/api/returnSale`, finalSaleData);
        toast.success(
            response.data.message || 'Sale returned successfully!',
            { autoClose: 2000 },
            { className: "custom-toast" }
        );
        navigate('/viewSaleReturns');
    } catch (error) {
        console.error('Error returning sale:', error);
        if (error.response) {
            console.error('Error details:', error.response.data);
            toast.error(
                error.response.data.message || 'An error occurred on the server',
                { autoClose: 2000 },
                { className: "custom-toast" }
            );
        } else if (error.request) {
            console.error('No response received:', error.request);
            toast.error(
                'No response received from server. Please try again later.',
                { autoClose: 2000 },
                { className: "custom-toast" }
            );
        } else {
            console.error('Request setup error:', error.message);
            toast.error(
                error.message || 'An unexpected error occurred.',
                { autoClose: 2000 },
                { className: "custom-toast" }
            );
        }
    } finally {
        if (typeof setLoading === 'function') {
            setProgress(false);
        }
        setProgress(false);
    }
};

//HANDLE UPDATE SALE RETURN
export const handleUpdateSaleReturn = async (
    id, total, paymentStatus, PaidAmount,
    warehouse, selectedCustomer,
    productData, date, note, setError, setResponseMessage, setProgress, navigate
) => {
    setError('')
    setResponseMessage('');
    setProgress(true)
    console.log('saleReturnData:', productData);

    if (!Array.isArray(productData)) {
        setError('Invalid sale return data format. Expected an array.');
        return;
    }

    const grandTotal = total;
    const totalAmount = Number(grandTotal) || 0;

    const commonSaleData = {
        date,
        selectedCustomer,
        warehouse: warehouse || null,
        paidAmount: PaidAmount,
        grandTotal: totalAmount,
        note
    };

    // Create products data array
    const productsData = productData.map(product => {
        const currentID = product.currentID;
        const ptype = product.ptype;
        const variationValue = product.variationValue;
        const price = product.price;
        const quantity = product.quantity || 1;
        const taxRate = product.taxRate
        const subtotal = product.subtotal;

        return {
            currentID,
            ptype,
            variationValue,
            name: product.name,
            price,
            quantity,
            taxRate,
            subtotal,
        };
    });

    const updatedSaleReturnData = {
        ...commonSaleData,
        productsData,
    };

    try {
        const response = await axios.put(`${process.env.REACT_APP_BASE_URL}/api/updateReturnSale/${id}`, updatedSaleReturnData);
        console.log('Response:', response.data);
        toast.success(
            response.data.message,
            { autoClose: 2000 },
            { className: "custom-toast" }
        );
        navigate('/viewSale');
    } catch (error) {
        console.error('Error updating return sale:', error);
        if (error.response) {
            console.error('Error details:', error.response.data);
            toast.error(
                error.response.data.message || 'An error occurred on the server',
                { autoClose: 2000 },
                { className: "custom-toast" }
            );
        } else if (error.request) {
            console.error('No response received:', error.request);
            toast.error(
                'No response received from server. Please try again later.',
                { autoClose: 2000 },
                { className: "custom-toast" }
            );
        } else {
            console.error('Request setup error:', error.message);
            toast.error(
                error.message || 'An unexpected error occurred.',
                { autoClose: 2000 },
                { className: "custom-toast" }
            );
        }
        setProgress(false)
    }
    finally {
        // setLoading(false); // Hide loading bar
    }
};