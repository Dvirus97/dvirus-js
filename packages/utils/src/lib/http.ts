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
    get: async function <R = any>(url: string, options?: RequestInit): Promise<R> {
        const response = await fetch(url, options);
        return await handleResponse(response);
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
    post: async function <R = any>(url: string, data: unknown, options?: RequestInit): Promise<R> {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...options?.headers,
            },
            body: JSON.stringify(data),
            ...options,
        });
        return await handleResponse(response);
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
    delete: async function <R = any>(url: string, id: string, options?: RequestInit): Promise<R> {
        const response = await fetch(url, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                ...options?.headers,
            },
            body: JSON.stringify({ id }),
            ...options,
        });
        return await handleResponse(response);
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
    patch: async function <R = any>(url: string, data: unknown, options?: RequestInit): Promise<R> {
        const response = await fetch(url, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                ...options?.headers,
            },
            body: JSON.stringify(data),
            ...options,
        });
        return await handleResponse(response);
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
    put: async function <R = any>(url: string, data: unknown, options?: RequestInit): Promise<R> {
        const response = await fetch(url, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                ...options?.headers,
            },
            body: JSON.stringify(data),
            ...options,
        });
        return await handleResponse(response);
    },
};

/**
 * Handles the response from a fetch request.
 *
 * @param {Response} response - The response object.
 * @returns {Promise<any>} The response data.
 * @throws {Error} If the response is not ok.
 */
async function handleResponse(response: Response): Promise<any> {
    if (!response.ok) throw new Error(`Error: ${response.statusText}`);
    return await response.json();
}


// usage example
 async function main() {
    type Todo = {
        userId: number;
        id: number;
        title: string;
        completed: boolean;
    };
    const res = await http.get<Todo>("https://jsonplaceholder.typicode.com/todos/1");
    console.log(res);
 }