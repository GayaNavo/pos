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

export const isValidMobileInput = (value) => {
    if (!/^\d*$/.test(value)) return false;
    if (value.length === 1 && value !== "0") return false;
    if (value.length > 10) return false;
    return true;
};


export const isAllowedKey = (key) => {
    const allowedKeys = [
        "Backspace",
        "Delete",
        "Tab",
        "ArrowLeft",
        "ArrowRight",
        "Enter",
        "Escape"
    ];
    return allowedKeys.includes(key) || /^[0-9]$/.test(key);
};
