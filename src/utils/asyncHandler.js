export const asyncHandler = (fn) => async (req, res, next) => {
    try {
        await fn(req, res, next);
    } catch (error) {
        // Mongoose ValidationError
        if (error.name === "ValidationError") {
            const errors = Object.values(error.errors).map((e) => ({
                field: e.path,
                message: e.message,
            }));
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors,
            });
        }

        // Mongoose duplicate key error
        if (error.code === 11000) {
            const field = Object.keys(error.keyValue || {})[0];
            return res.status(409).json({
                success: false,
                message: `${field} already exists`,
            });
        }

        res.status(500).json({
            success: false,
            message: "An unexpected error occurred.",
            error: error.message,
        });
        next(error);
    }
};
