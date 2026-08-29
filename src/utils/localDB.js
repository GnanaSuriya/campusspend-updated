const DB_NAME = 'CampusSpendDB';
const DB_VERSION = 1;

export const STORES = {
  TRANSACTIONS: 'transactions',
  BUDGETS: 'budgets',
  SHARED_EXPENSES: 'shared_expenses',
  SYNC_QUEUE: 'sync_queue', // For offline writes
};

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORES.TRANSACTIONS)) {
        db.createObjectStore(STORES.TRANSACTIONS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.BUDGETS)) {
        db.createObjectStore(STORES.BUDGETS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.SHARED_EXPENSES)) {
        db.createObjectStore(STORES.SHARED_EXPENSES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'queue_id', autoIncrement: true });
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

// Universal get/set for caches
export async function getLocalCache(storeName) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("LocalDB Read Error:", e);
    return [];
  }
}

export async function setLocalCache(storeName, dataArray) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      
      // Clear old cache first to avoid stale data
      store.clear().onsuccess = () => {
        dataArray.forEach(item => {
          if (item.id) store.put(item);
        });
      };
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (e) {
    console.error("LocalDB Write Error:", e);
  }
}

// Queue mechanism for offline writes
export async function addToSyncQueue(endpoint, method, payload) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
      const store = transaction.objectStore(STORES.SYNC_QUEUE);
      store.add({
        endpoint,
        method,
        payload,
        timestamp: new Date().toISOString()
      });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (e) {
    console.error("Sync Queue Write Error:", e);
  }
}

export async function getSyncQueue() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.SYNC_QUEUE, 'readonly');
      const store = transaction.objectStore(STORES.SYNC_QUEUE);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    return [];
  }
}

export async function clearSyncQueueItem(queue_id) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
      const store = transaction.objectStore(STORES.SYNC_QUEUE);
      store.delete(queue_id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (e) {
    console.error(e);
  }
}
