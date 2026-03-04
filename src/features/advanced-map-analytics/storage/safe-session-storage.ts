import type { StateStorage } from 'zustand/middleware';

export type SessionStorageOperation = 'get' | 'set' | 'remove';

export interface SessionStorageFailure {
  key: string;
  operation: SessionStorageOperation;
  errorMessage: string;
}

const inMemorySessionStorage = new Map<string, string>();
const storageFailureSubscribers = new Set<(failure: SessionStorageFailure) => void>();
const emittedFailureKeys = new Set<string>();

function emitStorageFailure(failure: SessionStorageFailure): void {
  const failureKey = `${failure.operation}:${failure.key}`;
  if (emittedFailureKeys.has(failureKey)) {
    return;
  }

  emittedFailureKeys.add(failureKey);

  for (const subscriber of storageFailureSubscribers) {
    subscriber(failure);
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown storage failure';
}

function isBrowserSessionStorageAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

export function subscribeToSessionStorageFailures(
  callback: (failure: SessionStorageFailure) => void
): () => void {
  storageFailureSubscribers.add(callback);

  return () => {
    storageFailureSubscribers.delete(callback);
  };
}

export function getSafeSessionStorageItem(key: string): string | null {
  if (!isBrowserSessionStorageAvailable()) {
    return inMemorySessionStorage.get(key) ?? null;
  }

  try {
    const value = window.sessionStorage.getItem(key);
    if (value !== null) {
      inMemorySessionStorage.set(key, value);
    }
    return value;
  } catch (error) {
    emitStorageFailure({
      key,
      operation: 'get',
      errorMessage: getErrorMessage(error),
    });

    return inMemorySessionStorage.get(key) ?? null;
  }
}

export function setSafeSessionStorageItem(key: string, value: string): void {
  inMemorySessionStorage.set(key, value);

  if (!isBrowserSessionStorageAvailable()) {
    return;
  }

  try {
    window.sessionStorage.setItem(key, value);
  } catch (error) {
    emitStorageFailure({
      key,
      operation: 'set',
      errorMessage: getErrorMessage(error),
    });
  }
}

export function removeSafeSessionStorageItem(key: string): void {
  inMemorySessionStorage.delete(key);

  if (!isBrowserSessionStorageAvailable()) {
    return;
  }

  try {
    window.sessionStorage.removeItem(key);
  } catch (error) {
    emitStorageFailure({
      key,
      operation: 'remove',
      errorMessage: getErrorMessage(error),
    });
  }
}

export function createSafeSessionStateStorage(): StateStorage {
  return {
    getItem: (key) => getSafeSessionStorageItem(key),
    setItem: (key, value) => setSafeSessionStorageItem(key, value),
    removeItem: (key) => removeSafeSessionStorageItem(key),
  };
}

