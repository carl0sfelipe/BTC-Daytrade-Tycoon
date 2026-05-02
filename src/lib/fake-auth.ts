const KEY = "ctp-auth-user";

export type FakeUser = { username: string; email: string };

export function getFakeUser(): FakeUser | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(KEY) || "null");
  } catch {
    return null;
  }
}

export function setFakeUser(u: FakeUser) {
  localStorage.setItem(KEY, JSON.stringify(u));
}

export function clearFakeUser() {
  localStorage.removeItem(KEY);
}
