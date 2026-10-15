// db.js - Databázové jádro IndexedDB a finanční pomocníci

const DB_NAME = 'KolobeznikRozpocetDB';
const DB_VERSION = 1;

// --- POMOCNÉ FUNKCE PRO PŘESNÉ FINANČNÍ VÝPOČTY (V HALÉŘÍCH) ---

/**
 * Převede koruny (např. 150 nebo 139.90 nebo "139,90") na celé haléře
 */
export function toCents(amount) {
  if (amount === null || amount === undefined || amount === '') return 0;
  if (typeof amount === 'string') {
    amount = amount.replace(/\s/g, '').replace(',', '.');
  }
  const num = parseFloat(amount);
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

/**
 * Převede haléře na formátovanou částku v Kč (český formát)
 */
export function formatKc(cents) {
  const crowns = (cents || 0) / 100;
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    minimumFractionDigits: crowns % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  }).format(crowns);
}

// --- OTEVŘENÍ A INICIALIZACE INDEXEDDB ---

export function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Chyba při otevírání IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // 1. Šablony pravidelných měsíčních výdajů
      if (!db.objectStoreNames.contains('recurring_templates')) {
        db.createObjectStore('recurring_templates', { keyPath: 'id', autoIncrement: true });
      }

      // 2. Měsíční záznamy plateb (konkrétní výdaje v daném měsíci)
      if (!db.objectStoreNames.contains('monthly_expenses')) {
        const store = db.createObjectStore('monthly_expenses', { keyPath: 'id', autoIncrement: true });
        store.createIndex('period', 'period', { unique: false }); // např. "2026-10"
      }

      // 3. Příjmy
      if (!db.objectStoreNames.contains('incomes')) {
        const store = db.createObjectStore('incomes', { keyPath: 'id', autoIncrement: true });
        store.createIndex('period', 'period', { unique: false });
      }

      // 4. Moje dluhy a půjčky (Provident, AvaFin...)
      if (!db.objectStoreNames.contains('debts_payable')) {
        db.createObjectStore('debts_payable', { keyPath: 'id', autoIncrement: true });
      }

      // 5. Pohledávky - co mi dluží ostatní (Jiří, Kov, Magda...)
      if (!db.objectStoreNames.contains('debts_receivable')) {
        db.createObjectStore('debts_receivable', { keyPath: 'id', autoIncrement: true });
      }

      // 6. Finanční cíle a rezerva
      if (!db.objectStoreNames.contains('savings_goals')) {
        db.createObjectStore('savings_goals', { keyPath: 'id', autoIncrement: true });
      }

      // 7. Zůstatky účtů (hotovost, běžný účet, spořicí účet)
      if (!db.objectStoreNames.contains('accounts')) {
        db.createObjectStore('accounts', { keyPath: 'id', autoIncrement: true });
      }

      // 8. Nastavení a metadata
      if (!db.objectStoreNames.contains('app_state')) {
        db.createObjectStore('app_state', { keyPath: 'key' });
      }
    };
  });
}

// --- GENERICKÉ METODY PRO PRÁCI S DATY ---

export async function dbGetAll(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function dbAdd(storeName, item) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.add(item);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function dbPut(storeName, item) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(item);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function dbDelete(storeName, id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
