# Hello World TypeScript Extension

This example demonstrates how to build a TypeScript/Node.js extension for BrightSign players. The extension broadcasts "Hello World" messages with device information over UDP.

## Prerequisites

**This example does NOT require the BrightSign SDK** because it uses the Node.js runtime already available on the player.

### Requirements

- Node.js 18+ and npm on your development machine
- `squashfs-tools` package (`apt install squashfs-tools` on Debian/Ubuntu)
- BrightSign Player running OS v9.x or later
- Serial cable for player connection

## Understanding the Node.js Runtime

This extension uses the **Node.js runtime that is pre-installed on BrightSign players**. You do not need to bundle your own Node.js - the player provides it.

### Checking the Node.js Version on Your Player

Before development, verify the Node.js version on your target player:

```bash
# Connect via SSH and drop to Linux shell (Ctrl-C, exit, exit)
# Then run:
node --version
```

As of BOS 9.x, players typically include Node.js 18.x. Ensure your development environment uses a compatible version.

### Player vs. Bundled Node.js

| Approach | Description | When to Use |
|----------|-------------|-------------|
| **Player's Node.js** (this example) | Use the Node.js pre-installed on the player | Most cases - simpler, smaller extension size |
| **Bundled Node.js** | Include your own Node.js binary in the extension | When you need a specific Node.js version not on the player |

This example uses the player's Node.js runtime.

## Project Structure

```
hello_world-ts-extension/
├── README.md              # This file
├── package.json           # Node.js project configuration
├── tsconfig.json          # TypeScript compiler configuration
├── webpack.config.js      # Webpack bundler configuration
├── bsext_init             # Init script for extension lifecycle
├── src/
│   ├── index.ts           # Main application source
│   └── config.ts          # Configuration settings
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

## Setting Up the Development Environment

### Step 1: Install Node.js

Ensure you have Node.js 18+ installed on your development machine:

```bash
node --version  # Should be v18.x or later
npm --version   # Should be v9.x or later
```

If not installed, download from [nodejs.org](https://nodejs.org/) or use a version manager like `nvm`.

### Step 2: Install Project Dependencies

```bash
cd examples/hello_world-ts-extension
npm install
```

This installs:
- **TypeScript** - The TypeScript compiler
- **ts-loader** - Webpack loader for TypeScript
- **@types/node** - TypeScript type definitions for Node.js
- **webpack** - Module bundler
- **copy-webpack-plugin** - Copies static files during build

### Step 3: Verify TypeScript Setup

```bash
# Check TypeScript compilation without emitting files
npm run build:check
```

This runs the TypeScript compiler in check mode to verify your code compiles without errors.

## Building the Extension

### Build the Bundle

```bash
npm run build
```

This uses Webpack to:
- Compile TypeScript to JavaScript
- Bundle into a single file
- Copy the `bsext_init` script
- Output everything to the `install/` directory

### Package for Deployment

```bash
# Package for LVM volume (most common)
npm run package-lvm

# Or for UBI volume
npm run package-ubi
```

This creates a zip file like `hello_world-1234567890.zip`.

## Configuration

Edit `src/config.ts` to customize behavior:

```typescript
/** UDP port to send messages to */
export const PORT: number = parseInt(process.env.PORT || '5000', 10);

/** Host address for UDP messages */
export const HOST: string = '127.0.0.1';

/** Interval (ms) between sending UDP messages */
export const SEND_INTERVAL_MS: number = 5000;

/** Startup delay (ms) before starting the main interval */
export const STARTUP_DELAY_MS: number = 60000;
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

## BrightSign JavaScript APIs

This extension uses BrightSign-specific Node.js APIs that are available on the player. These APIs provide access to device features and are marked as "externals" in Webpack so they're loaded at runtime.

### Available APIs

Common BrightSign APIs include:
- `@brightsign/deviceinfo` - Device serial number, model, etc.
- `@brightsign/networkconfiguration` - Network settings
- `@brightsign/screenshot` - Capture screenshots
- `@brightsign/registry` - Read/write registry keys
- `@brightsign/videooutput` - Video output configuration

### More Information

For comprehensive documentation on BrightSign JavaScript development and available APIs, see:

**[BrightSign JavaScript/Node Programs Documentation](https://github.com/BrightDevelopers/developer-documentation/blob/main/part-3-javascript-development/02-javascript-node-programs.md)**

This documentation covers:
- Node.js environment on BrightSign players
- Available BrightSign APIs and their usage
- Best practices for JavaScript development
- Integration with BrightScript presentations

## Technical Notes

### Why No SDK Required

TypeScript/JavaScript extensions run on the Node.js interpreter that's already installed on BrightSign players. The extension is compiled to JavaScript which Node.js executes - no native compilation or SDK is needed.

### TypeScript Configuration

The `tsconfig.json` is configured for:
- **Target**: ES2020 (compatible with Node.js 18+)
- **Module**: CommonJS (Node.js module format)
- **Strict mode**: Enabled for better type safety

### Webpack Configuration

The Webpack config:
- Compiles TypeScript using `ts-loader`
- Targets Node.js (not browser)
- Marks BrightSign APIs as externals (loaded from player at runtime)
- Copies the `bsext_init` script to the output directory

### Signal Handling

The example handles `SIGINT` and `SIGTERM` signals to:
- Clear the message interval
- Close the UDP socket
- Exit cleanly

This ensures the extension shuts down properly when the player stops it.

## Troubleshooting

### TypeScript Compilation Errors

```bash
# Check for type errors without building
npm run build:check
```

### Module Not Found Errors

Ensure all dependencies are installed:
```bash
rm -rf node_modules
npm install
```

### Extension Not Starting

1. Check the Node.js version on the player matches your development environment
2. Verify the `bsext_init` script has execute permissions
3. Check for errors in the extension logs via serial console
