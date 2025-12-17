# Time Publisher C++ Extension

This example demonstrates how to build a C++ extension for BrightSign players. The extension broadcasts the current time in ISO8601 format over UDP.

## Prerequisites

**This example requires the BrightSign SDK** because it produces a dynamically-linked executable that depends on the player's glibc and standard libraries.

### Requirements

- Linux development host with **x86 architecture CPU**
- Docker (recommended) for building the SDK
- `squashfs-tools` package (`apt install squashfs-tools` on Debian/Ubuntu)
- ~50GB disk space for SDK build
- BrightSign Player running OS v9.x or later
- Serial cable for player connection

## Project Structure

```
time_publisher-cpp-extension/
├── README.md           # This file
├── CMakeLists.txt      # CMake build configuration
├── bsext_init          # Init script for extension lifecycle
└── src/
    └── main.cpp        # Main application source
```

## Building the SDK

Before you can cross-compile for the BrightSign player, you must build a personal SDK.

### Step 1: Build the Docker Container

```bash
# From the repository root
cd /path/to/extension-template

docker build --rm --build-arg USER_ID=$(id -u) --build-arg GROUP_ID=$(id -g) --ulimit memlock=-1:-1 -t bsoe-build .
```

### Step 2: Download BrightSign Open Source Release

1. Visit the [Open Source Release](https://docs.brightsign.biz/releases/brightsign-open-source) page
2. Find your target OS release version and review the readme
3. Download both files:
   - `*-src-dl.tar.gz`
   - `*-src-oe.tar.gz`
4. Place them in the repository root

### Step 3: Extract and Build

```bash
cd /path/to/extension-template

# Extract the tarballs
tar zxvf *-dl.tar.gz && tar zxvf *-oe.tar.gz

# Create srv directory for build output
mkdir -p srv

# Run the Docker container
docker run -it --rm \
  -v $(pwd)/brightsign-oe:/home/builder/bsoe -v $(pwd)/srv:/srv \
  bsoe-build
```

Inside the container:

```bash
cd /home/builder/bsoe/build

# Optional: Build full release to validate setup (takes several hours)
# MACHINE=cobra ./bsbb brightsign-source-release-world

# Build the SDK
MACHINE=cobra ./bsbb brightsign-sdk
```

### Step 4: Install the SDK

Exit the container and install the SDK:

```bash
cd /path/to/extension-template

# Copy SDK installer
cp brightsign-oe/build/tmp-glibc/deploy/sdk/*.sh .

# Install SDK (adjust filename as needed)
./brightsign-x86_64-cobra-toolchain-9.0.189.sh -d ./sdk -y
```

## Building the Extension

### Native Build (for testing on host)

Test the code on your development machine first. Start from a new shell where the SDK enviornment has NOT been sourced.

```bash
cd examples/time_publisher-cpp-extension

mkdir -p build_native && cd build_native
cmake ..
make
```

Test it:

```bash
# Terminal 1: Run the publisher
./time_publisher

# Terminal 2: Listen for messages
socat -u UDP-LISTEN:5005 -

# Terminal 3: Test signal handling
kill $(pgrep time_publisher)
```

### Cross-Platform Build (for player)

```bash
cd examples/time_publisher-cpp-extension

# Source the SDK environment (required for each new shell)
source ../../sdk/environment-setup-aarch64-oe-linux

mkdir -p build_bsos && cd build_bsos
cmake ..
make

# Install to the install directory
cmake --install .
```

## Packaging the Extension

```bash
cd examples/time_publisher-cpp-extension

# Package for LVM volume (most common)
../common-scripts/pkg-dev.sh install lvm time_publisher

# Or for UBI volume
../common-scripts/pkg-dev.sh install ubi time_publisher
```

This creates a zip file like `time_publisher-1234567890.zip`.

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

export latest=$(ls -t /storage/sd/time_publisher-*.zip | head -n 1)
unzip ${latest} -o -d /usr/local/

# Install the extension
bash ./ext_time_publisher_install-lvm.sh

# Reboot to activate
reboot
```

### Testing

After reboot, verify the extension is running:

```bash
# Check process
ps | grep time_publisher

# Listen for UDP messages
socat -u UDP-LISTEN:5005 -
```

## Init Script Details

The `bsext_init` script manages the extension lifecycle:

| Command | Description |
|---------|-------------|
| `start` | Start as background daemon (production) |
| `stop` | Stop the daemon |
| `restart` | Stop then start |
| `run` | Run in foreground (development/debugging) |

### Disable Auto-Start (for debugging)

To prevent crash loops during development:

```bash
# On player, set registry key
registry extension time_publisher-disable-auto-start true

# Then manually run in foreground
/var/volatile/bsext/ext_time_publisher/bsext_init run
```

## Uninstalling

```bash
# Stop the extension
/var/volatile/bsext/ext_time_publisher/bsext_init stop

# Unmount and remove
umount /var/volatile/bsext/ext_time_publisher
rm -rf /var/volatile/bsext/ext_time_publisher

# Remove LVM volume
lvremove --yes /dev/mapper/bsos-ext_time_publisher
rm -f /dev/mapper/bsos-ext_time_publisher

reboot
```

## Technical Notes

### Why SDK is Required

This C++ application is **dynamically linked** against:
- glibc (C standard library)
- libstdc++ (C++ standard library)
- System libraries for sockets, threading, etc.

The SDK ensures these are compiled for the correct target architecture (aarch64) and are compatible with the versions on the player.

### Including Additional Libraries

If your extension needs libraries not on the player:

1. Add them to your extension's `lib/` directory
2. The `bsext_init` script already sets `LD_LIBRARY_PATH=./lib:$LD_LIBRARY_PATH`

### Signal Handling

The example demonstrates proper signal handling for extensions:
- Catches `SIGINT` and `SIGTERM`
- Uses atomic flag for thread-safe shutdown
- Cleans up resources before exit

This is essential for extensions to shut down gracefully when the player stops them.
