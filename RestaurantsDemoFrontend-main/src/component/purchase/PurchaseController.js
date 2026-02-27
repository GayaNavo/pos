

import axios from 'axios';
import { toast } from 'react-toastify';

//HANDLE SEARCH PRODUCT
export const handleProductSearch = async (e, setSearchTerm, setFilteredProducts, warehouse) => {
    const keyword = e.target.value;
    setSearchTerm(keyword);
    if (keyword.length > 0) {
        try {
            const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/searchProductByName`, {
                params: {
                    name: keyword,
                    warehouse: warehouse,
                },
            });
            setFilteredProducts(response.data.products);
            if (response.data && Array.isArray(response.data.products)) {
                setFilteredProducts(response.data.products);
            } else {
                console.error('Unexpected response format:', response.data);
                setFilteredProducts([]);
            }
        } catch (error) {
            setFilteredProducts([]);
        }
    }
};

// HANDLE SEARCH SUPPLIER
export const handleSuplierSearch = async (e, setSearchSuplier, setFilteredSuplier) => {
    const keyword = e.target.value;
    setSearchSuplier(keyword);
    if (keyword.length > 0) {
        try {
            const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/fetchSupplier`, {
                params: { keyword }
            });
            setFilteredSuplier(response.data);
        } catch (error) {
            console.error('Error fetching suppliers:', error);
            setFilteredSuplier([]);
        }
    } else {
        setFilteredSuplier([]);
    }
};

//HANDLE WAREHOUSE CHANGE
export const handleWarehouseChange = (e, setWarehouse, fetchProductDataByWarehouse, setProductData, setSelectedCategoryProducts, setSelectedBrandProducts, setSearchedProductData, setLoading) => {
    const selectedWarehouse = e.target.value;
    setWarehouse(selectedWarehouse);
    if (selectedWarehouse) {
        fetchProductDataByWarehouse(
            selectedWarehouse,
            setProductData,
            setSelectedCategoryProducts,
            setSelectedBrandProducts,
            setSearchedProductData,
            setLoading
        );
    } else {
        setProductData([]);
    }
};

//HANDLE CUSTOMER SELECT
export const handleSuplierSelect = (suplier, setSelectedSuplier, setSearchSuplier, setFilteredSuplier) => {
    setSelectedSuplier(suplier);
    setSearchSuplier(suplier.name);
    setFilteredSuplier([]);
}


// export const handleProductSelect = (product, setSelectedProduct, setSearchTerm, setFilteredProducts) => {
//     if (!product.isInventory) {
//         toast.warning(`⚠️ "${product.name}" is not tracked in inventory.`, {
//             position: "top-right",
//             autoClose: 3000,
//             closeOnClick: true,
//             pauseOnHover: true,
//         });
//     }
//     if (product.ptype === 'Variation' && product.variationValues) {
//         // Set the product with a variation
//         setSelectedProduct((prevProducts) => {
//             const firstVariation = Object.keys(product.variationValues)[0];
//             const existingProductWithSameVariation = prevProducts.find(
//                 p => p._id === product._id && p.selectedVariation === firstVariation
//             );
//             if (existingProductWithSameVariation) {
//                 toast.error(`The variation "${firstVariation}" is already added.`);
//                 return prevProducts;
//             }
//             return [
//                 ...prevProducts,
//                 {
//                     ...product,
//                     selectedVariation: firstVariation,
//                     barcodeFormat: product.barcode,
//                     barcodeQty: 0,
//                     variationValues: {
//                         ...product.variationValues,
//                         [firstVariation]: {
//                             ...product.variationValues[firstVariation],
//                             barcodeQty: 0
//                         }
//                     }
//                 },
//             ];
//         });
//     } else {
//         // Handle normal product without variations
//         setSelectedProduct((prevProducts) => {
//             const existingProduct = prevProducts.find(p => p._id === product._id);
//             if (existingProduct) {
//                 toast.error("This product is already added.");
//                 return prevProducts;
//             }
//             return [
//                 ...prevProducts,
//                 {
//                     ...product,
//                     barcodeFormat: product.barcode,
//                     barcodeQty: 0,
//                 },
//             ];
//         });
//     }
//     setSearchTerm('');
//     setFilteredProducts([]);
// };

