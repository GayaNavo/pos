

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, Link, useNavigate } from 'react-router-dom';
import '../../styles/dashboardBody.css';
import HouseIcon from '../../img/warehouse.png';
import Loader from '../utill/Loader';
import { isValidMobileInput, isAllowedKey } from '../utill/MobileValidation';
import { toast } from 'react-toastify';

function EditWarehouseBody() {
    const { id } = useParams();
    const [formData, setFormData] = useState({
        name: '',
        country: '',
        location: ''
    });
    const [errors, setErrors] = useState({});
    const [responseMessage, setResponseMessage] = useState('');
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWarehouseData = async () => {
            try {
                const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/fetchWarehouses`, {
                    params: { id },
                });

                const fetchedData = response.data;
                setFormData(fetchedData);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching warehouse data:', error);
                setErrors(prevErrors => ({ ...prevErrors, general: 'Failed to fetch warehouse data.' }));
                setLoading(false);
            }
        };

        fetchWarehouseData();
    }, [id]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === 'mobile') {
            if (isValidMobileInput(value)) {
                setFormData((prevData) => ({ ...prevData, [name]: value }));
                setErrors((prevErrors) => ({
                    ...prevErrors,
                    mobile: '',
                }));
            } else {
                setErrors((prevErrors) => ({
                    ...prevErrors,
                    mobile: 'Invalid characters. Only digits and "+" are allowed.',
                }));
            }
        } else {
            setFormData((prevData) => ({ ...prevData, [name]: value }));
        }
    };

    const validateFields = () => {
        const newErrors = {};
        if (!formData.name) newErrors.name = 'Name is required.';
        return newErrors;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const newErrors = {};

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setErrors({});
        setResponseMessage('');
        const validationErrors = validateFields();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        const formDataToSubmit = {
            id,
            name: formData.name,
            country: formData.country,
            location: formData.location,
            address: formData.address,
        };

        setLoading(true);
        axios.put(`${process.env.REACT_APP_BASE_URL}/api/editWarehouseByAdmin`, formDataToSubmit)
            .then(response => {
                if (response.data && response.data.status === 'success') {
                    console.log('Warehouse updated successfully:', response.data);
                    toast.success(
                        'Warehouse updated successfully.',
                        { autoClose: 2000 },
                        { className: "custom-toast" }
                    );
                    navigate('/viewWarehouse');
                } else {
                    toast.error(
                        'Update was not successful. Please try again.',
                        { autoClose: 2000 },
                        { className: "custom-toast" }
                    );
                }
            })
            .catch(error => {
                console.error('Error updating warehouse:', error);
                let errorMessage = 'Failed to update warehouse. Please try again.';

                if (error.response && error.response.data && error.response.data.message) {
                    errorMessage = error.response.data.message;
                } else if (error.request) {
                    errorMessage = 'No response from server. Please check your internet connection.';
                }

                toast.error(
                    errorMessage,
                    { autoClose: 2000, className: "custom-toast" }
                );

            })
            .finally(() => {
                setLoading(false);
            });
    };

    const handleClear = () => {
        setFormData({
            name: '',
            country: '',
            location: '',
        });
        setErrors({});
    };

    return (
        <div className='background-white absolute top-[80px] left-0 w-full sm:left-[220px] sm:w-[calc(100%-220px)] md:left-[220px] md:w-[calc(100%-220px)] 2xl:left-[18%] 2xl:w-[82%] h-[100vh] p-3 sm:p-5'>
            {loading && (
                <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-white/80 z-50">
                    <Loader />
                </div>
            )}
            <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4'>
                <div>
                    <h2 className="text-lightgray-300 m-0 p-0 text-xl sm:text-2xl">Edit Warehouse</h2>
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
                        <div className="flex space-x-16">
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
                                        value={formData.name}
                                        onChange={handleChange}
                                        autoComplete="given-name"
                                        className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                    />
                                </div>

                                {/* Country field */}
                                <div className="mt-5">
                                    <label className="block text-sm font-medium leading-6 text-gray-900 text-left">Country</label>
                                    <input
                                        id="country"
                                        name="country"
                                        type="text"

                                        placeholder='Sri Lanka'
                                        value={formData.country}
                                        onChange={handleChange}
                                        autoComplete="given-name"
                                        className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                    />
                                </div>

                                {/* Location field */}
                                <div className="mt-5">
                                    <label className="block text-sm font-medium leading-6 text-gray-900 text-left">Location </label>
                                    <input
                                        id="location"
                                        name="location"
                                        type="text"

                                        placeholder='88512-96152'
                                        value={formData.location}
                                        onChange={handleChange}
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

                    {/* Error and Response Messages */}
                    {errors.general && <p className="text-red-500 text-center mt-5 px-5 py-2 rounded-md  bg-red-100  mx-auto max-w-sm">{errors.general}</p>}
                    {responseMessage && <p className="text-color text-center mt-5 px-5 py-2 rounded-md  bg-green-100  mx-auto max-w-sm">{responseMessage}</p>}
                </div>
            </div>
        </div>
    );
}

export default EditWarehouseBody;
