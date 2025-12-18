# Hello World Go Extension

This example demonstrates how to build a Go extension for BrightSign players. The extension broadcasts "Hello World" messages with timestamps over UDP.

## Prerequisites

**This example does NOT require the BrightSign SDK** because Go produces statically-linked binaries by default. The compiled binary has no runtime dependencies on the player's system libraries.

### Requirements

- Go 1.21 or later on your development machine
- `squashfs-tools` package (`apt install squashfs-tools` on Debian/Ubuntu)
- BrightSign Player running OS v9.x or later
- Serial cable for player connection

## Project Structure

```
hello_world-go-extension/
├── README.md           # This file
├── go.mod              # Go module definition
├── main.go             # Main application source
└── bsext_init          # Init script for extension lifecycle
```

## How It Works

1. The extension starts and opens a UDP socket
2. Every second, it sends a message containing:
   - "Hello World from Go:" prefix
   - Current timestamp in RFC3339/ISO8601 format
3. The `bsext_init` script manages starting/stopping the binary
4. Handles SIGINT and SIGTERM for graceful shutdown

## Building the Extension

### Step 1: Build for Your Host (Testing)

```bash
cd examples/hello_world-go-extension

# Build for your local machine
go build -o hello_world_go main.go
```

Test it locally:
```bash
# Terminal 1: Run the extension
./hello_world_go

# Terminal 2: Listen for UDP messages
socat -u UDP-LISTEN:5010 -

# Terminal 3: Test signal handling
kill $(pgrep hello_world_go)
```

### Step 2: Cross-Compile for BrightSign Player

BrightSign players use ARM64 (aarch64) architecture:

```bash
cd examples/hello_world-go-extension

# Cross-compile for ARM64 Linux (BrightSign player)
GOOS=linux GOARCH=arm64 CGO_ENABLED=0 go build -o hello_world_go main.go
```

**Important flags:**
- `GOOS=linux` - Target Linux operating system
- `GOARCH=arm64` - Target ARM64 architecture
- `CGO_ENABLED=0` - Disable CGO for pure static binary (recommended)

### Step 3: Prepare the Install Directory

```bash
cd examples/hello_world-go-extension

# Create install directory
mkdir -p install

# Copy binary and init script
cp hello_world_go install/
cp bsext_init install/
chmod +x install/bsext_init
```

### Step 4: Package for Deployment

```bash
cd examples/hello_world-go-extension

# Package for LVM volume (most common)
../common-scripts/pkg-dev.sh install lvm hello_world_go

# Or for UBI volume
../common-scripts/pkg-dev.sh install ubi hello_world_go
```

This creates a zip file like `hello_world_go-1234567890.zip`.

## Configuration

The UDP port can be configured via environment variable in `bsext_init`:

```bash
UDP_PORT="5010"  # Change this to use a different port
```

Or set it at runtime:
```bash
PORT=5020 ./hello_world_go
```

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

export latest=$(ls -t /storage/sd/hello_world_go-*.zip | head -n 1)
unzip ${latest} -o -d /usr/local/

# Install the extension
bash ./ext_hello_world_go_install-lvm.sh

# Reboot to activate
reboot
```

### Testing

After reboot, verify the extension is running:

```bash
# Check if the extension is running
ps | grep hello_world_go

# Listen for UDP messages
socat -u UDP-LISTEN:5010 -
```

You should see messages like:
```
Hello World from Go: 2025-01-15T10:30:45Z
Hello World from Go: 2025-01-15T10:30:46Z
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

To prevent the extension from starting automatically:

```bash
# On player, set registry key
registry extension hello_world_go-disable-auto-start true

# Then manually run in foreground
/var/volatile/bsext/ext_hello_world_go/bsext_init run
```

## Uninstalling

```bash
# Stop the extension
/var/volatile/bsext/ext_hello_world_go/bsext_init stop

# Unmount and remove
umount /var/volatile/bsext/ext_hello_world_go
rm -rf /var/volatile/bsext/ext_hello_world_go

# Remove LVM volume
lvremove --yes /dev/mapper/bsos-ext_hello_world_go
rm -f /dev/mapper/bsos-ext_hello_world_go

reboot
```

## Technical Notes

### Why No SDK Required

Go compiles to **statically-linked binaries** by default. This means:
- All code is compiled into a single executable
- No dependency on system libraries like glibc
- No need for a cross-compilation SDK
- The binary runs on any Linux ARM64 system

This is the key advantage of Go for BrightSign extensions - simple cross-compilation with just environment variables.

### CGO_ENABLED=0

Setting `CGO_ENABLED=0` ensures a pure Go build with no C dependencies. While Go's standard library doesn't require CGO for basic operations like networking and file I/O, explicitly disabling it guarantees a fully static binary.

### Binary Size

Go binaries are larger than equivalent C/C++ programs because they include the Go runtime. A simple "Hello World" program is typically 2-5 MB. For most extensions this is acceptable given the simplicity benefits.

### Signal Handling

The example demonstrates proper signal handling for extensions:
- Uses a channel to receive signals
- Handles `SIGINT` (Ctrl+C) and `SIGTERM` (kill command)
- Performs clean shutdown with status message

This is essential for extensions to shut down gracefully when the player stops them.

### Alternative: Using a Makefile

For convenience, you can create a `Makefile`:

```makefile
BINARY_NAME=hello_world_go
GOOS=linux
GOARCH=arm64

.PHONY: build build-local install clean package

build:
	GOOS=$(GOOS) GOARCH=$(GOARCH) CGO_ENABLED=0 go build -o $(BINARY_NAME) main.go

build-local:
	go build -o $(BINARY_NAME) main.go

install: build
	mkdir -p install
	cp $(BINARY_NAME) install/
	cp bsext_init install/
	chmod +x install/bsext_init

clean:
	rm -rf $(BINARY_NAME) install/

package: install
	../common-scripts/pkg-dev.sh install lvm $(BINARY_NAME)
```

Then just run:
```bash
make package
```
