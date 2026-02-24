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

import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { UserContext } from "../../context/UserContext";
import PermissionController from "../utill/permissionController";

const PermissionGuard = ({ children, requiredPermissions }) => {
  const { userData } = useContext(UserContext);

  if (!userData) {
    return <Navigate to="/" replace />;
  }

  // Extract all permissions (including sub-permissions)
  const userPermissions = Object.entries(userData.permissions || {}).reduce(
    (acc, [_, subPermissions]) => {
      return { ...acc, ...subPermissions };
    },
    {}
  );

  // Check if user has at least one required permission
  const hasRequiredPermission = requiredPermissions.some(
    (perm) => userPermissions[perm] === true
  );

  if (!hasRequiredPermission) {
    console.warn("Access Denied → Missing:", requiredPermissions);
    return <Navigate to="/access-denied" replace />;
  }
  return children;
};

export default PermissionGuard;
