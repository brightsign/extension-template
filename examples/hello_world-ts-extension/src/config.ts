/**
 * Configuration for the Hello World TypeScript Extension
 */

/** UDP port to send messages to */
export const PORT: number = parseInt(process.env.PORT || '5000', 10);

/** Host address for UDP messages */
export const HOST: string = '127.0.0.1';

/**
 * Interval (ms) between sending UDP messages.
 * Controls how often the device info is sent.
 */
export const SEND_INTERVAL_MS: number = 5000;

/**
 * Startup delay (ms) before starting the main interval.
 * Should be a conservative time to ensure the BrightSign JS APIs become available.
 * The BrightSign Node.js runtime needs time to initialize before APIs are accessible.
 */
export const STARTUP_DELAY_MS: number = 60000;
