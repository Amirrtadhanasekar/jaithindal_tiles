import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jai-thindal-tiles';
const DATA_FILE = path.join(process.cwd(), 'server', 'customers.json');
const PRODUCTS_FILE = path.join(process.cwd(), 'server', 'products.json');

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// State to track storage mode
let useMongoDB = false;

// MongoDB Connection
mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('Connected to MongoDB');
        useMongoDB = true;
    })
    .catch(err => {
        console.log('MongoDB not available, switching to local file storage for customers.');
        // We don't exit, just continue in file mode
    });

// Define Customer Schema
const customerSchema = new mongoose.Schema({
    fullname: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    attender: { type: String, required: true },
    attenderPhone: { type: String, required: true },
    totalAmount: { type: Number },
    totalArea: { type: Number },
    totalWeight: { type: Number },
    loadingCharges: { type: Number }, // Added
    totalTileCost: { type: Number },  // Added
    rooms: [{
        name: String,
        areaType: String,
        totalArea: Number,
        totalCost: Number,
        totalWeight: Number,
        items: [{
            type: { type: String },
            design: String,
            area: Number,
            boxes: Number,
            price: Number,
            cost: Number,
            weight: Number,
            description: String,
            // Detailed breakdown for Wall Tiles
            darkBoxes: Number,
            lightBoxes: Number,
            highlightBoxes: Number,
            tilesPerWidth: Number,
            tilesPerLength: Number
        }]
    }],
    createdAt: { type: Date, default: Date.now }
});

const productSchema = new mongoose.Schema({
    id: { type: Number, required: true }, // Using timestamp as ID from frontend or generated
    type: { type: String, required: true, enum: ['floor', 'wall'] },
    image: { type: String }, // Base64 string usually
    size: { type: String },
    design: { type: String },
    amount: { type: Number },
    createdAt: { type: Date, default: Date.now }
});

const Customer = mongoose.model('Customer', customerSchema, 'customers');
const Product = mongoose.model('Product', productSchema, 'products');

// Helper to read local file
// Helper to read local file
async function readLocalCustomers() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        // If file doesn't exist or is empty, return empty array
        return [];
    }
}

async function readLocalProducts() {
    try {
        const data = await fs.readFile(PRODUCTS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

// GET all customers
app.get('/api/customers', async (req, res) => {
    try {
        if (useMongoDB) {
            const customers = await Customer.find().sort({ createdAt: -1 });
            return res.json(customers);
        } else {
            const customers = await readLocalCustomers();
            return res.json(customers);
        }
    } catch (error) {
        console.error('Fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch customers' });
    }
});

// POST new customer
app.post('/api/customers', async (req, res) => {
    try {
        const { fullname, phone, address, attender, attenderPhone, totalAmount, totalArea, totalWeight, rooms } = req.body;

        // Validation
        if (!fullname || !phone || !address || !attender || !attenderPhone) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const newCustomerData = {
            fullname,
            phone,
            address,
            attender,
            attenderPhone,
            totalAmount: totalAmount || 0,
            totalArea: totalArea || 0,
            totalWeight: totalWeight || 0,
            loadingCharges: req.body.loadingCharges || 0,
            totalTileCost: req.body.totalTileCost || 0,
            rooms: rooms || [],
            createdAt: new Date()
        };

        if (useMongoDB) {
            const newCustomer = new Customer(newCustomerData);
            const savedCustomer = await newCustomer.save();
            return res.status(201).json({
                message: 'Customer saved successfully (MongoDB)',
                customer: savedCustomer
            });
        } else {
            // File Storage Fallback
            const customers = await readLocalCustomers();
            customers.unshift(newCustomerData); // Add to beginning
            await fs.writeFile(DATA_FILE, JSON.stringify(customers, null, 2));

            return res.status(201).json({
                message: 'Customer saved successfully (Local File)',
                customer: newCustomerData
            });
        }
    } catch (error) {
        console.error('Error saving customer:', error);
        res.status(500).json({ error: 'Failed to save customer' });
    }
});

// --- PRODUCT ROUTES ---

// GET all products
app.get('/api/products', async (req, res) => {
    try {
        if (useMongoDB) {
            const products = await Product.find().sort({ createdAt: -1 });
            return res.json(products);
        } else {
            const products = await readLocalProducts();
            return res.json(products);
        }
    } catch (error) {
        console.error('Fetch products error:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// POST new product
app.post('/api/products', async (req, res) => {
    try {
        const { id, type, image, size, design, amount } = req.body;

        if (!type || !design || !amount) {
            return res.status(400).json({ error: 'Type, Design and Amount are required' });
        }

        const newProductData = {
            id: id || Date.now(),
            type,
            image, // Include the image (Base64 string)
            size,
            design,
            amount,
            createdAt: new Date()
        };

        if (useMongoDB) {
            const newProduct = new Product(newProductData);
            const savedProduct = await newProduct.save();
            return res.status(201).json({ message: 'Product saved', product: savedProduct });
        } else {
            const products = await readLocalProducts();
            products.push(newProductData);
            await fs.writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 2));
            return res.status(201).json({ message: 'Product saved', product: newProductData });
        }
    } catch (error) {
        console.error('Save product error:', error);
        res.status(500).json({ error: 'Failed to save product' });
    }
});

// DELETE product
app.delete('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const numId = parseInt(id); // IDs are timestamps usually numbers

        if (useMongoDB) {
            // MongoDB might use its own _id but we are storing a custom numerical 'id' field too.
            // Let's assume we delete by the custom id field since frontend uses it.
            await Product.findOneAndDelete({ id: numId });
            return res.json({ message: 'Product deleted' });
        } else {
            let products = await readLocalProducts();
            const initialLength = products.length;
            products = products.filter(p => p.id !== numId);

            if (products.length === initialLength && !isNaN(numId)) {
                // Try string comparison if number failed (though JSON parses numbers)
                products = products.filter(p => p.id != id);
            }

            await fs.writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 2));
            return res.json({ message: 'Product deleted' });
        }
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
