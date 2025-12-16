import * as dgram from 'dgram';
import { PORT, HOST, SEND_INTERVAL_MS, STARTUP_DELAY_MS } from './config';

const udpSocket = dgram.createSocket('udp4');

function sendTimestamp(): void {
    // Import BrightSign DeviceInfo API (available at runtime on the player)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const DeviceInfoClass = require('@brightsign/deviceinfo');
    const deviceInfo = new DeviceInfoClass();

    const message = Buffer.from(
        `Hello World! from ${deviceInfo.serialNumber}: ${new Date().toISOString()}`
    );
    console.log('Sending UDP message:', message.toString());

    udpSocket.send(message, PORT, HOST, (err: Error | null) => {
        if (err) {
            console.error('UDP send error:', err);
        }
    });
}

function main(): void {
    let appInterval: NodeJS.Timeout | undefined;
    console.log('Hello World TypeScript Extension starting...');
    console.log(`Waiting ${STARTUP_DELAY_MS / 1000} seconds for BrightSign APIs to load...`);

    setTimeout(() => {
        console.log(`Starting UDP broadcast to ${HOST}:${PORT} every ${SEND_INTERVAL_MS / 1000} seconds`);
        appInterval = setInterval(sendTimestamp, SEND_INTERVAL_MS);
    }, STARTUP_DELAY_MS);

    process.on('SIGINT', () => {
        console.log('Received SIGINT. Exiting...');
        if (appInterval) clearInterval(appInterval);
        udpSocket.close();
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        console.log('Received SIGTERM. Exiting...');
        if (appInterval) clearInterval(appInterval);
        udpSocket.close();
        process.exit(0);
    });
}

main();
