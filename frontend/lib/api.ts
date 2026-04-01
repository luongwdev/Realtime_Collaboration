export type ApiEnvelope<T> = {
  data: T;
  statusCode: number;
  message: string;
};

export type AuthPayload = {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
  };
};

export type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://3.27.72.228:4321";

export const getApiBaseUrl = () => API_BASE_URL;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<ApiEnvelope<T>> {
  const headers = new Headers(options.headers ?? {});
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError(
      `Không thể kết nối API (${API_BASE_URL}). Kiểm tra backend đang chạy và NEXT_PUBLIC_API_URL.`,
      0,
    );
  }

  const text = await res.text();
  let raw: ApiEnvelope<T> | null = null;
  try {
    raw = JSON.parse(text) as ApiEnvelope<T>;
  } catch {
    raw = null;
  }

  if (!raw) {
    throw new ApiError(
      `API response is not JSON. Kiểm tra NEXT_PUBLIC_API_URL (${API_BASE_URL}) và backend đang chạy đúng cổng.`,
      res.status,
    );
  }

  if (!res.ok) {
    throw new ApiError(raw?.message || "Request failed", res.status);
  }
  return raw;
}

export const api = {
  register: (body: {
    email: string;
    password: string;
    fullName: string;
    displayName: string;
    timezone?: string;
    avatarUrl?: string;
  }) =>
    request<AuthPayload>("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  login: (body: { email: string; password: string }) =>
    request<AuthPayload>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  refresh: (refreshToken: string) =>
    request<AuthPayload>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }),

  me: (token: string) => request("/users/me", { method: "GET" }, token),

  workspaces: (token: string) =>
    request<Array<{ id: string; name: string }>>(
      "/workspaces",
      { method: "GET" },
      token,
    ),

  createWorkspace: (token: string, name: string) =>
    request<{ id: string; name: string }>(
      "/workspaces",
      {
        method: "POST",
        body: JSON.stringify({ name }),
      },
      token,
    ),

  workspaceMembers: (token: string, workspaceId: string) =>
    request<
      Array<{
        role: WorkspaceRole;
        joinedAt: string;
        user: {
          id: string;
          email: string;
          fullName: string;
          displayName: string;
          avatarUrl?: string | null;
        };
      }>
    >(`/workspaces/${workspaceId}/members`, { method: "GET" }, token),

  channels: (token: string, workspaceId: string) =>
    request<Array<{ id: string; name: string; type: string }>>(
      `/channels/workspace/${workspaceId}`,
      { method: "GET" },
      token,
    ),

  createChannel: (
    token: string,
    workspaceId: string,
    body: { name: string; type?: string },
  ) =>
    request<{ id: string; name: string }>(
      `/channels/workspace/${workspaceId}`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
      token,
    ),

  messages: (token: string, channelId: string) =>
    request<
      Array<{
        id: string;
        content: string;
        senderId: string;
        createdAt: string;
      }>
    >(`/channels/${channelId}/messages`, { method: "GET" }, token),

  tasks: (token: string, workspaceId: string) =>
    request<
      Array<{
        id: string;
        title: string;
        status: string;
        assigneeId: string | null;
      }>
    >(`/tasks/workspace/${workspaceId}`, { method: "GET" }, token),

  createTask: (
    token: string,
    workspaceId: string,
    body: { title: string; description?: string; assigneeId?: string },
  ) =>
    request(
      `/tasks/workspace/${workspaceId}`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
      token,
    ),

  documents: (token: string, workspaceId: string) =>
    request<Array<{ id: string; title: string; version: number }>>(
      `/documents/workspace/${workspaceId}`,
      { method: "GET" },
      token,
    ),

  createDocument: (
    token: string,
    workspaceId: string,
    body: { title: string; content?: string },
  ) =>
    request(
      `/documents/workspace/${workspaceId}`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
      token,
    ),

  notifications: (token: string) =>
    request<
      Array<{ id: string; type: string; isRead: boolean; createdAt: string }>
    >("/notifications", { method: "GET" }, token),

  summarizeChat: (token: string, channelId: string) =>
    request<{ summary: string; model: string }>(
      "/ai/summarize-chat",
      {
        method: "POST",
        body: JSON.stringify({ channelId }),
      },
      token,
    ),

  suggestReply: (token: string, message: string) =>
    request<{ suggestion: string; model: string }>(
      "/ai/suggest-reply",
      {
        method: "POST",
        body: JSON.stringify({ message }),
      },
      token,
    ),
};
