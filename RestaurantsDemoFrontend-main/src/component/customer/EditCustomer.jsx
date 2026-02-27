

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, Link, useNavigate } from 'react-router-dom';
import '../../styles/dashboardBody.css';
import avatarIcon from '../../img/profile.png';
import Loader from '../utill/Loader';
import { isValidMobileInput, isAllowedKey } from '../utill/MobileValidation';
import { toast } from 'react-toastify';

function EditCustomerBody() {
    const { id } = useParams();
    const [formData, setFormData] = useState({
        // username: '',
        name: '',
        mobile: '',
        address: ''
    });
    const [errors, setErrors] = useState({});
    const [progress, setProgress] = useState(false);
    const [responseMessage, setResponseMessage] = useState('');
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    // Fetch user data when component mounts
    useEffect(() => {
        const fetchCustomerData = async () => {
            try {
                const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/fetchCustomer`, {
                    params: { id },
                });
                const fetchedData = response.data;
                setFormData({
                    // username: fetchedData.username || '',
                    name: fetchedData.name || '',
                    mobile: fetchedData.mobile || '',
                    address: fetchedData.address || ''
                });
                setLoading(false);
            } catch (error) {
                console.error('Error fetching customer data:', error);
                setErrors(prevErrors => ({ ...prevErrors, general: 'Failed to fetch customer data.' }));
                setLoading(false);
            }
        };

        fetchCustomerData();
    }, [id]);

    // Handle keydown event to restrict invalid keys
    const handleKeyDown = (e) => {
        const key = e.key;
        if (!isAllowedKey(key)) {
            e.preventDefault();
        }
    };

    // Handle input field values
    const handleChange = (e) => {
        setErrors({});
        setResponseMessage('');

        const { name, value } = e.target;
        let updatedFormData = { ...formData, [name]: value };
        let tempErrors = { ...errors };

        // Mobile number validation
        if (name === 'mobile') {
            if (!isValidMobileInput(value) || value.length !== 10) {
                tempErrors.mobile = 'Invalid mobile number. Must be 10 characters long and start with 0.';
            } else {
                tempErrors.mobile = '';
            }
        }
        setErrors(tempErrors);
        setFormData(updatedFormData);
    };

    // Handle submit
    const handleSubmit = (e) => {
        e.preventDefault();
        setErrors({});
        setResponseMessage('');
        setProgress(true);

        // Validate required fields
        let tempErrors = {};
        if (!formData.name) tempErrors.name = 'Name is required.';
        if (!formData.mobile) tempErrors.mobile = 'Mobile number is required.';

        // Validate mobile and username again before submit
        if (formData.mobile && (!isValidMobileInput(formData.mobile) || formData.mobile.length !== 10)) {
            tempErrors.mobile = 'Invalid mobile number. Must be 10 characters long and start with 0.';
        }

        if (Object.values(tempErrors).some(err => err)) {
            setErrors(tempErrors);
            setProgress(false);
            return;
        }

        if (Object.values(errors).some(err => err)) {
            toast.error("Please fix the errors in the form before submitting.", { autoClose: 2000, className: "custom-toast" });
            setProgress(false);
            return;
        }

        const formDataToSubmit = {
            id,
            // username: formData.username.toLowerCase(),
            name: formData.name,
            mobile: formData.mobile,
            address: formData.address
        };

        axios.put(`${process.env.REACT_APP_BASE_URL}/api/editCustomerProfileByAdmin`, formDataToSubmit)
            .then(response => {
                setResponseMessage("Successfully updated the customer");
                toast.success(
                    "Successfully updated the customer",
                    { autoClose: 2000, className: "custom-toast" }
                );
                setTimeout(() => {
                    navigate('/viewCustomers');
                }, 1000);
                setProgress(false);
            })
            .catch((error) => {
                const errorMessage =
                    error.response?.data?.message || 'An error occurred while updating the customer. Please try again.';
                toast.error(
                    errorMessage,
                    {
                        autoClose: 2000,
                        className: "custom-toast"
                    }
                );
                console.error('Error updating user:', error);
                setProgress(false);
            });
    };

    // Clear all fields
    const handleClear = () => {
        setFormData({
            // username: '',
            name: '',
            mobile: '',
            address: ''
        });
        setErrors({});
        setResponseMessage('');
    };

    if (loading) {
        return <p>Loading...</p>;
    }

    return (
        <div className='background-white absolute top-[80px] left-[18%] w-[82%] h-[900px] p-5'>
            {progress && (
                <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-white/80 z-50">
                    <Loader />
                </div>
            )}
            <div className='flex justify-between items-center'>
                <div>
                    <h2 className="text-lightgray-300 m-0 p-0 text-2xl">Edit Customer</h2>
                </div>
                <div>
                    <Link className='px-4 py-1.5 border border-[#35AF87] text-[#35AF87] rounded-md transition-colors duration-300 hover:bg-[#35AF87] hover:text-white' to={'/viewCustomers'}>Back</Link>
                </div>
            </div>
            <div className="bg-white mt-[20px] w-full h-[800px] rounded-2xl px-8 shadow-md">
                <div className="flex min-h-full flex-1 flex-col px-2 py-12 lg:px-8">
                    <div className="flex items-center justify-center">
                        <img className='w-[120px] h-[120px] rounded mb-10' src={avatarIcon} alt="icon" />
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
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
                                {/* Mobile number field */}
                                <div className="mt-5">
                                    <label htmlFor="mobile" className="block text-sm font-medium leading-6 text-gray-900 text-left">
                                        Mobile number <span className='text-red-500'>*</span>
                                    </label>
                                    <input
                                        id="mobile"
                                        name="mobile"
                                        type="text"
                                        required
                                        placeholder='0 xx xxxx xxx'
                                        value={formData.mobile}
                                        onChange={handleChange}
                                        onKeyDown={handleKeyDown}
                                        maxLength={10}
                                        className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                    />
                                    <p className="text-gray-500 text-left text-xs mt-1">
                                        Must start with 0 and be exactly 10 digits
                                    </p>
                                </div>
                            </div>

                            {/* Address field */}
                            <div className="mt-2">
                                <label className="block text-sm font-medium leading-6 text-gray-900 text-left">Address</label>
                                <textarea
                                    id="address"
                                    name="address"
                                    placeholder='No 46, Rock view Garden Thennekumbura'
                                    value={formData.address}
                                    onChange={handleChange}
                                    autoComplete="given-name"
                                    className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-400 focus:outline-none sm:text-sm sm:leading-6"
                                />
                            </div>
                        </div>
                        <div className="container mx-auto text-left">
                            <div className='mt-10 flex justify-start'>
                                <button type='submit' className="button-bg-color button-bg-color:hover flex-none rounded-md bg-indigo-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 w-[100px] text-center focus-visible:outline-offset-2 focus-visible:outline-indigo-500">
                                    Save
                                </button>
                                <button
                                    type="button"
                                    className="inline-flex ml-2 justify-center rounded-md bg-gray-600 py-2.5 px-4 text-sm font-medium text-white shadow-sm hover:bg-gray-500 focus:outline-none focus:ring-2 w-[100px] focus:ring-gray-500 focus:ring-offset-2"
                                    onClick={handleClear}
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default EditCustomerBody;