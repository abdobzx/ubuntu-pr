const fs = require('fs');
const https = require('https');
const express = require('express');
const cors = require('cors');
const paypal = require('@paypal/checkout-server-sdk');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// Server and certificate setup for HTTPS
const app = express();
const port = process.env.PORT || 3000;
const privateKey = fs.readFileSync('/etc/letsencrypt/live/ebook.sytes.net/privkey.pem', 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/ebook.sytes.net/fullchain.pem', 'utf8');
const credentials = { key: privateKey, cert: certificate };

// MongoDB setup
const uri = "mongodb+srv://ebook-store:wsZM7snqt2ma5kQg@travel-app.igqp7kb.mongodb.net/?retryWrites=true&w=majority&appName=Travel-app";
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// PayPal setup (Live environment)
const paypalClient = new paypal.core.PayPalHttpClient(new paypal.core.LiveEnvironment(
'AdSQOcXbI0U4Dt5DJHZdL3lKI7gHJeOB-pRfsRpsAFvCh5khIDnhr2FJisJXmPs4y1752N5Tzpro5FTS',
    'EMeya4EBacOqmXmiQ5F7aPjgcu2UhIfRrKGEOV0E5AhPJdj87gN0Y6chONEh2Bniwfg08biikfq_S-IJ'
));

// Middleware setup
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('404 - Not Found');
});

async function run() {
    try {
        await client.connect();
        const bookCollections = client.db("BookInventory").collection("books");

        // PayPal Order Creation API
        app.post("/api/orders", async (req, res) => {
            const orderRequest = new paypal.orders.OrdersCreateRequest();
            orderRequest.prefer("return=representation");
            orderRequest.requestBody({
                intent: "CAPTURE",
                purchase_units: [
                    {
                        amount: {
                            currency_code: "USD",
                            value: "10.00", // Total price of the product
                            breakdown: {
                                item_total: {
                                    currency_code: "USD",
                                    value: "10.00" // Matches the item price
                                }
                            }
                        },
                        items: [
                            {
                                name: "YourProductName", // Replace with your product name
                                unit_amount: {
                                    currency_code: "USD",
                                    value: "10.00" // Price per item
                                },
                                quantity: 1
                            }
                        ]
                    }
                ]
            });
            try {
                const order = await paypalClient.execute(orderRequest);
                res.status(201).json({ id: order.result.id });
            } catch (error) {
                console.error("PayPal order creation failed", error);
                res.status(500).json({ error: "Failed to create PayPal order" });
            }
        });

        // Insert a new book
        app.post("/upload-book", async (req, res) => {
            const data = req.body;
            const result = await bookCollections.insertOne(data);
            res.send(result);
        });

        // Patch (update) an existing book
        app.patch("/book/:id", async (req, res) => {
            const id = req.params.id;
            const updateBookData = req.body;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: { ...updateBookData },
            };
            const options = { upsert: true };
            const result = await bookCollections.updateOne(filter, updateDoc, options);
            res.send(result);
        });

        // Delete a book
        app.delete("/book/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const result = await bookCollections.deleteOne(filter);
            res.send(result);
        });

        // Get a single book by ID
        app.get("/book/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const result = await bookCollections.findOne(filter);
            res.send(result);
        });

        // Get all books (optional category filter)
        app.get("/all-books", async (req, res) => {
            let query = {};
            if (req.query?.category) {
                query = { category: req.query.category };
            }
            const result = await bookCollections.find(query).toArray();
            res.send(result);
        });

        // MongoDB ping to check connection
        await client.db("admin").command({ ping: 1 });
        console.log("Connected successfully to MongoDB!");

    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}

// Start the server with HTTPS
https.createServer(credentials, app).listen(port, () => {
    console.log(`Server running on port ${port}`);
});

// Execute the MongoDB run function
run().catch(console.dir);
