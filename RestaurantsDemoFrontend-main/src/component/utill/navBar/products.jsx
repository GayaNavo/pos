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

import React, { useState, useEffect } from "react";
import axios from "axios";
import Loader from '../Loader';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false); // Loading state

  // Fetch all products without pagination
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true); // Show loading bar
      try {
        // Fetch all products without including pagination params
        const response = await axios.get(
          `${process.env.REACT_APP_BASE_URL}/api/findAllProduct`
        );

        if (
          response.data &&
          response.data.products &&
          Array.isArray(response.data.products)
        ) {
          setProducts(response.data.products); // Set all products
        } else {
          console.error("Unexpected response format:", response.data);
          setProducts([]);
        }
      } catch (error) {
        console.error("Error fetching products:", error);
        setProducts([]);
      } finally {
        setLoading(false); // Hide loading bar
      }
    };

    fetchProducts();
  }, []);

  return (
    <div className="flex">
      {/* Loading Bar */}
      {loading && (
        <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-white/80 z-50">
          <Loader />
        </div>
      )}

      {/* Main Content */}
      <div className="ml-64 flex-1">
        {/* Navbar */}
        <nav className="bg-white shadow">
          <div className="container mx-auto flex justify-between items-center py-4 px-6">
            <h1 className="text-xl font-bold">App Name</h1>
            <span className="text-gray-700 hover:text-blue-500">Products</span>
          </div>
        </nav>

        {/* Products Section */}
        {!loading && (
          <div className="mt-6 mx-auto w-11/12 bg-[#eff3f7] p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold mb-6 text-center text-gray-800">
              Products
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6">
              {products.map((product) => (
                <div
                  key={product._id}
                  className="flex flex-col items-center p-4 bg-white shadow rounded-lg"
                >
                  {/* Product Image */}
                  <img
                    src={product.image || "/default-product.png"}
                    alt={product.name}
                    className="w-24 h-24 rounded-full mb-3 border-2 border-gray-300 object-cover"
                  />

                  {/* Product Name */}
                  <h3 className="text-lg font-semibold text-center text-gray-700">
                    {product.name}
                  </h3>

                  {/* Product Price */}
                  <p className="text-sm text-gray-500">
                    Rs. {product.productPrice || "N/A"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
