// The mobile API error contract shared with the iOS client (BunnListCore.APIError):
// 401/403/409/422/429. Keep these codes in lockstep with the Swift side.

export type ApiErrorCode =
  | "unauthorized"
  | "forbidden"
  | "conflict"
  | "unprocessable"
  | "rateLimited";

const STATUS: Record<ApiErrorCode, number> = {
  unauthorized: 401,
  forbidden: 403,
  conflict: 409,
  unprocessable: 422,
  rateLimited: 429,
};

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  /** Optional machine-readable reason; never leak whether an email/account exists. */
  readonly reason?: string;

  constructor(code: ApiErrorCode, reason?: string) {
    super(code);
    this.name = "ApiError";
    this.code = code;
    this.status = STATUS[code];
    this.reason = reason;
  }

  static unauthorized(reason?: string) { return new ApiError("unauthorized", reason); }
  static forbidden(reason?: string) { return new ApiError("forbidden", reason); }
  static conflict(reason?: string) { return new ApiError("conflict", reason); }
  static unprocessable(reason?: string) { return new ApiError("unprocessable", reason); }
  static rateLimited(reason?: string) { return new ApiError("rateLimited", reason); }

  /** The JSON body returned to the client. Reason is included only when safe to expose. */
  toBody(): { error: ApiErrorCode; reason?: string } {
    return this.reason ? { error: this.code, reason: this.reason } : { error: this.code };
  }
}

export function statusForCode(code: ApiErrorCode): number {
  return STATUS[code];
}
