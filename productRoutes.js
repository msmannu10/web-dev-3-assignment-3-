
const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const Product = require("../models/Product");

// 1. LOW-STOCK ALERT REPORT
router.get("/low-stock", async (req, res, next) => {
    try {
        const products = await Product.find({
            $expr: {
                $lte: ["$quantity", "$reorderLevel"]
            }
        });

        res.json({
            count: products.length,
            lowStockItems: products
        });
    } catch (error) {
        next(error);
    }
});

// 2. CATEGORY-WISE INVENTORY SUMMARY
router.get("/summary", async (req, res, next) => {
    try {
        const summary = await Product.aggregate([
            {
                $group: {
                    _id: "$category",
                    totalItems: { $sum: 1 },
                    totalQuantity: { $sum: "$quantity" },
                    totalStockValue: {
                        $sum: {
                            $multiply: ["$price", "$quantity"]
                        }
                    },
                    avgPrice: { $avg: "$price" }
                }
            }
        ]);

        res.json({
            categories: summary.length,
            summary
        });
    } catch (error) {
        next(error);
    }
});

// 3. GET ALL PRODUCTS WITH FILTERING, SORTING AND PAGINATION
router.get("/", async (req, res, next) => {
    try {
        const {
            category,
            minPrice,
            maxPrice,
            sortBy = "createdAt",
            order = "desc",
            page = 1,
            limit = 5
        } = req.query;

        const filter = {};

        if (category) {
            filter.category = category;
        }

        if (minPrice !== undefined || maxPrice !== undefined) {
            filter.price = {};

            if (minPrice !== undefined) {
                filter.price.$gte = Number(minPrice);
            }

            if (maxPrice !== undefined) {
                filter.price.$lte = Number(maxPrice);
            }
        }

        const allowedSortFields = [
            "name",
            "price",
            "quantity",
            "createdAt"
        ];

        const safeSortBy = allowedSortFields.includes(sortBy)
            ? sortBy
            : "createdAt";

        const sort = {
            [safeSortBy]: order === "asc" ? 1 : -1
        };

        const pageNumber = Math.max(1, Number(page) || 1);
        const pageLimit = Math.min(100, Math.max(1, Number(limit) || 5));

        const products = await Product.find(filter)
            .sort(sort)
            .skip((pageNumber - 1) * pageLimit)
            .limit(pageLimit);

        const total = await Product.countDocuments(filter);

        res.json({
            total,
            page: pageNumber,
            totalPages: Math.ceil(total / pageLimit),
            count: products.length,
            products
        });
    } catch (error) {
        next(error);
    }
});

// 4. CREATE PRODUCT
router.post("/", async (req, res, next) => {
    try {
        const product = new Product(req.body);
        const savedProduct = await product.save();

        res.status(201).json(savedProduct);
    } catch (error) {
        next(error);
    }
});

// 5. GET SINGLE PRODUCT BY ID
router.get("/:id", async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                message: "Invalid Product ID"
            });
        }

        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        res.json(product);
    } catch (error) {
        next(error);
    }
});

// 6. UPDATE PRODUCT DETAILS
router.put("/:id", async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                message: "Invalid Product ID"
            });
        }

        const product = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        );

        if (!product) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        res.json(product);
    } catch (error) {
        next(error);
    }
});

// 7. DELETE PRODUCT
router.delete("/:id", async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                message: "Invalid Product ID"
            });
        }

        const product = await Product.findByIdAndDelete(req.params.id);

        if (!product) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        res.json({
            message: "Product deleted",
            id: product._id
        });
    } catch (error) {
        next(error);
    }
});

// 8. INCREMENT / DECREMENT STOCK
router.patch("/:id/stock", async (req, res, next) => {
    try {
        const { change } = req.body;

        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                message: "Invalid Product ID"
            });
        }

        if (!Number.isInteger(change) || change === 0) {
            return res.status(400).json({
                message: "Change must be a non-zero integer"
            });
        }

        const filter = {
            _id: req.params.id
        };

        // Prevent stock from becoming negative
        if (change < 0) {
            filter.quantity = {
                $gte: Math.abs(change)
            };
        }

        const product = await Product.findOneAndUpdate(
            filter,
            {
                $inc: { quantity: change }
            },
            {
                new: true
            }
        );

        if (!product) {
            const exists = await Product.exists({
                _id: req.params.id
            });

            if (!exists) {
                return res.status(404).json({
                    message: "Product not found"
                });
            }

            return res.status(400).json({
                message: "Insufficient stock"
            });
        }

        res.json({
            message: "Stock updated",
            product
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