//HANDLE VARIATION CHANGE

export const handleProductSelect = (product, setSelectedProduct, setSearchTerm, setFilteredProducts) => {
    if (!product.isInventory) {
        toast.warning(`⚠️ "${product.name}" is not tracked in inventory.`, {
            position: "top-right",
            autoClose: 3000,
            closeOnClick: true,
            pauseOnHover: true,
        });
    }

    if (product.ptype === 'Variation' && product.variationValues) {
        setSelectedProduct((prevProducts) => {
            const existingProduct = prevProducts.find(p => p._id === product._id);

            if (existingProduct) {
                toast.error("This product is already added. Use the variation selector to add different variations.");
                return prevProducts;
            }

            const firstVariation = Object.keys(product.variationValues)[0];
            return [
                ...prevProducts,
                {
                    ...product,
                    selectedVariation: firstVariation,
                    barcodeFormat: product.barcode,
                    barcodeQty: 0,
                    addedVariations: [firstVariation],
                    variationValues: {
                        ...product.variationValues,
                        [firstVariation]: {
                            ...product.variationValues[firstVariation],
                            barcodeQty: 0
                        }
                    }
                },
            ];
        });
    } else {
        // Handle normal product without variations
        setSelectedProduct((prevProducts) => {
            const existingProduct = prevProducts.find(p => p._id === product._id);
            if (existingProduct) {
                toast.error("This product is already added.");
                return prevProducts;
            }
            return [
                ...prevProducts,
                {
                    ...product,
                    barcodeFormat: product.barcode,
                    barcodeQty: 0,
                },
            ];
        });
    }
    setSearchTerm('');
    setFilteredProducts([]);
};

// export const handleVariationChange = (index, variation, setSelectedProduct) => {
//     setSelectedProduct((prevProducts) =>
//         prevProducts.map((product, i) => {
//             if (i === index) { // Use index to find the correct product instance
//                 const productWithSameVariation = prevProducts.find(
//                     (p, j) => j !== index && p._id === product._id && p.selectedVariation === variation
//                 );

//                 if (productWithSameVariation) {
//                     toast.error(`The variation "${variation}" is already added.`);
//                     return product;
//                 }

//                 const stockQty = product.variationValues[variation]?.productQty || 0;
//                 const currentVariationQty = product.variationValues[variation]?.barcodeQty ?? 0;
//                 return {
//                     ...product,
//                     selectedVariation: variation,
//                     barcodeQty: currentVariationQty,
//                     variationValues: {
//                         ...product.variationValues,
//                         [variation]: {
//                             ...product.variationValues[variation],
//                             barcodeQty: currentVariationQty
//                         }
//                     }
//                 };
//             }
//             return product;
//         })
//     );
// };

// CALCULATE SINGLE & VARIATION PRODUCT QTY

export const handleVariationChange = (index, variation, setSelectedProduct) => {
    setSelectedProduct((prevProducts) => {
        const currentProduct = prevProducts[index];
        const isVariationAdded = currentProduct.addedVariations?.includes(variation);

        if (isVariationAdded) {
            toast.error(`The variation "${variation}" is already added.`);
            return prevProducts;
        }

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
            barcodeQty: 0,
            variationValues: {
                ...currentProduct.variationValues,
                [variation]: {
                    ...currentProduct.variationValues[variation],
                    barcodeQty: 0
                }
            }
        };

        // Insert the new variation after the current product
        updatedProducts.splice(index + 1, 0, newVariationProduct);
        return updatedProducts;
    });
};

