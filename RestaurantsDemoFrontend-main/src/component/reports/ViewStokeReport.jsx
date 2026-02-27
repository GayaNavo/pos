

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "../../styles/role.css";
import { Link } from "react-router-dom";
import ProductIcon from "../../img/product icon.jpg";
import Loader from '../utill/Loader';
import { handleExportPdf } from "../../component/utill/ExportingPDF";
import { useCurrency } from "../../context/CurrencyContext";
import formatWithCustomCommas from "../utill/NumberFormate";
import { CSSTransition, TransitionGroup } from "react-transition-group";

function StokeReportBody() {
  // State management
  const { currency } = useCurrency();
  const [stokeData, setStokeData] = useState({});
  const [searchedStokeReport, setSearchedStokeReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [error, setError] = useState("");
  const [warehouseData, setWarehouseData] = useState([]);
  const [warehouse, setWarehouse] = useState(["all"]);
  const [activeTab, setActiveTab] = useState("inventory"); // 'inventory' or 'non-inventory'
  const ref = useRef();

  // Combine and categorize product data
  // const combinedProductData = Array.isArray(searchedStokeReport) && searchedStokeReport.length > 0
  //     ? searchedStokeReport
  //     : Array.isArray(stokeData) && stokeData.length > 0
  //         ? stokeData
  //         : [];

  const combinedProductData =
    keyword.length > 0
      ? Array.isArray(searchedStokeReport)
        ? searchedStokeReport
        : []
      : Array.isArray(stokeData) && stokeData.length > 0
      ? stokeData
      : [];

  // Categorize products
  const inventoryProducts = combinedProductData.filter(
    (product) => product.isInventory
  );
  const nonInventoryProducts = combinedProductData.filter(
    (product) => !product.isInventory
  );
  const totalEvaluation = combinedProductData.reduce(
    (sum, p) => sum + p.productCost * p.productQty,
    0
  );

  //fetch stock data
  useEffect(() => {
    const fetchReportData = async () => {
      setLoading(true);
      setStokeData({});
      setError("");
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_BASE_URL}/api/findStokeReport/${warehouse}`
        );
        if (response.data && response.data.products) {
          setStokeData(response.data.products);
        }
      } catch (err) {
        if (err.response) {
          console.error("Error response:", err.response.data);
          setError(
            err.response.data.status || "An error occurred while fetching data."
          );
        } else if (err.request) {
          console.error("No response received:", err.request);
          setError("No response received from the server.");
        } else {
          console.error("Error setting up request:", err.message);
          setError("An error occurred while setting up the request.");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchReportData();
  }, [warehouse]);

  useEffect(() => {
    const fetchAllWarehouses = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_BASE_URL}/api/fetchWarehouses`
        );
        setWarehouseData(response.data.warehouses || []);
      } catch (error) {
        console.error("Failed to fetch all warehouses:", error);
      }
    };
    fetchAllWarehouses();
  }, []);

  const handleFindUser = async (e) => {
    const value = e.target.value;
    setKeyword(value);

    if (value.length > 0) {
      await handleSubmit(value);
    } else {
      setSearchedStokeReport([]);
      try {
        setLoading(true);
        const response = await axios.get(
          `${process.env.REACT_APP_BASE_URL}/api/findStokeReport/${warehouse}`
        );
        if (response.data?.products) {
          setStokeData(response.data.products);
        }
      } catch (error) {
        console.error("Error refreshing data:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSubmit = async (searchValue) => {
    setLoading(true);
    setError("");
    setSearchedStokeReport([]); // Clear previous search results immediately

    try {
      const trimmedValue = searchValue.trim();
      const response = await axios.get(
        `${process.env.REACT_APP_BASE_URL}/api/findStokeReportByCode`,
        {
          params: { name: trimmedValue },
        }
      );

      let products = [];
      if (Array.isArray(response.data)) {
        products = response.data;
      } else if (response.data && response.data.products) {
        products = response.data.products;
      }

      if (!products || products.length === 0) {
        setError("No products found");
        setSearchedStokeReport([]);
      } else {
        setSearchedStokeReport(products);
      }
    } catch (error) {
      console.error("Find customer error:", error);
      setSearchedStokeReport([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate price range (min and max) for products with variations
  const getPriceRange = (product) => {
    if (product.variationValues) {
      const prices = Object.values(product.variationValues)
        .map((variation) => Number(variation.productPrice))
        .filter((price) => !isNaN(price));

      if (prices.length > 0) {
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);

        if (minPrice === maxPrice) {
          return `${minPrice}`;
        } else {
          return `${minPrice} - ${maxPrice}`;
        }
      }
    }
    const singlePrice = Number(product.productPrice);
    if (!isNaN(singlePrice) && singlePrice > 0) {
      return `${singlePrice}`;
    }
    return "Price not available";
  };

  // Calculate quantity for products with variations
  const getQty = (product) => {
    if (product.variationValues) {
      const qty = Object.values(product.variationValues)
        .map((variation) => Number(variation.productQty))
        .filter((qty) => !isNaN(qty));
      return qty.length > 0
        ? qty.reduce((total, current) => total + current, 0)
        : 0;
    }
    const singleProductQty = Number(product.productQty);
    return !isNaN(singleProductQty) && singleProductQty > 0
      ? singleProductQty
      : 0;
  };

  // Render product table
  const renderProductTable = (products) => {
    return (
      <div className="overflow-x-auto p-6">
        <table className="min-w-full bg-white border border-gray-200 pr-2">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-7 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="px-7 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-7 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Code
              </th>
              <th className="px-7 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Brand
              </th>
              <th className="px-7 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Cost
              </th>
              <th className="px-7 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                In Stock
              </th>
              <th className="px-7 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Evaluation
              </th>
              <th className="px-7 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created On
              </th>
              <th className="px-7 py-3 text-right mr-5 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((p) => (
              <tr key={p._id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <img
                    src={p.image ? p.image : ProductIcon}
                    alt={p.name}
                    className="w-10 h-10 object-cover rounded-full"
                  />
                </td>
                <td className="px-7 py-5 text-left whitespace-nowrap text-m text-gray-900">
                  {p.name}
                </td>
                <td className="px-7 py-5 text-left whitespace-nowrap text-m text-gray-900">
                  {p.code}
                </td>
                <td className="px-4 py-5 text-left whitespace-nowrap text-m text-gray-900">
                  {p.brand}
                </td>
                <td className="px-7 py-5 text-left whitespace-nowrap text-m text-gray-900">
                  {currency} {formatWithCustomCommas(getPriceRange(p))}
                </td>
                <td className="px-7 py-5 text-left whitespace-nowrap text-m text-gray-900">
                  {currency} {formatWithCustomCommas(p.productCost)}
                </td>
                <td className="px-7 py-5 text-left whitespace-nowrap text-m text-gray-900 flex">
                  <p className="mr-2 text-left rounded-[5px] text-center p-[6px] bg-green-100 text-green-500">
                    {p.productQty ? p.productQty : getQty(p)}
                  </p>{" "}
                  <p className="rounded-[5px] text-center p-[6px] bg-green-100 text-blue-500">
                    {p.saleUnit}
                  </p>
                </td>
                <td className="px-7 py-5 whitespace-nowrap text-m text-gray-900">
                  {currency}{" "}
                  {formatWithCustomCommas(p.productCost * p.productQty)}
                </td>
                <td className="px-7 py-5 whitespace-nowrap text-m text-gray-900">
                  {p.createdAt}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  <div className="flex items-center justify-end">
                    <Link
                      to={`/clickedStokeRep/${p._id}`}
                      className="text-[#35AF87] hover:text-[#16796E] font-bold py-1 px-2 mr-2 text-lg"
                      style={{ background: "transparent" }}
                    >
                      <i className="fas fa-eye mr-1"></i>
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="relative background-white absolute top-[80px] left-[18%] w-[82%] min-h-screen p-5">
      {loading && (
        <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-white/80 z-50">
          <Loader />
        </div>
      )}
      <div>
        <div className="m-0 flex justify-center">
          {/* Warehouse field */}
          <div className="mt-5 text-center">
            <label className="block text-sm font-medium leading-6 text-gray-900 mb-2 text-left">
              Warehouse
            </label>
            <select
              value={warehouse}
              onChange={(e) => setWarehouse(e.target.value)}
              className="block w-[400px] mx-auto rounded-md border-0 py-3 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-200 focus:outline-none sm:text-sm sm:leading-6"
            >
              <option value="all">All warehouse</option>
              {warehouseData.map((wh) => (
                <option key={wh.name} value={wh.name}>
                  {wh.name}
                </option>
              ))}
            </select>
          </div>
          <div className="absolute right-10">
            <button
              onClick={() =>
                handleExportPdf({
                  data: combinedProductData,
                  currency,
                  title: "Stock Report",
                  summaryTitle: "Summary of Stock",
                  tableColumns: [
                    "Product Name",
                    "Code",
                    "Brand",
                    "Price",
                    "In Stock",
                    "Created On",
                  ],
                  dataKeys: [
                    "name",
                    "code",
                    "brand",
                    "productPrice",
                    "productQty",
                    "createdAt",
                  ],
                  additionalData: {
                    "Total Products": combinedProductData.length,
                  },
                  customColumnWidths: [50, 30, 25, 35, 30, 40], // Product Name, Code, Brand, Price, In Stock, Created On
                  customTableStartX: 5, // Move table to the left (default is 10)
                })
              }
              className="submit flex-none rounded-md px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 w-40 text-center"
            >
              {"Export As PDF"}
            </button>
          </div>
        </div>
        <div className="mt-5 mb-2 ml-[24px]">
          <div className="mt-2 flex justify-left">
            <h1 className="text-lightgray-300 m-0 mb-5 p-0 text-2xl">
              Stock Report
            </h1>
          </div>

          <form
            className="flex items-center"
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit(keyword);
            }}
          >
            <input
              onChange={handleFindUser}
              name="keyword"
              type="text"
              placeholder="Search..."
              className="searchBox w-80 pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:border-transparent"
              value={keyword}
            />
          </form>

          <div className="mt-3 flex justify-end pr-10">
            <div className="bg-white shadow-md rounded-lg px-5 py-3 w-60 border border-gray-200">
              <h3 className="text-sm font-medium text-gray-600">
                Total Evaluation
              </h3>
              <p className="text-xl font-semibold text-gray-900 mt-1">
                {currency} {formatWithCustomCommas(totalEvaluation)}
              </p>
            </div>
          </div>
        </div>

        {/* Tab buttons */}
        <div className="flex border-b border-gray-200 mt-5 ml-6">
          <button
            className={`py-2 px-4 outline-none font-medium text-sm relative transition-all duration-300 ease-in-out ${
              activeTab === "inventory"
                ? "text-[#35AF87]"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("inventory")}
          >
            Inventory Products ({inventoryProducts.length})
            <span
              className={`absolute bottom-0 left-0 w-full h-0.5 bg-[#35AF87] transition-all duration-300 ease-in-out ${
                activeTab === "inventory" ? "scale-x-100" : "scale-x-0"
              }`}
            ></span>
          </button>
          <button
            className={`py-2 px-4 outline-none font-medium text-sm relative transition-all duration-300 ease-in-out ${
              activeTab === "non-inventory"
                ? "text-[#35AF87]"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("non-inventory")}
          >
            Non-Inventory Products ({nonInventoryProducts.length})
            <span
              className={`absolute bottom-0 left-0 w-full h-0.5 bg-[#35AF87] transition-all duration-300 ease-in-out ${
                activeTab === "non-inventory" ? "scale-x-100" : "scale-x-0"
              }`}
            ></span>
          </button>
        </div>

        <div ref={ref} className="pt-2 relative">
          <TransitionGroup component={null}>
            <CSSTransition
              key={activeTab}
              timeout={300}
              classNames="fade"
              unmountOnExit
            >
              <div className={loading ? "opacity-50 pointer-events-none" : ""}>
                {activeTab === "inventory" ? (
                  inventoryProducts.length > 0 ? (
                    renderProductTable(inventoryProducts)
                  ) : (
                    <p className="text-center text-gray-700 mt-5">
                      No inventory products found
                    </p>
                  )
                ) : nonInventoryProducts.length > 0 ? (
                  renderProductTable(nonInventoryProducts)
                ) : (
                  <p className="text-center text-gray-700 mt-5">
                    No non-inventory products found
                  </p>
                )}
              </div>
            </CSSTransition>
          </TransitionGroup>
        </div>

        <div>
          {error && (
            <p
              className={`mt-5 text-center ${
                error === "No products found" ? "text-gray-700" : "text-red-500"
              }`}
            >
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default StokeReportBody;
