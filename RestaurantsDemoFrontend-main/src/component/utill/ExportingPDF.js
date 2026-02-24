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

// import { jsPDF } from "jspdf";
// import axios from "axios";
// import { useEffect, useState } from "react";

// export const handleExportPdf = async (data, currency) => {
//     if (!Array.isArray(data)) {
//         console.error("Data passed to handleExportPdf is not an array:", data);
//         return;
//     }

//     try {
//         // Fetch company details
//         const fetchSettings = async () => {
//             try {
//                 const { data } = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/getSettings`);
//                 return data;
//             } catch (error) {
//                 console.error("[DEBUG] Error fetching settings:", error);
//                 return {};
//             }
//         };

//         const settings = await fetchSettings();
//         const {
//             companyName,
//             companyMobile,
//             email,
//             address,
//             logo,
//         } = settings;

//         const pdf = new jsPDF("p", "mm", "a4");
//         const pageWidth = pdf.internal.pageSize.getWidth();
//         const pageHeight = pdf.internal.pageSize.getHeight();

//         let currentY = 0;

//         // Add Company Logo in the Center
//         if (logo) {
//             const logoImage = await loadImage(logo);
//             const logoWidth = 35;
//             const logoHeight = 35;
//             const logoX = (pageWidth - logoWidth) / 2;
//             pdf.addImage(logoImage, "JPEG", logoX, currentY, logoWidth, logoHeight);
//             currentY += logoHeight - 4;
//         }

//         // Company Info Section
//         pdf.setFontSize(12);
//         pdf.setTextColor(0, 0, 0);
//         pdf.setFont("helvetica", "normal");
//         pdf.text(`${companyName || "N/A"}`, pageWidth / 2, currentY, { align: "center" });
//         currentY += 6;
//         pdf.text(`${companyMobile || "N/A"}`, pageWidth / 2, currentY, { align: "center" });
//         currentY += 6;
//         pdf.text(`${email || "N/A"}`, pageWidth / 2, currentY, { align: "center" });
//         currentY += 6;
//         pdf.text(`${address || "N/A"}`, pageWidth / 2, currentY, { align: "center" });
//         currentY += 14;

//         // Title
//         pdf.setFont("helvetica", "bold");
//         pdf.setTextColor(26, 91, 99);
//         pdf.setFontSize(19);
//         pdf.text("Customer Sales Report", pageWidth / 2, currentY, { align: "center" });
//         currentY += 0;

//         // Table and Summary Generation
//         const tableColumn = ["Customer", "Mobile", "Total Sales", "Sale Amount", "Paid"];
//         const columnWidths = [40, 40, 30, 50, 40];
//         let startX = 10;
//         let startY = currentY + 10;
//         let rowHeight = 8;

//         pdf.setFillColor(200, 200, 200);
//         pdf.rect(startX, startY, columnWidths.reduce((a, b) => a + b, 0), rowHeight, "F");
//         pdf.setFontSize(10);
//         pdf.setFont("helvetica", "bold");
//         pdf.setTextColor(0, 0, 0);
//         let columnX = startX;

//         tableColumn.forEach((col, index) => {
//             pdf.text(col, columnX + 3, startY + 5);
//             pdf.rect(columnX, startY, columnWidths[index], rowHeight);
//             columnX += columnWidths[index];
//         });

//         currentY = startY + rowHeight;
//         let totalSalesCount = 0;
//         let totalSalesAmount = 0;
//         let totalPaidAmount = 0;

//         data.forEach((sale, rowIndex) => {
//             const totalSalesAmountPerCustomer = sale.sales.reduce((acc, sale) => acc + sale.amount, 0);
//             const totalPaidAmountPerCustomer = sale.sales.reduce((acc, sale) => acc + sale.paid, 0);
//             totalSalesCount += sale.sales.length;
//             totalSalesAmount += totalSalesAmountPerCustomer;
//             totalPaidAmount += totalPaidAmountPerCustomer;

