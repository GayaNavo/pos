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

export const handleFullScreen = () => {
    const elem = document.documentElement; // This will make the entire page full screen

    if (!document.fullscreenElement) {
        // Enter full screen mode
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.mozRequestFullScreen) { // For Firefox
            elem.mozRequestFullScreen();
        } else if (elem.webkitRequestFullscreen) { // For Chrome, Safari, and Opera
            elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) { // For IE/Edge
            elem.msRequestFullscreen();
        }
    } else {
        // Exit full screen mode
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) { // For Firefox
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) { // For Chrome, Safari, and Opera
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { // For IE/Edge
            document.msExitFullscreen();
        }
    }
};