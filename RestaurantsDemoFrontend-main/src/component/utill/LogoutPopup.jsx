import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const LogoutPopup = () => {
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const logoutFlag = localStorage.getItem("logoutRequired");

    if (logoutFlag === "true") {
      // Show popup
      setShowLogoutPopup(true);

      // Remove flag so popup only shows once
      localStorage.removeItem("logoutRequired");

      // Prevent browser back navigation during popup
      window.history.pushState(null, "", window.location.href);
      window.onpopstate = () => {
        window.history.pushState(null, "", window.location.href);
      };
    }
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('encryptedToken');
    sessionStorage.removeItem('isPOS');
    sessionStorage.removeItem('expirationTime');
    sessionStorage.removeItem('defaultWarehouse');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('currency');

    setShowLogoutPopup(false);
    navigate("/");
  };

  if (!showLogoutPopup) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-lg p-6 w-80 text-center">
        <h2 className="text-lg font-semibold mb-3">Re-login Required</h2>
        <p className="text-gray-600 mb-5">
          Your profile was updated successfully. Please log out and sign in again to continue.
        </p>
        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg w-full"
        >
          Log Out
        </button>
      </div>
    </div>
  );
};

export default LogoutPopup;
