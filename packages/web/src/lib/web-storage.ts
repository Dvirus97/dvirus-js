import { deserialize, serialize } from '@dvirus-js/utils';

/**
 * A utility to interact with Web Storage (localStorage or sessionStorage) with automatic serialization.
 *
 * > pass {initVal: x} to make get fn return `T`, otherwise `T | undefined`
 *
 * @template T - The type of the data being stored.
 * @param {string} key - The key under which the data is stored in the web storage.
 * @param {Object} [options] - Configuration options for the storage.
 * @param {Storage} [options.storage=localStorage] - The storage object to use (defaults to `localStorage`).
 * @returns {WebStorage<T>} An object containing methods to manage the stored data.
 */
export function webStorage<T extends Record<string, unknown>>(
  key: string,
  options?: { storage?: Storage },
): WebStorage<T>;

/**
 * A utility to interact with Web Storage (localStorage or sessionStorage) with automatic serialization.
 *
 * > pass {initVal: x} to make get fn return `T`, otherwise `T | undefined`
 *
 * @template T - The type of the data being stored.
 * @param {string} key - The key under which the data is stored in the web storage.
 * @param {Object} [options] - Configuration options for the storage.
 * @param {T} [options.initVal] - A default value to return if no value is found in storage.
 * @param {Storage} [options.storage=localStorage] - The storage object to use (defaults to `localStorage`).
 * @returns {WebStorage<T>} An object containing methods to manage the stored data.
 */
export function webStorage<T extends Record<string, unknown>>(
  key: string,
  options: { storage?: Storage; initVal: T },
): WebStorageWithInit<T>;

export function webStorage<T extends Record<string, unknown>>(
  key: string,
  options?: { storage?: Storage; initVal?: T },
): WebStorage<T> {
  const storage = options?.storage ?? localStorage;

  /**
   * Retrieves the value from storage.
   *
   * if in main function (webStorage) you pass `{initVal: x}` then get type is `T`. otherwise `T | undefined`
   *
   * @returns {T | undefined} The deserialized value from storage, or the default value if defined, otherwise undefined.
   */
  function get(): T | undefined {
    if (typeof window === 'undefined') return undefined;

    try {
      const item = storage.getItem(key);
      if (item === null) {
        return options?.initVal;
      }

      return deserialize(item) as T;
    } catch (error) {
      console.warn(`Failed to parse ${key} from storage`, error);
      return options?.initVal;
    }
  }

  /**
   * Serializes and saves the provided value to storage.
   *
   * @param {T} value - The value to store.
   */
  function set(value: T) {
    if (typeof window === 'undefined') return; // Guard for environment safety
    try {
      storage.setItem(key, serialize(value));
    } catch (error) {
      console.error('Failed to save value to storage', error);
    }
  }

  /**
   * Partially updates an object in storage by merging the new values with the existing ones.
   * Note: This assumes the stored value is an object.
   *
   * @param {Partial<T> | ((state: T) => Partial<T>)} value - The partial data to merge into the existing stored object, or a function that returns a partial update.
   */
  function update(value: Partial<T> | ((state: T) => Partial<T>)) {
    if (typeof window === 'undefined') return; // Guard for environment safety
    try {
      const current = get() ?? ({} as T);
      const delta = typeof value === 'function' ? value(current) : value;
      const updated = { ...current, ...delta };
      storage.setItem(key, serialize(updated));
    } catch (error) {
      console.error('Failed to update value in storage', error);
    }
  }

  /**
   * Removes the item associated with the key from storage.
   */
  function remove() {
    storage.removeItem(key);
  }
  return { get, set, remove, update };
}

/**
 * Represents the interface for interacting with a specific key in Web Storage.
 *
 * @template T - The type of the data being managed.
 */
export interface WebStorage<T> {
  /**
   * Method to retrieve data from storage.
   * @returns {T | undefined}
   */
  get: () => T | undefined;

  /**
   * Method to set/overwrite data in storage.
   * @param {T} value - The value to store.
   */
  set: (value: T) => void;
  /**
   * Method to remove data from storage.
   */
  remove: () => void;
  /**
   * Method to partially update an object in storage.
   * - if not exist - merge with `initVal` or empty object
   * @param {Partial<T> | ((state: T) => Partial<T>)} value - The partial update to apply, or a function that returns a partial update.
   */
  update: (value: Partial<T> | ((state: T) => Partial<T>)) => void;
}

/**
 * Represents the interface for interacting with a specific key in Web Storage.
 *
 * @template T - The type of the data being managed.
 */
export interface WebStorageWithInit<T> extends WebStorage<T> {
  /**
   * Method to retrieve data from storage.
   * @returns {T}
   */
  get: () => T;
}
