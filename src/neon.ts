import { createAuthClient } from '@neondatabase/neon-js/auth';
import { BetterAuthReactAdapter } from '@neondatabase/neon-js/auth/react/adapters';

export const authClient = createAuthClient(import.meta.env.VITE_NEON_AUTH_URL, {
  adapter: BetterAuthReactAdapter(),
});

async function getBearerToken() {
  const { data, error } = await authClient.getSession();
  if (error || !data?.session?.token) {
    throw new Error('Sessiya tugagan. Iltimos, qayta kiring.');
  }
  return data.session.token;
}

async function authenticatedRequest<T>(method: 'GET' | 'PUT' | 'DELETE', body?: unknown): Promise<T> {
  const token = await getBearerToken();
  const response = await fetch('/api/notebooks', {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(result?.error || 'Daftarlarni saqlashda xatolik yuz berdi.');
  }

  return response.json() as Promise<T>;
}

export function fetchNotebooks() {
  return authenticatedRequest<{ notebooks: import('./types/notebook').NotebookDoc[] }>('GET').then(
    (result) => result.notebooks
  );
}

let notebookSaveQueue: Promise<void> = Promise.resolve();

export function saveNotebooks(notebooks: import('./types/notebook').NotebookDoc[]) {
  const save = notebookSaveQueue
    .catch(() => undefined)
    .then(() => authenticatedRequest<{ saved: boolean }>('PUT', { notebooks }));
  notebookSaveQueue = save.then(() => undefined, () => undefined);
  return save;
}

export function deleteNotebookFromServer(id: string) {
  return authenticatedRequest<{ deleted: boolean }>('DELETE', { id });
}
