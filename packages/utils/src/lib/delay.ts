
/**
 * Delay for a given time
 * @param ms - Time in milliseconds
 * @returns Promise
 */
export async function delay(ms: number) {
    return await new Promise((resolve) => setTimeout(resolve, ms));
}


/**
 * Clamp a value between a minimum and maximum value
 * @param min - Minimum value
 * @param value - Value
 * @param max - Maximum value
 * @returns Clamped value
 */
export function clamp(min: number, value: number, max: number): number {
    if (value < min) return min;
    if (value > max) return max;
    return value;
}

/**
 * Debounce a function
 * @param func - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => void>(
    func: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timer: ReturnType<typeof setTimeout>;

    return (...args: Parameters<T>) => {
        clearTimeout(timer);
        timer = setTimeout(() => func(...args), delay);
    };
}
