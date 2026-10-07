import { getToken } from "./auth";
import { API_BASE_URL } from "./workspace";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errorCode?: string,
  ) {
    super(message);
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean; // attach the bearer token; default true
}

type InflightListener = (count: number) => void;

let inflight = 0;
const inflightListeners = new Set<InflightListener>();

function setInflight(next: number) {
  inflight = Math.max(0, next);
  inflightListeners.forEach((listener) => listener(inflight));
}

/** Subscribe to the number of API calls currently in flight. Returns an unsubscribe function. */
export function subscribeInflight(listener: InflightListener) {
  inflightListeners.add(listener);
  listener(inflight);
  return () => {
    inflightListeners.delete(listener);
  };
}

export function getInflightCount() {
  return inflight;
}

function beginRequest() {
  setInflight(inflight + 1);
}

function endRequest() {
  setInflight(inflight - 1);
}

/** Marks a raw upload/download as in flight so the global loader covers calls that cannot use {@link apiFetch}. */
export async function trackedFetch(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  beginRequest();
  try {
    return await fetch(input, init);
  } finally {
    endRequest();
  }
}

/** Thin fetch wrapper shared by every module - swap the base URL via env, nothing else changes. */
export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, auth = true } = options;

  if (!API_BASE_URL) {
    throw new ApiError("Workspace is not available on this site.", 503);
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  beginRequest();
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      let message = `Request failed with status ${response.status}`;
      let errorCode: string | undefined;
      try {
        const errorBody = await response.json();
        message = errorBody.message ?? message;
        errorCode = errorBody.errorCode;
      } catch {
        // response body wasn't JSON - fall back to the generic message above
      }
      throw new ApiError(message, response.status, errorCode);
    }

    if (response.status === 204) return undefined as T;
    const text = await response.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  } finally {
    endRequest();
  }
}

/** For raw `fetch()` calls that can't go through {@link apiFetch} (file upload/download, which
 * need FormData/blob handling) - extracts the backend's real error message from a failed
 * response instead of just reporting the HTTP status code. */
export async function extractErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const errorBody = await response.json();
    return errorBody.message ?? fallback;
  } catch {
    return fallback;
  }
}
