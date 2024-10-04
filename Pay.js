const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const paypal = require('@paypal/checkout-server-sdk'); // Import PayPal SDK

const app = express();
const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

// PayPal Configuration
const paypalClient = new paypal.core.PayPalHttpClient(new paypal.core.SandboxEnvironment(
  'YOUR_PAYPAL_CLIENT_ID', // Replace with your PayPal client ID
  'YOUR_PAYPAL_CLIENT_SECRET' // Replace with your PayPal client secret
));

// MongoDB connection
const uri = "???changeit with your mongodb url???";
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();
    const bookCollections = client.db("BookInventory").collection("books");

    // Endpoint to create a PayPal order
    app.post("/api/orders", async (req, res) => {
      const { cart } = req.body;

      const orderRequest = new paypal.orders.OrdersCreateRequest();
      orderRequest.prefer("return=representation");

      // Build the order details (adjust according to your cart structure)
      orderRequest.requestBody({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: "USD",
              value: "100.00", // Replace with dynamic cart value if needed
              breakdown: {
                item_total: {
                  currency_code: "USD",
                  value: "100.00" // Same as above
                }
              }
            },
            items: cart.map(item => ({
              name: item.name, // Replace with dynamic item name
              unit_amount: {
                currency_code: "USD",
                value: "100.00" // Replace with dynamic item price
              },
              quantity: item.quantity
            }))
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

    // Endpoint to capture PayPal order (after approval)
    app.post("/api/orders/:orderId/capture", async (req, res) => {
      const { orderId } = req.params;

      const captureRequest = new paypal.orders.OrdersCaptureRequest(orderId);
      captureRequest.requestBody({});

      try {
        const capture = await paypalClient.execute(captureRequest);
        res.status(200).json(capture.result);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to capture PayPal order" });
      }
    });

    // Other routes (CRUD operations on books)
    app.post("/upload-book", async (req, res) => {
      const data = req.body;
      const result = await bookCollections.insertOne(data);
      res.send(result);
    });

    app.patch("/book/:id", async (req, res) => {
      const id = req.params.id;
      const updateBookData = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = { $set: { ...updateBookData } };
      const options = { upsert: true };
      const result = await bookCollections.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    app.delete("/book/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await bookCollections.deleteOne(filter);
      res.send(result);
    });

    app.get("/book/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await bookCollections.findOne(filter);
      res.send(result);
    });

    app.get("/all-books", async (req, res) => {
      let query = {};
      if (req.query?.category) {
        query = { category: req.query.category };
      }
      const result = await bookCollections.find(query).toArray();
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. Successfully connected to MongoDB!");
  } finally {
    // Ensure the client will close
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
