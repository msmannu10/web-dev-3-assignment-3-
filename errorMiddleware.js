
const errorMiddleware = (err, req, res, next) => {
    console.error(err);

    const statusCode = err.statusCode || (
        err.name === "ValidationError" ||
        err.name === "CastError" ||
        err.code === 11000
            ? 400
            : 500
    );

    res.status(statusCode).json({
        success: false,
        message: err.code === 11000
            ? "Duplicate SKU. This SKU already exists."
            : err.message || "Internal Server Error"
    });
};

module.exports = errorMiddleware;
