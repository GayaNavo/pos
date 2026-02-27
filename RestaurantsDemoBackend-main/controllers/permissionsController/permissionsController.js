

const { get } = require('mongoose');
const Permissions = require('../../models/rolesPermissionModel');
const Wherehouse = require('../../models/warehouseModel');
const CryptoJS = require('crypto-js');

//Create permissions
const createPermissions = async (req, res) => {
    const { roleName, ...permissions } = req.body;
    if (!roleName || typeof roleName !== "string") {
        return res.status(400).json({ status: "error", message: "Invalid or missing role name" });
    }

    if (!permissions || Object.keys(permissions).length === 0) {
        console.error("❌ Error: No permissions received");
        return res.status(400).json({ status: "error", message: "Permissions are required" });
    }

    if (permissions.managePOS?.warehouses) {
        // Iterate over each warehouse and process its sub-permissions
        await Promise.all(
            Object.entries(permissions.managePOS.warehouses).map(async ([warehouseId, warehousePermissions]) => {
                if (typeof warehousePermissions === "object") {

                    const warehouse = await Wherehouse.findById(warehouseId);
                    if (!warehouse) {
                        console.error(`❌ Error: Warehouse with ID ${warehouseId} not found`);
                        return; 
                    }

                    const warehouseName = warehouse.name; 

                    // Ensure we have valid sub-permissions
                    const validPermissions = Object.entries(warehousePermissions).reduce((acc, [perm, value]) => {
                        if (typeof value === "boolean") {
                            acc[perm] = value;
                        }
                        return acc;
                    }, {});

                    // Replace the warehouse object with validated permissions and add warehouse name
                    permissions.managePOS.warehouses[warehouseId] = {
                        warehouseId,     
                        warehouseName,   
                        access: warehousePermissions.access || false, 
                        ...validPermissions 
                    };
                }
            })
        );
    }

    const existingRole = await Permissions.findOne({ roleName });
    if (existingRole) {
        return res.status(400).json({ status: "error", message: "Already exists this role" });
    }
    try {
        const newPermissions = new Permissions({
            roleName,
            permissions: permissions,
        });

        await newPermissions.save();
        res.json({ status: "success" });
    } catch (error) {
        console.error("Permission not created", error);
        res.status(500).json({ message: "Server error", error });
    }
};


//Fetching permissions
const FetchingPermissions = async (req, res) => {
    const { acc } = req.query;
    const key1 = process.env.SUPER_ADMIN_KEY;
    const key2 = "be5&2N*alr%hJ-oG";

    try {
        // Basic validation
        if (!acc) {
            return res.status(400).json({ message: 'Authorization parameter (acc) is required' });
        }

        const size = parseInt(req.query.page?.size) || 10;
        const number = parseInt(req.query.page?.number) || 1;
        const offset = (number - 1) * size;
        const sort = req.query.sort || '';
        const queryOptions = req.query.page ? { skip: offset, limit: size, sort } : {};

        // Decryption with proper error handling
        let requestingUserRole;
        try {
            const firstDecryption = CryptoJS.AES.decrypt(acc, key2).toString(CryptoJS.enc.Utf8);
            requestingUserRole = CryptoJS.AES.decrypt(firstDecryption, key1).toString(CryptoJS.enc.Utf8);
        } catch (decryptError) {
            console.error('Decryption failed:', decryptError);
            return res.status(401).json({ message: 'Invalid authorization token' });
        }

        // Create base query filter with superAdmin exclusion if needed
        const filter = {};
        if (requestingUserRole !== 'superAdmin') {
            filter.roleName = { $ne: 'superAdmin' };
        }

        const [permissions, totalPermissions] = await Promise.all([
            Permissions.find(filter, null, queryOptions),
            Permissions.countDocuments(filter)
        ]);

        if (!permissions || permissions.length === 0) {
            return res.status(404).json({ message: 'No permissions found' });
        }

        const totalPages = Math.ceil(totalPermissions / size);

        const jobRoles = permissions.map(permission => ({
            id: permission._id,
            roleName: permission.roleName,
            permissions: Object.fromEntries(permission.permissions)
        }));

        const response = req.query.page
            ? {
                jobRoles,
                totalItems: totalPermissions,
                totalPages,
                currentPage: number,
                pageSize: size
            }
            : { jobRoles };

        res.json(response);
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({
            message: 'An error occurred while fetching permissions',
            error: error.message
        });
    }
};

// Find role
const FindRole = async (req, res) => {
    const { roleName, acc } = req.query;
    const key1 = process.env.SUPER_ADMIN_KEY
    const key2 = "be5&2N*alr%hJ-oG";

    if (!roleName) {
        return res.status(400).json({ message: 'Role name is required for search' });
    }

    try {
        let requestingUserRole = null;
        if (acc) {
            try {
                const firstDecryption = CryptoJS.AES.decrypt(acc, key2).toString(CryptoJS.enc.Utf8);
                requestingUserRole = CryptoJS.AES.decrypt(firstDecryption, key1).toString(CryptoJS.enc.Utf8);
            } catch (decryptError) {
                console.error('Decryption failed:', decryptError);
                return res.status(401).json({ message: 'Invalid authorization token' });
            }
        }

        const escapedRoleName = roleName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        let filter = {
            roleName: { 
                $regex: new RegExp(escapedRoleName, 'i')
            }
        };

        // Add superAdmin exclusion if needed
        if (requestingUserRole !== 'superAdmin') {
            filter.roleName.$ne = 'superAdmin';
        }

        const permissions = await Permissions.find(filter);

        if (!permissions || permissions.length === 0) {
            return res.status(404).json({ message: 'No permissions found' });
        }

        const result = permissions.map(permission => ({
            id: permission._id,
            roleName: permission.roleName,
            permissions: Object.fromEntries(permission.permissions)
        }));

        return res.status(200).json({
            status: "success",
            roles: result
        });
    } catch (error) {
        console.error('Error fetching permissions:', error);
        return res.status(500).json({
            status: "error",
            message: 'Internal server error',
            error: error.message
        });
    }
};


