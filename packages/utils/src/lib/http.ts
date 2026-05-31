/* eslint-disable @typescript-eslint/no-explicit-any */

import { tryCatch } from './tryCatch';

export interface HttpError<TData = any> extends Error, _Response<TData> {}

export interface RequestInit extends globalThis.RequestInit {
  parse?: 'JSON' | 'TEXT' | 'BLOB' | 'ARRAYBUFFER';
}

interface _Response<T>
  extends Omit<
    globalThis.Response,
    'body' | 'json' | 'text' | 'blob' | 'arrayBuffer'
  > {
  data: T;
}

export type Response<T> = _Response<T>;

// eslint-disable-next-line @typescript-eslint/no-namespace
export declare namespace Http {
  export type Response<T> = _Response<T>;
}

let baseUrl = '';

export const HttpCodeNames = {
  100: 'Continue',
  101: 'Switching Protocols',
  102: 'Processing',
  103: 'Early Hints',
  200: 'OK',
  201: 'Created',
  202: 'Accepted',
  203: 'Non-Authoritative Information',
  204: 'No Content',
  205: 'Reset Content',
  206: 'Partial Content',
  207: 'Multi-Status',
  208: 'Already Reported',
  226: 'IM Used',
  300: 'Multiple Choices',
  301: 'Moved Permanently',
  302: 'Found',
  303: 'See Other',
  304: 'Not Modified',
  305: 'Use Proxy',
  307: 'Temporary Redirect',
  308: 'Permanent Redirect',
  400: 'Bad Request',
  401: 'Unauthorized',
  402: 'Payment Required',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  406: 'Not Acceptable',
  407: 'Proxy Authentication Required',
  408: 'Request Timeout',
  409: 'Conflict',
  410: 'Gone',
  411: 'Length Required',
  412: 'Precondition Failed',
  413: 'Payload Too Large',
  414: 'URI Too Long',
  415: 'Unsupported Media Type',
  416: 'Range Not Satisfiable',
  417: 'Expectation Failed',
  418: "I'm a teapot",
  421: 'Misdirected Request',
  422: 'Unprocessable Entity',
  423: 'Locked',
  424: 'Failed Dependency',
  425: 'Too Early',
  426: 'Upgrade Required',
  428: 'Precondition Required',
  429: 'Too Many Requests',
  431: 'Request Header Fields Too Large',
  451: 'Unavailable For Legal Reasons',
  500: 'Internal Server Error',
  501: 'Not Implemented',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
  505: 'HTTP Version Not Supported',
  506: 'Variant Also Negotiates',
  507: 'Insufficient Storage',
  508: 'Loop Detected',
  510: 'Not Extended',
  511: 'Network Authentication Required',
};

/**
 * A utility object for making HTTP requests.
 */
export const Http = {
  setBaseUrl: (url: string) => {
    baseUrl = url;
  },
  CodeNames: HttpCodeNames,
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
  ): Promise<Response<R>> {
    return await handleResponse<R>(
      () => fetch(baseUrl + url, options),
      options,
    );
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
  ): Promise<Response<R>> {
    return await handleResponse<R>(
      () =>
        fetch(baseUrl + url, {
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
   * Makes a DELETE request to the specified URL.
   *
   * @template R
   * @param {string} url - The URL to send the DELETE request to.
   * @param {RequestInit} [options] - Optional request options.
   * @returns {Promise<R>} The response data.
   * @throws {Error} If the response is not ok.
   */
  delete: async function <R = any>(
    url: string,
    options?: RequestInit,
  ): Promise<Response<R>> {
    return await handleResponse<R>(
      () =>
        fetch(baseUrl + url, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
          },
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
  ): Promise<Response<R>> {
    return await handleResponse<R>(
      () =>
        fetch(baseUrl + url, {
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
  ): Promise<Response<R>> {
    return await handleResponse<R>(
      () =>
        fetch(baseUrl + url, {
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
  res: () => Promise<globalThis.Response>,
  options?: RequestInit,
): Promise<Response<R>> {
  try {
    const response = await res();
    if (!response.ok) {
      const text = await response.text();
      const [data, dataError] = tryCatch(() => JSON.parse(text));

      const resError: HttpError<R> = Object.assign(response, {
        data: dataError ? text : data,
        name: `HTTP_${response.status}`,
        message:
          response.statusText ||
          HttpCodeNames[response.status as keyof typeof HttpCodeNames] ||
          `HTTP_${response.status}`,
      });

      throw resError;
    }

    if (options?.parse === 'JSON') {
      return Object.assign(response, {
        data: (await response.json()) as R,
      });
    } else if (options?.parse === 'TEXT') {
      return Object.assign(response, {
        data: (await response.text()) as R,
      });
    } else if (options?.parse === 'BLOB') {
      return Object.assign(response, {
        data: (await response.blob()) as R,
      });
    } else if (options?.parse === 'ARRAYBUFFER') {
      return Object.assign(response, {
        data: (await response.arrayBuffer()) as R,
      });
    }

    return Object.assign(response, {
      data: (await response.json()) as R,
    });
  } catch (error) {
    if (isResponse(error)) throw error as HttpError<R>;

    const resError: HttpError<R> = {
      data: error as R,
      ok: false,
      status: 0,
      statusText: 'NETWORK_ERROR',
      type: 'error',
      name: 'NetworkError',
      message: error instanceof Error ? error.message : String(error),
      headers: new Headers(),
      url: '',
      redirected: false,
      clone: () => resError as unknown as globalThis.Response,
      bodyUsed: false,
      formData: () => Promise.resolve(new FormData()),
    };
    throw resError;
  }
}

function isResponse(val: unknown): val is Response<unknown> {
  return (
    val !== null && typeof val === 'object' && 'data' in val && 'body' in val
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
