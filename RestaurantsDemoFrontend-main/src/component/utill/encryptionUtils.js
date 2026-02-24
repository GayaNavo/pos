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

// encryptionUtils.js
import CryptoJS from 'crypto-js';


const secretKey = 'zxcvb';

// Encrypt data
export const encryptData = (data) => {
  try {
      const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), secretKey).toString();
      return encrypted;
  } catch (error) {
      console.error('Error encrypting data:', error);
      throw error;
  }
};

export const decryptData = (cipherText) => {
  try {
      const bytes = CryptoJS.AES.decrypt(cipherText, secretKey);
      const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
      return JSON.parse(decryptedData);
  } catch (error) {
      console.error('Error decrypting data:', error);
      throw error;
  }
};
