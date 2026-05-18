import { logger } from "../utils/logger.js";

export const errorHandler = (err, req, res, next) => {
  logger.error("Error occurred:", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  // Default error
  const error = {
    error: "Internal server error",
    message: "An unexpected error occurred",
  };

  // Handle specific error types
  if (err.name === "ValidationError") {
    error.error = "Validation error";
    error.message = err.message;
    return res.status(400).json(error);
  }

  if (err.name === "UnauthorizedError") {
    error.error = "Unauthorized";
    error.message = "Authentication failed";
    return res.status(401).json(error);
  }

  if (err.name === "JsonWebTokenError") {
    error.error = "Unauthorized";
    error.message = "Invalid token";
    return res.status(401).json(error);
  }

  if (err.name === "TokenExpiredError") {
    error.error = "Unauthorized";
    error.message = "Token expired";
    return res.status(401).json(error);
  }

  if (err.code === "LIMIT_FILE_SIZE") {
    error.error = "File too large";
    error.message = "The uploaded file exceeds the size limit";
    return res.status(413).json(error);
  }

  // Return 500 for unhandled errors
  res.status(500).json(error);
};

export const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: "Not found",
    message: `Route ${req.method} ${req.path} not found`,
  });
};
