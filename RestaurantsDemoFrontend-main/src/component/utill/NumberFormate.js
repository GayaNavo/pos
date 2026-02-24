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

export default function formatWithCustomCommas(number) {
    const [integerPart, decimalPart] = parseFloat(number).toFixed(2).split('.'); // Ensure 2 decimal places
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ','); // Add commas every 3 digits
    return `${formattedInteger}.${decimalPart}`; // Combine formatted integer part with decimal part
}
