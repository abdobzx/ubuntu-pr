const fs = require('fs');
const https = require('https');
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const cors = require('cors');
const privatekey = fs.readFileSync('/etc/letsencrypt/live/ebook.sytes.net/privkey.pem', 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/ebook.sytes.net/fullchain.pem', 'utf8');
const credentials = { key: privatekey, cert: certificate };
const paypal = require('@paypal/checkout-server-sdk');

app.use(cors());
app.use(express.json());

const paypalClient = new paypal.core.PayPalHttpClient(new paypal.core.SandboxEnvironment(
    'AdSQOcXbI0U4Dt5DJHZdL3lKI7gHJeOB-pRfsRpsAFvCh5khIDnhr2FJisJXmPs4y1752N5Tzpro5FTS',
    'EMeya4EBacOqmXmiQ5F7aPjgcu2UhIfRrKGEOV0E5AhPJdj87gN0Y6chONEh2Bniwfg08biikfq_S-IJ'
));

app.get('/', (req, res) => {
    res.send('404');
});

// MongoDB
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = "mongodb+srv://ebook-store:wsZM7snqt2ma5kQg@travel-app.igqp7kb.mongodb.net/?retryWrites=true&w=majority&appName=Travel-app";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server (optional starting in v4.7)
        await client.connect();

        const bookCollections = client.db("BookInventory").collection("books");

        app.post("/api/orders", async (req, res) => {
            const orderRequest = new paypal.orders.OrdersCreateRequest();
            orderRequest.prefer("return=representation");

            orderRequest.requestBody({
                intent: "CAPTURE",
                purchase_units: [
                    {
                        amount: {
                            currency_code: "USD",
                            value: "100.00", // Replace with actual price of the item
                            breakdown: {
                                item_total: {
                                    currency_code: "USD",
                                    value: "10.00" // Same as above
                                }
                            }
                        },
                        items: [
                            {
                                name: "YourProductName", // Replace with the name of your product
                                unit_amount: {
                                    currency_code: "USD",
                                    value: "10.00" // Replace with actual item price
                                },
                                quantity: 1 // Fixed quantity since it's a single product across the site
                            }
                        ]
                    }
                ]
            });

            try {
                const order = await paypalClient.execute(orderRequest);
                res.status(201).json({ id: order.result.id });
            } catch (error) {
                console.error(error);
                res.status(500).json({ error: "Failed to create PayPal order" });
            }
        });

        // Insert ebook
        app.post("/upload-book", async (req, res) => {
            const data = req.body;
            const result = await bookCollections.insertOne(data);
            res.send(result);
        });

        // Patch book
        app.patch("/book/:id", async (req, res) => {
            const id = req.params.id;
            const updateBookData = req.body;
            const filter = { _id: new ObjectId(id) };

            const updateDoc = {
                $set: {
                    ...updateBookData
                },
            };
            const options = { upsert: true };
            const result = await bookCollections.updateOne(filter, updateDoc, options);
            res.send(result);
        });

        // Delete book
        app.delete("/book/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const result = await bookCollections.deleteOne(filter);
            res.send(result);
        });

        // Get single book
        app.get("/book/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const result = await bookCollections.findOne(filter);
            res.send(result);
        });

        // Find books
        app.get("/all-books", async (req, res) => {
            let query = {};
            if (req.query?.category) {
                query = { category: req.query.category };
            }
            const result = await bookCollections.find(query).toArray();
            res.send(result);
        });

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}

run().catch(console.dir);

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
