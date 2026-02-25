import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import Loader from '../utill/Loader';

function ReceiptSettingsBody() {
  const [settings, setSettings] = useState({
    header: {
      enabled: true,
      fields: []
    },
    body: {
      enabled: true,
      columns: []
    },
    summary: {
      enabled: true,
      fields: []
    },
    footer: {
      enabled: true,
      customFields: []
    },
    general: {
      paperSize: '80mm',
      fontSize: '13px',
      fontFamily: 'Arial, sans-serif',
      margin: '10px',
      showSectionHeaders: true,
      compactMode: false
    },
     logoPath: '', // Add this
  logoUrl: '' 
  });

  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [activeTab, setActiveTab] = useState('general');
  const [logoPreview, setLogoPreview] = useState(null);
const [logoUploading, setLogoUploading] = useState(false);

  // Updated default field configurations to match your requirements
  const defaultHeaderFields = [
    // Company Info Part
    { name: 'logo', label: 'Logo', enabled: true, position: 1, section: 'company' },
    { name: 'companyName', label: 'Company Name', enabled: true, position: 2, section: 'company' },
    { name: 'companyAddress', label: 'Company Address', enabled: true, position: 3, section: 'company' },
    { name: 'companyMobile', label: 'Company Phone', enabled: true, position: 4, section: 'company' },
    { name: 'whatsappNumber', label: 'WhatsApp Number', enabled: false, position: 5, section: 'company' },
    { name: 'companyEmail', label: 'Company Email', enabled: false, position: 6, section: 'company' },

    // Sale Info Part
    { name: 'outlet', label: 'Outlet', enabled: false, position: 7, section: 'sale' },
    { name: 'cashier', label: 'Cashier', enabled: true, position: 8, section: 'sale' },
    { name: 'invoiceNumber', label: 'Invoice No', enabled: true, position: 9, section: 'sale' },
    { name: 'kot', label: 'KOT', enabled: false, position: 10, section: 'sale' },
    { name: 'date', label: 'Date and Time', enabled: true, position: 11, section: 'sale' },
    { name: 'customer', label: 'Customer', enabled: true, position: 12, section: 'sale' }
  ];


  const defaultBodyColumns = [
    { name: 'productName', label: 'Product', enabled: true, position: 1 },
    { name: 'productCode', label: 'Code', enabled: false, position: 2 },
    { name: 'size', label: 'Size (Variation)', enabled: true, position: 3 },
    { name: 'price', label: 'Price', enabled: true, position: 4 },
    { name: 'quantity', label: 'Purchased Quantity', enabled: true, position: 5 },
    { name: 'discount', label: 'Discount', enabled: false, position: 6 },
    { name: 'tax', label: 'Tax', enabled: false, position: 7 },
    { name: 'subtotal', label: 'Amount', enabled: true, position: 8 }
  ];

// In your frontend component, update the defaultSummaryFields:
const defaultSummaryFields = [
  { name: 'subtotal', label: 'Subtotal', enabled: true, position: 1 },
  { name: 'discount', label: 'Discount', enabled: true, position: 2 },
  { name: 'tax', label: 'Tax', enabled: true, position: 3 },
  { name: 'shipping', label: 'Shipping (Delivery Charge)', enabled: true, position: 4 },
  { name: 'serviceCharge', label: 'Service Charge', enabled: true, position: 5 },
  { name: 'paidAmount', label: 'Paid Amount', enabled: true, position: 6 },
  { name: 'balance', label: 'Balance', enabled: true, position: 7 },
  { name: 'paymentMethods', label: 'Payment Methods', enabled: true, position: 8 },
  { name: 'grandTotal', label: 'Grand Total', enabled: true, position: 9 },
];

  // Default footer custom fields
  const defaultFooterFields = [
    { id: 1, text: '***DINING TAKEAWAY AND DELIVERY SERVICES ARE AVAILABLE***', enabled: true, position: 1 },
    { id: 2, text: 'THANK YOU, COME AGAIN!', enabled: true, position: 2 }
  ];

  // Helper function to merge existing fields with default fields (adds new fields if missing)
  const mergeFields = (existingFields, defaultFields) => {
    // Get valid field names from defaults
    const validFieldNames = defaultFields.map(f => f.name);
    
    // Filter existing fields to only include valid ones
    const validExistingFields = existingFields.filter(f => validFieldNames.includes(f.name));
    
    const merged = [...validExistingFields];
    
    // Add any new default fields that don't exist in existing fields
    defaultFields.forEach(defaultField => {
      if (!merged.find(f => f.name === defaultField.name)) {
        merged.push(defaultField);
      }
    });
    
    // Sort by position
    return merged.sort((a, b) => a.position - b.position);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

useEffect(() => {
  // Use logoUrl from backend if available, otherwise construct from logoPath
  if (settings?.logoUrl) {
    setLogoPreview(settings.logoUrl);
  } else if (settings?.logoPath) {
    const baseUrl = process.env.REACT_APP_BASE_URL;
    setLogoPreview(`${baseUrl}/api/receipt-logo/${settings.logoPath.split('/').pop()}`);
  } else {
    setLogoPreview(null);
  }
}, [settings]);

  const fetchSettings = async () => {
  try {
    const { data } = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/getReceiptSettings`);
    
    if (data) {
      // Ensure fields have the section property when loading from backend
      const headerFields = data.header?.fields?.length ? data.header.fields.map(field => ({
        ...field,
        section: defaultHeaderFields.find(df => df.name === field.name)?.section || 'company'
      })) : defaultHeaderFields;

      const updatedSettings = {
        header: {
          enabled: data.header?.enabled ?? true,
          fields: headerFields
        },
        body: {
          enabled: data.body?.enabled ?? true,
          columns: data.body?.columns?.length 
            ? mergeFields(data.body.columns, defaultBodyColumns)
            : defaultBodyColumns
        },
        summary: {
          enabled: data.summary?.enabled ?? true,
          fields: data.summary?.fields?.length 
            ? mergeFields(data.summary.fields, defaultSummaryFields)
            : defaultSummaryFields
        },
        footer: {
          enabled: data.footer?.enabled ?? true,
          customFields: data.footer?.customFields?.length ? data.footer.customFields : defaultFooterFields,
          showBarcode: data.footer?.showBarcode ?? true,
          showSystemBy: data.footer?.showSystemBy ?? true
        },
        general: data.general || {
          paperSize: '80mm',
          fontSize: '13px',
          fontFamily: 'Arial, sans-serif',
          margin: '10px',
          showSectionHeaders: true,
          compactMode: false
        },
        // ADD THIS - Save logoPath from backend response
        logoPath: data.logoPath || '',
        logoUrl: data.logoUrl || ''
      };
      
      setSettings(updatedSettings);
    }
    setInitialized(true);
  } catch (error) {
    console.error('Error fetching settings:', error);
    toast.error('Error fetching receipt settings');
    setInitialized(true);
  }
};
  // Tab configuration
  const tabs = [
    { id: 'general', label: 'General', icon: '⚙️', description: 'Basic receipt settings' },
    { id: 'header', label: 'Header', icon: '📄', description: 'Header content and layout' },
    { id: 'body', label: 'Products Table', icon: '📦', description: 'Product columns display' },
    { id: 'summary', label: 'Summary', icon: '📊', description: 'Order summary fields' },
    { id: 'footer', label: 'Footer', icon: '📝', description: 'Footer content' }
  ];

  // Toggle entire section
  const toggleSection = (sectionName) => {
    setSettings(prev => ({
      ...prev,
      [sectionName]: {
        ...prev[sectionName],
        enabled: !prev[sectionName].enabled
      }
    }));
  };

  // Toggle individual field
  const toggleField = (sectionName, fieldIndex) => {
    setSettings(prev => ({
      ...prev,
      [sectionName]: {
        ...prev[sectionName],
        fields: prev[sectionName].fields.map((field, idx) =>
          idx === fieldIndex ? { ...field, enabled: !field.enabled } : field
        )
      }
    }));
  };

  // Toggle individual column in body
const toggleColumn = (columnIndex) => {
  setSettings(prev => {
    const currentColumn = prev.body.columns[columnIndex];
    const enabledColumnsCount = prev.body.columns.filter(col => col.enabled).length;
    
    // If trying to enable a column and already have 5 enabled, prevent it
    if (!currentColumn.enabled && enabledColumnsCount >= 5) {
      toast.warning('You can only enable up to 5 columns in the products table');
      return prev;
    }
    
    return {
      ...prev,
      body: {
        ...prev.body,
        columns: prev.body.columns.map((column, idx) =>
          idx === columnIndex ? { ...column, enabled: !column.enabled } : column
        )
      }
    };
  });
};

  // Handle logo upload
const handleLogoUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  // Validation
  if (file.size > 2 * 1024 * 1024) {
    toast.error('Logo file size should be less than 2MB');
    return;
  }
  
  if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type) || 
      !/\.(jpe?g|png)$/i.test(file.name)) {
    toast.error('Only JPG and PNG files are allowed. Please upload a valid image file.');
    return;
  }

  // Create preview
  const previewUrl = URL.createObjectURL(file);
  setLogoPreview(previewUrl);
  setLogoUploading(true);

  const formData = new FormData();
  formData.append('logo', file);
  
  try {
    const response = await axios.post(
      `${process.env.REACT_APP_BASE_URL}/api/uploadReceiptLogo`, 
      formData, 
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    
    // Update settings with new logo data from backend
    setSettings(prev => ({
      ...prev,
      logoPath: response.data.logoPath,
      logoUrl: response.data.logoUrl || `${process.env.REACT_APP_BASE_URL}/api/receipt-logo/${response.data.logoPath.split('/').pop()}`
    }));
    
    toast.success('Logo uploaded successfully!');
  } catch (error) {
    console.error('Error uploading logo:', error);
    toast.error('Error uploading logo');
    // Revert preview on error
    setLogoPreview(null);
  } finally {
    setLogoUploading(false);
  }
};
const handleRemoveLogo = async () => {
  if (!settings.logoPath) return;

  try {
    await axios.post(`${process.env.REACT_APP_BASE_URL}/api/removeReceiptLogo`);
    
    // Clear preview and update settings
    setLogoPreview(null);
    setSettings(prev => ({
      ...prev,
      logoPath: '',
      logoUrl: ''
    }));
    
    toast.success('Logo removed successfully!');
  } catch (error) {
    console.error('Error removing logo:', error);
    toast.error('Error removing logo');
  }
};
  // Add custom footer field
  const addFooterField = () => {
    setSettings(prev => ({
      ...prev,
      footer: {
        ...prev.footer,
        customFields: [
          ...prev.footer.customFields,
          {
            id: Date.now(),
            text: '',
            enabled: true,
            position: prev.footer.customFields.length + 1
          }
        ]
      }
    }));
  };

  // Update footer field text
  const updateFooterField = (index, text) => {
    setSettings(prev => ({
      ...prev,
      footer: {
        ...prev.footer,
        customFields: prev.footer.customFields.map((field, idx) =>
          idx === index ? { ...field, text } : field
        )
      }
    }));
  };

  // Toggle footer field
  const toggleFooterField = (index) => {
    setSettings(prev => ({
      ...prev,
      footer: {
        ...prev.footer,
        customFields: prev.footer.customFields.map((field, idx) =>
          idx === index ? { ...field, enabled: !field.enabled } : field
        )
      }
    }));
  };

  // Remove footer field
  const removeFooterField = (index) => {
    setSettings(prev => ({
      ...prev,
      footer: {
        ...prev.footer,
        customFields: prev.footer.customFields.filter((_, idx) => idx !== index)
      }
    }));
  };

  // Toggle barcode display
  const toggleBarcode = () => {
    setSettings(prev => ({
      ...prev,
      footer: {
        ...prev.footer,
        showBarcode: !prev.footer.showBarcode
      }
    }));
  };

  // Toggle "System by IDEAZONE" display
  const toggleSystemBy = () => {
    setSettings(prev => ({
      ...prev,
      footer: {
        ...prev.footer,
        showSystemBy: !prev.footer.showSystemBy
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(
        `${process.env.REACT_APP_BASE_URL}/api/createOrUpdateReceiptSettings`, 
        settings
      );
      toast.success('Receipt settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Error saving receipt settings');
    } finally {
      setLoading(false);
    }
  };

  if (!initialized) {
    return (
      <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-white/80 z-50">
        <Loader />
      </div>
    );
  }

  // Group header fields by section
  const companyInfoFields = settings.header.fields.filter(field => field.section === 'company');
  const saleInfoFields = settings.header.fields.filter(field => field.section === 'sale');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b ml-72 pt-24">
        <div className="px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Receipt Settings</h1>
              <p className="text-gray-600 mt-1">Customize your 80mm thermal receipt layout and content</p>
            </div>
            <Link 
              to="/dashboard"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              ← Back to Dashboard
            </Link>
          </div>

          {/* Tabs Navigation */}
          <div className="mt-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8 overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-submit text-submit'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-lg">{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative left-[18%] w-[82%] px-8 py-8">
        <form onSubmit={handleSubmit}>
          {/* General Settings Tab */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">General Settings</h2>
                    <p className="text-gray-600">Configure basic receipt appearance and behavior</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Paper Size</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          value="80mm" 
                          disabled 
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 font-medium"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <span className="text-gray-400 text-xl">📏</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Fixed size for thermal printer compatibility</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Font Size</label>
                      <select 
                        value={settings.general.fontSize}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          general: { ...prev.general, fontSize: e.target.value }
                        }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-submit focus:border-transparent"
                      >
                        <option value="12px">Small (12px) - Compact</option>
                        <option value="13px">Medium (13px) - Recommended</option>
                        <option value="14px">Large (14px) - Readable</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700">Show Section Headers</label>
                        <p className="text-xs text-gray-500 mt-1">Display section titles like "Header", "Products", etc.</p>
                      </div>
                      <ToggleSwitch 
                        enabled={settings.general.showSectionHeaders}
                        onChange={() => setSettings(prev => ({
                          ...prev,
                          general: { ...prev.general, showSectionHeaders: !prev.general.showSectionHeaders }
                        }))}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700">Compact Mode</label>
                        <p className="text-xs text-gray-500 mt-1">Reduce spacing to fit more content on the receipt</p>
                      </div>
                      <ToggleSwitch 
                        enabled={settings.general.compactMode}
                        onChange={() => setSettings(prev => ({
                          ...prev,
                          general: { ...prev.general, compactMode: !prev.general.compactMode }
                        }))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Header Settings Tab */}
          {activeTab === 'header' && (
            <SectionCard 
              title="Header Section"
              description="Configure what information appears in the receipt header"
              enabled={settings.header.enabled}
              onToggle={() => toggleSection('header')}
              fieldCount={settings.header.fields.filter(f => f.enabled).length}
              totalFields={settings.header.fields.length}
            >
              <div className="space-y-6">
                {/* Company Info Section */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <span>🏢</span>
                    Company Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {companyInfoFields.map((field, index) => {
                      const globalIndex = settings.header.fields.findIndex(f => f.name === field.name);
                      return (
                        <div key={field.name} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{field.icon}</span>
                            <span className="font-medium text-gray-800">{field.label}</span>
                          </div>
                          <ToggleSwitch 
                            enabled={field.enabled} 
                            onChange={() => toggleField('header', globalIndex)} 
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Sale Info Section */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <span>🧾</span>
                    Sale Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {saleInfoFields.map((field, index) => {
                      const globalIndex = settings.header.fields.findIndex(f => f.name === field.name);
                      return (
                        <div key={field.name} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{field.icon}</span>
                            <span className="font-medium text-gray-800">{field.label}</span>
                          </div>
                          <ToggleSwitch 
                            enabled={field.enabled} 
                            onChange={() => toggleField('header', globalIndex)} 
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Logo Upload Section (only for logo field) */}
   {/* Logo Upload Section (only for logo field) */}
{companyInfoFields.find(field => field.name === 'logo' && field.enabled) && (
  <div className="bg-gray-50 rounded-lg p-4">
    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
      <span>🖼️</span>
      Logo Settings
    </h3>
    
    <div className="space-y-4">
      {/* Logo Preview */}
      {logoPreview && (
        <div className="flex flex-col items-center p-4 bg-white rounded-lg border">
          <div className="mb-3 text-sm font-medium text-gray-700">Current Logo</div>
          <div className="w-32 h-32 rounded-full border-2 border-dashed border-gray-300 overflow-hidden flex items-center justify-center bg-white shadow-sm">
            <img 
              src={logoPreview} 
              alt="Receipt Logo" 
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback if image fails to load
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div className="hidden w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
              <span className="text-sm">Logo</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemoveLogo}
            disabled={logoUploading}
            className="mt-3 px-4 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Remove Logo
          </button>
        </div>
      )}

      {/* Upload Section */}
      <div className="p-4 bg-white rounded-lg border">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          {logoPreview ? 'Change Logo' : 'Upload Logo'}
        </label>
        
        <div className="flex items-center gap-4">
          <label className={`flex-1 cursor-pointer ${logoUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <input
              type="file"
              accept=".jpg,.jpeg,.png"
              onChange={handleLogoUpload}
              disabled={logoUploading}
              className="hidden"
            />
            <div className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-submit hover:bg-submit/5 transition-colors text-center">
              {logoUploading ? (
                <div className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-submit" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-submit font-medium">Uploading...</span>
                </div>
              ) : (
                <div className="text-gray-600">
                  <div className="font-medium">Click to browse</div>
                  <div className="text-xs mt-1">PNG, JPG, SVG • Max 2MB</div>
                </div>
              )}
            </div>
          </label>
        </div>
        
        <p className="text-xs text-gray-500 mt-2">
          Recommended: Circular image • 300x300px • Transparent background works best
        </p>
        
        {/* Show current logo status */}
        {settings.logoPath && (
          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
            ✓ Logo is currently set and will appear on receipts
          </div>
        )}
      </div>
    </div>
    </div>
)}
  </div>
  </SectionCard>
)}
          {/* Body Settings Tab */}
{activeTab === 'body' && (
  <SectionCard 
    title="Products Table Columns"
    description="Choose which columns to display in the products table (Maximum 5 columns allowed)"
    enabled={settings.body.enabled}
    onToggle={() => toggleSection('body')}
    fieldCount={settings.body.columns.filter(c => c.enabled).length}
    totalFields={settings.body.columns.length}
  >
    {/* Show warning if 5 columns are selected */}
    {settings.body.columns.filter(c => c.enabled).length >= 5 && (
      <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-center gap-2 text-amber-800">
          <span className="text-lg">⚠️</span>
          <span className="text-sm font-medium">
            Maximum limit reached: You have selected 5 out of 5 allowed columns.
          </span>
        </div>
      </div>
    )}
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {settings.body.columns.map((column, index) => {
        const enabledCount = settings.body.columns.filter(c => c.enabled).length;
        const isDisabled = !column.enabled && enabledCount >= 5;
        
        return (
          <div 
            key={column.name} 
            className={`flex items-center justify-between p-4 rounded-lg border transition-all duration-200 ${
              isDisabled 
                ? 'border-gray-200 bg-gray-50 opacity-60' 
                : 'border-gray-200 bg-white hover:shadow-sm'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={`text-xl ${isDisabled ? 'text-gray-400' : 'text-gray-500'}`}>
                {column.icon}
              </span>
              <span className={`font-medium ${isDisabled ? 'text-gray-400' : 'text-gray-800'}`}>
                {column.label}
              </span>
              {isDisabled && (
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                  Limit reached
                </span>
              )}
            </div>
            <ToggleSwitch 
              enabled={column.enabled} 
              onChange={() => toggleColumn(index)}
              disabled={isDisabled}
            />
          </div>
        );
      })}
    </div>
  </SectionCard>
)}


          {/* Summary Settings Tab */}
          {activeTab === 'summary' && (
            <SectionCard 
              title="Summary Section"
              description="Configure which summary fields to display after products"
              enabled={settings.summary.enabled}
              onToggle={() => toggleSection('summary')}
              fieldCount={settings.summary.fields.filter(f => f.enabled).length}
              totalFields={settings.summary.fields.length}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {settings.summary.fields.map((field, index) => (
                  <div key={field.name} className="flex items-center justify-between p-4 rounded-lg border border-gray-200 bg-white hover:shadow-sm transition-all duration-200">
                    <div className="flex items-center gap-3">
                      <span className="text-xl text-gray-500">{field.icon}</span>
                      <span className="font-medium text-gray-800">{field.label}</span>
                    </div>
                    <ToggleSwitch enabled={field.enabled} onChange={() => toggleField('summary', index)} />
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Footer Settings Tab */}
          {activeTab === 'footer' && (
            <SectionCard 
              title="Footer Section"
              description="Add custom messages or information in the receipt footer"
              enabled={settings.footer.enabled}
              onToggle={() => toggleSection('footer')}
              fieldCount={settings.footer.customFields.filter(f => f.enabled).length + 
                         (settings.footer.showBarcode ? 1 : 0) + 
                         (settings.footer.showSystemBy ? 1 : 0)}
              totalFields={settings.footer.customFields.length + 2}
            >
              <div className="space-y-6">
                {/* Standard Footer Elements */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-3">Standard Elements</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">📊</span>
                        <div>
                          <div className="font-medium text-gray-800">Barcode</div>
                          <div className="text-sm text-gray-600">Show invoice barcode in receipt</div>
                        </div>
                      </div>
                      <ToggleSwitch 
                        enabled={settings.footer.showBarcode} 
                        onChange={toggleBarcode} 
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">💻</span>
                        <div>
                          <div className="font-medium text-gray-800">System by IDEAZONE</div>
                          <div className="text-sm text-gray-600">Show system credit line</div>
                        </div>
                      </div>
                      <ToggleSwitch 
                        enabled={settings.footer.showSystemBy} 
                        onChange={toggleSystemBy} 
                      />
                    </div>
                  </div>
                </div>

                {/* Custom Footer Fields */}
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Custom Messages</h3>
                  <div className="space-y-3">
                    {settings.footer.customFields.map((field, index) => (
                      <div key={field.id} className="flex items-center space-x-3 p-4 rounded-lg border border-gray-200 bg-white hover:shadow-sm transition-all duration-200">
                        <ToggleSwitch enabled={field.enabled} onChange={() => toggleFooterField(index)} />
                        <input
                          type="text"
                          value={field.text}
                          onChange={(e) => updateFooterField(index, e.target.value)}
                          placeholder="Enter footer text (e.g., Thank you for your business!)"
                          className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-submit focus:border-transparent"
                        />
                        <button
                          type="button"
                          onClick={() => removeFooterField(index)}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                          title="Remove field"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addFooterField}
                      className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-submit hover:text-submit transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Custom Footer Message
                    </button>
                  </div>
                </div>
              </div>
            </SectionCard>
          )}

          {/* Save Button */}
          <div className="mt-8 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="submit text-white px-8 py-3 rounded-lg hover:submit/90 disabled:bg-gray-400 font-semibold transition-colors min-w-[200px] flex items-center justify-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                'Save Receipt Settings'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const SectionCard = ({ title, description, enabled, onToggle, children, fieldCount, totalFields }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
    <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
          {description && <p className="text-gray-600 mt-1">{description}</p>}
        </div>
        
        <div className="flex items-center space-x-4">
          {fieldCount !== undefined && (
            <div className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full border">
              {fieldCount}/{totalFields} enabled
            </div>
          )}
          <div className="flex items-center space-x-3">
            <span className={`text-sm font-medium ${enabled ? 'text-green-600' : 'text-red-600'}`}>
              {enabled ? 'Enabled' : 'Disabled'}
            </span>
            <ToggleSwitch enabled={enabled} onChange={onToggle} />
          </div>
        </div>
      </div>
    </div>
    <div className="p-6">
      {children}
    </div>
  </div>
);

const ToggleSwitch = ({ enabled, onChange, disabled = false }) => (
  <button
    type="button"
    onClick={disabled ? undefined : onChange}
    disabled={disabled}
    className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-submit focus:ring-offset-1 ${
      disabled 
        ? 'bg-gray-200 cursor-not-allowed' 
        : enabled 
          ? 'submit' 
          : 'bg-gray-300'
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full shadow transition-transform ${
        disabled 
          ? 'bg-gray-300' 
          : 'bg-white'
      } ${
        enabled ? 'translate-x-5' : 'translate-x-1'
      }`}
    />
  </button>
);

export default ReceiptSettingsBody;