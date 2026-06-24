const API_BASE = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? '' : 'http://localhost:4000');

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(init?.headers ?? {})
    },
    ...init
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message ?? 'Request failed');
  }

  return response.json() as Promise<T>;
}

export function apiUrl(path: string) {
  return `${API_BASE}${path}`;
}
