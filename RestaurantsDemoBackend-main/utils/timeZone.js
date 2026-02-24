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

const formatToSriLankaTime = (utcDate) => {
    if (!utcDate) return null;

    const date = new Date(utcDate);
    
    if (isNaN(date.getTime())) {
        console.error('Invalid date provided to formatToSriLankaTime:', utcDate);
        return null;
    }
    
    return {
        full: date.toLocaleString('en-GB', {
            timeZone: 'Asia/Colombo',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }),
        dateOnly: date.toLocaleDateString('en-GB', {
            timeZone: 'Asia/Colombo'
        }),
        timeOnly: date.toLocaleTimeString('en-GB', {
            timeZone: 'Asia/Colombo',
            hour12: false
        }),
        iso: date.toLocaleString('sv-SE', {
            timeZone: 'Asia/Colombo'
        }) 
    };
};

const getTodayColomboRange = () => {
    const now = new Date();
    const today = formatToSriLankaTime(now);

    // today.iso → "YYYY-MM-DD HH:mm:ss"
    const [datePart] = today.iso.split(" ");

    const startOfDayString = `${datePart}T00:00:00+05:30`;
    const endOfDayString = `${datePart}T23:59:59.999+05:30`;

    return {
        start: new Date(startOfDayString),
        end: new Date(endOfDayString),
    };
};

module.exports = { formatToSriLankaTime, getTodayColomboRange};