# Hello World JavaScript Extension

This example demonstrates how to build a JavaScript/Node.js extension for BrightSign players. The extension broadcasts "Hello World" messages with device information over UDP.

## Prerequisites

**This example does NOT require the BrightSign SDK** because it uses the Node.js runtime already available on the player.

### Requirements

- Node.js 18+ and npm/yarn on your development machine
- `squashfs-tools` package (`apt install squashfs-tools` on Debian/Ubuntu)
- BrightSign Player running OS v9.x or later
- Serial cable for player connection

## Project Structure

```
hello_world-js-extension/
├── README.md              # This file
├── package.json           # Node.js project configuration
├── webpack.config.js      # Webpack bundler configuration
├── bsext_init             # Init script for extension lifecycle
├── src/
│   ├── index.js           # Main application source
│   └── config.js          # Configuration settings
└── player-app/            # Test presentation (not part of extension)
    ├── autorun.brs        # BrightScript entry point
    └── listener.js        # UDP listener for testing
```

## How It Works

1. The extension waits for BrightSign JS APIs to become available (configurable delay)
2. Every few seconds, it sends a UDP message containing:
   - "Hello World!" greeting
   - Device serial number (from `@brightsign/deviceinfo`)
   - Current timestamp in ISO8601 format
3. The `bsext_init` script manages starting/stopping the Node.js process

## Building the Extension

### Step 1: Install Dependencies

```bash
cd examples/hello_world-js-extension
yarn install
# or: npm install
```

### Step 2: Build the Bundle

```bash
yarn build
# or: npm run build
```

This uses Webpack to:
- Bundle the JavaScript into a single file
- Copy the `bsext_init` script
- Output everything to the `install/` directory

### Step 3: Package for Deployment

```bash
# Package for LVM volume (most common)
yarn package-lvm

# Or for UBI volume
yarn package-ubi
```

This creates a zip file like `hello_world-1234567890.zip`.

## Configuration

Edit `src/config.js` to customize behavior:

```javascript
module.exports = {
    PORT: process.env.PORT || 5000,           // UDP destination port
    HOST: '127.0.0.1',                         // UDP destination host
    SEND_INTERVAL_MS: 5000,                    // Message interval (5 seconds)
    STARTUP_DELAY_MS: 60000                    // Wait for APIs (60 seconds)
};
```

The `STARTUP_DELAY_MS` is important because BrightSign APIs like `@brightsign/deviceinfo` may not be immediately available when the extension starts.

## Deploying to the Player

### Prerequisites

1. [Un-secure your player](../../docs/Un-Secure-Player.md) for development
2. [Set up serial connection](../../docs/Serial-Connection.md)

### Installation

1. Copy the zip file to the player via DWS or SD card
2. Connect via SSH and drop to Linux shell (`Ctrl-C`, `exit`, `exit`)
3. Install the extension:

```bash
cd /usr/local
rm -rf *  # Clean up any previous installs

export latest=$(ls -t /storage/sd/hello_world-*.zip | head -n 1)
unzip ${latest} -o -d /usr/local/

# Install the extension
bash ./ext_hello_world_install-lvm.sh

# Reboot to activate
reboot
```

## Testing the Extension

### Option 1: Use the Included Test Presentation

1. Copy `player-app/autorun.brs` and `player-app/listener.js` to the SD card root
2. Reboot the player
3. Watch the serial console for received UDP messages

### Option 2: Manual Testing via SSH

```bash
# Check if the extension is running
ps | grep node

# Listen for UDP messages
socat -u UDP-LISTEN:5000 -
```

You should see messages like:
```
Hello World! from ABC123XYZ: 2025-01-15T10:30:45.123Z
```

## Init Script Details

The `bsext_init` script manages the extension lifecycle:

| Command | Description |
|---------|-------------|
| `start` | Start the Node.js process |
| `stop` | Stop the Node.js process |

### Disable Auto-Start (for debugging)

To prevent the extension from starting automatically:

```bash
# On player, set registry key
registry extension hello_world-disable-auto-start true

# Then manually start when ready
/var/volatile/bsext/ext_hello_world/bsext_init start
```

## Uninstalling

```bash
# Stop the extension
/var/volatile/bsext/ext_hello_world/bsext_init stop

# Unmount and remove
umount /var/volatile/bsext/ext_hello_world
rm -rf /var/volatile/bsext/ext_hello_world

# Remove LVM volume
lvremove --yes /dev/mapper/bsos-ext_hello_world
rm -f /dev/mapper/bsos-ext_hello_world

reboot
```

## Technical Notes

### Why No SDK Required

JavaScript extensions run on the Node.js interpreter that's already installed on BrightSign players. The extension is just JavaScript code that Node.js executes - no native compilation is needed.

### BrightSign APIs

The example uses `@brightsign/deviceinfo` which is a BrightSign-specific Node.js module available on the player. This is marked as an external in Webpack so it's loaded at runtime from the player's Node.js modules.

Other available BrightSign APIs include:
- `@brightsign/networkconfiguration`
- `@brightsign/screenshot`
- `@brightsign/registry`
- And many more - see BrightSign documentation

### Signal Handling

The example handles `SIGINT` and `SIGTERM` signals to:
- Clear the message interval
- Close the UDP socket
- Exit cleanly

This ensures the extension shuts down properly when the player stops it.

### Webpack Configuration

The Webpack config:
- Targets Node.js (not browser)
- Marks `@brightsign/deviceinfo` as external (loaded from player)
- Copies the `bsext_init` script to the output directory
- Uses Babel for JavaScript transpilation
