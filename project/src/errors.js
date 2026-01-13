export class HttpError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function toErrorResponse(error) {
  if (error instanceof HttpError) {
    return {
      statusCode: error.statusCode,
      body: { error: { code: error.code, message: error.message } }
    };
  }

  return {
    statusCode: 500,
    body: { error: { code: "internal_error", message: "Internal server error" } }
  };
}

