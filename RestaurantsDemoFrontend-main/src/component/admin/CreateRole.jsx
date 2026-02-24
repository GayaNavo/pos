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

import { useState, useEffect } from 'react';
import '../../styles/role.css';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import Loader from '../utill/Loader';
import { FaLock, FaStore, FaBox, FaShoppingCart, FaTruck, FaExchangeAlt, FaDollarSign, FaTags, FaUndo, FaCashRegister, FaChartBar, FaCog } from 'react-icons/fa';

const CreateRoleBody = () => {
    // Define categories for permissions (same as backend structure)
    const permissionCategories = {
        manageProducts: ["create_product", "edit_product", "delete_product", "view_product", "view_product_popup"],
        manageBaseUnits: ["create_baseunit", "edit_baseunit", "delete_baseunit", "view_baseunit"],
        manageUnits: ["create_unit", "edit_unit", "delete_unit", "view_unit"],
        manageVariation: ["create_variation", "edit_variation", "delete_variation", "view_variation"],
        manageBrands: ["create_brand", "edit_brand", "delete_brand", "view_brand"],
        manageCategory: ["create_category", "edit_category", "delete_category", "view_category"],
        manageBarcodePrint: ["create_barcode", "print_barcode"],
        manageCustomers: ["create_customer", "import_customer", "edit_customer", "delete_customer", "view_customer"],
        manageUsers: ["create_user", "edit_user", "delete_user", "view_user"],
        manageSuppliers: ["create_supplier", "edit_supplier", "delete_supplier", "view_supplier", "import_supplier"],
        manageWarehouse: ["create_warehouse", "edit_warehouse", "delete_warehouse", "view_warehouse"],
        manageTransfer: ["create_transfer", "edit_transfer", "view_transfer", "delete_transfer", "view_transfer_popup"],
        manageSales: ["create_sale", "edit_sale", "view_sale", "delete_sale", "show_payment", "return_sale", "view_sl_popup", "print_sale"],
        manageSaleReturns: ["view_sl_return", "delete_sl_return", "edit_sl_return", "view_sl_return_popup"],
        manageStaffRefreshments: ["view_staff_refreshments"],
        managePurchases: ["create_purchase", "edit_purchase", "view_purchase", "delete_purchase", "return_purchase", "view_purchase_popup"],
        managePurchaseReturns: ["view_pur_return", "edit_pur_return", "delete_pur_return", "view_pur_return_popup"],
        manageQuotations: ["create_quotation", "edit_quotation", "view_quotation", "delete_quotation", "create_sl_quotation", "view_quotation_popup"],
        manageCurrency: ["create_currency", "edit_currency", "delete_currency", "view_currency"],
        manageOffers: ["create_offer", "edit_offer", "delete_offer", "view_offer", "assign_offer"],
        manageExpenses: ["create_expense", "edit_expense", "delete_expense", "view_expense"],
        manageExpensesCategory: ["create_exp_category", "edit_exp_category", "delete_exp_category", "view_exp_category"],
        manageRolesAndPermissions: ["create_role", "edit_role", "delete_role", "view_role"],
        manageReports: ["view_reports"],
        manageAdjustments: ["create_adjustment", "edit_adjustment", "view_adjustment", "delete_adjustment", "view_adjustment_popup"],
        manageLanguage: ["view_language"],
        manageSettings: ["view_settings"],
        manageMailSettings: ["view_mail_settings"],
        manageReceiptSettings: ["view_receipt_settings"],
        managePrefixesSettings: ["view_prefixes_settings"],
        managePOS: ["view_pos", "add_discount"],
        manageZbill: ["delete_zbill", "view_zbills"]
    };

    // Organized category sections for UI display with existing permissions
    const categorySections = [
        {
            id: 'userAccess',
            title: 'User & Access Management',
            icon: FaLock,
            groups: [
                {
                    name: 'Manage Roles',
                    category: 'manageRolesAndPermissions',
                    permissions: [
                        { key: 'create_role', label: 'Create Role' },
                        { key: 'edit_role', label: 'Edit Role' },
                        { key: 'delete_role', label: 'Delete Role' },
                        { key: 'view_role', label: 'View Role' },
                    ]
                },
                {
                    name: 'Manage Users',
                    category: 'manageUsers',
                    permissions: [
                        { key: 'create_user', label: 'Create User' },
                        { key: 'edit_user', label: 'Edit User' },
                        { key: 'delete_user', label: 'Delete User' },
                        { key: 'view_user', label: 'View User' },
                    ]
                },
                {
                    name: 'Manage Customers',
                    category: 'manageCustomers',
                    permissions: [
                        { key: 'create_customer', label: 'Create Customer' },
                        { key: 'edit_customer', label: 'Edit Customer' },
                        { key: 'delete_customer', label: 'Delete Customer' },
                        { key: 'view_customer', label: 'View Customer' },
                    ],
                    additionalPermissions: [
                        { key: 'import_customer', label: 'Import Customer' },
                    ]
                },
            ]
        },
        {
            id: 'businessSetup',
            title: 'Business Setup',
            icon: FaStore,
            groups: [
                {
                    name: 'Manage Brands',
                    category: 'manageBrands',
                    permissions: [
                        { key: 'create_brand', label: 'Create Brand' },
                        { key: 'edit_brand', label: 'Edit Brand' },
                        { key: 'delete_brand', label: 'Delete Brand' },
                        { key: 'view_brand', label: 'View Brand' },
                    ]
                },
                {
                    name: 'Manage Currency',
                    category: 'manageCurrency',
                    permissions: [
                        { key: 'create_currency', label: 'Create Currency' },
                        { key: 'edit_currency', label: 'Edit Currency' },
                        { key: 'delete_currency', label: 'Delete Currency' },
                        { key: 'view_currency', label: 'View Currency' },
                    ]
                },
                {
                    name: 'Manage Warehouse',
                    category: 'manageWarehouse',
                    permissions: [
                        { key: 'create_warehouse', label: 'Create Warehouse' },
                        { key: 'edit_warehouse', label: 'Edit Warehouse' },
                        { key: 'delete_warehouse', label: 'Delete Warehouse' },
                        { key: 'view_warehouse', label: 'View Warehouse' },
                    ]
                },
            ]
        },
        {
            id: 'productManagement',
            title: 'Product Management',
            icon: FaBox,
            groups: [
                {
                    name: 'Manage Products',
                    category: 'manageProducts',
                    permissions: [
                        { key: 'create_product', label: 'Create Product' },
                        { key: 'edit_product', label: 'Edit Product' },
                        { key: 'delete_product', label: 'Delete Product' },
                        { key: 'view_product', label: 'View Product' },
                    ],
                    additionalPermissions: [
                        { key: 'view_product_popup', label: 'View Product Details' },
                    ]
                },
                {
                    name: 'Manage Product Category',
                    category: 'manageCategory',
                    permissions: [
                        { key: 'create_category', label: 'Create Category' },
                        { key: 'edit_category', label: 'Edit Category' },
                        { key: 'delete_category', label: 'Delete Category' },
                        { key: 'view_category', label: 'View Category' },
                    ]
                },
                {
                    name: 'Manage Units',
                    category: 'manageUnits',
                    permissions: [
                        { key: 'create_unit', label: 'Create Unit' },
                        { key: 'edit_unit', label: 'Edit Unit' },
                        { key: 'delete_unit', label: 'Delete Unit' },
                        { key: 'view_unit', label: 'View Unit' },
                    ]
                },
                {
                    name: 'Manage Base Units',
                    category: 'manageBaseUnits',
                    permissions: [
                        { key: 'create_baseunit', label: 'Create Baseunit' },
                        { key: 'edit_baseunit', label: 'Edit Baseunit' },
                        { key: 'delete_baseunit', label: 'Delete Baseunit' },
                        { key: 'view_baseunit', label: 'View Baseunit' },
                    ]
                },
                {
                    name: 'Manage Variation',
                    category: 'manageVariation',
                    permissions: [
                        { key: 'create_variation', label: 'Create Variation' },
                        { key: 'edit_variation', label: 'Edit Variation' },
                        { key: 'delete_variation', label: 'Delete Variation' },
                        { key: 'view_variation', label: 'View Variation' },
                    ]
                },
            ]
        },
        {
            id: 'salesOperations',
            title: 'Sales Operations',
            icon: FaShoppingCart,
            groups: [
                {
                    name: 'Manage Sales',
                    category: 'manageSales',
                    permissions: [
                        { key: 'create_sale', label: 'Create Sale' },
                        { key: 'edit_sale', label: 'Edit Sale' },
                        { key: 'delete_sale', label: 'Delete Sale' },
                        { key: 'view_sale', label: 'View Sale' },
                    ],
                    additionalPermissions: [
                        { key: 'print_sale', label: 'Print Sale' },
                        { key: 'return_sale', label: 'Return Sale' },
                        { key: 'show_payment', label: 'Show Payment' },
                        { key: 'view_sl_popup', label: 'View Sale Details' },
                    ]
                },
                {
                    name: 'Manage Quotations',
                    category: 'manageQuotations',
                    permissions: [
                        { key: 'create_quotation', label: 'Create Quotation' },
                        { key: 'edit_quotation', label: 'Edit Quotation' },
                        { key: 'delete_quotation', label: 'Delete Quotation' },
                        { key: 'view_quotation', label: 'View Quotation' },
                    ],
                    additionalPermissions: [
                        { key: 'create_sl_quotation', label: 'Create Sale from Quotation' },
                        { key: 'view_quotation_popup', label: 'View Quotation Details' },
                    ]
                },
            ]
        },
        {
            id: 'reportsAnalytics',
            title: 'Reports & Analytics',
            icon: FaChartBar,
            groups: [
                {
                    name: 'Manage Reports',
                    category: 'manageReports',
                    permissions: [
                        { key: 'view_reports', label: 'View Reports' },
                    ]
                },
            ]
        },
        {
            id: 'purchaseManagement',
            title: 'Purchase Management',
            icon: FaTruck,
            groups: [
                {
                    name: 'Manage Purchases',
                    category: 'managePurchases',
                    permissions: [
                        { key: 'create_purchase', label: 'Create Purchase' },
                        { key: 'edit_purchase', label: 'Edit Purchase' },
                        { key: 'delete_purchase', label: 'Delete Purchase' },
                        { key: 'view_purchase', label: 'View Purchase' },
                    ],
                    additionalPermissions: [
                        { key: 'view_purchase_popup', label: 'View Purchase Details' },
                        { key: 'return_purchase', label: 'Return Purchase' },
                    ]
                },
                {
                    name: 'Manage Suppliers',
                    category: 'manageSuppliers',
                    permissions: [
                        { key: 'create_supplier', label: 'Create Supplier' },
                        { key: 'edit_supplier', label: 'Edit Supplier' },
                        { key: 'delete_supplier', label: 'Delete Supplier' },
                        { key: 'view_supplier', label: 'View Supplier' },
                    ],
                    additionalPermissions: [
                        { key: 'import_supplier', label: 'Import Supplier' },
                    ]
                },
            ]
        },
        {
            id: 'inventoryOperations',
            title: 'Inventory & Operations',
            icon: FaExchangeAlt,
            groups: [
                {
                    name: 'Manage Transfer',
                    category: 'manageTransfer',
                    permissions: [
                        { key: 'create_transfer', label: 'Create Transfer' },
                        { key: 'edit_transfer', label: 'Edit Transfer' },
                        { key: 'delete_transfer', label: 'Delete Transfer' },
                        { key: 'view_transfer', label: 'View Transfer' },
                    ],
                    additionalPermissions: [
                        { key: 'view_transfer_popup', label: 'View Transfer Details' },
                    ]
                },
                {
                    name: 'Manage Adjustments',
                    category: 'manageAdjustments',
                    permissions: [
                        { key: 'create_adjustment', label: 'Create Adjustment' },
                        { key: 'edit_adjustment', label: 'Edit Adjustment' },
                        { key: 'delete_adjustment', label: 'Delete Adjustment' },
                        { key: 'view_adjustment', label: 'View Adjustment' },
                    ],
                    additionalPermissions: [
                        { key: 'view_adjustment_popup', label: 'View Adjustment Details' },
                    ]
                },
            ]
        },
        {
            id: 'financialManagement',
            title: 'Financial Management',
            icon: FaDollarSign,
            groups: [
                {
                    name: 'Manage Expenses',
                    category: 'manageExpenses',
                    permissions: [
                        { key: 'create_expense', label: 'Create Expense' },
                        { key: 'edit_expense', label: 'Edit Expense' },
                        { key: 'delete_expense', label: 'Delete Expense' },
                        { key: 'view_expense', label: 'View Expense' },
                    ]
                },
                {
                    name: 'Manage Expenses Categories',
                    category: 'manageExpensesCategory',
                    permissions: [
                        { key: 'create_exp_category', label: 'Create Expenses Category' },
                        { key: 'edit_exp_category', label: 'Edit Expenses Category' },
                        { key: 'delete_exp_category', label: 'Delete Expenses Category' },
                        { key: 'view_exp_category', label: 'View Expenses Category' },
                    ]
                },
            ]
        },
        {
            id: 'marketingPromotions',
            title: 'Marketing & Promotions',
            icon: FaTags,
            groups: [
                {
                    name: 'Manage Offers',
                    category: 'manageOffers',
                    permissions: [
                        { key: 'create_offer', label: 'Create Offer' },
                        { key: 'edit_offer', label: 'Edit Offer' },
                        { key: 'delete_offer', label: 'Delete Offer' },
                        { key: 'view_offer', label: 'View Offer' },
                    ],
                    additionalPermissions: [
                        { key: 'assign_offer', label: 'Assign Offer' },
                    ]
                },
            ]
        },
        {
            id: 'manageReturns',
            title: 'Manage Returns',
            icon: FaUndo,
            groups: [
                {
                    name: 'Manage Purchase Returns',
                    category: 'managePurchaseReturns',
                    permissions: [
                        { key: 'edit_pur_return', label: 'Edit Purchase Return' },
                        { key: 'delete_pur_return', label: 'Delete Purchase Return' },
                        { key: 'view_pur_return', label: 'View Purchase Return' },
                    ],
                    additionalPermissions: [
                        { key: 'view_pur_return_popup', label: 'View Purchase Return Details' },
                    ]
                },
                {
                    name: 'Manage Sale Returns',
                    category: 'manageSaleReturns',
                    permissions: [
                        { key: 'edit_sl_return', label: 'Edit Sale Return' },
                        { key: 'delete_sl_return', label: 'Delete Sale Return' },
                        { key: 'view_sl_return', label: 'View Sale Return' },
                    ],
                    additionalPermissions: [
                        { key: 'view_sl_return_popup', label: 'View Sale Return Details' },
                    ]
                },
            ]
        },
        {
            id: 'posPrinting',
            title: 'Point of Sale & Printing',
            icon: FaCashRegister,
            groups: [
                {
                    name: 'Manage POS',
                    category: 'managePOS',
                    permissions: [
                        { key: 'view_pos', label: 'View POS' },
                    ],
                    additionalPermissions: [
                        { key: 'add_discount', label: 'Add Discount' },
                    ],
                    hasWarehouses: true
                },
                {
                    name: 'Manage Barcode Print',
                    category: 'manageBarcodePrint',
                    permissions: [
                        { key: 'create_barcode', label: 'Create Barcode' },
                        { key: 'print_barcode', label: 'Print Barcode' },
                    ]
                },
                {
                    name: 'Manage Z Bill',
                    category: 'manageZbill',
                    permissions: [
                        { key: 'view_zbills', label: 'View Z Bills' },
                        { key: 'delete_zbill', label: 'Delete Bill' },
                    ]
                },
            ]
        },
        {
            id: 'systemConfig',
            title: 'System & Configuration',
            icon: FaCog,
            groups: [
                {
                    name: 'Manage Language',
                    category: 'manageLanguage',
                    permissions: [
                        { key: 'view_language', label: 'View Language' },
                    ]
                },
                {
                    name: 'Manage Settings',
                    category: 'manageSettings',
                    permissions: [
                        { key: 'view_settings', label: 'View Settings' },
                    ]
                },
                {
                    name: 'Manage Mail Settings',
                    category: 'manageMailSettings',
                    permissions: [
                        { key: 'view_mail_settings', label: 'View Mail Settings' },
                    ]
                },
                {
                    name: 'Manage Receipt Settings',
                    category: 'manageReceiptSettings',
                    permissions: [
                        { key: 'view_receipt_settings', label: 'View Receipt Settings' },
                    ]
                },
                {
                    name: 'Manage Prefixes Settings',
                    category: 'managePrefixesSettings',
                    permissions: [
                        { key: 'view_prefixes_settings', label: 'View Prefixes Settings' },
                    ]
                },
            ]
        },
    ];

    // Initialize state with backend permission structure
    const [roleName, setRoleName] = useState('');
    const [permissions, setPermissions] = useState(() => {
        const initialPermissions = {};
        Object.entries(permissionCategories).forEach(([category, perms]) => {
            initialPermissions[category] = {};
            perms.forEach(perm => {
                initialPermissions[category][perm] = false;
            });
        });
        return initialPermissions;
    });
    const [progress, setProgress] = useState(false);
    const [error, setError] = useState('');
    const [responseMessage, setResponseMessage] = useState('');
    const [warehouseData, setWarehouseData] = useState([]);
    const [isKitchenRole, setIsKitchenRole] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchAllWarehouses = async () => {
            try {
                const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/fetchWarehouses`);
                setWarehouseData(response.data.warehouses || []);
            } catch (error) {
                console.error('Failed to fetch all warehouses:', error);
            }
        };
        fetchAllWarehouses();
    }, []);

    // Handle role name
    const handleRoleNameChange = (event) => {
        setRoleName(event.target.value);
    };

    // Handle permission change (using category_permission format)
    const handlePermissionChange = (event) => {
        const { name, checked } = event.target;
        const firstUnderscoreIndex = name.indexOf("_");
        const category = name.substring(0, firstUnderscoreIndex);
        const permission = name.substring(firstUnderscoreIndex + 1);
        
        // Preserve scroll position
        const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
        
        setPermissions((prevPermissions) => ({
            ...prevPermissions,
            [category]: {
                ...(prevPermissions[category] || {}),
                [permission]: checked,
            },
        }));

        // Restore scroll position using requestAnimationFrame for smoother update
        requestAnimationFrame(() => {
            window.scrollTo(0, scrollPosition);
        });
    };

    // Handle section select all
    const handleSectionSelectAll = (sectionId, checked) => {
        const section = categorySections.find(s => s.id === sectionId);
        if (!section) return;

        // Preserve scroll position
        const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;

        setPermissions(prevPermissions => {
            const updated = { ...prevPermissions };
            section.groups.forEach(group => {
                const category = group.category;
                if (!updated[category]) updated[category] = {};
                
                group.permissions.forEach(perm => {
                    updated[category][perm.key] = checked;
                });
                if (group.additionalPermissions) {
                    group.additionalPermissions.forEach(perm => {
                        updated[category][perm.key] = checked;
                    });
                }
            });
            return updated;
        });

        // Handle warehouse permissions if this is the POS section
        if (sectionId === 'posPrinting' && warehouseData.length > 0) {
            setPermissions(prev => ({
                ...prev,
                managePOS: {
                    ...prev.managePOS,
                    view_pos: checked,
                    warehouses: warehouseData.reduce((acc, warehouse) => {
                        acc[warehouse._id] = {
                            warehouseId: warehouse._id,
                            warehouseName: warehouse.name,
                            access: checked,
                            create_sale_from_pos: checked
                        };
                        return acc;
                    }, {})
                }
            }));
        }

        // Restore scroll position after state update
        requestAnimationFrame(() => {
            window.scrollTo(0, scrollPosition);
        });
    };

    // Check if all permissions in a section are selected
    const isSectionAllSelected = (sectionId) => {
        const section = categorySections.find(s => s.id === sectionId);
        if (!section) return false;

        return section.groups.every(group => {
            const category = group.category;
            const mainPermsSelected = group.permissions.every(perm => 
                permissions[category]?.[perm.key] === true
            );
            const additionalPermsSelected = group.additionalPermissions 
                ? group.additionalPermissions.every(perm => permissions[category]?.[perm.key] === true)
                : true;
            return mainPermsSelected && additionalPermsSelected;
        });
    };

    const handleWarehousePermissionChange = (event, warehouseId, permission) => {
        const { checked } = event.target;
        const normalizedPermission = permission.toLowerCase().replace(/\s+/g, "_");

        // Preserve scroll position
        const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;

        setPermissions((prev) => ({
            ...prev,
            managePOS: {
                ...prev.managePOS,
                warehouses: {
                    ...(prev.managePOS?.warehouses || {}),
                    [warehouseId]: {
                        ...(prev.managePOS?.warehouses?.[warehouseId] || {}),
                        [normalizedPermission]: checked,
                    },
                },
            },
        }));

        // Restore scroll position after state update
        requestAnimationFrame(() => {
            window.scrollTo(0, scrollPosition);
        });
    };

    // Handle submit
    const handleSubmit = (event) => {
        event.preventDefault();
        setError('');
        setResponseMessage('');
        setProgress(true);

        if (roleName.trim() === '') {
            setError('Please enter a role name.');
            setProgress(false);
            return;
        }

        // Check if at least one permission is selected (skip for kitchen role)
        if (!isKitchenRole) {
            const isPermissionSelected = Object.values(permissions).some(permissionGroup =>
                typeof permissionGroup === 'object' && 
                Object.values(permissionGroup).some(value => value === true)
            );

            if (!isPermissionSelected) {
                setError('Please select at least one permission for the role.');
                setProgress(false);
                return;
            }
        }

        // Build permissions object for backend
        const formattedPermissions = {};
        Object.entries(permissionCategories).forEach(([category, perms]) => {
            formattedPermissions[category] = {};
            perms.forEach(permission => {
                formattedPermissions[category][permission] = permissions[category]?.[permission] || false;
            });
        });

        // Handle warehouse permissions under managePOS
        if (permissions.managePOS?.warehouses) {
            formattedPermissions.managePOS = {
                ...formattedPermissions.managePOS,
                warehouses: {}
            };

            warehouseData.forEach((warehouse) => {
                const warehousePermissions = permissions.managePOS.warehouses[warehouse._id] || {};
                formattedPermissions.managePOS.warehouses[warehouse._id] = {
                    warehouseId: warehouse._id,
                    warehouseName: warehouse.name,
                    access: warehousePermissions.access || false,
                    create_sale_from_pos: warehousePermissions.create_sale_from_pos || false,
                };
            });
        }

        // Add kitchen role flag
        if (isKitchenRole) {
            formattedPermissions.isKitchenRole = true;
        }

        const roleData = {
            roleName: roleName.trim(),
            ...formattedPermissions,
        };

        axios.post(`${process.env.REACT_APP_BASE_URL}/api/createPermissions`, roleData)
            .then((response) => {
                toast.success("Role and permissions added successfully!", { autoClose: 2000, className: "custom-toast" });

                setTimeout(() => {
                    navigate("/viewRoleAndPermissions");
                }, 1000);

                setRoleName('');
                // Reset permissions
                const resetPermissions = {};
                Object.entries(permissionCategories).forEach(([category, perms]) => {
                    resetPermissions[category] = {};
                    perms.forEach(perm => {
                        resetPermissions[category][perm] = false;
                    });
                });
                setPermissions(resetPermissions);
            })
            .catch((err) => {
                let errorMessage = "An error occurred while adding the permissions. Please try again later.";

                if (err.response && err.response.data) {
                    if (err.response.data.message === 'Already exists this role') {
                        errorMessage = "Role already exists";
                    } else if (err.response.data.message) {
                        errorMessage = err.response.data.message;
                    }
                }
                toast.error(errorMessage, { autoClose: 2000, className: "custom-toast" });
            })
            .finally(() => {
                setProgress(false);
            });
    };

    const handleAllPermissionsChange = (event) => {
        const { checked } = event.target;

        // Preserve scroll position
        const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;

        setPermissions(prevPermissions => {
            const updatedPermissions = {};
            Object.entries(permissionCategories).forEach(([category, perms]) => {
                updatedPermissions[category] = {};
                perms.forEach(perm => {
                    updatedPermissions[category][perm] = checked;
                });
            });

            // Handle warehouse permissions
            updatedPermissions.managePOS = {
                ...updatedPermissions.managePOS,
                view_pos: checked,
                warehouses: warehouseData.reduce((acc, warehouse) => {
                    acc[warehouse._id] = {
                        warehouseId: warehouse._id,
                        warehouseName: warehouse.name,
                        access: checked,
                        create_sale_from_pos: checked
                    };
                    return acc;
                }, {})
            };

            return updatedPermissions;
        });

        // Restore scroll position after state update
        requestAnimationFrame(() => {
            window.scrollTo(0, scrollPosition);
        });
    };

    // Handle kitchen role toggle
    const handleKitchenRoleToggle = (checked) => {
        setIsKitchenRole(checked);
        if (checked) {
            // Clear all permissions when kitchen mode is ON
            const resetPermissions = {};
            Object.entries(permissionCategories).forEach(([category, perms]) => {
                resetPermissions[category] = {};
                perms.forEach(perm => {
                    resetPermissions[category][perm] = false;
                });
            });
            setPermissions(resetPermissions);
        }
    };

    // Handle clear
    const handleClear = () => {
        setRoleName('');
        setIsKitchenRole(false);
        const resetPermissions = {};
        Object.entries(permissionCategories).forEach(([category, perms]) => {
            resetPermissions[category] = {};
            perms.forEach(perm => {
                resetPermissions[category][perm] = false;
            });
        });
        setPermissions(resetPermissions);
        setError('');
    };

    // Permission checkbox component
    const PermissionCheckbox = ({ category, permKey, label }) => (
        <label className={`flex items-center gap-2 min-w-[140px] ${isKitchenRole ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
            <input
                type="checkbox"
                name={`${category}_${permKey}`}
                className="checkbox-custom"
                checked={permissions[category]?.[permKey] || false}
                onChange={handlePermissionChange}
                disabled={isKitchenRole}
            />
            <span className="text-sm text-gray-600">{label}</span>
        </label>
    );

    // Section component
    const PermissionSection = ({ section }) => {
        const Icon = section.icon;
        const allSelected = isSectionAllSelected(section.id);

        return (
            <div className="border border-gray-200 rounded-lg mb-6 overflow-hidden">
                {/* Section Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <Icon className="text-gray-600 text-lg" />
                        <h3 className="font-semibold text-gray-800">{section.title}</h3>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            className="checkbox-custom"
                            checked={allSelected}
                            onChange={(e) => handleSectionSelectAll(section.id, e.target.checked)}
                        />
                        <span className="text-sm text-gray-600">Select All</span>
                    </label>
                </div>

                {/* Section Content */}
                <div className="p-6">
                    {section.groups.map((group, groupIdx) => (
                        <div key={groupIdx} className={`${groupIdx > 0 ? 'mt-6 pt-6 border-t border-gray-100' : ''}`}>
                            <div className="flex flex-wrap items-start gap-4">
                                {/* Group Name */}
                                <div className="w-52 flex-shrink-0">
                                    <span className="font-medium text-gray-700">{group.name}</span>
                                </div>

                                {/* Permissions */}
                                <div className="flex flex-wrap gap-x-6 gap-y-3 flex-1">
                                    {group.permissions.map((perm, permIdx) => (
                                        <PermissionCheckbox
                                            key={permIdx}
                                            category={group.category}
                                            permKey={perm.key}
                                            label={perm.label}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Additional Permissions Row */}
                            {group.additionalPermissions && group.additionalPermissions.length > 0 && (
                                <div className="flex flex-wrap items-start gap-4 mt-3">
                                    <div className="w-52 flex-shrink-0"></div>
                                    <div className="flex flex-wrap gap-x-6 gap-y-3 flex-1">
                                        {group.additionalPermissions.map((perm, permIdx) => (
                                            <PermissionCheckbox
                                                key={permIdx}
                                                category={group.category}
                                                permKey={perm.key}
                                                label={perm.label}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Warehouse permissions for POS */}
                            {group.hasWarehouses && warehouseData.length > 0 && (
                                <div className="flex flex-wrap items-start gap-4 mt-4">
                                    <div className="w-52 flex-shrink-0"></div>
                                    <div className="flex-1">
                                        <div className="text-sm font-medium text-gray-600 mb-3">Create Sale from POS to</div>
                                        <div className="flex flex-wrap gap-4">
                                            {warehouseData.map((warehouse) => (
                                                <label key={warehouse._id} className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="checkbox-custom"
                                                        checked={permissions.managePOS?.warehouses?.[warehouse._id]?.create_sale_from_pos || false}
                                                        onChange={(e) => handleWarehousePermissionChange(e, warehouse._id, "create_sale_from_pos")}
                                                    />
                                                    <span className="text-sm text-gray-600">{warehouse.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className='background-white relative left-[18%] w-[82%] min-h-[100vh] p-5'>
            {progress && (
                <div className="fullscreen-loader">
                    <Loader />
                </div>
            )}

            {/* Header */}
            <div className='flex justify-between items-center mt-20'>
                <div>
                    <h2 className="text-lightgray-300 m-0 p-0 text-2xl">Create User Role</h2>
                </div>
                <div>
                    <Link 
                        className='px-4 py-1.5 border border-[#35AF87] text-[#35AF87] rounded-md transition-colors duration-300 hover:bg-[#35AF87] hover:text-white flex items-center gap-2' 
                        to={'/viewRoleAndPermissions'}
                    >
                        <span>↩</span>
                    </Link>
                </div>
            </div>

            {/* Main Content */}
            <div className="bg-white mt-[20px] w-full rounded-2xl px-8 shadow-md pb-10">
                <form onSubmit={handleSubmit}>
                    {/* Role Name Input */}
                    <div className="py-6 border-b border-gray-200">
                        <label htmlFor="roleName" className="block text-sm font-medium text-gray-900 mb-2 text-left">
                            Role Name <span className='text-red-500'>*</span>
                        </label>
                        <input
                            id="roleName"
                            className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#35AF87] focus:border-transparent"
                            type="text"
                            name="role"
                            placeholder="Enter the role name"
                            value={roleName}
                            onChange={handleRoleNameChange}
                        />
                    </div>

                    {/* Kitchen Display Login Toggle */}
                    <div className="py-4 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-xl">🍳</span>
                                <div>
                                    <span className="font-semibold text-gray-700">Kitchen Display Login</span>
                                    <p className="text-xs text-gray-400 mt-0.5">Enable this to make the role a kitchen-only role. After login, users will go directly to the Kitchen Display.</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleKitchenRoleToggle(!isKitchenRole)}
                                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 focus:outline-none ${
                                    isKitchenRole ? 'bg-[#44BC8D]' : 'bg-gray-300'
                                }`}
                            >
                                <span
                                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                                        isKitchenRole ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                />
                            </button>
                        </div>
                    </div>

                    {/* All Permissions Toggle */}
                    <div className={`py-4 border-b border-gray-200 ${isKitchenRole ? 'opacity-40 pointer-events-none' : ''}`}>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                id="checkbox-all"
                                name='allPermissions'
                                className="checkbox-custom"
                                onChange={handleAllPermissionsChange}
                                disabled={isKitchenRole}
                            />
                            <span className="font-semibold text-gray-700">Select All Permissions</span>
                        </label>
                    </div>

                    {/* Permission Sections */}
                    <div className={`py-6 ${isKitchenRole ? 'opacity-40 pointer-events-none' : ''}`}>
                        {categorySections.map((section) => (
                            <PermissionSection key={section.id} section={section} />
                        ))}
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex space-x-4 pt-6 border-t border-gray-200">
                        <button
                            type="submit"
                            className="button-bg-color button-bg-color:hover text-white rounded-md px-6 py-2 transition-colors duration-300 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-[#37b34a] focus:ring-offset-2"
                        >
                            Save
                        </button>
                        <button
                            type="button"
                            onClick={handleClear}
                            className="bg-gray-600 text-white rounded-md px-6 py-2 text-sm font-medium shadow-sm hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                        >
                            Clear
                        </button>
                    </div>
                </form>

                {/* Error and Response Messages */}
                <div className="mt-5">
                    {error && (
                        <p className="text-red-600 px-5 py-2 rounded-md bg-red-100 text-center mx-auto max-w-sm">
                            {error}
                        </p>
                    )}
                    {responseMessage && (
                        <p className="text-color px-5 py-2 rounded-md bg-green-100 text-center mx-auto max-w-sm">
                            {responseMessage}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CreateRoleBody;
