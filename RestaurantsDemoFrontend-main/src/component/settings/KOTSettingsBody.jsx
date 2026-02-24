/**
 * Copyright (c) 2025 Ideazone (Pvt) Ltd
 * Proprietary and Confidential
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import Loader from '../utill/Loader';

function KOTSettingsBody() {
  const [settings, setSettings] = useState({
    header: { enabled: true, fields: [] },
    body: { enabled: true, columns: [] },
    footer: { enabled: true, fields: [] },
    general: {
      paperSize: '80mm',
      fontSize: '13px',
      fontFamily: 'Arial, sans-serif',
      margin: '10px'
    },
    logoPath: '',
    logoUrl: ''
  });

  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoUploading, setLogoUploading] = useState(false);

  // Default field configurations
  const defaultHeaderFields = [
    { name: 'logo', label: 'Logo', enabled: true, position: 1 },
    { name: 'companyName', label: 'Company Name', enabled: true, position: 2 },
    { name: 'saleNumber', label: 'Sale No', enabled: true, position: 3 },
    { name: 'date', label: 'Date', enabled: true, position: 4 },
    { name: 'orderType', label: 'Order Type', enabled: true, position: 5 }
  ];

  const defaultBodyColumns = [
    { name: 'productName', label: 'Item', enabled: true, position: 1 },
    { name: 'size', label: 'Size', enabled: true, position: 2 },
    { name: 'quantity', label: 'Qty', enabled: true, position: 3 },
    { name: 'subtotal', label: 'Amount', enabled: true, position: 4 }
  ];

  const defaultFooterFields = [
    { name: 'paymentStatus', label: 'Payment Status', enabled: true, position: 1 },
    { name: 'deliveryCharge', label: 'Delivery Charge', enabled: true, position: 2 },
    { name: 'subtotal', label: 'Subtotal', enabled: true, position: 3 },
    { name: 'note', label: 'Note', enabled: true, position: 4 },
    { name: 'thankYou', label: 'Thank You Message', enabled: true, position: 5 }
  ];

  // Helper function to merge fields
  const mergeFields = (existingFields, defaultFields) => {
    const validFieldNames = defaultFields.map(f => f.name);
    const validExistingFields = existingFields.filter(f => validFieldNames.includes(f.name));
    const merged = [...validExistingFields];
    
    defaultFields.forEach(defaultField => {
      if (!merged.find(f => f.name === defaultField.name)) {
        merged.push(defaultField);
      }
    });
    
    return merged.sort((a, b) => a.position - b.position);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (settings?.logoUrl) {
      setLogoPreview(settings.logoUrl);
    } else if (settings?.logoPath) {
      const baseUrl = process.env.REACT_APP_BASE_URL;
      setLogoPreview(`${baseUrl}/api/kot-logo/${settings.logoPath.split('/').pop()}`);
    } else {
      setLogoPreview(null);
    }
  }, [settings]);

  const fetchSettings = async () => {
    try {
      const { data } = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/getKOTSettings`);
      
      const updatedSettings = {
        header: {
          enabled: data.header?.enabled ?? true,
          fields: data.header?.fields?.length
            ? mergeFields(data.header.fields, defaultHeaderFields)
            : defaultHeaderFields
        },
        body: {
          enabled: data.body?.enabled ?? true,
          columns: data.body?.columns?.length
            ? mergeFields(data.body.columns, defaultBodyColumns)
            : defaultBodyColumns
        },
        footer: {
          enabled: data.footer?.enabled ?? true,
          fields: data.footer?.fields?.length
            ? mergeFields(data.footer.fields, defaultFooterFields)
            : defaultFooterFields
        },
        general: data.general || {
          paperSize: '80mm',
          fontSize: '13px',
          fontFamily: 'Arial, sans-serif',
          margin: '10px'
        },
        logoPath: data.logoPath || '',
        logoUrl: data.logoUrl || ''
      };
      
      setSettings(updatedSettings);
      setInitialized(true);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Error fetching KOT settings');
      setInitialized(true);
    }
  };

  // Tab configuration
  const tabs = [
    { id: 'general', label: 'General', icon: '⚙️', description: 'Basic KOT settings' },
    { id: 'header', label: 'Header', icon: '📄', description: 'Header content' },
    { id: 'body', label: 'Products Table', icon: '📋', description: 'Product columns' },
    { id: 'footer', label: 'Footer', icon: '📌', description: 'Footer content' }
  ];

  // Toggle entire section
  const toggleSection = (sectionName) => {
    setSettings(prev => ({
      ...prev,
      [sectionName]: { ...prev[sectionName], enabled: !prev[sectionName].enabled }
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
    setSettings(prev => ({
      ...prev,
      body: {
        ...prev.body,
        columns: prev.body.columns.map((column, idx) =>
          idx === columnIndex ? { ...column, enabled: !column.enabled } : column
        )
      }
    }));
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

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (JPEG, PNG, etc.)');
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
        `${process.env.REACT_APP_BASE_URL}/api/uploadKOTLogo`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      setSettings(prev => ({
        ...prev,
        logoPath: response.data.logoPath,
        logoUrl: response.data.logoUrl || `${process.env.REACT_APP_BASE_URL}/api/kot-logo/${response.data.logoPath.split('/').pop()}`
      }));

      toast.success('Logo uploaded successfully!');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Error uploading logo');
      setLogoPreview(null);
    } finally {
      setLogoUploading(false);
    }
  };

  // Handle remove logo
  const handleRemoveLogo = async () => {
    if (!settings.logoPath) return;

    try {
      await axios.post(`${process.env.REACT_APP_BASE_URL}/api/removeKOTLogo`);
      
      setLogoPreview(null);
      setSettings(prev => ({ ...prev, logoPath: '', logoUrl: '' }));
      
      toast.success('Logo removed successfully!');
    } catch (error) {
      console.error('Error removing logo:', error);
      toast.error('Error removing logo');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${process.env.REACT_APP_BASE_URL}/api/createOrUpdateKOTSettings`, settings);
      toast.success('KOT settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Error saving KOT settings');
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b ml-72 pt-24">
        <div className="px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">KOT Settings</h1>
              <p className="text-gray-600 mt-1">Customize your 80mm thermal KOT layout and content</p>
            </div>
            <Link
              to="/dashboard"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>

          {/* Tabs Navigation */}
          <div className="mt-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8 overflow-x-auto">
                {tabs.map(tab => (
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

      {/* Main Content - Styles fixed to match Receipt Settings */}
      <div className="relative left-[18%] w-[82%] px-8 py-8">
        <form onSubmit={handleSubmit}>
          {/* General Settings Tab */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">General Settings</h2>
                    <p className="text-gray-600">Configure basic KOT appearance and behavior</p>
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
                          <span className="text-gray-400 text-xl">🔒</span>
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
                        <option value="12px">Small (12px - Compact)</option>
                        <option value="13px">Medium (13px - Recommended)</option>
                        <option value="14px">Large (14px - Readable)</option>
                      </select>
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
              description="Configure what information appears in the KOT header"
              enabled={settings.header.enabled}
              onToggle={() => toggleSection('header')}
              fieldCount={settings.header.fields.filter(f => f.enabled).length}
              totalFields={settings.header.fields.length}
            >
              <div className="space-y-6">
                {/* Header Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {settings.header.fields.map((field, index) => (
                    <div
                      key={field.name}
                      className="flex items-center justify-between p-3 bg-white rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-gray-800">{field.label}</span>
                      </div>
                      <ToggleSwitch
                        enabled={field.enabled}
                        onChange={() => toggleField('header', index)}
                      />
                    </div>
                  ))}
                </div>

                {/* Logo Upload Section */}
                {settings.header.fields.find(field => field.name === 'logo' && field.enabled) && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <span>🖼️</span> Logo Settings
                    </h3>
                    
                    <div className="space-y-4">
                      {/* Logo Preview */}
                      {logoPreview && (
                        <div className="flex flex-col items-center p-4 bg-white rounded-lg border">
                          <div className="mb-3 text-sm font-medium text-gray-700">Current Logo</div>
                          <div className="w-32 h-32 rounded-full border-2 border-dashed border-gray-300 overflow-hidden flex items-center justify-center bg-white shadow-sm">
                            <img
                              src={logoPreview}
                              alt="KOT Logo"
                              className="w-full h-full object-cover"
                              onError={(e) => {
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
                              accept="image/*"
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
                                  <div className="text-xs mt-1">PNG, JPG, SVG (Max 2MB)</div>
                                </div>
                              )}
                            </div>
                          </label>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          💡 Recommended: Circular image 300x300px. Transparent background works best
                        </p>
                        {settings.logoPath && (
                          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                            ✓ Logo is currently set and will appear on KOT
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
              description="Choose which columns to display in the KOT products table"
              enabled={settings.body.enabled}
              onToggle={() => toggleSection('body')}
              fieldCount={settings.body.columns.filter(c => c.enabled).length}
              totalFields={settings.body.columns.length}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {settings.body.columns.map((column, index) => (
                  <div
                    key={column.name}
                    className="flex items-center justify-between p-4 rounded-lg border border-gray-200 bg-white hover:shadow-sm transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-800">{column.label}</span>
                    </div>
                    <ToggleSwitch
                      enabled={column.enabled}
                      onChange={() => toggleColumn(index)}
                    />
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Footer Settings Tab */}
          {activeTab === 'footer' && (
            <SectionCard
              title="Footer Section"
              description="Configure footer information for KOT"
              enabled={settings.footer.enabled}
              onToggle={() => toggleSection('footer')}
              fieldCount={settings.footer.fields.filter(f => f.enabled).length}
              totalFields={settings.footer.fields.length}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {settings.footer.fields.map((field, index) => (
                  <div
                    key={field.name}
                    className="flex items-center justify-between p-4 rounded-lg border border-gray-200 bg-white hover:shadow-sm transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-800">{field.label}</span>
                    </div>
                    <ToggleSwitch
                      enabled={field.enabled}
                      onChange={() => toggleField('footer', index)}
                    />
                  </div>
                ))}
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
                'Save KOT Settings'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// SectionCard Component
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
    <div className="p-6">{children}</div>
  </div>
);

// ToggleSwitch Component
const ToggleSwitch = ({ enabled, onChange, disabled = false }) => (
  <button
    type="button"
    onClick={disabled ? undefined : onChange}
    disabled={disabled}
    className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-submit focus:ring-offset-1 ${
      disabled ? 'bg-gray-200 cursor-not-allowed' : enabled ? 'submit' : 'bg-gray-300'
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full shadow transition-transform ${
        disabled ? 'bg-gray-300' : 'bg-white'
      } ${enabled ? 'translate-x-5' : 'translate-x-1'}`}
    />
  </button>
);

export default KOTSettingsBody;
