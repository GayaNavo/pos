

import axios from 'axios';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Loader from '../utill/Loader';
import { toast } from 'react-toastify';
import HouseIcon from '../../img/warehouse.png';
import '../../styles/role.css';

function CreateWhereHouseBody() {
    const [name, setName] = useState('');
    const [country, setCountry] = useState('');
    const [location, setLocation] = useState('');
    const [error, setError] = useState("");
    const [responseMessage, setResponseMessage] = useState("");
    const navigate = useNavigate();
    const [progress, setProgress] = useState(false);

    const handleSubmit = (event) => {
        event.preventDefault();
        setError("");
        setResponseMessage("");
        setProgress(true);

        const requiredFields = ['name'];
        const missingFields = requiredFields.filter(field => !eval(field));
        if (missingFields.length > 0) {
            setError(
                `${missingFields.map(field => field.charAt(0).toUpperCase() + field.slice(1)).join(', ')} is required`
            );
            setProgress(false);
            return;
        }

        setError('');

        const warehouseData = {
            name,
            country,
            location,
        };

        axios.post(`${process.env.REACT_APP_BASE_URL}/api/createWherehouse`, warehouseData)
            .then(result => {
                toast.success(
                    result.data.message,
                    { autoClose: 2000 },
                    { className: "custom-toast" }
                );
                console.log('response: ', result.data);
                navigate('/viewWarehouse');
            })
            .catch(error => {
                setProgress(false);
                console.error("Error adding warehouse:", error);
                if (error.response && error.response.data && error.response.data.message) {
                    toast.error(
                        error.response.data.message,
                        { autoClose: 2000 },
                        { className: "custom-toast" }
                    );
                } else {
                    toast.error(
                        "Error: Warehouse not added",
                        { autoClose: 2000 },
                        { className: "custom-toast" }
                    );
                }
            })
            .finally(() => {
                setProgress(false);
            });
    };

    // Handle clear operation
    const handleClear = () => {
        setName('');
        setCountry('');
        setLocation('');
        setError('');
        setResponseMessage('');
    };

    return (
        <div className='background-white absolute top-[80px] left-0 w-full sm:left-[220px] sm:w-[calc(100%-220px)] md:left-[220px] md:w-[calc(100%-220px)] 2xl:left-[18%] 2xl:w-[82%] h-[100vh] p-3 sm:p-5'>
            {progress && (
                <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-white/80 z-50">
                    <Loader />
                </div>
            )}
            <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4'>
                <div>
                    <h2 className="text-lightgray-300 m-0 p-0 text-xl sm:text-2xl">Create Warehouse</h2>
                </div>
                <div>
                    <Link className='px-3 py-1.5 sm:px-4 border border-[#35AF87] text-[#35AF87] rounded-md transition-colors duration-300 hover:bg-[#35AF87] hover:text-white text-sm' to={'/viewWarehouse'}>Back</Link>
                </div>
            </div>
            <div className="bg-white mt-[20px] w-full max-w-[630px] min-h-[500px] rounded-2xl px-4 sm:px-8 py-6 shadow-md">
                <div className="flex min-h-full flex-1 flex-col px-2 py-6 lg:py-12 lg:px-8">
                    <div className="flex items-center justify-center">
                        <img className='w-[80px] h-[80px] sm:w-[100px] sm:h-[100px] lg:w-[120px] lg:h-[120px] rounded mb-6 sm:mb-10' src={HouseIcon} alt="icon" />
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 gap-x-10 gap-y-9">
                            <div className="flex-1">
                                {/* Name field */}
                                <div className="mt-2">
                                    <label className="block text-sm font-medium leading-6 text-gray-900 text-left">Name <span className='text-red-500'>*</span></label>
                                    <input
                                        id="name"
                                        name="name"
                                        type="text"
                                        required
                                        placeholder='Ben'
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        autoComplete="given-name"
                                        className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                    />
                                </div>


                                <div className="mt-5">
                                    <label className="block text-sm font-medium leading-6 text-gray-900 text-left">Country </label>
                                    <input
                                        id="country"
                                        name="country"
                                        type="text"

                                        placeholder='Sri Lanka'
                                        value={country}
                                        onChange={(e) => setCountry(e.target.value)}
                                        autoComplete="given-name"
                                        className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                    />
                                </div>


                                <div className="mt-5">
                                    <label className="block text-sm font-medium leading-6 text-gray-900 text-left">Location </label>
                                    <input
                                        id="location"
                                        name="location"
                                        type="text"

                                        placeholder='03231-6569'
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        autoComplete="given-name"
                                        className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="container mx-auto text-left">
                            <div className='mt-6 sm:mt-10 flex flex-col sm:flex-row gap-2 sm:gap-0 justify-start'>
                                <button type='submit' className="button-bg-color button-bg-color:hover flex-none rounded-md bg-indigo-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 w-full sm:w-[100px] text-center focus-visible:outline-offset-2 focus-visible:outline-indigo-500">
                                    Save
                                </button>
                                <button
                                    type="button"
                                    className="inline-flex sm:ml-2 justify-center rounded-md bg-gray-600 py-2.5 px-4 text-sm font-medium text-white shadow-sm hover:bg-gray-500 focus:outline-none focus:ring-2 w-full sm:w-[100px] focus:ring-gray-500 focus:ring-offset-2"
                                    onClick={handleClear}
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                    </form>
                    <div className="mt-5">
                        {error && (
                            <p className="text-red-600 px-5 py-2 rounded-md bg-red-100 mt-5 text-center mx-auto max-w-sm">
                                {error}
                            </p>
                        )}
                        {responseMessage && (
                            <p className="text-color px-5 py-2 rounded-md bg-green-100 mt-5 text-center mx-auto max-w-sm inline-block">
                                {responseMessage}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CreateWhereHouseBody;
