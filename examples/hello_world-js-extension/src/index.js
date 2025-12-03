const dgram = require('dgram');

const { PORT, HOST, SEND_INTERVAL_MS, STARTUP_DELAY_MS } = require('./config');

const udpSocket = dgram.createSocket('udp4');

function sendTimestamp() {
    const DeviceInfoClass = require('@brightsign/deviceinfo');
    const deviceInfo = new DeviceInfoClass();

    const message = Buffer.from(
        `Hello World! from ${deviceInfo.serialNumber}: ${new Date().toISOString()}`
    );
    console.log('Sending UDP message:', message.toString());

    udpSocket.send(message, PORT, HOST, (err) => {
        if (err) {
            console.error('UDP send error:', err);
        }
    });
}

function main() {
    let appInterval;
    console.log('Waiting for BrightSign app to load ...');
    setTimeout(() => {
        appInterval = setInterval(sendTimestamp, SEND_INTERVAL_MS);
    }, STARTUP_DELAY_MS);

    process.on('SIGINT', () => {
        console.log('Received SIGINT. Exiting...');
        clearInterval(appInterval);
        udpSocket.close();
        process.exit();
    });

    process.on('SIGTERM', () => {
        console.log('Received SIGTERM. Exiting...');
        clearInterval(appInterval);
        udpSocket.close();
        process.exit();
    });
}

main();
