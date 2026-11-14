
const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

const errorMiddleware = require("./middleware/errorMiddleware");
const productRoutes = require("./routes/productRoutes");

const app = express();

app.use(express.json());

// Test route
app.get("/", (req, res) => {
    res.send("Inventory Management API is Running");
});

// Product routes
app.use("/api/products", productRoutes);

// Handle unknown routes
app.use((req, res) => {
    res.status(404).json({
        message: "Route not found"
    });
});

// Centralized error handling (must be after routes)
app.use(errorMiddleware);

// Connect MongoDB and start server
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB Connected Successfully");

        const PORT = process.env.PORT || 5000;

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error("MongoDB Connection Error:", error.message);
        process.exit(1);
    });
