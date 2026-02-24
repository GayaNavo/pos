const path = require('path');
const Handlebars = require('handlebars');

// Register formatCurrency helper
Handlebars.registerHelper('formatCurrency', function (number) {
    if (isNaN(number)) return '0.00';
    const [integerPart, decimalPart] = parseFloat(number).toFixed(2).split('.');
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${formattedInteger}.${decimalPart}`;
});

// Register formatPercentage helper
Handlebars.registerHelper('formatPercentage', function (number) {
    if (isNaN(number)) return '0%';
    
    // Convert to number and handle the formatting
    const numValue = parseFloat(number);
    
    // Remove decimal places if they are .00, otherwise keep 2 decimal places
    const formattedNumber = numValue % 1 === 0 ? 
        parseInt(number) : numValue.toFixed(2);
    
    return `${formattedNumber}%`;
});

Handlebars.registerHelper('formatPercentageProduct', function (number) {
    if (isNaN(number)) return '0%';
    const numValue = parseFloat(number);
    // For display, show as percentage (2% instead of 0.02)
    const displayValue = numValue * 100;
    const formattedNumber = displayValue % 1 === 0 ? 
        parseInt(displayValue) : displayValue.toFixed(2);
    return `${formattedNumber}%`;
});

// Register formatDate helper
Handlebars.registerHelper('formatDate', function (dateString) {
    if (!dateString) return '';
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        
        const options = {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
            timeZone: 'Asia/Colombo'
        };
        
        return new Intl.DateTimeFormat('en-GB', options).format(date).replace(',', '');
    } catch (error) {
        console.error('Error formatting date:', error);
        return '';
    }
});

Handlebars.registerHelper('abs', function(number) {
  if (isNaN(number)) return '0.00';
  return Math.abs(parseFloat(number)).toFixed(2);
});

// Register formatPaymentMethod helper to format payment method labels
Handlebars.registerHelper('formatPaymentMethod', function(paymentType) {
  if (!paymentType || typeof paymentType !== 'string') return paymentType;
  
  // Replace underscores with spaces and split into words
  const words = paymentType.replace(/_/g, ' ').split(' ');
  
  // Capitalize first letter of each word
  const formatted = words.map(word => {
    if (word.length === 0) return word;
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
  
  return formatted;
});

const generateReceiptTemplate = (saleData, receiptSettings, settings, req) => {
  const { header, body, summary, footer, general } = receiptSettings;

    const fontSize = general?.fontSize || '13px';
  
  // Base template styled to match printed 80mm receipt with dotted lines and bold headers
  let template = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Receipt</title>
        <style>
            @media print {
                body {
                    margin: 0 !important;
                    padding: 0 !important;
                    width: 80mm !important;
                }
                @page {
                    margin: 0 !important;
                    padding: 0 !important;
                    size: 80mm auto;
                }
            }
            * { box-sizing: border-box; }
            body {
                font-family: ${general?.fontFamily || "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"};
                max-width: 80mm;
                margin: 0 auto;
                padding: ${general?.margin || '10px'} ${general?.margin || '10px'} ${general?.margin || '10px'} 10px;
                font-size: ${fontSize};
                line-height: 1.35;
                color: #000;
            }
            .text-center { text-align: center; }
            .text-left { text-align: left; }
            .text-right { text-align: right; }
            .bold { font-weight: bold; }
            .separator { border-top: 1px dotted #000; margin: 8px 0; }
            .solid { border-top: 1px solid #000; margin: 4px 0; }
            .row { display: flex; justify-content: space-between; }
            .table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            .table thead th { font-weight: bold; padding: 4px 2px; border-bottom: 1px solid #000; }
            .table thead th:first-child { width: 48%; padding-right: 2px; text-align: left; }
            .table thead th.qty-col { width: 12%; text-align: left; }
            .table thead th.price-col { width: 20%; text-align: right; }
            .table thead th.amount-col { width: 20%; text-align: right; }
            .table tbody td { padding: 2px 1px; word-wrap: break-word; }
            .table tbody td:nth-child(1) { width: 48%; }
            .table tbody td:nth-child(2) { width: 12%; }
            .table tbody td:nth-child(3) { width: 20%; }
            .table tbody td:nth-child(4) { width: 20%; }
        </style>
    </head>
    <body>
  `;

  // Header
  if (header && header.enabled) {
    template += generateHeaderSection(header, settings, saleData, req, receiptSettings);
    template += '<div class="separator"></div>';
  }

  // Transaction info
  template += generateTransactionInfoSection(header, saleData, receiptSettings, settings);

  // Products
  if (body && body.enabled) {
    template += generateBodySection(body, saleData, receiptSettings);
    template += '<div class="separator"></div>';
  }

  // Summary
  if (summary && summary.enabled) {
    template += generateSummarySection(summary, saleData, receiptSettings, settings);
    template += '<div class="separator"></div>';
  }

  // Notes
  template += generateNotesSection(saleData);

  // Footer
  if (footer && footer.enabled) {
    template += generateFooterSection(footer, saleData, receiptSettings);
  }

  // FIXED: Improved barcode script with better timing and error handling
  template += `
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        <script>
            // Wait for both DOM and external script to be ready
            function generateBarcode() {
                const barcodeElement = document.getElementById('barcode-{{invoiceNumber}}');
                if (barcodeElement && typeof JsBarcode !== 'undefined') {
                    try {
                        JsBarcode(barcodeElement, '{{invoiceNumber}}', {
                            format: 'CODE128',
                            width: 1.2,
                            height: 30,
                            fontSize: 14,
                            margin: 5,
                            displayValue: true
                        });
                        console.log('Barcode generated successfully');
                    } catch (error) {
                        console.error('Barcode generation error:', error);
                    }
                } else {
                    console.log('Barcode element or library not found, retrying...');
                    setTimeout(generateBarcode, 100);
                }
            }

            // Multiple initialization methods to ensure barcode generates
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', generateBarcode);
            } else {
                generateBarcode();
            }
            
            // Fallback: try again after a short delay
            setTimeout(generateBarcode, 500);
        </script>
    </body>
    </html>
  `;
  
  // Add template data
  const templateData = {
    ...saleData,
    showBarcode: footer && footer.showBarcode
  };
  
  // Compile the template with templateData
  const compiledTemplate = Handlebars.compile(template);
  return compiledTemplate(templateData);
};

const generateHeaderSection = (header, settings, saleData, req, receiptSettings) => {
  if (!header.fields || !Array.isArray(header.fields)) return '';
  
  const enabledFields = header.fields
    .filter(field => field.enabled)
    .sort((a, b) => a.position - b.position);
  
  if (enabledFields.length === 0) return '';

   const fontSize = receiptSettings.general?.fontSize || '13px';

  let headerHTML = '<div class="text-center mb-2">';

  // Logo (if enabled and exists)
  const logoField = enabledFields.find(field => field.name === 'logo');
  if (logoField && receiptSettings.logoPath) {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const logoUrl = `${baseUrl}/api/receipt-logo/${receiptSettings.logoPath.split('/').pop()}`;
    
    headerHTML += `
      <div style="width: 40mm; height: 40mm; margin: 0 auto 8px; overflow: hidden; display: flex; justify-content: center; align-items: center;">
        <img src="${logoUrl}" alt="Logo" style="max-width: 100%; max-height: 100%; object-fit: contain;">
      </div>
    `;
  }

  // Company info fields
    enabledFields.forEach(field => {
    let content = '';
    
    switch (field.name) {
      case 'companyName':
        content = `<div class="bold" style="font-size: ${fontSize}; margin: 2px 0;">${settings.companyName || ''}</div>`;
        break;
      case 'companyAddress':
        content = `<div style="margin: 1px 0; font-size: ${fontSize};">${settings.address || ''}</div>`;
        break;
      case 'companyMobile':
        content = `<div style="margin: 1px 0; font-size: ${fontSize};">Phone: ${settings.companyMobile || ''}</div>`;
        break;
      case 'companyEmail':
        content = `<div style="margin: 1px 0; font-size: ${fontSize};">${settings.email || ''}</div>`;
        break;
      case 'whatsappNumber':
        content = `<div style="margin: 1px 0; font-size: ${fontSize};">Whatsapp/Mobile: ${settings.whatsappNumber || ''}</div>`;
        break;
    }
    
    if (content && field.name !== 'logo') {
      headerHTML += content;
    }
  });
  
  // Add invoice number inside header block as per template (if enabled)
  const invoiceField = enabledFields.find(field => field.name === 'invoiceNumber');
  if (invoiceField && saleData.invoiceNumber) {
    headerHTML += `<div style="margin: 1px 0; font-size: ${fontSize};">#INVOICE: ${saleData.invoiceNumber}</div>`;
  }
  
  // Add KOT number below invoice number (if enabled)
  const kotField = enabledFields.find(field => field.name === 'kot');
  if (kotField && saleData.invoiceNumber) {
    headerHTML += `<div style="margin: 1px 0; font-size: ${fontSize};">#KOT: ${saleData.invoiceNumber}</div>`;
  }

  headerHTML += '</div>';
  return headerHTML;
};
const generateTransactionInfoSection = (header, saleData, receiptSettings, settings) => {
  if (!header.fields || !Array.isArray(header.fields)) return '';
  
  const enabledFields = header.fields
    .filter(field => field.enabled && ['outlet', 'cashier', 'saleNumber', 'date', 'customer'].includes(field.name))
    .sort((a, b) => a.position - b.position);
  
  if (enabledFields.length === 0) return '';

  const fontSize = receiptSettings.general?.fontSize || '13px';

  let transactionHTML = '<div class="mb-2 border-bottom py-1">';

  // Generate each field on separate lines with right-aligned values
  enabledFields.forEach(field => {
    switch (field.name) {
      case 'outlet':
        const defaultWarehouse = settings?.defaultWarehouse || '';
        if (defaultWarehouse) {
          transactionHTML += `<div style="display: flex; justify-content: space-between; margin: 1px 0; font-size: ${fontSize};"><span>Outlet:</span><span>${defaultWarehouse}</span></div>`;
        }
        break;
      case 'cashier':
        transactionHTML += `<div style="display: flex; justify-content: space-between; margin: 1px 0; font-size: ${fontSize};"><span>Cashier:</span><span>${saleData.cashierUsername || ''}</span></div>`;
        break;
      case 'saleNumber':
        transactionHTML += `<div style="display: flex; justify-content: space-between; margin: 1px 0; font-size: ${fontSize};"><span>Sale No:</span><span>${saleData.todaySaleNumber || ''}</span></div>`;
        break;
      case 'date':
        transactionHTML += `<div style="display: flex; justify-content: space-between; margin: 1px 0; font-size: ${fontSize};"><span>Date:</span><span>{{formatDate date}}</span></div>`;
        break;
      case 'customer':
        transactionHTML += `<div style="display: flex; justify-content: space-between; margin: 1px 0; font-size: ${fontSize};"><span>Customer:</span><span>${saleData.customer || ''}</span></div>`;
        break;
    }
  });
  
  // Show Order Type only if it's not 'Normal'
  if (saleData.orderType && saleData.orderType !== 'Normal') {
    transactionHTML += `<div style="display: flex; justify-content: space-between; margin: 1px 0; font-size: ${fontSize};"><span>Order Type:</span><span>${saleData.orderType}</span></div>`;
  }
  
  transactionHTML += '</div>';
  return transactionHTML;
};
const generateBodySection = (body, saleData, receiptSettings) => {
  if (!body.columns || !Array.isArray(body.columns)) return '';

  // Get all enabled columns, sorted by position
  let enabledColumns = body.columns
    .filter(column => column.enabled)
    .sort((a, b) => a.position - b.position);

  // Separate productName (Item) from other columns
  const itemColumn = enabledColumns.find(col => col.name === 'productName');
  const otherColumns = enabledColumns.filter(col => col.name !== 'productName');

  if (!itemColumn || otherColumns.length === 0) return '';

  const fontSize = receiptSettings.general?.fontSize || '13px';
  const totalOtherCols = otherColumns.length;
  const totalCols = 1 + totalOtherCols; // Item + others
  
  // Bias widths to reduce Item space and give more room to the other columns
  // Weights tuned for 80mm receipts: Item smaller, others larger, Amount even larger
  const itemWeight = 0.45;
  const otherWeight = 1.3;
  const amountWeight = 1.8; // More weight for Amount column to prevent wrapping
  
  // Calculate weights for each column
  let weightSum = itemWeight;
  const columnWeights = otherColumns.map(col => {
    if (col.name === 'subtotal') {
      weightSum += amountWeight;
      return amountWeight;
    } else {
      weightSum += otherWeight;
      return otherWeight;
    }
  });
  
  const itemWidthPercent = ((itemWeight / weightSum) * 100).toFixed(2);
  
  // Column configuration for alignment and template
  const columnConfig = {
    'productCode': { align: 'left', template: '{{this.productCode}}' },
    'size': { align: 'center', template: '{{#if this.size}}{{this.size}}{{else}}-{{/if}}' },
    'quantity': { align: 'right', template: '{{this.quantity}}' },
    'price': { align: 'right', template: '{{formatCurrency this.price}}' },
    'subtotal': { align: 'right', template: '{{formatCurrency this.subtotal}}' },
    'discount': { align: 'right', template: '{{formatCurrency this.discount}}' },
    'tax': { align: 'right', template: '{{formatPercentageProduct this.tax}}' }
  };

  // Build colgroup: Item narrower, others wider, Amount widest
  let colgroupHTML = `<col style="width:${itemWidthPercent}%">`;
  otherColumns.forEach((col, index) => {
    const colWidthPercent = ((columnWeights[index] / weightSum) * 100).toFixed(2);
    colgroupHTML += `<col style="width:${colWidthPercent}%">`;
  });

  // Build table headers (allow wrapping to prevent overlap)
  let headersHTML = `<th style="text-align:left; font-weight:bold; font-size: ${fontSize}; padding:4px 2px;">Item</th>`;
  otherColumns.forEach(col => {
    const config = columnConfig[col.name] || { align: 'left', template: '' };
    headersHTML += `<th style="text-align:${config.align}; font-weight:bold; font-size: ${fontSize}; padding:4px 2px;">${col.label}</th>`;
  });

  // Build table with line above headers
  let tableHTML = `
    <div style="border-top: 1px solid #000; margin-bottom: 4px;"></div>
    <table class="table" style="width:100%; border-collapse:collapse;">
      <colgroup>
        ${colgroupHTML}
      </colgroup>
      <thead>
        <tr>
          ${headersHTML}
        </tr>
      </thead>
      <tbody>
  `;

  // Each item is rendered in two rows: name row, then values row
  tableHTML += `{{#each productsData}}`;
  // First row: Item name spanning all columns
  tableHTML += `<tr><td colspan="${totalCols}" style="text-align:left; padding:3px 2px; font-size: ${fontSize};">{{this.name}}</td></tr>`;
  // Second row: Empty Item cell, then other column values
  tableHTML += `<tr>`;
  tableHTML += `<td style="padding:3px 2px;"></td>`;
  
  otherColumns.forEach(col => {
    const config = columnConfig[col.name] || { align: 'left', template: '' };
    tableHTML += `<td style="text-align:${config.align}; padding:3px 2px; font-size: ${fontSize};">${config.template}</td>`;
  });
  
  tableHTML += `</tr>`;
  tableHTML += `{{/each}}`;

  tableHTML += `</tbody></table>`;
  return tableHTML;
};
const generateSummarySection = (summary, saleData, receiptSettings, settings) => {
  if (!summary.fields || !Array.isArray(summary.fields)) return '';
  
  // Get only enabled fields and sort by position
  const enabledFields = summary.fields
    .filter(field => field.enabled)
    .sort((a, b) => a.position - b.position);
  
  if (enabledFields.length === 0) return '';

  const fontSize = receiptSettings.general?.fontSize || '13px';

  const currency = settings?.currency ? `${settings.currency} ` : '';
  let summaryHTML = '<div class="mt-2" style="text-align: right;">';

  const fieldStyle = `style="display: flex; justify-content: space-between; margin: 2px 0; font-size: ${fontSize};"`;
  const boldStyle = `style="display: flex; justify-content: space-between; margin: 4px 0; font-weight: bold; border-top: 1px dashed #ccc; padding-top: 4px; font-size: ${fontSize};"`;

  // Check which fields are enabled
  const enabledFieldNames = enabledFields.map(f => f.name);
  
  // Build subtotal row if enabled
  if (enabledFieldNames.includes('subtotal')) {
    const subtotal = saleData.productsData?.reduce((sum, product) => {
      return sum + (parseFloat(product.subtotal) || 0);
    }, 0) || 0;
    
    if (subtotal > 0) {
      summaryHTML += `
        <div ${fieldStyle}>
          <span style="flex: 1; text-align: right;">Subtotal:</span>
          <span style="width: 100px; text-align: right;">${currency}${subtotal.toFixed(2)}</span>
        </div>
      `;
    }
  }

  // Build shipping row if enabled
  if (enabledFieldNames.includes('shipping') && saleData.shipping > 0) {
    summaryHTML += `
      <div ${fieldStyle}>
        <span style="flex: 1; text-align: right;">Delivery Charge:</span>
        <span style="width: 100px; text-align: right;">${currency}{{formatCurrency shipping}}</span>
      </div>
    `;
  }

  // Build service charge row if enabled
  if (enabledFieldNames.includes('serviceCharge') && saleData.serviceCharge > 0) {
    const serviceChargeDisplay = saleData.serviceChargeType === 'percentage' 
      ? `{{formatPercentage serviceCharge}}` 
      : `${currency}{{formatCurrency serviceCharge}}`;
    summaryHTML += `
      <div ${fieldStyle}>
        <span style="flex: 1; text-align: right;">Service Charge:</span>
        <span style="width: 100px; text-align: right;">${serviceChargeDisplay}</span>
      </div>
    `;
  }

  // Build grand total row if enabled
  if (enabledFieldNames.includes('grandTotal')) {
    summaryHTML += `
      <div ${boldStyle}>
        <span style="flex: 1; text-align: right;">Total Amount:</span>
        <span style="width: 100px; text-align: right;">${currency}{{formatCurrency grandTotal}}</span>
      </div>
    `;
  }

  // Build discount rows if enabled
  if (enabledFieldNames.includes('discount')) {
    if (saleData.discountType === 'percentage' && saleData.discount) {
      summaryHTML += `
        <div ${fieldStyle}>
          <span style="flex: 1; text-align: right;">Discount:</span>
          <span style="width: 100px; text-align: right;">{{formatPercentage discount}}</span>
        </div>
      `;
    }
    if (saleData.discountValue > 0) {
      summaryHTML += `
        <div ${fieldStyle}>
          <span style="flex: 1; text-align: right;">Discount Amount:</span>
          <span style="width: 100px; text-align: right;">${currency}{{formatCurrency discountValue}}</span>
        </div>
      `;
    }
  }

  // Build tax row if enabled
  if (enabledFieldNames.includes('tax') && saleData.taxPercentage > 0) {
    summaryHTML += `
      <div ${fieldStyle}>
        <span style="flex: 1; text-align: right;">Tax:</span>
        <span style="width: 100px; text-align: right;">{{formatPercentage taxPercentage}}</span>
      </div>
    `;
  }

  // Build payment methods if enabled
  if (enabledFieldNames.includes('paymentMethods') && saleData.paymentType && saleData.paymentType.length > 0) {
    summaryHTML += `{{#each paymentType}}`;
    summaryHTML += `
      <div ${fieldStyle}>
        <span style="flex: 1; text-align: right;">{{formatPaymentMethod this.type}}:</span>
        <span style="width: 100px; text-align: right;">${currency}{{formatCurrency this.amount}}</span>
      </div>
    `;
    summaryHTML += `{{/each}}`;
  }

  // Build paid amount row if enabled
  if (enabledFieldNames.includes('paidAmount')) {
    summaryHTML += `
      <div ${fieldStyle}>
        <span style="flex: 1; text-align: right;">Paid Amount:</span>
        <span style="width: 100px; text-align: right;">${currency}{{formatCurrency paidAmount}}</span>
      </div>
    `;
  }

  // Build balance row if enabled
  if (enabledFieldNames.includes('balance')) {
    summaryHTML += `
      <div ${fieldStyle}>
        <span style="flex: 1; text-align: right;">Balance:</span>
        <span style="width: 100px; text-align: right;">${currency}{{formatCurrency cashBalance}}</span>
      </div>
    `;
  }

  // Build total items row if enabled
  if (enabledFieldNames.includes('totalItems')) {
    const totalItems = saleData.productsData?.reduce((total, product) => total + (product.quantity || 0), 0) || 0;
    if (totalItems > 0) {
      summaryHTML += `
        <div ${fieldStyle}>
          <span style="flex: 1; text-align: right;">Total Items:</span>
          <span style="width: 100px; text-align: right;">${totalItems}</span>
        </div>
      `;
    }
  }

  if (typeof saleData.cashBalance === 'number' && saleData.cashBalance <= 0) {
    summaryHTML += `<div style=\"text-align: right; margin-top: 6px;\">Status: Paid</div>`;
  }
  summaryHTML += '</div>';
  return summaryHTML;
};
const generateNotesSection = (saleData) => {
  if (!saleData.note) return '';
  
  return `
    <div class="mt-2 mb-2">
      <div><strong>Note:</strong> {{note}}</div>
    </div>
  `;
};

const generateFooterSection = (footer, saleData, receiptSettings) => {
  if (!footer || !footer.customFields || !Array.isArray(footer.customFields)) return '';

  const enabledCustomFields = footer.customFields
    .filter(field => field.enabled)
    .sort((a, b) => a.position - b.position);

  let footerHTML = '<div class="mt-2 text-center border-top py-1">';

  // Add custom fields
  enabledCustomFields.forEach(field => {
    footerHTML += `<div style="margin: 2px 0; font-size: 12px;">${field.text}</div>`;
  });

  // Add barcode if enabled - FIXED: Ensure proper rendering
  if (footer.showBarcode && saleData.invoiceNumber) {
    footerHTML += `
      <div class="mt-2" style="display: flex; justify-content: center; min-height: 40px;">
        <svg id="barcode-{{invoiceNumber}}" style="display: block;"></svg>
      </div>
    `;
  }

  // Add system by if enabled
  if (footer.showSystemBy) {
    footerHTML += `<div style="margin: 2px 0; font-size: 11px; color: #666;">System by IDEAZONE</div>`;
  }

  footerHTML += '</div>';
  return footerHTML;
};
module.exports = { generateReceiptTemplate };
