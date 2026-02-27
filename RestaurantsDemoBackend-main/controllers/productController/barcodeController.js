

const Product = require('../../models/products/product');

const searchProductByName = async (req, res) => {
    try {
        const { name, warehouse } = req.query;
        console.log('Search query received: ', {name, warehouse});

        if (!name) {
            return res.status(400).json({ status: 'Name query parameter is required' });
        }

        if (!name) {
            return res.status(400).json({ status: 'Name query parameter is required' });
        }

        const query = { name: new RegExp(name, 'i') };

        if (warehouse) {
            query[`warehouse.${warehouse}`] = { $exists: true }; 
        }

        const products = await Product.find(query);

        if (!products.length) {
            return res.status(404).json({ status: 'No products found' });
        }

        const allProducts = products.map(product => {
            const productObj = product.toObject();
            const selectedWarehouseData = warehouse ? productObj.warehouse?.get(warehouse) || {} : {};
            
            return {
                _id: productObj._id,
                name: productObj.name,
                isInventory: productObj.isInventory,
                code: productObj.code,
                barcode: productObj.barcode,
                productPrice: selectedWarehouseData.productPrice || productObj.productPrice,
                productCost: selectedWarehouseData.productCost || productObj.productCost,
                ptype: productObj.ptype,
                discount: selectedWarehouseData.discount || productObj.discount,
                orderTax: selectedWarehouseData.orderTax || productObj.orderTax,
                taxType: selectedWarehouseData.taxType || productObj.taxType,
                productQty: selectedWarehouseData.productQty || productObj.productQty,
                variationValues: selectedWarehouseData.variationValues || {},
                warehouseId: warehouse || Object.keys(productObj.warehouse || {})[0] || null,
                warehouse: warehouse || Object.keys(productObj.warehouse || {})[0] || null,
            };
        });

        return res.status(200).json({ status: 'Products fetched successfully', products: allProducts });
    } catch (error) {
        console.error('Error searching products:', error);
        return res.status(500).json({ status: 'Error searching products', error: error.message });
    }
};


module.exports = { searchProductByName };