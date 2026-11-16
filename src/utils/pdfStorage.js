const DATABASE_NAME = "edidox-pdf-storage";
const STORE_NAME = "pdf-files";
const DATABASE_VERSION = 1;

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("PDF storage is unavailable."));
  });
}

async function runTransaction(mode, operation) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const request = operation(transaction.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("PDF storage operation failed."));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => {
      database.close();
      reject(transaction.error || new Error("PDF storage operation failed."));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error || new Error("PDF storage operation was cancelled."));
    };
  });
}

export function savePdfBlob(id, blob) {
  return runTransaction("readwrite", (store) => store.put(blob, id));
}

export function getPdfBlob(id) {
  return runTransaction("readonly", (store) => store.get(id));
}

export function deletePdfBlob(id) {
  return runTransaction("readwrite", (store) => store.delete(id));
}