//Get details for Update
const findRoleForUpdate = async (req, res) => {
    const { id } = req.params;

    // Validate ID
    if (!id || id.length !== 24) {
        return res.status(400).json({ message: 'Invalid Role ID' });
    }
    try {
        const permission = await Permissions.findById(id);
        if (!permission) {
            return res.status(404).json({ message: 'Role not found' });
        }

        // Convert Map to object properly
        let permissionsData = permission.permissions instanceof Map
            ? Object.fromEntries(permission.permissions)
            : permission.permissions;

        // Process managePOS warehouses
        if (permissionsData?.managePOS?.warehouses) {

            const warehouseIds = Object.keys(permissionsData.managePOS.warehouses);

            // Fetch warehouse details from the database
            const warehouses = await Wherehouse.find({ _id: { $in: warehouseIds } });

            // Create a map of warehouse IDs to their names
            const warehouseMap = warehouses.reduce((acc, warehouse) => {
                acc[warehouse._id.toString()] = warehouse.name;
                return acc;
            }, {});

            // Map warehouse names back to the permissions object
            permissionsData.managePOS.warehouses = Object.entries(permissionsData.managePOS.warehouses).reduce(
                (acc, [warehouseId, warehousePermissions]) => {
                    acc[warehouseId] = {
                        warehouseId,
                        warehouseName: warehouseMap[warehouseId] || "Unknown Warehouse",
                        access: warehousePermissions.access || false,
                        ...warehousePermissions,
                    };
                    return acc;
                },
                {}
            );

        }
        res.status(200).json({
            _id: permission._id,
            roleName: permission.roleName,
            permissions: permissionsData,
            __v: permission.__v
        });

    } catch (error) {
        console.error('Error fetching job role by ID:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};


// Function to normalize permission keys
const normalizePermissionKey = (key) => key.toLowerCase().replace(/\s+/g, "_");

const updatePermissions = async (req, res) => {
    try {
        const { id, roleName, permissions } = req.body;
        const permission = await Permissions.findById(id);
        if (!permission) {
            return res.status(404).json({ message: 'Permission not found' });
        }

        if (roleName) {
            const existingRole = await Permissions.findOne({ roleName });
            if (existingRole && existingRole._id.toString() !== id) {
                return res.status(400).json({ message: 'Role name already in use' });
            }
            permission.roleName = roleName;
        }
        if (permissions) {
            const updatedPermissions = {};

            for (const [mainPermission, subPermissions] of Object.entries(permissions)) {
                updatedPermissions[mainPermission] = {};

                for (const [subPermission, value] of Object.entries(subPermissions)) {
                    // Normalize keys before storing them
                    const normalizedKey = normalizePermissionKey(subPermission);
                    updatedPermissions[mainPermission][normalizedKey] = value;
                }
            }

            // Process managePOS and warehouse permissions
            if (permissions.managePOS?.warehouses) {
                const warehouseIds = Object.keys(permissions.managePOS.warehouses);
                const warehouses = await Wherehouse.find({ _id: { $in: warehouseIds } });
                const warehouseMap = warehouses.reduce((acc, warehouse) => {
                    acc[warehouse._id.toString()] = warehouse.name;
                    return acc;
                }, {});

                updatedPermissions.managePOS.warehouses = {};

                for (const [warehouseId, warehousePermissions] of Object.entries(permissions.managePOS.warehouses)) {
                    updatedPermissions.managePOS.warehouses[warehouseId] = {
                        warehouseId,
                        warehouseName: warehouseMap[warehouseId] || "Unknown Warehouse",
                        access: warehousePermissions.access || false,
                    };

                    for (const [perm, value] of Object.entries(warehousePermissions)) {
                        const normalizedPerm = normalizePermissionKey(perm);
                        updatedPermissions.managePOS.warehouses[warehouseId][normalizedPerm] = value;
                    }
                }
            }
            permission.permissions = updatedPermissions;
        }
        await permission.save();
        res.status(200).json({ message: 'Permissions updated successfully' });
    } catch (error) {
        console.error('Error updating permissions:', error);
        res.status(500).json({ message: 'Server error' });
    }
};


//Delete the role
const DeleteRole = async (req, res) => {
    const { id } = req.params;
    try {
        const roleAndPermission = await Permissions.findByIdAndDelete(id);
        if (!roleAndPermission) {
            return res.status(404).json({ message: 'Role not found' });
        }
        res.status(200).json({ message: 'Successfully deleted the Role' });
    } catch (error) {
        console.error('Delete Role error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};


//newly added combine function
const getRole = async (req, res) => {
    const { id, roleName } = req.query;
    try {
        let roles;

        if (id) {
            roles = await Permissions.findById(id);
            if (!roles) {
                return res.status(404).json({ message: 'Role not found' });
            }
            roles = [roles];  
        } else if (roleName) {
            roles = await Permissions.find({ roleName: roleName });
            if (roles.length === 0) {
                return res.status(404).json({ message: 'No roles found for the specified name' });
            }
        } else {
            return res.status(400).json({ message: 'Please provide either an id or a roleName to search' });
        }
        const result = roles.map(role => ({
            roleName: role.roleName,
            permissions: Object.fromEntries(role.permissions)
        }));

        res.status(200).json({ data: result });
    } catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};


module.exports = { createPermissions, FetchingPermissions, DeleteRole, FindRole, findRoleForUpdate, updatePermissions, getRole };