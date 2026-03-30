import AsyncStorage from "@react-native-async-storage/async-storage";

/** Written on each email/password (or equivalent) login; stable across Passcode unlock in the same session. */
export const ANNOUNCEMENT_LOGIN_SESSION_ID_KEY = "announcement_login_session_id";

/** When set to the same value as ANNOUNCEMENT_LOGIN_SESSION_ID_KEY, event/announcement modals are suppressed until the next login. */
export const ANNOUNCEMENTS_SHOWN_FOR_LOGIN_SESSION_KEY =
  "announcements_shown_for_login_session_id";

export const ANNOUNCEMENT_SESSION_ASYNC_KEYS = [
  ANNOUNCEMENT_LOGIN_SESSION_ID_KEY,
  ANNOUNCEMENTS_SHOWN_FOR_LOGIN_SESSION_KEY,
] as const;

function newSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/** Call after a fresh email/password login, registration, or silent re-login — shows announcements once for this session. */
export async function startNewAnnouncementLoginSession(): Promise<void> {
  const id = newSessionId();
  await AsyncStorage.setItem(ANNOUNCEMENT_LOGIN_SESSION_ID_KEY, id);
  await AsyncStorage.removeItem(ANNOUNCEMENTS_SHOWN_FOR_LOGIN_SESSION_KEY);
}

/** Ensure a session id exists (e.g. Passcode-only restore); does not reset the “already shown” flag. */
export async function ensureAnnouncementLoginSessionId(): Promise<string> {
  const existing = await AsyncStorage.getItem(ANNOUNCEMENT_LOGIN_SESSION_ID_KEY);
  if (existing) return existing;
  const id = newSessionId();
  await AsyncStorage.setItem(ANNOUNCEMENT_LOGIN_SESSION_ID_KEY, id);
  return id;
}

/** After the user dismisses or finishes the last announcement in the queue for this login session. */
export async function markAnnouncementsShownForCurrentLoginSession(): Promise<void> {
  const id = await AsyncStorage.getItem(ANNOUNCEMENT_LOGIN_SESSION_ID_KEY);
  if (id) {
    await AsyncStorage.setItem(ANNOUNCEMENTS_SHOWN_FOR_LOGIN_SESSION_KEY, id);
  }
}
