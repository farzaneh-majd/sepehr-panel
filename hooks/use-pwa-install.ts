import * as React from "react"

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null
let installed = false
let initialized = false
const listeners = new Set<() => void>()

const emit = () => listeners.forEach((listener) => listener())

export function initPwa() {
  if (initialized || typeof window === "undefined") return
  initialized = true

  window.addEventListener("beforeinstallprompt", (event) => {
    deferredPrompt = event as BeforeInstallPromptEvent
    emit()
  })
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null
    installed = true
    emit()
  })

  if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
    navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" })
      .then((registration) => registration.update())
      .catch((error) => console.error("Service worker registration failed:", error))
  }

  if ("caches" in window) {
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("awan-")).map((key) => caches.delete(key))))
      .catch(() => {})
  }
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

const getSnapshot = () => {
  if (installed) return "installed"
  if (deferredPrompt) return "prompt"
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
  if (standalone) return "installed"
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  return ios ? "ios" : "unavailable"
}

const getServerSnapshot = () => "unavailable"

export function usePwaInstall() {
  const status = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) as "installed" | "prompt" | "ios" | "unavailable"

  const install = React.useCallback(async () => {
    if (!deferredPrompt) return false
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    deferredPrompt = null
    emit()
    return outcome === "accepted"
  }, [])

  return { status, install }
}
