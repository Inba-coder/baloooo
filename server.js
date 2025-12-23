// ============================================
// BACKEND API FOR MANI CONSTRUCTION MATERIALS
// ============================================

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const stripe = require('stripe')('your_stripe_secret_key');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mani_construction',
    port: process.env.DB_PORT || 3306
};

let db;

// Initialize database connection
async function initDatabase() {
    try {
        db = await mysql.createConnection(dbConfig);
        console.log('Database connected successfully');
        
        // Create tables if they don't exist
        await createTables();
    } catch (error) {
        console.error('Database connection failed:', error);
    }
}

// Create database tables
async function createTables() {
    try {
        // Users table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                full_name VARCHAR(100),
                phone VARCHAR(20),
                address TEXT,
                role ENUM('customer', 'admin', 'employee') DEFAULT 'customer',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Products table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                price DECIMAL(10,2) NOT NULL,
                category VARCHAR(50),
                stock_quantity INT DEFAULT 0,
                image_url VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Orders table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                total_amount DECIMAL(10,2) NOT NULL,
                status ENUM('pending', 'confirmed', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
                payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
                payment_method VARCHAR(50),
                shipping_address TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

        // Order items table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS order_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id INT,
                product_id INT,
                quantity INT NOT NULL,
                price DECIMAL(10,2) NOT NULL,
                FOREIGN KEY (order_id) REFERENCES orders(id),
                FOREIGN KEY (product_id) REFERENCES products(id)
            )
        `);

        // Payments table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS payments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id INT,
                amount DECIMAL(10,2) NOT NULL,
                payment_method VARCHAR(50),
                transaction_id VARCHAR(255),
                status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES orders(id)
            )
        `);

        console.log('Database tables created successfully');
    } catch (error) {
        console.error('Error creating tables:', error);
    }
}

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// ============================================
// USER REGISTRATION AND LOGIN
// ============================================

