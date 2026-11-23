// Transport: echter Server (fetch mit Bearer-Token) oder Test-Server im Speicher (EXPO_PUBLIC_API_MOCK=1).
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Basis-URL der API. Zum lokalen Testen z. B. EXPO_PUBLIC_API_BASE=http://127.0.0.1:8788/api/v1 (wrangler dev).
export const API_BASE = (process.env.EXPO_PUBLIC_API_BASE || 'https://highrise-bots.com/api/v1').replace(/\/+$/, '');
export const SITE = 'https://highrise-bots.com';
export const MOCK = process.env.EXPO_PUBLIC_API_MOCK === '1';

/** Fehler der API: immer `{error, message}` mit HTTP-Status. status 0 = keine Verbindung. */
export class ApiError extends Error {
  code: string;
  status: number;
  constructor(status: number, code: string, message?: string) {
    super(message || code);
    this.status = status;
    this.code = code;
  }
}

// ---- Token (SecureStore; im Browser nur zum Entwickeln localStorage) ----
const KEY = 'hrbots.token';
let token: string | null = null;

export async function loadToken() {
  try {
    token = Platform.OS === 'web' ? localStorage.getItem(KEY) : await SecureStore.getItemAsync(KEY);
  } catch {
    token = null;
  }
  return token;
}

export async function saveToken(t: string | null) {
  token = t;
  try {
    if (Platform.OS === 'web') {
      if (t) localStorage.setItem(KEY, t);
      else localStorage.removeItem(KEY);
    } else if (t) await SecureStore.setItemAsync(KEY, t);
    else await SecureStore.deleteItemAsync(KEY);
  } catch {}
}

export const getToken = () => token;

// ---- globale Reaktion auf bestimmte Fehler (Sitzung setzt sie) ----
type Hooks = { unauthorized?: () => void; discordRequired?: () => void };
let hooks: Hooks = {};
export function setErrorHooks(h: Hooks) {
  hooks = h;
}

export type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
export type Handler = (method: Method, path: string, body: any, token: string | null) => Promise<any>;

async function httpRequest(method: Method, path: string, body: unknown): Promise<any> {
  let res: Response;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 20000);
  try {
    res = await fetch(API_BASE + path, {
      method,
      headers: {
        accept: 'application/json',
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: ctl.signal,
    });
  } catch {
    throw new ApiError(0, 'offline');
  } finally {
    clearTimeout(timer);
  }
  let data: any = null;
  try {
    data = await res.json();
  } catch {}
  if (!res.ok) {
    const code = data?.error || (res.status === 401 ? 'unauthorized' : res.status === 404 ? 'not_found' : 'server_error');
    throw new ApiError(res.status, code, data?.message);
  }
  return data;
}

let mockHandler: Handler | null = null;

function onApiError(e: unknown, path: string) {
  if (e instanceof ApiError) {
    if (e.code === 'unauthorized' && path !== '/auth/login' && path !== '/auth/register') hooks.unauthorized?.();
    if (e.code === 'discord_required') hooks.discordRequired?.();
  }
}

export async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  try {
    if (MOCK) {
      if (!mockHandler) mockHandler = (await import('./mock')).mockHandler;
      return (await mockHandler(method, path, body, token)) as T;
    }
    return (await httpRequest(method, path, body)) as T;
  } catch (e) {
    onApiError(e, path);
    throw e;
  }
}

/** Datei aus der Auswahl (expo-document-picker): `uri` auf dem iPhone, im Browser zusätzlich das File-Objekt. */
export type UploadFile = { uri: string; name: string; size: number | null; mimeType: string; file?: Blob | null };

/** multipart/form-data-Upload (Feld `file`), z. B. Autoplay-MP3s. Großzügige Zeit (bis 10 MB). */
export async function upload<T>(path: string, f: UploadFile, timeoutMs = 180000): Promise<T> {
  try {
    if (MOCK) {
      if (!mockHandler) mockHandler = (await import('./mock')).mockHandler;
      return (await mockHandler('POST', path, { __file: { name: f.name, size: f.size ?? 0, type: f.mimeType } }, token)) as T;
    }
    const form = new FormData();
    if (Platform.OS === 'web' && f.file) form.append('file', f.file, f.name);
    // React Native: {uri, name, type} wird als Datei gesendet
    else form.append('file', { uri: f.uri, name: f.name, type: f.mimeType } as unknown as Blob);
    let res: Response;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      res = await fetch(API_BASE + path, {
        method: 'POST',
        headers: { accept: 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: form,
        signal: ctl.signal,
      });
    } catch {
      throw new ApiError(0, 'offline');
    } finally {
      clearTimeout(timer);
    }
    let data: any = null;
    try {
      data = await res.json();
    } catch {}
    if (!res.ok) throw new ApiError(res.status, data?.error || 'server_error', data?.message);
    return data as T;
  } catch (e) {
    onApiError(e, path);
    throw e;
  }
}
