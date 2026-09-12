const DB_NAME = 'cleanflow-db'; const DB_VERSION = 1;
const STORES = ['staff', 'apartments', 'assignments', 'payments', 'settings'];
const request = result => new Promise((resolve, reject) => { result.onsuccess = () => resolve(result.result); result.onerror = () => reject(result.error); });
const complete = transaction => new Promise((resolve, reject) => { transaction.oncomplete = resolve; transaction.onerror = () => reject(transaction.error); transaction.onabort = () => reject(transaction.error || new Error('Database transaction was aborted.')); });
export class Store {
  async open() {
    const open = indexedDB.open(DB_NAME, DB_VERSION);
    open.onupgradeneeded = () => STORES.forEach(name => { if (!open.result.objectStoreNames.contains(name)) open.result.createObjectStore(name, { keyPath: 'id' }); });
    this.db = await request(open); return this;
  }
  async all(store) { return request(this.db.transaction(store).objectStore(store).getAll()); }
  async get(store, key) { return request(this.db.transaction(store).objectStore(store).get(key)); }
  async put(store, value) { const tx = this.db.transaction(store, 'readwrite'); tx.objectStore(store).put(value); await complete(tx); return value; }
  async delete(store, key) { const tx = this.db.transaction(store, 'readwrite'); tx.objectStore(store).delete(key); await complete(tx); }
  async data() { const values = await Promise.all(STORES.map(name => this.all(name))); return Object.fromEntries(STORES.map((name, index) => [name, values[index]])); }
  async replace(data) { const tx = this.db.transaction(STORES, 'readwrite'); STORES.forEach(name => { const store = tx.objectStore(name); store.clear(); data[name].forEach(value => store.put(value)); }); await complete(tx); }
}
