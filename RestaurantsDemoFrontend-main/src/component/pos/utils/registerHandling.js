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

import axios from "axios";

export const handlePopupOpen = (setIsPopupOpen) => {
    setIsPopupOpen(true);
};

export const handlePopupClose = async (setIsPopupOpen, navigate) => {
    try {
        const id = sessionStorage.getItem('cashRegisterID');
        if (id) {
            const response = await axios.delete(`${process.env.REACT_APP_BASE_URL}/api/closeRegister/${id}`);
            if (response.status === 200) {
                sessionStorage.removeItem('cashRegisterID'); 
                navigate('/dashboard');
            }
        } else {
            alert("No cashRegisterID found in local storage.");
            console.error("No cashRegisterID found in local storage.");
        }
    } catch (error) {
        alert("Error closing the register.");
        console.error("Error closing the register:", error);
    } finally {
        setIsPopupOpen(false);
    }
};

