

const express = require('express');
const connectDB = require('./config/database');
const routes = require('./routes/index');
const { Server } = require('socket.io');
const http = require('http');
const { corsMiddleware, bodyParserMiddleware } = require('./middleware/commonMiddleware');
require('dotenv').config();
const path = require('path');
const mongoose = require('mongoose');
const Order = require('./models/orderModel'); 

const app = express();

// Middleware
app.use(corsMiddleware);
app.use(bodyParserMiddleware);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to MongoDB
connectDB();

app.use('/api', routes);

// At the top with other app.set()
app.set('orderChannel', new BroadcastChannel('order-channel'));

// ————————————————————————————————
// NEW ENDPOINT: Get all pending orders (for Live Orders sidebar)
// ————————————————————————————————
app.get('/api/orders/pending', async (req, res) => {
    try {
        const pendingOrders = await Order.find({ status: 'pending' })
            .sort({ timestamp: -1 }) // newest first
            .lean();

        res.json({
            success: true,
            data: pendingOrders,
            count: pendingOrders.length
        });
    } catch (err) {
        console.error('Error fetching pending orders:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pending orders'
        });
    }
});

// Root route
app.get('/', (req, res) => {
    res.send('POS Server is running – Live Orders ready!');
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        status: 'error',
        message: 'Route not found'
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error:', err);
    res.status(err.status || 500).json({
        status: 'error',
        message: err.message || 'Internal Server Error'
    });
});

// ————————————————————————————————
// HTTP + Socket.IO Server Setup
// ————————————————————————————————
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Make io available in routes (important!)
app.set('io', io);

// Socket.IO Logic
io.on('connection', (socket) => {
    console.log('New client connected (Kitchen Display):', socket.id);
    Order.find({ status: 'pending' })
        .sort({ timestamp: -1 })
        .lean()
        .then(orders => {
            socket.emit('initialOrders', orders);
        })
        .catch(err => console.error('Error sending initial orders:', err));

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// ————————————————————————————————
// Helper: Emit order events (call this from your order routes!)
// ————————————————————————————————
const emitOrderEvent = (eventName, order) => {
    const io = app.get('io');
    if (io) {
        io.emit(eventName, order);
        console.log(`Emitted ${eventName}:`, order._id);
    }
};

// Make it globally available in your routes
app.set('emitOrderEvent', emitOrderEvent);

const PORT = process.env.PORT || 4001;

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Live Orders Endpoint → GET /api/orders/pending`);
    console.log(`Socket.IO ready → ws://localhost:${PORT}`);
});
