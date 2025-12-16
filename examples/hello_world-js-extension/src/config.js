module.exports = {
    // UDP port to send messages to
    PORT: process.env.PORT || 5000,

    // Host address for UDP messages
    HOST: '127.0.0.1',

    /**
     * Interval (ms) between sending UDP messages.
     * Controls how often the device info is sent.
     */
    SEND_INTERVAL_MS: 5000,

    /**
     * Startup delay (ms) before starting the main interval.
     * Should be a conservative time to ensure the BrightSign JS APIs become available.
     */
    STARTUP_DELAY_MS: 60000
};
