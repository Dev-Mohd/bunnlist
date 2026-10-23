import { NextResponse } from "next/server";
import { ApiError, type ApiErrorCode } from "./errors";

// Shared plumbing for the mobile v1 route handlers: read+parse the JSON body,
// run the handler, and translate thrown errors into the agreed status codes.
// Unexpected errors become an opaque 500 so internals never leak to the client.

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw ApiError.unprocessable("invalid_json");
  }
}

function isApiErrorShaped(err: unknown): err is { apiErrorCode: ApiErrorCode } {
  return !!err && typeof err === "object" && "apiErrorCode" in err;
}

export async function handle(fn: () => Promise<unknown>): Promise<NextResponse> {
  try {
    const body = await fn();
    return NextResponse.json(body, { status: 200 });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(err.toBody(), { status: err.status });
    }
    if (isApiErrorShaped(err)) {
      const api = new ApiError(err.apiErrorCode);
      return NextResponse.json(api.toBody(), { status: api.status });
    }
    console.error("mobile route error", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
