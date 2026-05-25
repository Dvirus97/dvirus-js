/* eslint-disable @typescript-eslint/no-explicit-any */

export type HttpError = Error & {
  status?: number;
  statusText?: string;
  body?: string;
  code?: string;
  isNetworkError?: boolean;
  cause?: unknown;
};

export interface RequestInit extends globalThis.RequestInit {
  parse?: 'JSON' | 'TEXT' | 'BLOB' | 'ARRAYBUFFER';
}

/**
 * A utility object for making HTTP requests.
 */
export const http = {
  /**
   * Makes a GET request to the specified URL.
   *
   * @param {string} url - The URL to send the GET request to.
   * @param {RequestInit} [options] - Optional request options.
   * @returns {Promise<any>} The response data.
   * @throws {Error} If the response is not ok.
   */
  get: async function <R = any>(
    url: string,
    options?: RequestInit,
  ): Promise<R> {
    return await handleResponse<R>(() => fetch(url, options), options);
  },

  /**
   * Makes a POST request to the specified URL with the given data.
   *
   * @template R
   * @param {string} url - The URL to send the POST request to.
   * @param {unknown} data - The data to send in the request body.
   * @param {RequestInit} [options] - Optional request options.
   * @returns {Promise<R>} The response data.
   * @throws {Error} If the response is not ok.
   */
  post: async function <R = any>(
    url: string,
    data: unknown,
    options?: RequestInit,
  ): Promise<R> {
    return await handleResponse<R>(
      () =>
        fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
          },
          body: JSON.stringify(data),
          ...options,
        }),
      options,
    );
  },

  /**
   * Makes a DELETE request to the specified URL with the given ID.
   *
   * @template R
   * @param {string} url - The URL to send the DELETE request to.
   * @param {string} id - The ID to send in the request body.
   * @param {RequestInit} [options] - Optional request options.
   * @returns {Promise<R>} The response data.
   * @throws {Error} If the response is not ok.
   */
  delete: async function <R = any>(
    url: string,
    id: string,
    options?: RequestInit,
  ): Promise<R> {
    return await handleResponse<R>(
      () =>
        fetch(url, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
          },
          body: JSON.stringify({ id }),
          ...options,
        }),
      options,
    );
  },

  /**
   * Makes a PATCH request to the specified URL with the given data.
   *
   * @template R
   * @param {string} url - The URL to send the PATCH request to.
   * @param {unknown} data - The data to send in the request body.
   * @param {RequestInit} [options] - Optional request options.
   * @returns {Promise<R>} The response data.
   * @throws {Error} If the response is not ok.
   */
  patch: async function <R = any>(
    url: string,
    data: unknown,
    options?: RequestInit,
  ): Promise<R> {
    return await handleResponse<R>(
      () =>
        fetch(url, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
          },
          body: JSON.stringify(data),
          ...options,
        }),
      options,
    );
  },

  /**
   * Makes a PUT request to the specified URL with the given data.
   *
   * @template R
   * @param {string} url - The URL to send the PUT request to.
   * @param {unknown} data - The data to send in the request body.
   * @param {RequestInit} [options] - Optional request options.
   * @returns {Promise<R>} The response data.
   * @throws {Error} If the response is not ok.
   */
  put: async function <R = any>(
    url: string,
    data: unknown,
    options?: RequestInit,
  ): Promise<R> {
    return await handleResponse<R>(
      () =>
        fetch(url, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
          },
          body: JSON.stringify(data),
          ...options,
        }),
      options,
    );
  },
};

/**
 * Handles the response from a fetch request.
 *
 * @param {() => Promise<Response>} res - A function that returns a promise resolving to a response object.
 * @param {RequestInit} [options] - Optional request options.
 * @returns {Promise<any>} The response data.
 * @throws {Error} If the response is not ok.
 */
async function handleResponse<R>(
  res: () => Promise<Response>,
  options?: RequestInit,
): Promise<R> {
  try {
    const response = await res();
    if (!response.ok) {
      const bodyText = await response.text().catch(() => '');
      const httpError = Object.assign(
        new Error(`HTTP ${response.status} ${response.statusText}`),
        {
          status: response.status,
          statusText: response.statusText,
          body: bodyText,
        },
      );
      throw httpError as HttpError;
    }
    if (options?.parse === 'JSON') {
      return (await response.json()) as R;
    } else if (options?.parse === 'TEXT') {
      return (await response.text()) as unknown as R;
    } else if (options?.parse === 'BLOB') {
      return (await response.blob()) as unknown as R;
    } else if (options?.parse === 'ARRAYBUFFER') {
      return (await response.arrayBuffer()) as unknown as R;
    }
    return (await response.json()) as R;
  } catch (error) {
    if (isHttpError(error)) {
      throw error;
    }

    const networkError = Object.assign(
      new Error(
        error instanceof Error ? error.message : 'Network request failed',
      ),
      {
        status: getErrorStatus(error),
        statusText: 'NETWORK_ERROR',
        code: getErrorCode(error),
        isNetworkError: true,
        cause: error,
      },
    );
    throw networkError as HttpError;
  }
}

function getErrorStatus(error: unknown): number | undefined {
  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number'
  ) {
    return error.status;
  }
  return undefined;
}

function getErrorCode(error: unknown): string | undefined {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
  ) {
    return error.code;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'cause' in error &&
    typeof error.cause === 'object' &&
    error.cause !== null &&
    'code' in error.cause &&
    typeof error.cause.code === 'string'
  ) {
    return error.cause.code;
  }

  return undefined;
}

function isHttpError(error: unknown): error is HttpError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number'
  );
}

// usage example
// async function main() {
//   type Todo = {
//     userId: number;
//     id: number;
//     title: string;
//     completed: boolean;
//   };
//   const res = await http.get<Todo>(
//     'https://jsonplaceholder.typicode.com/todos/1',
//   );
//   console.log(res);
// }