//             const rowData = [
//                 sale.name,
//                 sale.mobile,
//                 sale.sales.length.toString(),
//                 `${currency} ${totalSalesAmountPerCustomer.toLocaleString()}`,
//                 `${currency} ${totalPaidAmountPerCustomer.toLocaleString()}`
//             ];

//             if (rowIndex % 2 === 0) {
//                 pdf.setFillColor(240, 240, 240);
//                 pdf.rect(startX, currentY, columnWidths.reduce((a, b) => a + b, 0), rowHeight, "F");
//             }

//             let columnX = startX;
//             rowData.forEach((cell, cellIndex) => {
//                 pdf.text(cell, columnX + 3, currentY + 5);
//                 pdf.rect(columnX, currentY, columnWidths[cellIndex], rowHeight);
//                 columnX += columnWidths[cellIndex];
//             });

//             currentY += rowHeight;

//             if (currentY + rowHeight > pageHeight - 40) {
//                 pdf.addPage();
//                 currentY = 20;
//             }
//         });

//         // Summary Section
//         currentY += 10;
//         pdf.setFillColor(228, 248, 243);
//         pdf.setDrawColor(26, 91, 99);
//         pdf.rect(10, currentY, pageWidth - 20, 30, "FD");

//         pdf.setFontSize(14);
//         pdf.setFont("helvetica", "bold");
//         pdf.setTextColor(26, 91, 99);
//         pdf.text("Sales Summary", pageWidth / 2, currentY + 8, { align: "center" });

//         pdf.setFontSize(10);
//         pdf.setFont("helvetica", "normal");
//         pdf.setTextColor(0, 0, 0);

//         currentY += 14;
//         pdf.text("Total Sales Transactions:", 15, currentY);
//         pdf.text(`${totalSalesCount}`, 120, currentY);
//         currentY += 6;
//         pdf.text("Total Sales Amount:", 15, currentY);
//         pdf.text(`${currency} ${totalSalesAmount.toLocaleString()}`, 120, currentY);
//         currentY += 6;
//         pdf.text("Total Paid Amount:", 15, currentY);
//         pdf.text(`${currency} ${totalPaidAmount.toLocaleString()}`, 120, currentY);

//         pdf.save("customer_report.pdf");
//     } catch (error) {
//         console.error("Failed to export PDF:", error);
//     }
// };

// const loadImage = (url) => {
//     return new Promise((resolve, reject) => {
//         const img = new Image();
//         img.onload = () => resolve(img);
//         img.onerror = (error) => reject(error);
//         img.src = url;
//     });
// };

import { jsPDF } from "jspdf";
import axios from "axios";

