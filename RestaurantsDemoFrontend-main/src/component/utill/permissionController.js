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

const PermissionController = {
  hasPermission: (userPermissions, requiredPermissions) => {
      if (!requiredPermissions || requiredPermissions.length === 0) {
          return true; // If no permissions are required, allow access
      }
      return requiredPermissions.every((permission) =>
          userPermissions.includes(permission)
      );
  },
};

export default PermissionController;
