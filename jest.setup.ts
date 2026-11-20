// inspect comments : suggested jest setup (comments stay for clarifying)
import "@testing-library/jest-dom";
// Import the jest function explicitly to avoid TS2708 errors
import { jest } from "@jest/globals";

// ---------- ResizeObserver ----------
class TestResizeObserver {
  observe(_target?: Element, _options?: unknown): void {}
  unobserve(_target?: Element): void {}
  disconnect(): void {}
}
// only define if missing
const g = globalThis as typeof globalThis & {
  ResizeObserver?: new (...args: unknown[]) => TestResizeObserver;
};
if (!g.ResizeObserver) {
  g.ResizeObserver = TestResizeObserver;
}

// ---------- matchMedia ----------
type MatchMediaFn = (query: string) => MediaQueryList;
if (!("matchMedia" in window)) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: ((query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // Fixed
      removeListener: jest.fn(), // Fixed
      addEventListener: jest.fn(), // Fixed
      removeEventListener: jest.fn(), // Fixed
      dispatchEvent: jest.fn(() => true),
    })) as MatchMediaFn,
  });
}

// ---------- scroll helpers ----------
if (!("scrollTo" in window)) {
  // window.scrollTo
  // @ts-expect-error jsdom doesn't implement it
  window.scrollTo = jest.fn(); // Fixed
}

// Element.prototype.scrollIntoView
if (!Element.prototype.scrollIntoView) {
  Object.defineProperty(Element.prototype, "scrollIntoView", {
    value: jest.fn(), // Fixed
    configurable: true,
  });
}

// ---------- optional: dialog APIs (if any component uses them) ----------
if (typeof HTMLDialogElement !== "undefined") {
  if (!(HTMLDialogElement.prototype as unknown as { show?: () => void }).show) {
    Object.defineProperty(HTMLDialogElement.prototype, "show", {
      value: jest.fn(), // Fixed
      configurable: true,
    });
  }
  if (
    !(HTMLDialogElement.prototype as unknown as { showModal?: () => void })
      .showModal
  ) {
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
      value: jest.fn(), // Fixed
      configurable: true,
    });
  }
  if (
    !(HTMLDialogElement.prototype as unknown as { close?: () => void }).close
  ) {
    Object.defineProperty(HTMLDialogElement.prototype, "close", {
      value: jest.fn(), // Fixed
      configurable: true,
    });
  }
}
