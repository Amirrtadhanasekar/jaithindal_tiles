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

// Middleware
app.use(cors());
app.use(express.json());

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
            description: String
        }]
    }],
    createdAt: { type: Date, default: Date.now }
});

const Customer = mongoose.model('Customer', customerSchema);

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

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
