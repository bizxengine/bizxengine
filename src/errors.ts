export class BizXError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = "BizXError";
  }
}

export class SetupRequiredError extends BizXError {
  constructor() {
    super("BIZX_SETUP_REQUIRED", "SETUP_REQUIRED", 0);
  }
}

export class AuthenticationError extends BizXError {
  constructor() {
    super("BIZX_SETUP_REQUIRED", "AUTH_FAILED", 401);
  }
}

export class RateLimitError extends BizXError {
  constructor() {
    super("BIZX_RATE_LIMITED", "RATE_LIMITED", 429);
  }
}

export class ValidationError extends BizXError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR", 400);
  }
}

export class UnavailableError extends BizXError {
  constructor() {
    super("BIZX_UNAVAILABLE", "UNAVAILABLE", 503);
  }
}

export class ApiError extends BizXError {
  constructor(statusCode: number) {
    super("BIZX_REQUEST_FAILED", "API_ERROR", statusCode);
  }
}

const ONBOARDING_MESSAGE = `\u{1F510} BizXEngine setup required

It looks like your API key is not configured yet.

To get started:

1. Open BizXEngine dashboard
   https://app.bizxengine.com

2. Create or select your workspace

3. Go to API Keys

4. Generate a new API key

5. Add it to your MCP configuration:

   BIZX_API_KEY=your_api_key_here

Once added, restart your AI tool.

Your AI will then be able to remember, learn, and improve over time.`;

const RATE_LIMIT_MESSAGE = `\u26A0\uFE0F BizXEngine rate limit reached

Please wait a moment and try again.`;

const GENERIC_ERROR_MESSAGE = `Something went wrong while connecting to BizXEngine. Please try again.`;

export function formatError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message === "BIZX_SETUP_REQUIRED") {
      return ONBOARDING_MESSAGE;
    }
    if (error.message === "BIZX_RATE_LIMITED") {
      return RATE_LIMIT_MESSAGE;
    }
  }
  return GENERIC_ERROR_MESSAGE;
}
