/**
 * 404 Not Found Middleware
 * Returns pure JSON — no backend HTML pages or default error views.
 */
export const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Resource not found at ${req.originalUrl}`,
  });
};

/**
 * Global Error Handler Middleware
 * Formats errors consistently as JSON.
 */
export const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? (err.statusCode || 500) : res.statusCode;
  // Client mistakes (schema validation, bad ids, malformed JSON) are 4xx, never 500.
  if (statusCode >= 500 && (err.name === 'ValidationError' || err.name === 'CastError' || err.type === 'entity.parse.failed')) {
    statusCode = 400;
  }
  if (statusCode >= 500 && err.code === 11000) statusCode = 409;

  const response = {
    success: false,
    message: err.message || 'Internal Server Error',
  };

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    response.errors = Object.values(err.errors).map((e) => e.message);
  }

  // Mongoose CastError (bad ObjectId)
  if (err.name === 'CastError') {
    response.message = `Invalid resource identifier: ${err.value}`;
  }

  // MongoDB duplicate key error
  if (err.code === 11000) {
    response.message = 'Duplicate field value entered';
  }

  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