// User Registration
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password, full_name, phone, address } = req.body;

        // Validate input
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password are required' });
        }

        // Check if user already exists
        const [existingUser] = await db.execute(
            'SELECT id FROM users WHERE username = ? OR email = ?',
            [username, email]
        );

        if (existingUser.length > 0) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new user
        const [result] = await db.execute(
            'INSERT INTO users (username, email, password, full_name, phone, address) VALUES (?, ?, ?, ?, ?, ?)',
            [username, email, hashedPassword, full_name, phone, address]
        );

        // Generate JWT token
        const token = jwt.sign(
            { id: result.insertId, username, email, role: 'customer' },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: result.insertId,
                username,
                email,
                full_name,
                phone,
                address,
                role: 'customer'
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// User Login
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validate input
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        // Find user
        const [users] = await db.execute(
            'SELECT * FROM users WHERE username = ? OR email = ?',
            [username, username]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = users[0];

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                full_name: user.full_name,
                phone: user.phone,
                address: user.address,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get user profile
app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
        const [users] = await db.execute(
            'SELECT id, username, email, full_name, phone, address, role, created_at FROM users WHERE id = ?',
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user: users[0] });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// PRODUCT MANAGEMENT
// ============================================

// Get all products
app.get('/api/products', async (req, res) => {
    try {
        const [products] = await db.execute('SELECT * FROM products ORDER BY created_at DESC');
        res.json({ products });
    } catch (error) {
        console.error('Products error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get single product
app.get('/api/products/:id', async (req, res) => {
    try {
        const [products] = await db.execute('SELECT * FROM products WHERE id = ?', [req.params.id]);
        
        if (products.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json({ product: products[0] });
    } catch (error) {
        console.error('Product error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// ORDER MANAGEMENT
// ============================================

// Create order
app.post('/api/orders', authenticateToken, async (req, res) => {
    try {
        const { items, shipping_address, payment_method } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'Order items are required' });
        }

        // Calculate total amount
        let totalAmount = 0;
        for (const item of items) {
            const [products] = await db.execute('SELECT price FROM products WHERE id = ?', [item.product_id]);
            if (products.length === 0) {
                return res.status(400).json({ error: `Product with ID ${item.product_id} not found` });
            }
            totalAmount += products[0].price * item.quantity;
        }

        // Create order
        const [orderResult] = await db.execute(
            'INSERT INTO orders (user_id, total_amount, shipping_address, payment_method) VALUES (?, ?, ?, ?)',
            [req.user.id, totalAmount, shipping_address, payment_method]
        );

        const orderId = orderResult.insertId;

        // Create order items
        for (const item of items) {
            const [products] = await db.execute('SELECT price FROM products WHERE id = ?', [item.product_id]);
            await db.execute(
                'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                [orderId, item.product_id, item.quantity, products[0].price]
            );
        }

        res.status(201).json({
            message: 'Order created successfully',
            order: {
                id: orderId,
                user_id: req.user.id,
                total_amount: totalAmount,
                status: 'pending',
                payment_status: 'pending',
                shipping_address,
                payment_method
            }
        });

    } catch (error) {
        console.error('Order creation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get user orders
app.get('/api/orders', authenticateToken, async (req, res) => {
    try {
        const [orders] = await db.execute(
            'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
            [req.user.id]
        );

        res.json({ orders });
    } catch (error) {
        console.error('Orders error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// PAYMENT PROCESSING
// ============================================

// Process payment with Stripe
app.post('/api/payments/stripe', authenticateToken, async (req, res) => {
    try {
        const { order_id, token } = req.body;

        if (!order_id || !token) {
            return res.status(400).json({ error: 'Order ID and payment token are required' });
        }

        // Get order details
        const [orders] = await db.execute(
            'SELECT * FROM orders WHERE id = ? AND user_id = ?',
            [order_id, req.user.id]
        );

        if (orders.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const order = orders[0];

        // Create Stripe charge
        const charge = await stripe.charges.create({
            amount: Math.round(order.total_amount * 100), // Convert to cents
            currency: 'usd',
            source: token,
            description: `Payment for order #${order.id}`,
        });

        // Update order payment status
        await db.execute(
            'UPDATE orders SET payment_status = ? WHERE id = ?',
            ['paid', order_id]
        );

        // Record payment
        await db.execute(
            'INSERT INTO payments (order_id, amount, payment_method, transaction_id, status) VALUES (?, ?, ?, ?, ?)',
            [order_id, order.total_amount, 'stripe', charge.id, 'completed']
        );

        res.json({
            message: 'Payment processed successfully',
            payment: {
                id: charge.id,
                amount: order.total_amount,
                status: 'completed'
            }
        });

    } catch (error) {
        console.error('Payment error:', error);
        res.status(500).json({ error: 'Payment processing failed' });
    }
});

// Process payment with PayPal
app.post('/api/payments/paypal', authenticateToken, async (req, res) => {
    try {
        const { order_id, payment_id } = req.body;

        if (!order_id || !payment_id) {
            return res.status(400).json({ error: 'Order ID and payment ID are required' });
        }

        // Get order details
        const [orders] = await db.execute(
            'SELECT * FROM orders WHERE id = ? AND user_id = ?',
            [order_id, req.user.id]
        );

        if (orders.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const order = orders[0];

        // Here you would integrate with PayPal API
        // For now, we'll simulate a successful payment

        // Update order payment status
        await db.execute(
            'UPDATE orders SET payment_status = ? WHERE id = ?',
            ['paid', order_id]
        );

        // Record payment
        await db.execute(
            'INSERT INTO payments (order_id, amount, payment_method, transaction_id, status) VALUES (?, ?, ?, ?, ?)',
            [order_id, order.total_amount, 'paypal', payment_id, 'completed']
        );

        res.json({
            message: 'Payment processed successfully',
            payment: {
                id: payment_id,
                amount: order.total_amount,
                status: 'completed'
            }
        });

    } catch (error) {
        console.error('Payment error:', error);
        res.status(500).json({ error: 'Payment processing failed' });
    }
});

// ============================================
// CONTACT AND SUPPORT
// ============================================

// Send contact message
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({ error: 'Name, email, and message are required' });
        }

        // Here you would send an email using nodemailer
        // For now, we'll just log the message
        console.log('Contact message received:', { name, email, subject, message });

        res.json({ message: 'Message sent successfully' });
    } catch (error) {
        console.error('Contact error:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// ============================================
// ERROR HANDLING
// ============================================
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// ============================================
// START SERVER
// ============================================
async function startServer() {
    await initDatabase();
    
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`API Documentation: http://localhost:${PORT}/api`);
    });
}

startServer().catch(console.error);

module.exports = app;
