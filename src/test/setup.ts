import "@testing-library/jest-dom";
import { afterEach } from "vitest";
import { resetStore } from "./resetStore";

// Mock localStorage for zustand persist
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

afterEach(() => {
  window.localStorage.clear();
  resetStore();
});
