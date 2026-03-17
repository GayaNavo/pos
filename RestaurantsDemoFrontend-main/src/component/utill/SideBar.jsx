import { useState, useEffect, useContext, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import '../../styles/sidebar.css';
import { HomeIcon, CubeIcon, ReceiptPercentIcon, GiftIcon, ShoppingBagIcon, TagIcon, CogIcon, DocumentChartBarIcon, ReceiptRefundIcon, ChartPieIcon, DocumentTextIcon, UserGroupIcon, UsersIcon, CubeTransparentIcon, FolderIcon, UserIcon, TruckIcon, BuildingStorefrontIcon, ArrowRightOnRectangleIcon, ShoppingCartIcon, CurrencyDollarIcon, AdjustmentsVerticalIcon, GlobeAltIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import ArrowIcon from '../../img/right-arrow (3).png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBarcode } from '@fortawesome/free-solid-svg-icons';
import { UserContext } from '../../context/UserContext';

const Sidebar = ({ items, sidebarHidden }) => {
  const { userData } = useContext(UserContext);
  const [isPeopleDropdownOpen, setPeopleDropdownOpen] = useState(false);
  const [peopleDropdownSearchOpen, setPeopleDropdownSearchOpen] = useState(false);
  const [isProductDropdownOpen, setProductDropdownOpen] = useState(false);
  const [productDropdownSearchOpen, setProductDropdownSearchOpen] = useState(false);
  const [isSaleDropdownOpen, setSaleDropdownOpen] = useState(false);
  const [saleDropdownSearchOpen, setSaleDropdownSearchOpen] = useState(false);
  const [isPurchaseDropdownOpen, setPurchaseDropdownOpen] = useState(false);
  const [purchaseDropdownSearchOpen, setPurchaseDropdownSearchOpen] = useState(false);
  const [isSettingsDropdownOpen, setSettingsDropdown] = useState(false);
  const [settingsDropdownSearchOpen, setSettingsDropdownSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const sidebarRef = useRef(null);
  const debounceTimeout = useRef(null);
  const [activeIndex, setActiveIndex] = useState(null);
  const [showLogoutModel, setShowLogoutModal] = useState(false);
  const [permissionData, setPermissionData] = useState({});

  // Map routes to activeIndex and their parent dropdown
  const routeToIndexMap = {
    '/dashboard': { index: 1, dropdown: null },
    '/viewProducts': { index: 2, dropdown: 'products' },
    // '/viewBaseUnit': { index: 3, dropdown: 'products' },
    '/viewUnit': { index: 4, dropdown: 'products' },
    '/viewVariation': { index: 5, dropdown: 'products' },
    '/viewBrands': { index: 6, dropdown: 'products' },
    '/viewCategory': { index: 7, dropdown: 'products' },
    '/barcodePrint': { index: 8, dropdown: 'products' },
    '/users': { index: 9, dropdown: 'people' },
    '/viewSuplier': { index: 10, dropdown: 'people' },
    '/viewWarehouse': { index: 11, dropdown: null },
    '/viewTransfer': { index: 12, dropdown: null },
    '/viewSale': { index: 13, dropdown: 'sale' },
    '/viewSaleReturns': { index: 14, dropdown: 'sale' },
    '/viewPurchase': { index: 15, dropdown: 'purchase' },
    '/viewPurchaseReturns': { index: 16, dropdown: 'purchase' },
    '/viewCustomers': { index: 17, dropdown: 'people' },
    '/viewQuotation': { index: 18, dropdown: null },
    '/viewCurrency': { index: 19, dropdown: null },
    '/viewRoleAndPermissions': { index: 21, dropdown: null },
    '/viewReport': { index: 22, dropdown: null },
    '/viewAdjustment': { index: 23, dropdown: null },
    // '/language': { index: 24, dropdown: null }, // Commented out in original code
    '/settings': { index: 25, dropdown: 'settings' },
    '/mailSettings': { index: 26, dropdown: 'settings' },
    '/receiptSettings': { index: 27, dropdown: 'settings' },
    '/kotSettings': { index: 30, dropdown: 'settings' },


    '/saleReturnsToSupplier': { index: 32, dropdown: 'sale' },
    '/zBillRecords': { index: 60, dropdown: null },
  };

  useEffect(() => {
    if (userData) {
      const permissions = userData?.permissions || {};
      const hasAnyPermission = (permissionKey) => {
        const subPermissions = permissions[permissionKey] || {};
        return Object.values(subPermissions).some(Boolean);
      };

      setPermissionData({
        manageProducts: hasAnyPermission('manageProducts'),
        // manageBaseUnits: hasAnyPermission('manageBaseUnits'),
        manageUnits: hasAnyPermission('manageUnits'),
        manageVariation: hasAnyPermission('manageVariation'),
        manageBrands: hasAnyPermission('manageBrands'),
        manageCategory: hasAnyPermission('manageCategory'),
        manageBarcodePrint: hasAnyPermission('manageBarcodePrint'),
        manageCustomers: hasAnyPermission('manageCustomers'),
        manageUsers: hasAnyPermission('manageUsers'),
        manageSuppliers: hasAnyPermission('manageSuppliers'),
        manageWarehouse: hasAnyPermission('manageWarehouse'),
        manageTransfer: hasAnyPermission('manageTransfer'),
        manageSales: hasAnyPermission('manageSales'),
        manageSaleReturns: hasAnyPermission('manageSaleReturns'),
        managePurchases: hasAnyPermission('managePurchases'),
        managePurchaseReturns: hasAnyPermission('managePurchaseReturns'),
        manageQuotations: hasAnyPermission('manageQuotations'),
        manageCurrency: hasAnyPermission('manageCurrency'),
        
        manageRolesAndPermissions: hasAnyPermission('manageRolesAndPermissions'),
        manageReports: hasAnyPermission('manageReports'),
        manageAdjustments: hasAnyPermission('manageAdjustments'),
        manageLanguage: hasAnyPermission('manageLanguage'),
        manageSettings: hasAnyPermission('manageSettings'),
        manageMailSettings: hasAnyPermission('manageMailSettings'),
        manageReceiptSettings: hasAnyPermission('manageReceiptSettings'),

        managePOS: hasAnyPermission('managePOS'),
        manageZbill: hasAnyPermission('manageZbill'),
      });
    }
  }, [userData]);

  // Update activeIndex and dropdown states based on current route
  useEffect(() => {
    const currentPath = location.pathname;
    const routeInfo = routeToIndexMap[currentPath] || { index: null, dropdown: null };
    const newActiveIndex = routeInfo.index;
    const dropdown = routeInfo.dropdown;

    // Update activeIndex
    setActiveIndex(newActiveIndex);
    sessionStorage.setItem('activeTab', newActiveIndex);

    // Reset all dropdowns to closed unless specified
    const resetDropdowns = () => {
      setProductDropdownOpen(false);
      setPeopleDropdownOpen(false);
      setSaleDropdownOpen(false);
      setPurchaseDropdownOpen(false);
      
      setSettingsDropdown(false);
      sessionStorage.setItem('isProductDropdownOpen', false);
      sessionStorage.setItem('isPeopleDropdownOpen', false);
      sessionStorage.setItem('isSaleDropdownOpen', false);
      sessionStorage.setItem('isPurchaseDropdownOpen', false);
      
      sessionStorage.setItem('isSettingsDropdownOpen', false);
    };

    // Open the relevant dropdown based on the route
    if (dropdown && !searchTerm) { // Only auto-open if no search is active
      resetDropdowns();
      if (dropdown === 'products') {
        setProductDropdownOpen(true);
        sessionStorage.setItem('isProductDropdownOpen', true);
      } else if (dropdown === 'people') {
        setPeopleDropdownOpen(true);
        sessionStorage.setItem('isPeopleDropdownOpen', true);
      } else if (dropdown === 'sale') {
        setSaleDropdownOpen(true);
        sessionStorage.setItem('isSaleDropdownOpen', true);
      } else if (dropdown === 'purchase') {
        setPurchaseDropdownOpen(true);
        sessionStorage.setItem('isPurchaseDropdownOpen', true);
      
      } else if (dropdown === 'settings') {
        setSettingsDropdown(true);
        sessionStorage.setItem('isSettingsDropdownOpen', true);
      }
    } else if (!searchTerm) {
      resetDropdowns();
    }
  }, [location.pathname, searchTerm]);

  // Load dropdown states from sessionStorage on mount
  useEffect(() => {
    const savedProductDropdownState = sessionStorage.getItem('isProductDropdownOpen');
    if (savedProductDropdownState !== null) {
      setProductDropdownOpen(savedProductDropdownState === 'true');
    }

    const savedPeopleDropdownState = sessionStorage.getItem('isPeopleDropdownOpen');
    if (savedPeopleDropdownState !== null) {
      setPeopleDropdownOpen(savedPeopleDropdownState === 'true');
    }

    const savedSaleDropdownState = sessionStorage.getItem('isSaleDropdownOpen');
    if (savedSaleDropdownState !== null) {
      setSaleDropdownOpen(savedSaleDropdownState === 'true');
    }

    const savedPurchaseDropdownState = sessionStorage.getItem('isPurchaseDropdownOpen');
    if (savedPurchaseDropdownState !== null) {
      setPurchaseDropdownOpen(savedPurchaseDropdownState === 'true');
    }

    const savedSettingsDropdownState = sessionStorage.getItem('isSettingsDropdownOpen');
    if (savedSettingsDropdownState !== null) {
      setSettingsDropdown(savedSettingsDropdownState === 'true');
    }
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      handleSearchSidebar(value);
    }, 200);
  };

  const PeopletoggleDropdown = () => {
    const newState = !isPeopleDropdownOpen;
    setPeopleDropdownOpen(newState);
    sessionStorage.setItem('isPeopleDropdownOpen', newState);
  };

  const ProductToggleDropdown = () => {
    const newState = !isProductDropdownOpen;
    setProductDropdownOpen(newState);
    sessionStorage.setItem('isProductDropdownOpen', newState);
  };

  const SaletoggleDropdown = () => {
    const newState = !isSaleDropdownOpen;
    setSaleDropdownOpen(newState);
    sessionStorage.setItem('isSaleDropdownOpen', newState);
  };

  const PurchasetoggleDropdown = () => {
    const newState = !isPurchaseDropdownOpen;
    setPurchaseDropdownOpen(newState);
    sessionStorage.setItem('isPurchaseDropdownOpen', newState);
  };

  const SettingsDropdown = () => {
    const newState = !isSettingsDropdownOpen;
    setSettingsDropdown(newState);
    sessionStorage.setItem('isSettingsDropdownOpen', newState);
  };

  const handleSearchSidebar = (query) => {
    const trimmedQuery = query.trim().toLowerCase();
    const allTabs = document.querySelectorAll('ul > li[id]');
    let peopleMatch = false;
    let productMatch = false;
    let saleMatch = false;
    let purchaseMatch = false;
    let settingsMatch = false;

    allTabs.forEach((tab) => {
      const tabText = tab.textContent.toLowerCase();
      if (trimmedQuery === '' || tabText.includes(trimmedQuery)) {
        tab.style.display = '';
        if (tab.closest('#peopleDropdownMenu')) peopleMatch = true;
        if (tab.closest('#productDropdownMenu')) productMatch = true;
        if (tab.closest('#saleDropdownMenu')) saleMatch = true;
        if (tab.closest('#purchaseDropdownMenu')) purchaseMatch = true;
        if (tab.closest('#settings')) settingsMatch = true;
      } else {
        tab.style.display = 'none';
      }
    });

    setPeopleDropdownSearchOpen(trimmedQuery !== '' && peopleMatch);
    setProductDropdownSearchOpen(trimmedQuery !== '' && productMatch);
    setSaleDropdownSearchOpen(trimmedQuery !== '' && saleMatch);
    setPurchaseDropdownSearchOpen(trimmedQuery !== '' && purchaseMatch);
    setSettingsDropdownSearchOpen(trimmedQuery !== '' && settingsMatch);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setIsSidebarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleClick = (index, path) => {
    setActiveIndex(index);
    sessionStorage.setItem('activeTab', index);
    navigate(path);
  };

  const handleLogout = () => {
    const cashRegisterID = sessionStorage.getItem('cashRegisterID');
    const cashierUsername = sessionStorage.getItem('cashierUsername');
    if (cashRegisterID && cashierUsername) {
      setShowLogoutModal(true);
    } else {
      performLogout();
    }
  };

  const performLogout = () => {
    sessionStorage.clear();
    navigate('/');
  };

  const handleConfirm = () => {
    setShowLogoutModal(false);
    performLogout();
  };

  const handleCancel = () => {
    setShowLogoutModal(false);
  };

  return (
    <aside
      className="sidebar-wrapper"
    >
      {/* Mobile Overlay */}
      <div 
        className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
      />
      {/* Mobile Hamburger Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="fixed top-20 left-4 z-50 sm:hidden bg-[#1F5F3B] text-white p-3 rounded-lg shadow-lg hover:bg-[#16452a] transition-colors"
        aria-label="Toggle Menu"
      >
        <svg 
          className="w-6 h-6" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          {isSidebarOpen ? (
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M6 18L18 6M6 6l12 12" 
            />
          ) : (
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4 6h16M4 12h16M4 18h16" 
            />
          )}
        </svg>
      </button>
      <div
        ref={sidebarRef}
        className={`sidebar overflow-y-auto scroll-container p-0 m-0 flex flex-col fixed left-0 bg-[#1F5F3B] border-r border-[#1F5F3B]/20 transition-transform duration-300 transform ${isSidebarOpen ? 'translate-x-0 sidebar-open mobile-open' : '-translate-x-full'
          } sm:translate-x-0 ${sidebarHidden ? 'md:translate-x-0' : ''}`}
      >
        {/* Sidebar Header with Hamburger and Title */}
        <div className="sidebar-header flex items-center justify-between px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            {/* Hamburger Icon for Desktop */}
            <button 
              onClick={toggleSidebar}
              className="hidden sm:flex items-center justify-center w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="Toggle Menu"
            >
              <svg 
                className="w-5 h-5 text-white" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 6h16M4 12h16M4 18h16" 
                />
              </svg>
            </button>
            <h2 className="text-xl text-white font-bold tracking-wide">Menu</h2>
          </div>
          {/* Close button for mobile */}
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="sm:hidden flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <svg 
              className="w-5 h-5 text-white" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M6 18L18 6M6 6l12 12" 
              />
            </svg>
          </button>
        </div>

        {/* Search Bar - More Visible */}
        <div className="px-4 py-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-[#D4AF37]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search menu..."
              value={searchTerm}
              onChange={handleInputChange}
              className="w-full pl-12 pr-4 py-3 bg-white/10 border-2 border-[#D4AF37]/40 rounded-xl text-white placeholder-white/60 focus:outline-none focus:border-[#D4AF37] focus:bg-white/15 focus:ring-2 focus:ring-[#D4AF37]/30 transition-all"
            />
          </div>
        </div>

        <ul className="list-none p-0 pb-20 m-0 px-2">

          {/* Dashboard Item */}
          <li
            id="dashboard"
            className="w-full flex p-0 m-0 items-center"
            onClick={() => handleClick(1, '/dashboard')}
          >
            <Link 
              to="/dashboard" 
              className={`w-full flex items-center px-4 py-3 rounded-xl transition-all ${activeIndex === 1 ? 'active text-[#1F5F3B]' : 'hover:bg-white/10'}`}
            >
              <HomeIcon className={`h-5 w-5 mr-3 flex-shrink-0 ${activeIndex === 1 ? 'text-[#1F5F3B]' : 'text-[#D4AF37]'}`} aria-hidden="true" />
              <span className="font-medium">Dashboard</span>
            </Link>
          </li>

          {/* Products Dropdown */}
          {permissionData.manageProducts && (
            <li id="products" className="dropdown rounded-sm flex items-center w-full p-0 m-0 cursor-pointer">
              <button
                onClick={ProductToggleDropdown}
                className="dropdown-toggle text-white hover:text-[#D4AF37] flex items-center w-full"
              >
                <span className="flex items-center text-white w-full hover:text-[#D4AF37]">
                  <ShoppingBagIcon className="h-6 w-6 text-[#D4AF37] mr-4" aria-hidden="true" />
                  Products
                </span>
                <span className="ml-auto" style={{ transformOrigin: 'center' }}>
                  <img
                    src={ArrowIcon}
                    className={`h-3 w-3 transition-transform duration-500 transform invert ${isProductDropdownOpen ? 'rotate-90' : ''
                      }`}
                    alt="arrow icon"
                    aria-hidden="true"
                  />
                </span>
              </button>
            </li>
          )}

          <ul
            className={`w-full dropdown-menu p-0 m-0 ${isProductDropdownOpen || productDropdownSearchOpen ? 'open' : ''}`}
            id="productDropdownMenu"
          >
            {permissionData.manageProducts && (
              <li id="products" className="rounded-sm w-full flex items-center space-x-2">
                <Link
                  to="/viewProducts"
                  className={`w-full flex items-center cursor-pointer space-x-2 p-2 rounded-lg transition-all ${activeIndex === 2 ? 'active text-[#1F5F3B]' : 'text-white hover:bg-white/10'}
                    }`}
                  onClick={() => handleClick(2, '/viewProducts')}
                >
                  <ShoppingBagIcon className="h-6 w-6 text-gray-500 mr-4" aria-hidden="true" />
                  Products
                </Link>
              </li>
            )}
            {/* {permissionData.manageBaseUnits && (
              <li id="products" className="rounded-sm w-full flex items-center space-x-2">
                <Link
                  to="/viewBaseUnit"
                  className={`w-full flex items-center cursor-pointer space-x-2 p-2 rounded-lg transition-all ${activeIndex === 3 ? 'active text-[#1F5F3B]' : 'text-white hover:bg-white/10'}
                    }`}
                  onClick={() => handleClick(3, '/viewBaseUnit')}
                >
                  <CubeIcon className="h-6 w-6 text-gray-500 mr-4" aria-hidden="true" />
                  Base units
                </Link>
              </li>
            )} */}
            {permissionData.manageUnits && (
              <li id="products" className="rounded-sm w-full flex items-center space-x-2">
                <Link
                  to="/viewUnit"
                  className={`w-full flex items-center cursor-pointer space-x-2 p-2 rounded-lg transition-all ${activeIndex === 4 ? 'active text-[#1F5F3B]' : 'text-white hover:bg-white/10'}
                    }`}
                  onClick={() => handleClick(4, '/viewUnit')}
                >
                  <CubeTransparentIcon className="h-6 w-6 text-gray-500 mr-4" aria-hidden="true" />
                  Units
                </Link>
              </li>
            )}
            {permissionData.manageVariation && (
              <li id="products" className="rounded-sm flex items-center space-x-2 w-full">
                <Link
                  to="/viewVariation"
                  className={`w-full flex items-center cursor-pointer p-2 rounded-lg transition-all ${activeIndex === 5 ? 'active text-[#1F5F3B]' : 'text-white hover:bg-white/10'}
                    }`}
                  onClick={() => handleClick(5, '/viewVariation')}
                >
                  <AdjustmentsVerticalIcon className="h-6 w-6 text-gray-500 mr-4" aria-hidden="true" />
                  Variation
                </Link>
              </li>
            )}
            {permissionData.manageBrands && (
              <li id="products" className="rounded-sm flex items-center space-x-2 w-full">
                <Link
                  to="/viewBrands"
                  className={`w-full flex items-center cursor-pointer p-2 rounded-lg transition-all ${activeIndex === 6 ? 'active text-[#1F5F3B]' : 'text-white hover:bg-white/10'}
                    }`}
                  onClick={() => handleClick(6, '/viewBrands')}
                >
                  <TagIcon className="h-6 w-6 text-gray-500 mr-4" aria-hidden="true" />
                  Brands
                </Link>
              </li>
            )}
            {permissionData.manageCategory && (
              <li id="products" className="rounded-sm flex items-center space-x-2 w-full">
                <Link
                  to="/viewCategory"
                  className={`w-full flex items-center cursor-pointer p-2 rounded-lg transition-all ${activeIndex === 7 ? 'active text-[#1F5F3B]' : 'text-white hover:bg-white/10'}
                    }`}
                  onClick={() => handleClick(7, '/viewCategory')}
                >
                  <FolderIcon className="h-6 w-6 text-gray-500 mr-4" aria-hidden="true" />
                  Category
                </Link>
              </li>
            )}
            {permissionData.manageBarcodePrint && (
              <li id="products" className="rounded-sm flex items-center space-x-2 w-full">
                <Link
                  to="/barcodePrint"
                  className={`w-full flex items-center cursor-pointer p-2 rounded-lg transition-all ${activeIndex === 8 ? 'active text-[#1F5F3B]' : 'text-white hover:bg-white/10'}
                    }`}
                  onClick={() => handleClick(8, '/barcodePrint')}
                >
                  <FontAwesomeIcon icon={faBarcode} className="ml-[2px] h-5 w-5 text-gray-500 mr-4" />
                  Barcode Print
                </Link>
              </li>
            )}
          </ul>

          {/* People Dropdown */}
          {permissionData.manageCustomers && (
            <li id="users" className="dropdown w-full rounded-[2px]">
              <button
                onClick={PeopletoggleDropdown}
                className="dropdown-toggle text-gray hover:text-gray-700 w-full flex items-center p-2 space-x-2 cursor-pointer"
              >
                <span className="text-white flex items-center w-full">
                  <UserGroupIcon className="h-6 w-6 text-gray-500 mr-4" aria-hidden="true" />
                  People
                </span>
                <span className="ml-auto" style={{ transformOrigin: 'center' }}>
                  <img
                    src={ArrowIcon}
                    className={`h-3 w-3 transition-transform duration-500 transform text-gray-500 ${isPeopleDropdownOpen ? 'rotate-90' : ''
                      }`}
                    alt="arrow icon"
                    aria-hidden="true"
                  />
                </span>
              </button>
            </li>
          )}

          <ul
            className={`dropdown-menu ${isPeopleDropdownOpen || peopleDropdownSearchOpen ? 'open' : ''} w-full`}
            id="peopleDropdownMenu"
          >
            {permissionData.manageCustomers && (
              <li id="users" className="flex items-center w-full cursor-pointer rounded-sm">
                <Link
                  to="/viewCustomers"
                  className={`w-full flex items-center cursor-pointer p-2 rounded-lg transition-all ${activeIndex === 17 ? 'active text-[#1F5F3B]' : 'text-white hover:bg-white/10'}
                    }`}
                  onClick={() => handleClick(17, '/viewCustomers')}
                >
                  <UsersIcon className="h-6 w-6 text-gray-500 mr-4" aria-hidden="true" />
                  Customers
                </Link>
              </li>
            )}
            {permissionData.manageUsers && (
              <li id="users" className="flex items-center w-full cursor-pointer">
                <Link
                  to="/users"
                  className={`w-full flex items-center cursor-pointer p-2 rounded-lg transition-all ${activeIndex === 9 ? 'active text-[#1F5F3B]' : 'text-white hover:bg-white/10'}
                    }`}
                  onClick={() => handleClick(9, '/users')}
                >
                  <UserIcon className="h-6 w-6 text-gray-500 mr-4" aria-hidden="true" />
                  Users
                </Link>
              </li>
            )}
            {permissionData.manageSuppliers && (
              <li id="users" className="flex items-center w-full cursor-pointer rounded-sm">
                <Link
                  to="/viewSuplier"
                  className={`w-full flex items-center cursor-pointer p-2 rounded-lg transition-all ${activeIndex === 10 ? 'active text-[#1F5F3B]' : 'text-white hover:bg-white/10'}
                    }`}
                  onClick={() => handleClick(10, '/viewSuplier')}
                >
                  <TruckIcon className="h-6 w-6 text-gray-500 mr-4" aria-hidden="true" />
                  Suppliers
                </Link>
              </li>
            )}
          </ul>

          {/* Warehouse */}
          {permissionData.manageWarehouse && (
            <li id="warehouse" className="flex items-center w-full p-0 m-0 rounded-sm">
              <Link
                to="/viewWarehouse"
                className={`w-full flex items-center space-x-2 cursor-pointer p-2 rounded-lg transition-all ${activeIndex === 11 ? 'active text-[#1F5F3B]' : 'text-white hover:bg-white/10'}
                  }`}
                onClick={() => handleClick(11, '/viewWarehouse')}
              >
                <BuildingStorefrontIcon className="h-6 w-6 text-gray-500 mr-4" aria-hidden="true" />
                Warehouse
              </Link>
            </li>
          )}

          {/* Transfer */}
          {/* {permissionData.manageTransfer && (
            <li id="transfer" className="flex items-center w-full p-0 m-0 rounded-sm">
              <Link
                to="/viewTransfer"
                className={`w-full flex items-center space-x-2 cursor-pointer p-2 rounded-lg transition-all ${
                  activeIndex === 12 ? 'active text-[#1F5F3B]' : 'text-white hover:bg-white/10'
                }`}
                onClick={() => handleClick(12, '/viewTransfer')}
              >
                <ArrowRightOnRectangleIcon className="h-6 w-6 text-gray-500 mr-4" aria-hidden="true" />
                Transfer
              </Link>
            </li>
          )} */}

          {/* Sale Dropdown */}
          {permissionData.manageSales && (
            <li id="sale" className="dropdown flex items-center w-full p-0 m-0 cursor-pointer">
              <button
                onClick={SaletoggleDropdown}
                className="dropdown-toggle text-gray hover:text-gray-700 w-full flex items-center justify-between"
              >
                <span className="flex items-center text-white w-full">
                  <ShoppingCartIcon className="h-6 w-6 text-gray-500 mr-4" aria-hidden="true" />
                  Sale
                </span>
                <span className="ml-auto" style={{ transformOrigin: 'center' }}>
                  <img
                    src={ArrowIcon}
                    className={`h-3 w-3 transition-transform duration-500 transform text-gray-500 ${isSaleDropdownOpen ? 'rotate-90' : ''
                      }`}
                    alt="arrow icon"
                    aria-hidden="true"
                  />
                </span>
              </button>
            </li>
          )}

          <ul
            className={`rounded-sm w-full dropdown-menu p-0 m-0 ${isSaleDropdownOpen || saleDropdownSearchOpen ? 'open' : ''}`}
            id="saleDropdownMenu"
          >
            {permissionData.manageSales && (
              <li id="sale" className="flex items-center w-full p-0 m-0">
                <Link
                  to="/viewSale"
                  className={`w-full flex items-center cursor-pointer p-2 rounded-lg transition-all ${activeIndex === 13 ? 'active text-[#1F5F3B]' : 'text-white hover:bg-white/10'
                    }`}
                  onClick={() => handleClick(13, '/viewSale')}
                >
                  <ShoppingCartIcon className="h-6 w-6 text-gray-500 mr-4" aria-hidden="true" />
                  Sale
                </Link>
              </li>
            )}
            {permissionData.manageSaleReturns && (
              <li id="sale" className="rounded-sm flex items-center w-full p-0 m-0">
                <Link
                  to="/viewSaleReturns"
                  className={`w-full flex items-center cursor-pointer p-2 rounded-lg transition-all ${activeIndex === 14 ? 'active text-[#1F5F3B]' : 'text-white hover:bg-white/10'
                    }`}
                  onClick={() => handleClick(14, '/viewSaleReturns')}
                >
                  <ArrowRightOnRectangleIcon className="h-6 w-6 text-gray-500 mr-4" aria-hidden="true" />
                  Returns
                </Link>
              </li>
            )}
            {permissionData.managePurchaseReturns && (
              <li id="sale" className="rounded-sm flex items-center w-full p-0 m-0">
                <Link
                  to="/saleReturnsToSupplier"
                  className={`w-full flex items-center cursor-pointer p-2 rounded-lg transition-all ${activeIndex === 32 ? 'active text-[#1F5F3B]' : 'text-white hover:bg-white/10'
                    }`}
                  onClick={() => handleClick(32, '/saleReturnsToSupplier')}
                >
                  <ArrowRightOnRectangleIcon className="h-6 w-6 text-gray-500 mr-4" aria-hidden="true" />
                  Returns To Supplier
                </Link>
              </li>
            )}
          </ul>

          {/* Purchase Dropdown */}
          {permissionData.managePurchases && (
            <li id="purchase" className="rounded-sm dropdown flex items-center w-full p-0 m-0 cursor-pointer">
              <button
                onClick={PurchasetoggleDropdown}
                className="dropdown-toggle text-gray hover:text-gray-700 w-full flex items-center justify-between"
              >
                <span className="flex items-center text-white w-full">
                  <ShoppingCartIcon className="h-6 w-6 text-gray-500 mr-4" aria-hidden="true" />
                  Purchase
                </span>
                <span className="ml-auto" style={{ transformOrigin: 'center' }}>
                  <img
                    src={ArrowIcon}
                    className={`h-3 w-3 transition-transform duration-500 transform text-gray-500 ${isPurchaseDropdownOpen ? 'rotate-90' : ''
                      }`}
                    alt="arrow icon"
                    aria-hidden="true"
                  />
                </span>
              </button>
            </li>
          )}

          <ul
            className={`rounded-sm w-full dropdown-menu p-0 m-0 ${isPurchaseDropdownOpen || purchaseDropdownSearchOpen ? 'open' : ''}`}
            id="purchaseDropdownMenu"
          >
            {permissionData.managePurchases && (
              <li id="purchase" className="flex items-center w-full p-0 m-0">
                <Link
                  to="/viewPurchase"
                  className={`w-full flex items-center cursor-pointer p-2 rounded-lg transition-all ${activeIndex === 15 ? 'active text-[#1F5F3B]' : 'text-white hover:bg-white/10'
                    }`}
                  onClick={() => handleClick(15, '/viewPurchase')}
                >
                  <ShoppingCartIcon className="h-6 w-6 text-gray-500 mr-4" aria-hidden="true" />
                  Purchase
                </Link>
              </li>
            )}
            {permissionData.managePurchaseReturns && (
              <li id="purchase" className="rounded-sm flex items-center w-full p-0 m-0">
                <Link
                  to="/viewPurchaseReturns"
                  className={`w-full flex items-center cursor-pointer p-2 rounded-lg transition-all ${activeIndex === 16 ? 'active text-[#1F5F3B]' : 'text-white hover:bg-white/10'
                    }`}
                  onClick={() => handleClick(16, '/viewPurchaseReturns')}
                >
                  <ArrowRightOnRectangleIcon className="h-6 w-6 text-gray-500 mr-4" aria-hidden="true" />
                  Returns
                </Link>
              </li>
            )}
          </ul>

          {/* Quotation */}
          {permissionData.manageQuotations && (
            <li id="quotation" className="rounded-sm flex items-center space-x-2 w-full p-0 m-0 cursor-pointer">
              <Link
                to="/viewQuotation"
                className={`w-full flex items-center cursor-pointer p-2 rounded-lg transition-all ${activeIndex === 18 ? 'active text-[#1F5F3B]' : 'text-white hover:bg-white/10'
                  }`}
                onClick={() => handleClick(18, '/viewQuotation')}
              >
                <DocumentTextIcon className="h-6 w-6 text-gray-500 mr-4" aria-hidden="true" />
                Quotation
              </Link>
            </li>
          )}



          {/* Roles/Permissions */}
          {permissionData.manageRolesAndPermissions && (
            <li id="roles" className="rounded-sm flex items-center space-x-2 w-full p-0 m-0 cursor-pointer">
              <Link
                to="/viewRoleAndPermissions"
                className={`flex items-center w-full cursor-pointer p-2 rounded-lg transition-all ${activeIndex === 21 ? 'active text-[#1F5F3B]' : 'text-white hover:bg-white/10'
                  }`}
                onClick={() => handleClick(21, '/viewRoleAndPermissions')}
              >
                <ShieldCheckIcon className="h-6 w-6 text-gray-500 mr-4" aria-hidden="true" />
                Roles/Permissions
              </Link>
            </li>
          )}



          {/* Reports */}
          {permissionData.manageReports && (
            <li id="reports" className="rounded-sm flex items-center space-x-2 w-full p-0 m-0 cursor-pointer">
              <Link
                to="/viewReport"
                className={`flex items-center w-full cursor-pointer p-2 rounded-lg transition-all ${activeIndex === 22 ? 'active text-[#1F5F3B]' : 'text-white hover:bg-white/10'
                  }`}
                onClick={() => handleClick(22, '/viewReport')}
              >
                <DocumentChartBarIcon className="h-5 w-5 text-gray-500 mr-4" aria-hidden="true" />
                Reports
              </Link>
            </li>
          )}



          {/* Z Bill */}
          {permissionData.manageZbill && (
            <li id="zBill" className="rounded-sm flex items-center space-x-2 w-full p-0 m-0 cursor-pointer">
              <Link
                to="/zBillRecords"
                className={`flex items-center w-full cursor-pointer p-2 rounded-lg transition-all ${activeIndex === 60 ? 'active text-[#1F5F3B]' : 'text-white hover:bg-white/10'
                  }`}
                onClick={() => handleClick(60, '/zBillRecords')}
              >
                <ReceiptPercentIcon className="h-6 w-6 text-gray-500 mr-4" aria-hidden="true" />
                Z bill
              </Link>
            </li>
          )}

          {/* Settings Dropdown */}
          {permissionData.manageSettings && (
            <li id="settings" className="rounded-sm dropdown flex items-center space-x-2 w-full p-0 m-0 cursor-pointer">
              <button
                onClick={SettingsDropdown}
                className="dropdown-toggle text-gray hover:text-gray-700 flex items-center w-full justify-between"
              >
                <span className="text-white flex items-center space-x-2">
                  <CogIcon className="h-6 w-6 text-gray-500 mr-2" aria-hidden="true" />
                  <span>Settings</span>
                </span>
                <span className="ml-auto transform transition-transform duration-300">
                  <img
                    src={ArrowIcon}
                    className={`h-3 w-3 transition-transform duration-500 transform text-gray-500 ${isSettingsDropdownOpen ? 'rotate-90' : ''
                      }`}
                    alt="arrow icon"
                    aria-hidden="true"
                  />
                </span>
              </button>
            </li>
          )}

          <ul id="settings" className={`rounded-sm dropdown-menu ${isSettingsDropdownOpen || settingsDropdownSearchOpen ? 'open' : ''}`}>
            {permissionData.manageSettings && (
              <li className="flex items-center space-x-2">
                <Link
                  to="/settings"
                  className={`w-full flex items-center cursor-pointer p-2 rounded-lg transition-all ${activeIndex === 25 ? 'active text-[#1F5F3B]' : 'text-white hover:bg-white/10'
                    }`}
                  onClick={() => handleClick(25, '/settings')}
                >
                  <CogIcon className="h-6 w-6 mr-4 text-gray-500 group-hover:text-[#2a9d34]" aria-hidden="true" />
                  Settings
                </Link>
              </li>
            )}
            {permissionData.manageMailSettings && (
              <li id="settings" className="rounded-sm flex items-center space-x-2">
                <Link
                  to="/mailSettings"
                  className={`w-full flex items-center cursor-pointer p-2 rounded-lg transition-all ${activeIndex === 26 ? 'active text-[#1F5F3B]' : 'text-white hover:bg-white/10'
                    }`}
                  onClick={() => handleClick(26, '/mailSettings')}
                >
                  <CogIcon className="h-6 w-6 text-gray-500 mr-4" aria-hidden="true" />
                  Mail settings
                </Link>
              </li>
            )}
            {permissionData.manageReceiptSettings && (
              <li id="settings" className="rounded-sm flex items-center space-x-2">
                <Link
                  to="/receiptSettings"
                  className={`w-full flex items-center cursor-pointer p-2 rounded-lg transition-all ${activeIndex === 27 ? 'active text-[#1F5F3B]' : 'text-white hover:bg-white/10'
                    }`}
                  onClick={() => handleClick(27, '/receiptSettings')}
                >
                  <CogIcon className="h-6 w-6 text-gray-500 mr-4" aria-hidden="true" />
                  Receipt settings
                </Link>
              </li>
            )}


            {permissionData.manageReceiptSettings && (
              <li id="settings" className="rounded-sm flex items-center space-x-2">
                <Link
                  to="/kotSettings"
                  className={`w-full flex items-center cursor-pointer p-2 rounded-lg transition-all ${activeIndex === 30 ? 'active text-[#1F5F3B]' : 'text-white hover:bg-white/10'
                  }`}
                  onClick={() => handleClick(30, '/kotSettings')}
                >
                  <CogIcon
                    className="h-6 w-6 text-gray-500 mr-4"
                    aria-hidden="true"
                  />
                  KOT settings
                </Link>
              </li>
            )}




          </ul>

          {/* Logout */}
          <p id="logout" className="rounded-sm flex items-center space-x-2 w-full p-0 ml-2 cursor-pointer">
            <span
              onClick={handleLogout}
              className="text-white hover:text-[#D4AF37] flex items-center w-full cursor-pointer p-2 rounded-lg hover:bg-white/10 transition-all"
            >
              <ArrowRightOnRectangleIcon className="h-6 w-6 text-gray-500 mr-4" aria-hidden="true" />
              Logout
            </span>
          </p>
        </ul>
      </div>
      {showLogoutModel && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white w-[400px] h-[260px] p-8 rounded-xl shadow-lg flex flex-col justify-between">
            <div className="text-center">
              <h3 className="text-2xl text-gray-800 font-bold mb-2">Confirm Logout</h3>
              <p className="text-gray-800 text-base pt-6">Do you want to logout without closing the POS?</p>
            </div>
            <div className="flex justify-center space-x-4 mt-8">
              <button className="submit w-[100px] text-white px-4 py-2 rounded mr-2" onClick={handleConfirm}>
                Confirm
              </button>
              <button className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400 transition" onClick={handleCancel}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;