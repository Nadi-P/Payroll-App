import { useSyncExternalStore } from "react";

/**
 * Who is using the app. Until sign-in exists the user is picked in the sidebar and kept in this
 * browser; the API reads it from the X-User header and checks every change against its role.
 */
const KEY = "paypex:user";
const DEFAULT_USER = "u-ronit";
const listeners = new Set<() => void>();
let memory: string | null = null;

export function getUserId(): string {
  if (memory) return memory;
  if (typeof window === "undefined") return DEFAULT_USER;
  try {
    return window.localStorage.getItem(KEY) || DEFAULT_USER;
  } catch {
    return DEFAULT_USER;
  }
}

export function setUserId(id: string): void {
  try {
    window.localStorage.setItem(KEY, id);
  } catch {
    // Private windows can refuse storage; the choice then lasts until the page reloads.
  }
  memory = id;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useUserId(): string {
  return useSyncExternalStore(subscribe, () => memory ?? getUserId(), () => DEFAULT_USER);
}