export const handleRemoveVariation = (index, setSelectedProduct) => {
    setSelectedProduct((prevProducts) => {
        const productToRemove = prevProducts[index];
        const removedVariation = productToRemove.selectedVariation;

        // Remove the row
        const updatedProducts = prevProducts.filter((_, i) => i !== index);

        return updatedProducts.map(product => {
            if (product._id === productToRemove._id) {
                return {
                    ...product,
                    addedVariations: (product.addedVariations || []).filter(v => v !== removedVariation)
                };
            }
            return product;
        });
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
export const getBaseCost = (product, selectedVariation) => {
    if (product.variationValues) {
        if (selectedVariation && product.variationValues[selectedVariation]) {
            const variationPrice = Number(product.variationValues[selectedVariation].productCost);
            return !isNaN(variationPrice) ? `${variationPrice}` : 'Price not available';
        }
        const prices = Object.values(product.variationValues)
            .map(variation => Number(variation.productCost))
            .filter(price => !isNaN(price));

        if (prices.length > 0) {
            const minPrice = Math.min(...prices);
            return minPrice;
        }
    }
    const singlePrice = Number(product.productCost);
    return !isNaN(singlePrice) && singlePrice > 0 ? `${singlePrice}` : 'Price not available';
};

//GET TAX
export const getTax = (product, selectedVariation) => {
    if (product.variationValues && selectedVariation && product.variationValues[selectedVariation]) {
        const variationTax = Number(product.variationValues[selectedVariation].orderTax);
        return !isNaN(variationTax) ? variationTax : 0;
    }
    return 0;
};

//REMOVE PRODUCT FROM LIST
export const handleDelete = (index, selectedProduct, setSelectedProduct) => {
    const updatedProducts = selectedProduct.filter((_, i) => i !== index);
    setSelectedProduct(updatedProducts);
};

// HANDLE QUANTITY CHANGING
export const handleQtyChange = (index, selectedVariation, setSelectedProduct, change, isInputChange = false) => {
    setSelectedProduct((prevProducts) =>
        prevProducts.map((product, i) => {
            if (i !== index) return product;

            // Variation products
            if (product.variationValues && selectedVariation) {
                const variation = product.variationValues[selectedVariation];
                const currentQty = variation?.barcodeQty ?? 0;

                let updatedQty;
                if (isInputChange) {
                    // Allow empty string while typing
                    updatedQty = change === "" ? "" : Math.max(0, change);
                } else {
                    const qty = currentQty === "" ? 0 : currentQty;
                    updatedQty = Math.max(0, qty + change);
                }

                return {
                    ...product,
                    barcodeQty: updatedQty,
                    variationValues: {
                        ...product.variationValues,
                        [selectedVariation]: {
                            ...variation,
                            barcodeQty: updatedQty,
                        },
                    },
                };
            }

            // Single products
            const currentQty = product.barcodeQty ?? 0;
            let updatedQty;
            if (isInputChange) {
                updatedQty = change === "" ? "" : Math.max(0, change);
            } else {
                const qty = currentQty === "" ? 0 : currentQty;
                updatedQty = Math.max(0, qty + change);
            }

            return { ...product, barcodeQty: updatedQty };
        })
    );
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

//HANDLE SAVE PRODUCT
export const handleSave = async (grandTotal, orderStatus, paymentStatus, paymentType, shipping, discountType, discount, tax, warehouse, selectedSuplier, selectedProduct, invoiceNumber, date, setError, setResponseMessage, setProgress, navigate) => {
    setError('')
    setResponseMessage('');
    setProgress(true)

    const numberRegex = /^[0-9]*(\.[0-9]+)?$/;
    if (!numberRegex.test(tax)) {
        toast.error('Tax must be a valid number');
        setProgress(false)
        return;
    }
    if (!numberRegex.test(discount)) {
        toast.error('Discount must be a valid number');
        setProgress(false)
        return;
    }
    if (!numberRegex.test(shipping)) {
        toast.error('Shipping must be a valid number');
        setProgress(false)
        return;
    }
    if (!selectedSuplier || !selectedSuplier.name) {
        toast.error('Supplier information is required');
        setProgress(false)
        return;
    }
    if (!date) {
        toast.error('Date is required');
        setProgress(false)
        return;
    }
    if (!paymentStatus) {
        toast.error('Payment Status is required');
        setProgress(false)
        return;
    }
    if (!warehouse) {
        toast.error('Warehouse is required');
        setProgress(false)
        return;
    }
    if (paymentStatus.toLowerCase() === 'paid' && !paymentType) {
        toast.error('Payment Type is required when Payment Status is Paid');
        setProgress(false);
        return;
    }

    const hasZeroQuantity = selectedProduct.some(product => {
        const quantity = product.ptype === "Variation"
            ? (product.variationValues?.[product.selectedVariation]?.barcodeQty ?? product.barcodeQty)
            : product.barcodeQty;
        return quantity === 0 || quantity === "" || !quantity;
    });

    if (hasZeroQuantity) {
        setError('Cannot create purchase. All products must have a quantity greater than 0.');
        toast.error('Cannot create purchase. All products must have a quantity greater than 0.', {
            autoClose: 2000,
            className: "custom-toast"
        });
        setProgress(false);
        return;
    }

    const totalAmount = Number(grandTotal) || 0;
    const paidAmount = paymentStatus.toLowerCase() === 'paid' ? grandTotal : 0.00;

    const commonPurchaseData = {
        invoiceNumber,
        date,
        supplier: selectedSuplier.name,
        warehouse: warehouse ? warehouse : 'Unknown',
        tax,
        discountType: discountType ? discountType : 'fixed',
        discount,
        shipping,
        paymentStatus,
        paymentType: paymentType ? paymentType : '',
        orderStatus: orderStatus ? orderStatus : 'ordered',
        paidAmount,
        grandTotal: totalAmount,
    };

    // Create products data array
    const productsData = selectedProduct.map(product => {
        const currentID = product._id;
        const ptype = product.ptype;
        const variationValue = product.selectedVariation;
        const productCost = getBaseCost(product, product.selectedVariation);
        const quantity = product.barcodeQty || 0;
        const subtotal = (productCost * quantity);

        return {
            currentID,
            ptype,
            variationValue: variationValue ? variationValue : 'No variations',
            name: product.name,
            price: productCost,
            quantity,
            subtotal,
        };
    });

    // Combine common sale data with products data
    const finalPurchaseData = {
        ...commonPurchaseData,
        productsData,
    };

    try {
        const response = await axios.post(`${process.env.REACT_APP_BASE_URL}/api/createPurchase`, finalPurchaseData);
        console.log('Response:', response.data);
        toast.success(
            response.data.message || 'Purchase created successfully!',
            { autoClose: 2000 },
            { className: "custom-toast" }
        );
        // await new Promise((resolve) => setTimeout(resolve, 1000));
        navigate('/viewPurchase', { state: { refresh: true } });
    } catch (error) {
        console.error('Error creating Purchase:', error);
        if (error.response) {
            console.error('Error details:', error.response.data);
            toast.error(
                'An error occurred on the server',
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
    }
    finally {
        setProgress(false); // Hide loading bar
    }
};

//HANDLE THE RETURN OF PURCHASE
export const handleReturnPurchase = async (id, grandTotal, paidAmount, note, warehouse, supplier, selectedProduct, _id, setError, setResponseMessage, setProgress, navigate) => {
    setProgress(true)

    if (!note) {
        toast.error('Reason is Required', { autoClose: 2000 }, { className: "custom-toast" });
        setProgress(false)
        return;
    }

    const commonPurchaseData = {
        id,
        supplier,
        warehouse: warehouse || 'Unknown',
        grandTotal,
        paidAmount,
        note
    };
    // Create products data array
    const productsData = selectedProduct.map(product => {
        const currentID = product.currentID;
        const variationValue = product.variationValue;
        const price = product.price;
        const ptype = product.ptype;
        const quantity = product.returnQuantity || 0;
        const subtotal = product.returnSubtotal;

        return {
            currentID,
            variationValue,
            name: product.name,
            price,
            ptype,
            quantity,
            subtotal,
        };
    });

    // Combine common sale data with products data
    const finalPurchaseData = {
        ...commonPurchaseData,
        productsData,
        _id,
    };

    console.log('Final Purchase Return Data:', finalPurchaseData);

    try {
        const response = await axios.post(`${process.env.REACT_APP_BASE_URL}/api/returnPurchase`, finalPurchaseData);
        setError('');
        toast.success(
            response.data.message || 'Purchase returned successfully!',
            { autoClose: 2000 },
            { className: "custom-toast" }
        );
        navigate('/viewPurchaseReturns', { state: { refresh: true } });
    } catch (error) {
        console.error('Error creating sale:', error);
        toast.error(
            error.response?.data?.message || 'Failed to return Purchase',
            { autoClose: 2000 },
            { className: "custom-toast" }
        );
        setError('');
    }
    finally {
        setProgress(false);
    }

}


export const handleReturnPurchaseToSupplier = async (
    grandTotal, paidAmount, supplier, note, selectedProduct, warehouse, setError, setResponseMessage, setProgress, navigate
) => {
    setProgress(true);

    // Ensure selectedProduct is an array
    if (!Array.isArray(selectedProduct)) {
        setError('Selected product data is invalid.');
        setProgress(false);
        return;
    }

    const commonPurchaseData = {
        note,
        supplier,
        grandTotal,
        paidAmount,
        warehouse
    };

    const productsData = selectedProduct.map(product => {
        const { warehouse = '', variationValue = '', productCost = 0, returnQty = 0, subtotal = 0, name = 'Unknown', currentID = '', taxRate = 0, ptype = '' } = product;
        return {
            warehouse,
            currentID,
            taxRate,
            ptype,
            variationValue: variationValue || 'No variations',
            name,
            price: productCost,
            quantity: returnQty,
            subtotal,
        };
    });

    const finalPurchaseData = {
        ...commonPurchaseData,
        productsData,
    };

    try {
        const response = await axios.post(`${process.env.REACT_APP_BASE_URL}/api/returnPurchaseToSupplier`, finalPurchaseData);
        console.log('Response:', response.data);
        setError('');
        toast.success(
            response.data.message || 'Purchase returned successfully!',
            { autoClose: 2000 },
            { className: "custom-toast" }
        );
        navigate('/viewPurchaseReturns', { state: { refresh: true } });
    } catch (error) {
        console.error('Error creating sale:', error);
        toast.error(
            error.response?.data?.message || 'Failed to return Purchase',
            { autoClose: 2000 },
            { className: "custom-toast" }
        );
        setResponseMessage('');
    } finally {
        setProgress(false); // Hide loading bar
    }
};

//HANDLE UPDATE PURCHASE RETURN
export const handleUpdatePurchaseReturn = async (
    id, grandTotal, paidAmount, warehouse, supplier,
    productData, date, note, setError, setResponseMessage, setProgress, navigate
) => {
    setResponseMessage('');
    setError('');
    setProgress(true);

    if (!Array.isArray(productData)) {
        setError('Invalid purchase return data format. Expected an array.');
        setProgress(false);
        return;
    }

    const totalAmount = Number(grandTotal) || 0;
    const commonSaleData = {
        date,
        supplier,
        warehouse: warehouse || null,
        paidAmount,
        grandTotal: totalAmount,
        note
    };

    // Create products data array
    const productsData = productData.map(product => {
        const currentID = product.currentID;
        const variationValue = product.variationValue;
        const price = product.price;
        const ptype = product.ptype;
        const quantity = product.quantity || 1;
        const subtotal = product.subtotal;

        return {
            currentID,
            variationValue,
            name: product.name,
            price,
            ptype,
            quantity,
            subtotal,
        };
    });

    const updatedPurchaseReturnData = {
        ...commonSaleData,
        productsData,
    };

    try {
        const response = await axios.put(`${process.env.REACT_APP_BASE_URL}/api/updatePurchaseReturn/${id}`, updatedPurchaseReturnData);
        toast.success(
            response.data.message,
            { autoClose: 2000 },
            { className: "custom-toast" }
        );
        navigate('/viewPurchaseReturns');
    } catch (error) {
        console.error('Error updating purchase return:', error);
        if (error.response) {
            console.error('Error details:', error.response.data);
            // Check for specific backend error messages
            if (error.response.data.errors) {
                const messages = error.response.data.errors.map(err => err.msg).join(', ');
                toast.error(
                    messages || 'An error occurred on the server',
                    { autoClose: 2000 },
                    { className: "custom-toast" }
                );
            } else {
                toast.error(
                    error.response.data.message || 'An error occurred on the server',
                    { autoClose: 2000 },
                    { className: "custom-toast" }
                );
            }
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
        setProgress(false);
    }
};

//HANDLE UPDATE PURCHASE 
export const handleUpdatePurchase = async (id, grandTotal, orderStatus, paymentStatus, paidAmount, paymentType, shipping, discountType, discount, tax, warehouse, selectedSuplier, invoiceNumber, productData, setError, setResponseMessage, setProgress, navigate) => {
    setResponseMessage('')
    setError('')
    setProgress(true)

    if (!Array.isArray(productData)) {
        setError('Invalid sale return data format. Expected an array.');
        setProgress(false)
        return;
    }
    const numberRegex = /^[0-9]*(\.[0-9]+)?$/;
    if (!numberRegex.test(tax)) {
        setError('Tax must be a valid number');
        setProgress(false)
        return;
    }
    if (!numberRegex.test(discount)) {
        setError('Discount must be a valid number');
        setProgress(false)
        return;
    }
    if (!numberRegex.test(shipping)) {
        setError('Shipping must be a valid number');
        setProgress(false)
        return;
    }
    if (!paymentStatus) {
        setError('Payment Status is required');
        setProgress(false)
        return;
    }
    if (!warehouse) {
        setError('Warehouse is required');
        setProgress(false)
        return;
    }
    if (paymentStatus?.toLowerCase() === 'paid' && !paymentType) {
        setError('Payment Type is required when Payment Status is Paid');
        setProgress(false);
        return;
    }

    const hasZeroQuantity = productData.some(product => {
        const qty = Number(product.quantity) || 0;
        return qty <= 0;
    });

    if (hasZeroQuantity) {
        setError('Cannot update purchase. All products must have a quantity of at least 1.');
        toast.error('Cannot update purchase. All products must have a quantity of at least 1.', {
            autoClose: 2000,
            className: "custom-toast"
        });
        setProgress(false);
        return;
    }

    const totalAmount = Number(grandTotal) || 0;
    const PaidAmount = paymentStatus?.toLowerCase() === 'paid' ? totalAmount : 0;
    const commonSaleData = {
        selectedSuplier,
        warehouse: warehouse ? warehouse : 'Unknown',
        invoiceNumber: invoiceNumber ? invoiceNumber : '',
        tax,
        discountType: discountType ? discountType : 'fixed',
        discount,
        shipping,
        paymentStatus,
        paymentType:
            paymentStatus === "unpaid"
                ? ""
                : paymentType && paymentType !== ""
                    ? paymentType
                    : null,
        orderStatus: orderStatus ? orderStatus : 'ordered',
        paidAmount: PaidAmount,
        grandTotal: totalAmount,
    };

    // Create products data array
    const productsData = productData.map((product, index) => {
        const currentID = product.currentID;
        const variationValue = product.variationValue;
        const ptype = product.ptype;
        const price = product.price;
        const quantity = product.quantity || 0;
        const subtotal = product.subtotal;
        return {
            currentID,
            variationValue: variationValue ? variationValue : 'No variations',
            ptype,
            name: product.name,
            price,
            quantity,
            subtotal,
        };
    });

    const updatedSaleData = {
        ...commonSaleData,
        productsData,
    };

    try {
        const response = await axios.put(`${process.env.REACT_APP_BASE_URL}/api/updatePuchase/${id}`, updatedSaleData);
        toast.success(
            response.data.message || 'Purchase created successfully!',
            { autoClose: 2000 },
            { className: "custom-toast" }
        );
        navigate('/viewPurchase');
    } catch (error) {
        console.error('Error updating Purchase:', error);
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
    }
    finally {
        setProgress(false);
    }
};

//HANDLE WAREHOUSE CHANGE
export const handleWarehouseChangeProduct = (e, setWarehouse, existingWarehouse, fetchProductDataByWarehouse, setProductData, setSelectedCategoryProducts, setSelectedBrandProducts, setSearchedProductData, setLoading, warehouseList) => {
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

