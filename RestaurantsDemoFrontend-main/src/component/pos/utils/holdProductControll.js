

// fetchHeldProducts.js
import axios from 'axios';
import { toast } from 'react-toastify';

export const getHeldProducts = async (setHeldProducts) => {
    try {
        const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/viewAllHeldProducts`);
        setHeldProducts(response.data.data);
    } catch (error) {
        console.error('Error fetching held products:', error);
    }
};

export const handleDeleteHoldProduct = async (id, heldProducts, setHeldProducts) => {
    try {
        const deleteResponse = await axios.delete(`${process.env.REACT_APP_BASE_URL}/api/deleteHeldProduct/${id}`);

        if (deleteResponse.status !== 200) {
            throw new Error(`Failed to delete the product with ID ${id}. Status code: ${deleteResponse.status}`);
        }

        // Update local state immediately
        const updatedHeldProducts = heldProducts.filter(product => product._id !== id);
        setHeldProducts(updatedHeldProducts);

        // Fetch latest list from server
        const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/viewAllHeldProducts`);
        setHeldProducts(response.data.data);

        toast.success('Held product deleted successfully.', { autoClose: 2000 });

    } catch (error) {
        console.error('Error deleting held product:', error);

        if (error.response) {
            console.error('Error details:', error.response.data);
        }
        else if (error.request) {
            console.error('No response received:', error.request);
        }
        else {
            console.error('Error details:', error.message);
        }
    }
};

