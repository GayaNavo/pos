

const path = require('path');
const Handlebars = require('handlebars');

const generateKOTTemplate = (saleData, kotSettings, settings, req) => {
  const { header, body, footer, general } = kotSettings;
  
  const fontSize = general?.fontSize || '13px';
  
  // Base template for 80mm KOT
  let template = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>KOT</title>
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
                font-family: ${general?.fontFamily || 'Arial, sans-serif'};
                max-width: 80mm;
                margin: 0 auto;
                padding: ${general?.margin || '10px'};
                font-size: ${fontSize};
                line-height: 1.35;
                color: #000;
            }
            .text-center { text-align: center; }
            .text-left { text-align: left; }
            .text-right { text-align: right; }
            .bold { font-weight: bold; }
            .separator { border-top: 1px solid #ccc; margin: 10px 0; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
            .table thead th { font-weight: bold; padding: 4px 2px; border-bottom: 1px solid #000; text-align: left; }
            .table tbody td { padding: 2px 0; font-size: ${fontSize}; }
        </style>
    </head>
    <body>
      <div class="text-center" style="margin-bottom: 8px;">
        <h2 style="margin: 0; font-size: 16px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Kitchen Order Ticket</h2>
      </div>
  `;
  
  // Header
  if (header && header.enabled) {
    template += generateKOTHeaderSection(header, settings, saleData, req, kotSettings);
    template += '<div class="separator"></div>';
  }
  
  // Products table
  if (body && body.enabled) {
    template += generateKOTBodySection(body, saleData, kotSettings);
  }
  
  // Footer
  if (footer && footer.enabled) {
    template += generateKOTFooterSection(footer, saleData, kotSettings, settings);
  }
  
  template += `
    </body>
    </html>
  `;
  
  // Compile the template
  const compiledTemplate = Handlebars.compile(template);
  return compiledTemplate(saleData);
};

const generateKOTHeaderSection = (header, settings, saleData, req, kotSettings) => {
  if (!header.fields || !Array.isArray(header.fields)) return '';
  
  const enabledFields = header.fields
    .filter(field => field.enabled)
    .sort((a, b) => a.position - b.position);
  
  if (enabledFields.length === 0) return '';
  
  const fontSize = kotSettings.general?.fontSize || '13px';
  
  let headerHTML = '<div class="text-center" style="margin-bottom: 10px;">';
  
  enabledFields.forEach(field => {
    switch (field.name) {
      case 'logo':
        if (kotSettings.logoPath) {
          const baseUrl = `${req.protocol}://${req.get('host')}`;
          const logoUrl = `${baseUrl}/api/kot-logo/${kotSettings.logoPath.split('/').pop()}`;
          
          headerHTML += `
            <div style="width: 32mm; height: 32mm; display: flex; justify-content: center; align-items: center; margin: 0px auto; overflow: hidden; background: transparent;">
              <img src="${logoUrl}" alt="Logo" style="max-width: 100%; max-height: 100%; object-fit: contain;">
            </div>
          `;
        }
        break;
      case 'companyName':
        headerHTML += `<h2 style="margin: 5px 0; font-size: ${fontSize};">${settings.companyName || ''}</h2>`;
        break;
      case 'saleNumber':
        headerHTML += `<p style="margin: 3px 0; font-size: ${fontSize};">Sale No: {{todaySaleNumber}}</p>`;
        break;
      case 'date':
        headerHTML += `<p style="margin: 3px 0; font-size: ${fontSize};">Date: {{formatDate date}}</p>`;
        break;
    }
  });
  
  headerHTML += '</div>';
  return headerHTML;
};

