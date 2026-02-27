
const Handlebars = require('handlebars');

// Register formatCurrency helper (duplicated here to ensure independence)
Handlebars.registerHelper('formatCurrency', function (number) {
    if (isNaN(number)) return '0.00';
    const [integerPart, decimalPart] = parseFloat(number).toFixed(2).split('.');
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${formattedInteger}.${decimalPart}`;
});

Handlebars.registerHelper('formatDate', function (dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        // Match old format: "Date: {{date}}" - Old code passed pre-formatted string or date object
        // If it's a date object, format it standardly, or return as is if string
        const options = {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false, timeZone: 'Asia/Colombo'
        };
        return new Intl.DateTimeFormat('en-GB', options).format(date).replace(',', '');
    } catch (error) { return dateString || ''; }
});

const generateKOTTemplate = (saleData, kotSettings, settings, req) => {
  const { header, body, footer, general } = kotSettings;
  const fontSize = general?.fontSize || '13px'; // Old template used 13px fixed
  const fontFamily = general?.fontFamily || 'Arial, sans-serif'; // Old template used Arial

  let template = `
    <div style="font-family: ${fontFamily}; max-width: 80mm; margin: 0 auto; padding: 10px; border: 1px solid #ccc;">
        <style>
            @media print {
                body { margin: 0 !important; padding: 0 !important; }
                @page { margin: 0 !important; padding: 0 !important; }
            }
        </style>
        <div style="text-align: center; margin-bottom: 8px;">
            <h2 style="margin: 0; font-size: 16px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Kitchen Order Ticket</h2>
        </div>
  `;

  // --- HEADER SECTION ---
  if (header && header.enabled) {
      template += `<div style="text-align: center; margin-bottom: 10px;">`;
      
      // Logo
      const logoField = header.fields.find(f => f.name === 'logo' && f.enabled);
      if (logoField && kotSettings.logoPath) {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const logoUrl = `${baseUrl}/api/kot-logo/${kotSettings.logoPath.split('/').pop()}`;
        template += `
            <div style="width: 32mm; height: 32mm; display: flex; justify-content: center; align-items: center; margin: 0px auto; overflow: hidden; background: transparent;">
                <img src="${logoUrl}" alt="Logo" style="max-width: 100%; max-height: 100%; object-fit: contain;">
            </div>`;
      }

      // Company Name
      const companyField = header.fields.find(f => f.name === 'companyName' && f.enabled);
      if (companyField) {
          template += `<h2 style="margin: 5px 0;">${settings.companyName || ''}</h2>`;
      }
      template += `</div>`; // End top center div

      // Sale No & Date
      template += `<div style="text-align: center; margin-bottom: 10px;">`;
      const saleNoField = header.fields.find(f => f.name === 'saleNumber' && f.enabled);
      if (saleNoField) {
          template += `<p style="margin: 3px 0; font-size: 13px;">Sale No: ${saleData.todaySaleNumber}</p>`;
      }
      const dateField = header.fields.find(f => f.name === 'date' && f.enabled);
      if (dateField) {
          template += `<p style="margin: 3px 0; font-size: 13px;">Date: {{formatDate date}}</p>`;
      }
      const orderTypeField = header.fields.find(f => f.name === 'orderType' && f.enabled);
      if (orderTypeField && saleData.orderType) {
          template += `<p style="margin: 3px 0; font-size: 13px;"><strong>Order Type: ${saleData.orderType}</strong></p>`;
      }
      template += `</div>`;
  }

  // --- BODY SECTION (Product Table) ---
  if (body && body.enabled) {
      template += `<table style="width: 100%; border-collapse: collapse; margin-bottom: 4px;"><thead><tr>`;
      
      const enabledColumns = body.columns.filter(c => c.enabled).sort((a, b) => a.position - b.position);
      
      // Headers
      enabledColumns.forEach(col => {
          let align = 'left';
          if (col.name === 'quantity') align = 'center';
          if (col.name === 'subtotal') align = 'right';
          template += `<th style="text-align: ${align}; font-size: 13px;">${col.label}</th>`;
      });
      template += `</tr></thead><tbody>`;

      // Data Rows
      template += `{{#each productsData}}<tr>`;
      enabledColumns.forEach(col => {
          let align = 'left';
          let padding = 'padding: 2px 0;'; // Default padding from old template
          let val = '';

          if (col.name === 'productName') { 
              val = '{{this.name}}'; 
          }
          if (col.name === 'size') { 
              val = '{{this.size}}'; 
              padding = 'padding: 2px 8px;'; // Old template had specific padding for size
          }
          if (col.name === 'quantity') { 
              val = '{{this.quantity}}'; 
              align = 'center'; 
          }
          if (col.name === 'subtotal') { 
              val = '{{formatCurrency this.subtotal}}'; 
              align = 'right'; 
          }

          template += `<td style="text-align: ${align}; ${padding} font-size: 13px;">${val}</td>`;
      });
      template += `</tr>{{/each}}</tbody>`;

      // --- FOOTER SECTION (Inside Table tfoot) ---
      if (footer && footer.enabled) {
          template += `<tfoot>`;
          template += `<tr><td colspan="${enabledColumns.length - 1}" style="padding-top: 8px;"></td></tr>`;

          const footerFields = footer.fields.filter(f => f.enabled).sort((a, b) => a.position - b.position);
          
          footerFields.forEach(field => {
             // Payment Status
             if (field.name === 'paymentStatus') {
                 template += `<tr>
                    <td colspan="${enabledColumns.length - 1}" style="text-align: right; padding: 2px 0; font-size: 14px;">Payment Status:</td>
                    <td style="text-align: right; padding: 2px 0; font-size: 14px;">{{paymentStatus}}</td>
                 </tr>`;
             }
             // Delivery Charge
             if (field.name === 'deliveryCharge' && saleData.shipping > 0) {
                 template += `<tr>
                    <td colspan="${enabledColumns.length - 1}" style="text-align: right; padding: 2px 0; font-size: 14px;">Delivery Charge:</td>
                    <td style="text-align: right; padding: 2px 0; font-size: 14px;">{{formatCurrency shipping}}</td>
                 </tr>`;
             }
             // Subtotal (Grand Total in context)
             if (field.name === 'subtotal') {
                 template += `<tr>
                    <td colspan="${enabledColumns.length - 1}" style="text-align: right; padding: 2px 0; font-size: 14px;">Subtotal:</td>
                    <td style="text-align: right; padding: 2px 0; font-size: 14px;">{{formatCurrency subtotal}}</td>
                 </tr>`;
             }
          });
          template += `</tfoot></table>`;
      } else {
          template += `</tbody></table>`;
      }
  }

  // --- FOOTER EXTERNAL (Notes & Thank You) ---
  // Order Identifier (e.g. "Running Order - Table 2")
  if (saleData.orderIdentifier) {
      template += `
        <div style="margin-top: 10px; margin-bottom: 5px; font-size: 14px; word-wrap: break-word; overflow-wrap: break-word; text-align: left;">
            <p style="margin-top: 3px; margin-bottom: 3px; font-size: 14px; word-break: break-word;">
                {{orderIdentifier}}
            </p>
        </div>`;
  }

  // Note
  if (saleData.note) {
      template += `
        <div style="margin-top: 5px; margin-bottom:10px; font-size: 14px; word-wrap: break-word; overflow-wrap: break-word; text-align: left;">
            <p style="margin-top: 3px; margin-bottom: 3px; font-size: 14px; word-break: break-word;">
                <strong>Note: </strong>{{note}}
            </p>
        </div>`;
  }

  // Thank You
  if (footer && footer.fields.some(f => f.name === 'thankYou' && f.enabled)) {
      template += `
        <div style="text-align: center; margin-top: 15px; font-size: 0.8em;">
            <p style="margin: 4px 0;">THANK YOU!</p>
        </div>`;
  }

  template += `</div>`; // End main container

  const compiledTemplate = Handlebars.compile(template);
  return compiledTemplate(saleData);
};

module.exports = { generateKOTTemplate };
