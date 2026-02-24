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

import { useState, useEffect, useRef, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import Loader from '../utill/Loader';
import "../../styles/login.css";
import { read, utils } from "xlsx";
import PaginationDropdown from "../utill/Pagination";
import { toast } from "react-toastify";
import ConfirmationModal from "../common/deleteConfirmationDialog";
import { UserContext } from "../../context/UserContext";
import { useSidebar } from '../../context/SidebarContext';

function ViewSuplierBody() {
  // State variables
  const [suplierData, setSuplierData] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [searchedSuplier, setSearchedSuplier] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openPopup, setOpenPopup] = useState(false);
  const [excelData, setExcelData] = useState([]);
  const [error, setError] = useState("");
  const [successStatus, setSuccessStatus] = useState("");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState(null);
  const debounceTimeout = useRef(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [permissionData, setPermissionData] = useState({});
  const navigate = useNavigate();
  const { userData } = useContext(UserContext);
  const { sidebarHidden } = useSidebar();

  useEffect(() => {
    if (userData?.permissions) {
      console.log("UserData received in useEffect:", userData);

      setPermissionData(extractPermissions(userData.permissions));
    }
  }, [userData]);

  const extractPermissions = (permissions) => {
    let extractedPermissions = {};

    Object.keys(permissions).forEach((category) => {
      Object.keys(permissions[category]).forEach((subPermission) => {
        extractedPermissions[subPermission] = permissions[category][subPermission];
      });
    });

    return extractedPermissions;
  };

  const fetchSuplierData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_BASE_URL}/api/fetchSupplier`,
        {
          params: {
            sort: "-createdAt",
            "page[size]": size,
            "page[number]": page,
          },
        }
      );
      setSuplierData(response.data.suppliers);
      setSearchedSuplier(response.data.suppliers);
      setTotalPages(response.data.totalPages || 0);
      setKeyword('');
    } catch (error) {
      console.error("Fetch supplier data error:", error);
      setError("No suppliers found.");
      setSuplierData([]);
      setSearchedSuplier([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (keyword.trim() === '') {
      fetchSuplierData();
    }
  }, [keyword, page, size, refreshKey]);


  const handleNextPage = () => {
    if (page < totalPages) setPage((prev) => prev + 1);
  };

  const handlePrevPage = () => {
    if (page > 1) setPage((prev) => prev - 1);
  };

  const handleDelete = async (_id) => {
    try {
      await axios.delete(
        `${process.env.REACT_APP_BASE_URL}/api/DeleteSuplier/${_id}`
      );
      setSuplierData(suplierData.filter((supplier) => supplier._id !== _id));
      toast.success("Supplier deleted successfully!", { autoClose: 2000 });
      setRefreshKey(prevKey => prevKey + 1);
      fetchSuplierData('');
    } catch (error) {
      console.error("Delete supplier error:", error);
      toast.error("Error deleting supplier!", { autoClose: 2000 });
    }
  };

  const showConfirmationModal = (supplierId) => {
    setSupplierToDelete(supplierId);
    setIsModalOpen(true);
  };

  const searchSupplier = async (query) => {
    setLoading(true);
    setError("");

    try {
      if (!query.trim()) {
        setSearchedSuplier(suplierData);
        setSuccessStatus("");
        return;
      }

      const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/searchSupplier`, {
        params: { keyword: query },
      });

      if (response.data.suppliers && response.data.suppliers.length > 0) {
        setSearchedSuplier(response.data.suppliers);
        setSuccessStatus("");
      } else {
        setSearchedSuplier([]);
        setError("No suppliers found for the given query.");
      }
    } catch (error) {
      console.error("Search product error:", error);
      setSearchedSuplier([]);
      setError("No suppliers found for the given query.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setKeyword(value);

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      if (value.trim() === "") {
        setError("");
        setSuccessStatus("");
        setSearchedSuplier(suplierData);
      } else {
        searchSupplier(value);
      }
    }, 100);
  };

  const handleKeyDown = (e) => {
    const value = e.target.value;
    if (e.key === 'Backspace' && value === '') {
      setSearchedSuplier([]);
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = read(data, { type: "array" });
        if (workbook.SheetNames.length === 0) {
          throw new Error("Excel file has no sheets.");
        }

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData = utils.sheet_to_json(worksheet, { defval: "" });

        if (rawData.length === 0) {
          throw new Error("Excel sheet is empty.");
        }

        const formattedData = rawData.map((row, index) => {
          const cleaned = {};
          Object.keys(row).forEach((key) => {
            cleaned[key.trim().toLowerCase()] = String(row[key]).trim();
          });
          cleaned._rowNumber = index + 2;
          return cleaned;
        });

        const requiredRows = formattedData.filter((row) => row.name && row.mobile);
        if (requiredRows.length === 0) {
          throw new Error("No valid rows found (name and mobile are required).");
        }

        const validMobileRegex = /^0\d{9}$/;
        const invalidMobiles = requiredRows.filter(
          (sup) => !validMobileRegex.test(sup.mobile)
        );

        if (invalidMobiles.length > 0) {
          const invalidList = invalidMobiles
            .map((s) => `Row ${s._rowNumber}: ${s.name} (${s.mobile})`)
            .join(", ");
          toast.error(
            `Invalid mobile numbers detected: ${invalidList}`,
            { autoClose: 4000, className: "custom-toast" }
          );
          setExcelData([]);
          setError(`Invalid rows: ${invalidList}`);
          return;
        }

        // All valid
        setExcelData(requiredRows);
        setError(null);
        toast.success("File processed successfully.", {
          autoClose: 2000,
          className: "custom-toast",
        });
        console.log("Processed Supplier Data:", requiredRows);
      } catch (err) {
        console.error("Error processing supplier file:", err);
        setExcelData([]);
        setError(err.message);
        toast.error(`Error: ${err.message}`, {
          autoClose: 3000,
          className: "custom-toast",
        });
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleSave = async () => {
    setError("");
    setSuccessStatus("");

    if (!excelData || excelData.length === 0) {
      toast.error("No data to save. Please upload a valid file.", {
        autoClose: 2000,
        className: "custom-toast",
      });
      return;
    }

    try {
      //  Send data directly as JSON, not FormData
      const response = await axios.post(
        `${process.env.REACT_APP_BASE_URL}/api/importSuplier`,
        { suppliers: excelData }, // Send the parsed data
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status === 201) {
        toast.success("Suppliers imported successfully!", {
          autoClose: 2000,
          className: "custom-toast",
        });

        setTimeout(() => {
          navigate("/viewSuppliers");
        }, 2000);

        setExcelData([]);
        setOpenPopup(false);
        fetchSuplierData();
      }
    } catch (error) {
      setOpenPopup(false);
      const duplicates = error.response?.data?.duplicates || [];
      if (error.response?.data?.message === "Some suppliers already exist") {
        toast.error(
          `Supplier(s) already exist: ${JSON.stringify(duplicates)}`,
          { autoClose: 2500, className: "custom-toast" }
        );
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message, {
          autoClose: 2500,
          className: "custom-toast",
        });
      } else {
        toast.error("Failed to import suppliers. Please try again.", {
          autoClose: 2000,
          className: "custom-toast",
        });
      }
    }
  };

  const handleClosePopup = () => {
    setOpenPopup(false);
  };

  return (
    <div className={`relative background-white absolute top-[80px] min-h-[100vh] p-3 md:p-5 transition-all duration-300 ${sidebarHidden ? 'left-0 w-full' : 'left-0 w-full md:left-[220px] md:w-[calc(100vw-220px)] 2xl:left-[18%] 2xl:w-[82%]'}`}>
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 mb-4">
        <div className="relative w-full lg:w-auto">
          <form
            onSubmit={(e) => e.preventDefault()}
            className="flex items-center"
          >
            <input
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              name="keyword"
              type="text"
              placeholder="Search by supplier name"
              className="searchBox w-full lg:w-80 pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:border-transparent"
              value={keyword}
            />
            <button
              type="submit"
              className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400"
            >
              <svg
                className="h-5 w-5"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M9 3a6 6 0 100 12A6 6 0 009 3zm0-1a7 7 0 110 14A7 7 0 019 2z"
                  clipRule="evenodd"
                />
                <path
                  fillRule="evenodd"
                  d="M12.9 12.9a1 1 0 011.41 0l3 3a1 1 0 01-1.41 1.41l-3-3a1 1 0 010-1.41z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </form>
        </div>
        <div className="flex flex-row items-center gap-2 w-full lg:w-auto">
          {permissionData.import_supplier && (
            <button
              onClick={() => setOpenPopup(true)}
              className="submit rounded-md px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 flex-1 lg:w-40 text-center block whitespace-nowrap"
            >
              Import Supplier
            </button>
          )}
          {permissionData.create_supplier && (
            <Link
              to={"/createSuplier"}
              className="submit rounded-md px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 flex-1 lg:w-40 text-center block whitespace-nowrap"
            >
              Create Supplier
            </Link>
          )}
        </div>
      </div>

      {loading ? (
        <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-white/80 z-50">
            <Loader />
        </div>
      ) : error ? (
        <div className=" ">
          {error && (
            <p className="text-red-600 px-5 py-2 rounded-md bg-red-100 mt-5 text-center inline-block">
              {error}
            </p>
          )}
        </div>
      ) : searchedSuplier.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Username
                </th> */}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Supplier name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mobile
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created on
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {searchedSuplier.map((searchedSuplier) => (
                <tr key={searchedSuplier._id}>
                  {/* <td className="px-6 py-4 whitespace-nowrap text-m text-gray-900 text-left">
                    {searchedSuplier.username}
                  </td> */}
                  <td className="px-6 py-4 whitespace-nowrap text-m text-gray-900 text-left">
                    {searchedSuplier.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-m text-gray-900 text-left">
                    {searchedSuplier.mobile}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-m text-gray-900 text-left">
                    {new Date(searchedSuplier.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-m text-gray-900 justify-end">
                    <div className="flex items-center justify-end">
                      {permissionData.edit_supplier && (
                        <Link
                          to={`/editSuplier/${searchedSuplier._id}`}
                          className="text-blue-500 hover:text-blue-700 font-bold py-1 px-2 mr-2 flex items-center"
                          style={{ background: "transparent" }}
                        >
                          <i className="fas fa-edit mr-1"></i>
                        </Link>
                      )}
                      {permissionData.delete_supplier && (
                        <button
                          onClick={() => showConfirmationModal(searchedSuplier._id)}
                          className="text-red-500 hover:text-red-700 font-bold py-1 px-2 flex items-center"
                          style={{ background: "transparent" }}
                        >
                          <i className="fas fa-trash mr-1"></i>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : suplierData.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Username
                </th> */}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Supplier name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mobile
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created on
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {suplierData.map((suplier) => (
                <tr key={suplier._id}>
                  {/* <td className="px-6 py-4 whitespace-nowrap text-m text-gray-900 text-left">
                    {suplier.username}
                  </td> */}
                  <td className="px-6 py-4 whitespace-nowrap text-m text-gray-900 text-left">
                    {suplier.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-m text-gray-900 text-left">
                    {suplier.mobile}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-m text-gray-900 text-left">
                    {new Date(suplier.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-m text-gray-900 text-right justify-end">
                    <div className="flex items-center justify-end">
                      {permissionData.edit_supplier && (
                        <Link
                          to={`/editSuplier/${suplier._id}`}
                          className="text-blue-500 hover:text-blue-700 font-bold py-1 px-2 mr-2 flex items-center"
                          style={{ background: "transparent" }}
                        >
                          <i className="fas fa-edit mr-1"></i>
                        </Link>
                      )}
                      {permissionData.delete_supplier && (
                        <button
                          onClick={() => showConfirmationModal(suplier._id)}
                          className="text-red-500 hover:text-red-700 font-bold py-1 px-2 flex items-center"
                          style={{ background: "transparent" }}
                        >
                          <i className="fas fa-trash mr-1"></i>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-10">
          <p className="text-gray-500">No suppliers found</p>
        </div>
      )}

      {openPopup && (
        <>
          <div
            className="fixed inset-0 bg-gray-900  bg-opacity-50 z-40"
            onClick={() => setOpenPopup(false)}
          ></div>
          {/* Popup Container */}
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-1/2 h-[450px] overflow-y-auto">
              <h2 className="text-lg font-semibold mb-4">Import Suplier</h2>
              <div>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  className=""
                />
              </div>

              <div className="mt-10">
                {/* <label className="block text-sm font-medium leading-6 text-gray-900 text-left">
                  Username : Required
                </label> */}
                <label className="block text-sm font-medium leading-6 text-gray-900 text-left">
                  Name : Required
                </label>
                {/* <label className="block text-sm font-medium leading-6 text-gray-900 text-left">
                  NIC : Required
                </label> */}
                <label className="block text-sm font-medium leading-6 text-gray-900 text-left">
                  Mobile
                </label>
                {/* <label className="block text-sm font-medium leading-6 text-gray-900 text-left">
                  Country : Required
                </label> */}
                {/* <label className="block text-sm font-medium leading-6 text-gray-900 text-left">
                  City : Required
                </label> */}
                {/* <label className="block text-sm font-medium leading-6 text-gray-900 text-left">
                  Address : Required
                </label> */}
              </div>

              <div>
                <button
                  onClick={handleSave}
                  className="submit flex-none rounded-md px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 w-40 text-center"
                >
                  Save
                </button>
                <button
                  onClick={handleClosePopup}
                  className="mt-20 inline-flex ml-2 justify-center rounded-md bg-gray-600 py-2.5 px-4 text-sm font-medium text-white shadow-sm hover:bg-gray-500 focus:outline-none focus:ring-2 w-[100px]  focus:ring-gray-500 focus:ring-offset-2"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}  // Close modal
        onConfirm={() => handleDelete(supplierToDelete)}  // Confirm delete
        message="Are you sure you want to delete this supplier?"
      />

      {/* Pagination Controls - Visible only when data is loaded */}
      <div>
        {!error && suplierData.length > 0 && (
          <PaginationDropdown
            size={size}
            setSize={setSize}
            page={page}
            setPage={setPage}
            totalPages={totalPages}
            handlePrevPage={handlePrevPage}
            handleNextPage={handleNextPage}
          />
        )}
      </div>
      <div className="mt-5">
        {/* Error and Response Messages */}
        {/* {error && <p className="text-red-500 text-center">{error}</p>} */}
        {successStatus && (
          <p className="text-color text-center">{successStatus}</p>
        )}
      </div>
    </div>
  );
}

export default ViewSuplierBody;
