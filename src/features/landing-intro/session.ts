const attempted = new Set<string>();

export const sessionKey = (version: string) => `threadlabz:landing-intro:${version}`;

export function wasAttempted(version: string) {
  if (attempted.has(version)) return true;
  try {
    return sessionStorage.getItem(sessionKey(version)) === 'seen';
  } catch {
    return false;
  }
}

export function markAttempted(version: string) {
  attempted.add(version);
  try {
    sessionStorage.setItem(sessionKey(version), 'seen');
  } catch {
    // Private or storage-restricted browsing falls back to in-memory session state.
  }
}
