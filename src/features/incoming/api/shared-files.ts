/** Files the service worker saved from the system share sheet (Web Share Target). Read once, then cleared. */
export function takeSharedFiles(): Promise<File[]> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve([]);
    const open = indexedDB.open("squished-share", 1);
    open.onupgradeneeded = () => open.result.createObjectStore("files", { autoIncrement: true });
    open.onerror = () => resolve([]);
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction("files", "readwrite");
      const store = tx.objectStore("files");
      const all = store.getAll();
      all.onsuccess = () => store.clear();
      tx.oncomplete = () => { db.close(); resolve((all.result as unknown[]).filter((f): f is File => f instanceof File)); };
      tx.onerror = () => { db.close(); resolve([]); };
    };
  });
}

/** Registers the service worker in production builds (installable app, offline use, share target). */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/sw.js").catch((err) => console.warn("[squished] service worker:", err));
}
