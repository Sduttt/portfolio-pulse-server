export const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An unexpected error occurred.",
      error: error.message,
    });
    next(error);
  }
};