const generateKOTBodySection = (body, saleData, kotSettings) => {
  if (!body.columns || !Array.isArray(body.columns)) return '';
  
  const enabledColumns = body.columns
    .filter(column => column.enabled)
    .sort((a, b) => a.position - b.position);
  
  if (enabledColumns.length === 0) return '';
  
  const fontSize = kotSettings.general?.fontSize || '13px';
  
  // Column configuration
  const columnConfig = {
    'productName': { align: 'left', template: '{{this.name}}', width: '40%' },
    'size': { align: 'left', template: '{{#if this.size}}{{this.size}}{{else}}-{{/if}}', width: '20%' },
    'quantity': { align: 'center', template: '{{this.quantity}}', width: '20%' },
    'subtotal': { align: 'right', template: '{{formatCurrency this.subtotal}}', width: '20%' }
  };
  
  let tableHTML = '<table class="table" style="width: 100%; border-collapse: collapse;">';
  
  // Table header
  tableHTML += '<thead><tr>';
  enabledColumns.forEach(col => {
    const config = columnConfig[col.name] || { align: 'left', width: '25%' };
    tableHTML += `<th style="text-align: ${config.align}; font-size: ${fontSize};">${col.label}</th>`;
  });
  tableHTML += '</tr></thead>';
  
  // Table body
  tableHTML += '<tbody>{{#each productsData}}<tr>';
  enabledColumns.forEach(col => {
    const config = columnConfig[col.name] || { align: 'left', template: '' };
    tableHTML += `<td style="text-align: ${config.align}; padding: 2px 0; font-size: ${fontSize};">${config.template}</td>`;
  });
  tableHTML += '</tr>{{/each}}</tbody>';
  
  // Table footer (spacer row)
  tableHTML += '<tfoot><tr><td colspan="' + enabledColumns.length + '" style="padding-top: 8px;"></td></tr></tfoot>';
  
  tableHTML += '</table>';
  return tableHTML;
};

const generateKOTFooterSection = (footer, saleData, kotSettings, settings) => {
  if (!footer.fields || !Array.isArray(footer.fields)) return '';
  
  const enabledFields = footer.fields
    .filter(field => field.enabled)
    .sort((a, b) => a.position - b.position);
  
  if (enabledFields.length === 0) return '';
  
  const fontSize = kotSettings.general?.fontSize || '13px';
  const currency = settings?.currency ? `${settings.currency} ` : '';
  
  let footerHTML = '<div style="margin-top: 10px;">';
  
  // Add table for footer fields
  footerHTML += '<table class="table" style="width: 100%; border-collapse: collapse;"><tfoot>';
  
  enabledFields.forEach(field => {
    switch (field.name) {
      case 'paymentStatus':
        footerHTML += `
          <tr>
            <td colspan="2" style="text-align: right; padding: 2px 0; font-size: 14px;">Payment Status</td>
            <td style="text-align: right; padding: 2px 0; font-size: 14px;">{{paymentStatus}}</td>
          </tr>
        `;
        break;
      case 'deliveryCharge':
        footerHTML += `
          {{#if shipping}}
          <tr>
            <td colspan="2" style="text-align: right; padding: 2px 0; font-size: 14px;">Delivery Charge</td>
            <td style="text-align: right; padding: 2px 0; font-size: 14px;">${currency}{{formatCurrency shipping}}</td>
          </tr>
          {{/if}}
        `;
        break;
      case 'subtotal':
        footerHTML += `
          {{#if subtotal}}
          <tr>
            <td colspan="2" style="text-align: right; padding: 2px 0; font-size: 14px;">Subtotal</td>
            <td style="text-align: right; padding: 2px 0; font-size: 14px;">${currency}{{formatCurrency subtotal}}</td>
          </tr>
          {{/if}}
        `;
        break;
      case 'note':
        footerHTML += `
          {{#if note}}
          <tr>
            <td colspan="3" style="margin-bottom: 10px; font-size: 14px; word-wrap: break-word; overflow-wrap: break-word;">
              <p style="margin-top: 3px; margin-bottom: 3px; font-size: 14px; white-space: pre-wrap; word-break: break-word;">
                <strong>Note: </strong>{{note}}
              </p>
            </td>
          </tr>
          {{/if}}
        `;
        break;
      case 'thankYou':
        footerHTML += `
          <tr>
            <td colspan="3" style="text-align: center; margin-top: 15px; font-size: 0.8em;">
              <p style="margin: 4px 0;">THANK YOU!</p>
            </td>
          </tr>
        `;
        break;
    }
  });
  
  footerHTML += '</tfoot></table></div>';
  return footerHTML;
};

module.exports = { generateKOTTemplate };