// Function to generate and download the PDF report
export const handleExportPdf = async ({
    data,
    currency,
    title,
    summaryTitle,
    tableColumns,
    dataKeys,
    additionalData = {},
    customColumnWidths = null,
    customTableStartX = 10,
}) => {
    if (!Array.isArray(data)) {
        console.error("Data passed to handleExportPdf is not an array:", data);
        return;
    }

    try {
        // Fetch company details
        const fetchSettings = async () => {
            try {
                const { data } = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/getSettings`);
                return data;
            } catch (error) {
                console.error("[DEBUG] Error fetching settings:", error);
                return {};
            }
        };

        const settings = await fetchSettings();
        const { companyName, companyMobile, email, address, logo } = settings;

        const pdf = new jsPDF("p", "mm", "a4");
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        let currentY = 10; // Initial Y position

        // Add Company Logo in the Center
        if (logo) {
            const logoImage = await loadImage(logo);
            const logoWidth = 25;  // Desired width
            const logoHeight = 25; // Desired height
            const logoX = (pageWidth - logoWidth) / 2;
        
            if (logoImage) {
                pdf.addImage(logoImage, "JPEG", logoX, currentY, logoWidth, logoHeight, '', 'FAST');
                currentY += logoHeight + 5;
            }
        }
        

        // Company Info Section
        pdf.setFontSize(12);
        pdf.setTextColor(0, 0, 0);
        pdf.setFont("helvetica", "normal");
        pdf.text(companyName || "N/A", pageWidth / 2, currentY, { align: "center" });
        currentY += 6;
        pdf.text(companyMobile || "N/A", pageWidth / 2, currentY, { align: "center" });
        currentY += 6;
        pdf.text(email || "N/A", pageWidth / 2, currentY, { align: "center" });
        currentY += 6;
        pdf.text(address || "N/A", pageWidth / 2, currentY, { align: "center" });
        currentY += 14;

        // Title Section
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(26, 91, 99);
        pdf.setFontSize(19);
        pdf.text(title, pageWidth / 2, currentY, { align: "center" });
        currentY += 10;

        const getTextWidth = (text, fontSize = 10) => {
            pdf.setFontSize(fontSize);
            return pdf.getTextWidth(text);
        };

        // Calculate Column Widths Dynamically or Use Custom Widths
        const columnWidths = customColumnWidths || tableColumns.map((col, index) => {
            const maxTextWidth = Math.max(
                ...data.map(row => getTextWidth(row[dataKeys[index]] ? row[dataKeys[index]].toString() : "")),
                getTextWidth(col)
            );
            return Math.min(Math.max(maxTextWidth + 6, 30), 80); // Min 30, Max 80
        });

        let startX = customTableStartX;  // Use custom table position or default to 10
        let startY = currentY + 10;
        let rowHeight = 8;

        // Table Header (Bold)
        pdf.setFillColor(200, 200, 200);
        pdf.rect(startX, startY, columnWidths.reduce((a, b) => a + b, 0), rowHeight, "F");
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(0, 0, 0);

        let columnX = startX;
        tableColumns.forEach((col, index) => {
            pdf.text(col, columnX + 3, startY + 5);
            pdf.rect(columnX, startY, columnWidths[index], rowHeight);
            columnX += columnWidths[index];
        });

        currentY = startY + rowHeight;
        let totalAmount = 0;

        // Table Data
        data.forEach((row, rowIndex) => {
            const rowData = dataKeys.map(key => row[key] ?? "N/A");

            if (rowIndex % 2 === 0) {
                pdf.setFillColor(240, 240, 240);
                pdf.rect(startX, currentY, columnWidths.reduce((a, b) => a + b, 0), rowHeight, "F");
            }

            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(0, 0, 0);
            let columnX = startX;
            rowData.forEach((cell, cellIndex) => {
                const cellText = cell != null ? cell.toString() : ''; 
                pdf.text(cellText, columnX + 3, currentY + 5);
                pdf.rect(columnX, currentY, columnWidths[cellIndex], rowHeight);
                columnX += columnWidths[cellIndex];
            });

            if (row.saleAmount) {
                totalAmount += parseFloat(row.saleAmount);
            }

            currentY += rowHeight;

            if (currentY + rowHeight > pageHeight - 40) {
                pdf.addPage();
                currentY = 20;
            }
        });

        // Summary Section
        currentY += 10;
        pdf.setFillColor(228, 248, 243);
        pdf.setDrawColor(26, 91, 99);
        pdf.rect(10, currentY, pageWidth - 20, 40, "FD");

        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(26, 91, 99);
        pdf.text(summaryTitle, pageWidth / 2, currentY + 8, { align: "center" });

        pdf.setFontSize(14);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(0, 0, 0);

        currentY += 14;

        // Additional Data Section
        if (additionalData) {
            Object.keys(additionalData).forEach((key, idx) => {
                currentY += 6;
                pdf.text(`${key}: ${additionalData[key]}`, 15, currentY);
            });
        }

        pdf.save("report.pdf");
    } catch (error) {
        console.error("Failed to export PDF:", error);
    }
};

// Function to export Sales Report with Product Details
export const handleExportSalesWithItemsPdf = async ({
    data,
    currency,
    title,
    summaryTitle,
    additionalData = {},
}) => {
    if (!Array.isArray(data)) {
        console.error("Data passed to handleExportSalesWithItemsPdf is not an array:", data);
        return;
    }

    try {
        // Fetch company details
        const fetchSettings = async () => {
            try {
                const { data } = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/getSettings`);
                return data;
            } catch (error) {
                console.error("[DEBUG] Error fetching settings:", error);
                return {};
            }
        };

        const settings = await fetchSettings();
        const { companyName, companyMobile, email, address, logo } = settings;

        const pdf = new jsPDF("p", "mm", "a4");
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const marginBottom = 20;

        let currentY = 10;

        // Add Company Logo in the Center
        if (logo) {
            const logoImage = await loadImage(logo);
            const logoWidth = 25;
            const logoHeight = 25;
            const logoX = (pageWidth - logoWidth) / 2;
        
            if (logoImage) {
                pdf.addImage(logoImage, "JPEG", logoX, currentY, logoWidth, logoHeight, '', 'FAST');
                currentY += logoHeight + 5;
            }
        }

        // Company Info Section
        pdf.setFontSize(12);
        pdf.setTextColor(0, 0, 0);
        pdf.setFont("helvetica", "normal");
        pdf.text(companyName || "N/A", pageWidth / 2, currentY, { align: "center" });
        currentY += 6;
        pdf.text(companyMobile || "N/A", pageWidth / 2, currentY, { align: "center" });
        currentY += 6;
        pdf.text(email || "N/A", pageWidth / 2, currentY, { align: "center" });
        currentY += 6;
        pdf.text(address || "N/A", pageWidth / 2, currentY, { align: "center" });
        currentY += 14;

        // Title Section
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(26, 91, 99);
        pdf.setFontSize(19);
        pdf.text(title, pageWidth / 2, currentY, { align: "center" });
        currentY += 10;

        // Helper function to wrap text and calculate required height
        const wrapText = (text, maxWidth, fontSize = 8) => {
            pdf.setFontSize(fontSize);
            const textStr = text != null ? text.toString() : '';
            
            // If text is empty, return empty line
            if (!textStr) return [''];
            
            // Check if entire text fits
            if (pdf.getTextWidth(textStr) <= maxWidth) {
                return [textStr];
            }
            
            const words = textStr.split(' ');
            const lines = [];
            let currentLine = '';

            words.forEach(word => {
                // Handle very long words that don't fit in maxWidth
                if (pdf.getTextWidth(word) > maxWidth) {
                    // If there's content in currentLine, push it first
                    if (currentLine) {
                        lines.push(currentLine);
                        currentLine = '';
                    }
                    
                    // Break the long word into chunks that fit
                    let remainingWord = word;
                    while (remainingWord.length > 0) {
                        let chunk = '';
                        for (let i = 1; i <= remainingWord.length; i++) {
                            const testChunk = remainingWord.substring(0, i);
                            if (pdf.getTextWidth(testChunk) > maxWidth) {
                                chunk = remainingWord.substring(0, Math.max(1, i - 1));
                                break;
                            }
                            chunk = testChunk;
                        }
                        lines.push(chunk);
                        remainingWord = remainingWord.substring(chunk.length);
                    }
                } else {
                    const testLine = currentLine ? currentLine + ' ' + word : word;
                    const testWidth = pdf.getTextWidth(testLine);
                    
                    if (testWidth > maxWidth && currentLine) {
                        lines.push(currentLine);
                        currentLine = word;
                    } else {
                        currentLine = testLine;
                    }
                }
            });
            
            if (currentLine) {
                lines.push(currentLine);
            }
            
            return lines.length > 0 ? lines : [''];
        };

        // Helper function to draw wrapped text
        const drawWrappedText = (text, x, y, maxWidth, fontSize = 8, lineHeight = 3.5) => {
            const lines = wrapText(text, maxWidth, fontSize);
            lines.forEach((line, index) => {
                pdf.text(line, x, y + (index * lineHeight));
            });
            return lines.length;
        };

        // Single table configuration with all columns
        const tableColumns = ["Invoice Number", "Customer", "Product", "Price", "Warehouse", "Date", `Grand Total (${currency})`, `Paid (${currency})`, "Username"];
        const startX = 2;
        const columnWidths = [29, 35, 30, 20, 20, 18, 20, 18, 18]; // Adjusted widths for all columns
        const tableWidth = columnWidths.reduce((a, b) => a + b, 0);
        const baseRowHeight = 6;
        const headerRowHeight = 10; // Increased height for header to accommodate wrapped text

        // Table Header
        let startY = currentY + 5;
        pdf.setFillColor(200, 200, 200);
        pdf.rect(startX, startY, tableWidth, headerRowHeight, "F");
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(0, 0, 0);

        let columnX = startX;
        tableColumns.forEach((col, index) => {
            const headerLines = wrapText(col, columnWidths[index] - 2, 9).length;
            const textStartY = startY + (headerRowHeight / 2) - (headerLines * 3.5 / 2) + 3.5;
            drawWrappedText(col, columnX + 1, textStartY, columnWidths[index] - 2, 9);
            pdf.rect(columnX, startY, columnWidths[index], headerRowHeight);
            columnX += columnWidths[index];
        });

        currentY = startY + headerRowHeight;

        // Process each sale record and its products
        data.forEach((sale, saleIndex) => {
            if (sale.productsData && Array.isArray(sale.productsData) && sale.productsData.length > 0) {
                // Calculate maximum lines needed for each product row to determine row height
                const productRowHeights = sale.productsData.map(product => {
                    const productName = product.name || "N/A";
                    const productPrice = product.price ? `${currency} ${product.price}` : "N/A";
                    
                    const productLines = wrapText(productName, columnWidths[2] - 2, 8).length;
                    const priceLines = wrapText(productPrice, columnWidths[3] - 2, 8).length;
                    
                    const maxLines = Math.max(productLines, priceLines, 1);
                    // Add padding: 2mm top + 2mm bottom
                    return Math.max(baseRowHeight, maxLines * 3.5 + 4);
                });
                
                // Calculate heights for rowspan cells
                const invoiceLines = wrapText(sale.invoiceNumber || "N/A", columnWidths[0] - 2, 8).length;
                const customerLines = wrapText(sale.customer || "N/A", columnWidths[1] - 2, 8).length;
                const warehouseLines = wrapText(sale.warehouse || "N/A", columnWidths[4] - 2, 8).length;
                const dateLines = wrapText(sale.date || "N/A", columnWidths[5] - 2, 8).length;
                const totalLines = wrapText((sale.grandTotal || "N/A").toString(), columnWidths[6] - 2, 8).length;
                const paidLines = wrapText((sale.paidAmount || "N/A").toString(), columnWidths[7] - 2, 8).length;
                const usernameLines = wrapText(sale.profile?.cashierUsername || sale.cashierUsername || sale.createdBy?.username || sale.user?.username || sale.username || "N/A", columnWidths[8] - 2, 8).length;
                
                const totalRowHeight = productRowHeights.reduce((a, b) => a + b, 0);
                
                // Check if we need a new page for the entire sale block
                if (currentY + totalRowHeight > pageHeight - marginBottom) {
                    pdf.addPage();
                    currentY = 20;
                    
                    // Redraw header on new page
                    pdf.setFillColor(200, 200, 200);
                    pdf.rect(startX, currentY, tableWidth, headerRowHeight, "F");
                    pdf.setFontSize(9);
                    pdf.setFont("helvetica", "bold");
                    let columnX = startX;
                    tableColumns.forEach((col, index) => {
                        const headerLines = wrapText(col, columnWidths[index] - 2, 9).length;
                        const textStartY = currentY + (headerRowHeight / 2) - (headerLines * 3.5 / 2) + 3.5;
                        drawWrappedText(col, columnX + 1, textStartY, columnWidths[index] - 2, 9);
                        pdf.rect(columnX, currentY, columnWidths[index], headerRowHeight);
                        columnX += columnWidths[index];
                    });
                    currentY += headerRowHeight;
                }

                const startRowY = currentY;
                
                // Alternating row background for the entire sale block
                if (saleIndex % 2 === 0) {
                    pdf.setFillColor(240, 240, 240);
                    pdf.rect(startX, currentY, tableWidth, totalRowHeight, "F");
                }

                // Draw sale info cells with rowspan (these span all product rows)
                pdf.setFont("helvetica", "normal");
                pdf.setTextColor(0, 0, 0);
                pdf.setFontSize(8);
                
                // Column positions
                const col0X = startX;
                const col1X = startX + columnWidths[0];
                const col2X = startX + columnWidths[0] + columnWidths[1];
                const col3X = startX + columnWidths[0] + columnWidths[1] + columnWidths[2];
                const col4X = startX + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3];
                const col5X = startX + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3] + columnWidths[4];
                const col6X = startX + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3] + columnWidths[4] + columnWidths[5];
                const col7X = startX + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3] + columnWidths[4] + columnWidths[5] + columnWidths[6];
                const col8X = startX + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3] + columnWidths[4] + columnWidths[5] + columnWidths[6] + columnWidths[7];

                // Draw rowspan cells with wrapped text vertically centered
                const centerY = startRowY + (totalRowHeight / 2);
                
                drawWrappedText(sale.invoiceNumber || "N/A", col0X + 1, centerY - (invoiceLines * 3.5 / 2) + 3, columnWidths[0] - 2, 8);
                pdf.rect(col0X, startRowY, columnWidths[0], totalRowHeight);
                
                drawWrappedText(sale.customer || "N/A", col1X + 1, centerY - (customerLines * 3.5 / 2) + 3, columnWidths[1] - 2, 8);
                pdf.rect(col1X, startRowY, columnWidths[1], totalRowHeight);
                
                drawWrappedText(sale.warehouse || "N/A", col4X + 1, centerY - (warehouseLines * 3.5 / 2) + 3, columnWidths[4] - 2, 8);
                pdf.rect(col4X, startRowY, columnWidths[4], totalRowHeight);
                
                drawWrappedText(sale.date || "N/A", col5X + 1, centerY - (dateLines * 3.5 / 2) + 3, columnWidths[5] - 2, 8);
                pdf.rect(col5X, startRowY, columnWidths[5], totalRowHeight);
                
                drawWrappedText((sale.grandTotal || "N/A").toString(), col6X + 1, centerY - (totalLines * 3.5 / 2) + 3, columnWidths[6] - 2, 8);
                pdf.rect(col6X, startRowY, columnWidths[6], totalRowHeight);
                
                drawWrappedText((sale.paidAmount || "N/A").toString(), col7X + 1, centerY - (paidLines * 3.5 / 2) + 3, columnWidths[7] - 2, 8);
                pdf.rect(col7X, startRowY, columnWidths[7], totalRowHeight);
                
                drawWrappedText(sale.profile?.cashierUsername || sale.cashierUsername || sale.createdBy?.username || sale.user?.username || sale.username || "N/A", col8X + 1, centerY - (usernameLines * 3.5 / 2) + 3, columnWidths[8] - 2, 8);
                pdf.rect(col8X, startRowY, columnWidths[8], totalRowHeight);

                // Draw product rows (each product gets its own row with dynamic height)
                sale.productsData.forEach((product, prodIndex) => {
                    const productName = product.name || "N/A";
                    const productPrice = product.price ? `${currency} ${product.price}` : "N/A";
                    const rowHeight = productRowHeights[prodIndex];
                    
                    // Add 2mm top padding to text start position
                    drawWrappedText(productName, col2X + 1, currentY + 4, columnWidths[2] - 2, 8);
                    pdf.rect(col2X, currentY, columnWidths[2], rowHeight);
                    
                    drawWrappedText(productPrice, col3X + 1, currentY + 4, columnWidths[3] - 2, 8);
                    pdf.rect(col3X, currentY, columnWidths[3], rowHeight);
                    
                    currentY += rowHeight;
                });
            } else {
                // If no products, show the sale record with N/A for product details
                const rowData = [
                    sale.invoiceNumber || "N/A",
                    sale.customer || "N/A",
                    "N/A",
                    "N/A",
                    sale.warehouse || "N/A",
                    sale.date || "N/A",
                    sale.grandTotal ? sale.grandTotal.toString() : "N/A",
                    sale.paidAmount ? sale.paidAmount.toString() : "N/A",
                    sale.profile?.cashierUsername || sale.cashierUsername || sale.createdBy?.username || sale.user?.username || sale.username || "N/A"
                ];
                
                // Calculate row height based on wrapped text
                const lineCounts = rowData.map((cell, index) => 
                    wrapText(cell, columnWidths[index] - 2, 8).length
                );
                const maxLines = Math.max(...lineCounts, 1);
                // Add padding: 2mm top + 2mm bottom
                const rowHeight = Math.max(baseRowHeight, maxLines * 3.5 + 4);
                
                if (currentY + rowHeight > pageHeight - marginBottom) {
                    pdf.addPage();
                    currentY = 20;
                    
                    // Redraw header on new page
                    pdf.setFillColor(200, 200, 200);
                    pdf.rect(startX, currentY, tableWidth, headerRowHeight, "F");
                    pdf.setFontSize(9);
                    pdf.setFont("helvetica", "bold");
                    let columnX = startX;
                    tableColumns.forEach((col, index) => {
                        const headerLines = wrapText(col, columnWidths[index] - 2, 9).length;
                        const textStartY = currentY + (headerRowHeight / 2) - (headerLines * 3.5 / 2) + 3.5;
                        drawWrappedText(col, columnX + 1, textStartY, columnWidths[index] - 2, 9);
                        pdf.rect(columnX, currentY, columnWidths[index], headerRowHeight);
                        columnX += columnWidths[index];
                    });
                    currentY += headerRowHeight;
                }

                if (saleIndex % 2 === 0) {
                    pdf.setFillColor(240, 240, 240);
                    pdf.rect(startX, currentY, tableWidth, rowHeight, "F");
                }

                pdf.setFont("helvetica", "normal");
                pdf.setTextColor(0, 0, 0);
                pdf.setFontSize(8);
                
                let columnX = startX;
                rowData.forEach((cell, cellIndex) => {
                    const cellText = cell != null ? cell.toString() : 'N/A';
                    drawWrappedText(cellText, columnX + 1, currentY + 4, columnWidths[cellIndex] - 2, 8);
                    pdf.rect(columnX, currentY, columnWidths[cellIndex], rowHeight);
                    columnX += columnWidths[cellIndex];
                });

                currentY += rowHeight;
            }
        });

        // Summary Section
        currentY += 10;
        
        // Check if summary fits on current page
        if (currentY + 40 > pageHeight - marginBottom) {
            pdf.addPage();
            currentY = 20;
        }

        pdf.setFillColor(228, 248, 243);
        pdf.setDrawColor(26, 91, 99);
        pdf.rect(10, currentY, pageWidth - 20, 40, "FD");

        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(26, 91, 99);
        pdf.text(summaryTitle, pageWidth / 2, currentY + 8, { align: "center" });

        pdf.setFontSize(14);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(0, 0, 0);

        currentY += 14;

        // Additional Data Section
        if (additionalData) {
            Object.keys(additionalData).forEach((key) => {
                currentY += 6;
                pdf.text(`${key}: ${additionalData[key]}`, 15, currentY);
            });
        }

        // Calculate category-wise summary
        const categorySummary = {};
        
        console.log('[PDF Export] Processing sales data for categories:', data.length, 'sales');
        
        data.forEach((sale, saleIndex) => {
            if (sale.productsData && Array.isArray(sale.productsData)) {
                if (saleIndex === 0) {
                    console.log('[PDF Export] First sale products:', sale.productsData.length);
                    if (sale.productsData.length > 0) {
                        console.log('[PDF Export] Sample product:', {
                            name: sale.productsData[0].name,
                            category: sale.productsData[0].category,
                            categoryName: sale.productsData[0].categoryName,
                            productCategory: sale.productsData[0].productCategory,
                            allKeys: Object.keys(sale.productsData[0])
                        });
                    }
                }
                
                sale.productsData.forEach(product => {
                    // Try multiple possible category field names
                    const category = product.category || product.categoryName || product.productCategory || "Uncategorized";
                    const price = parseFloat(product.price) || 0;
                    const quantity = parseFloat(product.quantity) || 1;
                    const total = price * quantity;
                    
                    if (!categorySummary[category]) {
                        categorySummary[category] = {
                            totalSales: 0,
                            totalAmount: 0
                        };
                    }
                    categorySummary[category].totalSales += quantity;
                    categorySummary[category].totalAmount += total;
                });
            }
        });
        
        console.log('[PDF Export] Category summary:', categorySummary);

        // Category-wise Summary Table - Only show if there are categorized products
        const categorizedProducts = Object.keys(categorySummary).filter(cat => cat !== "Uncategorized");
        if (categorizedProducts.length > 0) {
            currentY += 20;
            
            // Check if category table fits on current page
            const categoryTableHeight = 15 + (categorizedProducts.length * 8) + 10;
            if (currentY + categoryTableHeight > pageHeight - marginBottom) {
                pdf.addPage();
                currentY = 20;
            }

            // Draw green summary box with border - full width
            const categoryBoxStartY = currentY;
            pdf.setFillColor(228, 248, 243);
            pdf.setDrawColor(26, 91, 99);
            pdf.rect(10, categoryBoxStartY, pageWidth - 20, categoryTableHeight, "FD");

            // Section heading inside the box
            currentY += 5;
            pdf.setFontSize(14);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(26, 91, 99);
            pdf.text("Category-wise Sales Summary", pageWidth / 2, currentY + 3, { align: "center" });

            currentY += 10;

            // Category table - centered inside the green box
            const categoryTableColumns = ["Category", "Total Quantity", `Total Amount (${currency})`];
            const categoryColWidths = [80, 50, 60];
            const categoryStartX = (pageWidth - categoryColWidths.reduce((a, b) => a + b, 0)) / 2;
            const categoryRowHeight = 8;

            // Table Header
            pdf.setFillColor(200, 200, 200);
            pdf.rect(categoryStartX, currentY, categoryColWidths.reduce((a, b) => a + b, 0), categoryRowHeight, "F");
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(0, 0, 0);

            let catColumnX = categoryStartX;
            categoryTableColumns.forEach((col, index) => {
                pdf.text(col, catColumnX + 3, currentY + 5.5);
                pdf.rect(catColumnX, currentY, categoryColWidths[index], categoryRowHeight);
                catColumnX += categoryColWidths[index];
            });

            currentY += categoryRowHeight;

            // Table Data - Filter out "Uncategorized"
            let categoryRowIndex = 0;
            Object.keys(categorySummary)
                .filter(category => category !== "Uncategorized")
                .sort()
                .forEach((category) => {
                    const catData = categorySummary[category];
                    
                    if (categoryRowIndex % 2 === 0) {
                        pdf.setFillColor(240, 240, 240);
                        pdf.rect(categoryStartX, currentY, categoryColWidths.reduce((a, b) => a + b, 0), categoryRowHeight, "F");
                    }

                    pdf.setFont("helvetica", "normal");
                    pdf.setTextColor(0, 0, 0);
                    
                    let catColumnX = categoryStartX;
                
                // Category name
                pdf.text(category, catColumnX + 3, currentY + 5.5);
                pdf.rect(catColumnX, currentY, categoryColWidths[0], categoryRowHeight);
                catColumnX += categoryColWidths[0];
                
                // Total quantity (without decimals)
                pdf.text(Math.round(catData.totalSales).toString(), catColumnX + 3, currentY + 5.5);
                pdf.rect(catColumnX, currentY, categoryColWidths[1], categoryRowHeight);
                catColumnX += categoryColWidths[1];
                
                // Total amount
                pdf.text(`${currency} ${catData.totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, catColumnX + 3, currentY + 5.5);
                pdf.rect(catColumnX, currentY, categoryColWidths[2], categoryRowHeight);
                
                currentY += categoryRowHeight;
                categoryRowIndex++;
            });
        }

        pdf.save("report.pdf");
    } catch (error) {
        console.error("Failed to export Sales PDF with items:", error);
    }
};

// Function to Load Image and Convert to Base64
const loadImage = async (url) => {
    try {
        const response = await axios.get(url, { responseType: "blob" });
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(response.data);
        });
    } catch (error) {
        console.error("Error loading image:", error);
        return null;
    }
};
