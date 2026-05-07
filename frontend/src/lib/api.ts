const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// Access token lives in memory — never written to localStorage directly.
// The useAuth hook owns persistence (sets this via setAccessToken on login/refresh).
let _accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  _accessToken = token;
}

export function getAccessToken(): string | null {
  return _accessToken;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, headers: extraHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(extraHeaders as Record<string, string>),
  };

  if (_accessToken) {
    headers["Authorization"] = `Bearer ${_accessToken}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new ApiError(response.status, payload.detail ?? "Request failed");
  }

  return response.json() as Promise<T>;
}

/**
 * Authenticated download — fetches the resource as a Blob and triggers a
 * browser download with the given filename. Used for ICS exports.
 */
export async function apiDownload(path: string, filename: string): Promise<void> {
  const headers: Record<string, string> = {};
  if (_accessToken) headers["Authorization"] = `Bearer ${_accessToken}`;

  const response = await fetch(`${API_BASE}${path}`, { headers });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ detail: "Download failed" }));
    throw new ApiError(response.status, payload.detail ?? "Download failed");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
