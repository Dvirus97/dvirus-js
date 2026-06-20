import { deserialize, serialize } from '@dvirus-js/utils';

/**
 * A utility to interact with Web Storage (localStorage or sessionStorage) with automatic serialization.
 *
 * @template T - The type of the data being stored.
 * @param {string} key - The key under which the data is stored in the web storage.
 * @param {Object} [options] - Configuration options for the storage.
 * @param {T} [options.defaultValue] - A default value to return if no value is found in storage.
 * @param {Storage} [options.storage=localStorage] - The storage object to use (defaults to `localStorage`).
 * @returns {WebStorage<T>} An object containing methods to manage the stored data.
 */
export function webStorage<T extends Record<string, unknown>>(
  key: string,
  options?: { storage?: Storage },
): WebStorage<T> {
  const storage = options?.storage ?? localStorage;

  /**
   * Retrieves the value from storage.
   *
   * @returns {T | undefined} The deserialized value from storage, or the default value if defined, otherwise undefined.
   */
  function get(): T | undefined;
  /**
   * Retrieves the value from storage with an overriding default value.
   *
   * @param {Object} config - Configuration for this specific retrieval.
   * @param {T} config.defaultValue - An overriding default value for this call.
   * @returns {T} The deserialized value from storage, or the provided default value.
   */
  function get(config: { defaultValue: T }): T;
  function get(config?: { defaultValue?: T }): T | undefined {
    if (typeof window === 'undefined') return undefined;

    try {
      return deserialize(
        storage.getItem(key) ?? serialize(config?.defaultValue),
      ) as T;
    } catch (error) {
      console.warn(`Failed to parse ${key} from storage`, error);
      return config?.defaultValue;
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
      const current = get();
      if (current) {
        const updated = typeof value === 'function' ? value(current) : value;
        storage.setItem(key, serialize({ ...current, ...updated }));
      }
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
   */
  get: {
    /**
     * @returns {T | undefined}
     */
    (): T | undefined;
    /**
     * @param {Object} config
     * @param {T} config.defaultValue
     * @returns {T}
     */
    (config: { defaultValue: T }): T;
  };
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
   * @param {Partial<T> | ((state: T) => Partial<T>)} value - The partial update to apply, or a function that returns a partial update.
   */
  update: (value: Partial<T> | ((state: T) => Partial<T>)) => void;
}
