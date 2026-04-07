import { randomUUID } from "node:crypto";
import {
  AuthenticationError,
  RateLimitError,
  UnavailableError,
  ApiError,
  BizXError,
  SetupRequiredError,
} from "./errors.js";
import { resolveApiKey } from "./setup.js";

const DEFAULT_BASE_URL = "https://api.bizxengine.com";
const TIMEOUT_MS = 10_000;
const MAX_RETRIES = 2;
const RETRY_DELAYS_MS = [300, 800];
const RETRYABLE_STATUS_CODES = new Set([502, 503, 504]);

export class BizXClient {
  private apiKey: string | undefined;
  readonly baseUrl: string;

  constructor() {
    this.apiKey = resolveApiKey();
    this.baseUrl = this.resolveBaseUrl();
  }

  setApiKey(key: string): void {
    this.apiKey = key;
  }

  private resolveBaseUrl(): string {
    const override = process.env.BIZX_BASE_URL;
    if (!override) return DEFAULT_BASE_URL;

    const url = override.replace(/\/+$/, "");
    const isDev = process.env.NODE_ENV === "development";
    const isOfficialDomain = url.startsWith("https://api.bizxengine.com");

    if (!url.startsWith("https://") && !isDev) {
      return DEFAULT_BASE_URL;
    }

    if (!isDev && !isOfficialDomain) {
      return DEFAULT_BASE_URL;
    }

    return url;
  }

  get baseHost(): string {
    try {
      return new URL(this.baseUrl).host;
    } catch {
      return "unknown";
    }
  }

  get authConfigured(): boolean {
    return !!this.apiKey && this.apiKey.length > 0;
  }

  private ensureAuth(): void {
    if (!this.apiKey) {
      throw new SetupRequiredError();
    }
  }

  private buildHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "BizXEngine-MCP/1.0",
      "X-BizX-Client": "mcp",
      "X-BizX-Version": "1.0",
      "X-BizX-Request-ID": randomUUID(),
    };
  }

  async post<T = unknown>(path: string, body: unknown): Promise<T> {
    this.ensureAuth();
    return this.requestWithRetry<T>("POST", path, body);
  }

  async get<T = unknown>(path: string): Promise<T> {
    this.ensureAuth();
    return this.requestWithRetry<T>("GET", path);
  }

  private async requestWithRetry<T>(
    method: "GET" | "POST",
    path: string,
    body?: unknown
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const delay = RETRY_DELAYS_MS[attempt - 1] ?? 800;
        await new Promise((r) => setTimeout(r, delay));
      }

      try {
        return await this.doRequest<T>(method, path, body);
      } catch (error) {
        if (error instanceof AuthenticationError || error instanceof RateLimitError) {
          throw error;
        }
        if (error instanceof BizXError && error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
          throw error;
        }
        if (error instanceof UnavailableError || this.isRetryable(error)) {
          lastError = error as Error;
          continue;
        }
        throw error;
      }
    }

    if (lastError instanceof UnavailableError) throw lastError;
    throw new UnavailableError();
  }

  private isRetryable(error: unknown): boolean {
    if (error instanceof DOMException && error.name === "AbortError") return true;
    if (error instanceof TypeError) return true;
    if (error instanceof ApiError && error.statusCode && RETRYABLE_STATUS_CODES.has(error.statusCode)) return true;
    return false;
  }

  private async doRequest<T>(
    method: "GET" | "POST",
    path: string,
    body?: unknown
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const options: RequestInit = {
        method,
        headers: this.buildHeaders(),
        signal: controller.signal,
      };
      if (method === "POST" && body !== undefined) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(`${this.baseUrl}${path}`, options);

      if (!response.ok) {
        this.handleHttpError(response.status);
      }

      const text = await response.text();
      if (!text) return {} as T;

      try {
        return JSON.parse(text) as T;
      } catch {
        return {} as T;
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  private handleHttpError(status: number): never {
    if (status === 401) throw new AuthenticationError();
    if (status === 429) throw new RateLimitError();
    if (RETRYABLE_STATUS_CODES.has(status)) throw new UnavailableError();
    throw new ApiError(status);
  }
}
