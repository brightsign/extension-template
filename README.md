# Building Extensions for BrightSign Players

## Introduction

The "BrightSign OS Extensions" feature allows BrightSign partners to run their own code on BrightSign products. This repository provides a self-guided workshop for creating, debugging, and deploying extensions, with examples in multiple programming languages.

---

## For the Impatient

Want to get started quickly with a TypeScript/Node.js extension? Follow these steps:

### 1. Create Your Repository

Click the **"Use this template"** button at the top of this repository to create your own copy.

### 2. Clone and Setup

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME

# Navigate to the TypeScript example
cd examples/hello_world-ts-extension

# Install dependencies
npm install

# Build the extension
npm run build
```

### 3. Customize Your Extension

1. **Rename your extension**: Update `DAEMON_NAME` in `bsext_init` and the extension name in `package.json`
2. **Modify the code**: Edit `src/index.ts` with your application logic
3. **Update configuration**: Adjust settings in `src/config.ts`

### 4. Package and Deploy

```bash
# Package for deployment
npm run package-lvm

# Copy the resulting zip to your un-secured player and install
```

### 5. Clean Up Unused Examples

Delete the examples you don't need:

```bash
# From repository root
rm -rf examples/time_publisher-cpp-extension  # If not using C++
rm -rf examples/hello_world-go-extension      # If not using Go
rm -rf examples/hello_world-ts-extension      # If not using TypeScript
rm -rf Dockerfile                              # If not building SDK
rm -rf plans/                                  # Planning documents
```

### LLM Prompt for Automatic Setup

If you're using an AI assistant like Claude Code or GitHub Copilot, use this prompt to automate the setup:

```
I've created a new repository from the BrightSign extension template. Please help me set up a new TypeScript extension called "[YOUR_EXTENSION_NAME]" that [DESCRIBE WHAT YOUR EXTENSION DOES].

Please:
1. Rename the hello_world-ts-extension directory to [YOUR_EXTENSION_NAME]-extension
2. Update DAEMON_NAME in bsext_init to "[YOUR_EXTENSION_NAME]"
3. Update the package.json name and description
4. Modify src/index.ts to implement: [YOUR FUNCTIONALITY]
5. Update src/config.ts with appropriate configuration
6. Delete the examples I won't use: [time_publisher-cpp-extension / hello_world-go-extension]
7. Delete the Dockerfile if I don't need the SDK
8. Update this README.md to describe my specific extension
9. Delete the plans/ directory

My extension should: [DETAILED DESCRIPTION OF FUNCTIONALITY]
```

For more detailed guidance on working with this codebase using an LLM, see [CLAUDE.md](./CLAUDE.md).

---

## What is a BrightSign Extension?

A BrightSign extension is a **squashfs filesystem** that is installed onto the player's internal NVRAM storage. Key characteristics:

- **Persistent**: Extensions survive reboots - they are stored in internal flash, not on the SD card
- **Mountable**: On boot, the extension filesystem is mounted at `/var/volatile/bsext/{extension_name}/`
- **Auto-started**: Linux SysV init scripts (`bsext_init`) automatically start your software on boot
- **Removable**: Extensions can be uninstalled, freeing up the storage space
- **Read-only**: The squashfs filesystem is read-only; runtime data should go to writable locations

### Extension Lifecycle

1. **Installation**: Extension package is written to an LVM or UBI volume in NVRAM
2. **Boot**: Player mounts the extension filesystem and runs `bsext_init start`
3. **Running**: Your software runs as a daemon process
4. **Shutdown**: Player runs `bsext_init stop` for graceful cleanup
5. **Uninstallation**: Volume is unmounted and removed from NVRAM

## Types of Extensions

Extensions fall into two categories based on their compatibility with BrightSign OS (BOS) versions:

### Standalone Extensions

**Standalone** extensions work regardless of the BOS version. They have no dependencies on version-specific system libraries.

Examples:
- Go applications (statically compiled)
- JavaScript/Node.js applications (use the player's runtime)
- Any statically-linked binary

### Versioned Extensions

**Versioned** extensions only work on a specific version of BOS because they depend on version-specific libraries (like glibc or libstdc++). If the BOS is updated, the extension may need to be recompiled and re-signed.

Examples:
- C/C++ applications with dynamic linking
- Any application that links against system shared libraries

## Types of Extension Software

Extensions can contain different types of software. The type determines whether you need the BrightSign SDK:

| Type | Language Examples | SDK Required? | Extension Type |
|------|-------------------|---------------|----------------|
| **Compiled (Dynamic Linking)** | C, C++, Rust (default) | **YES** | Versioned |
| **Compiled (Static Linking)** | Go, Rust (musl) | **NO** | Standalone |
| **Interpreted** | TypeScript/JavaScript, Python, Shell | **NO** | Standalone |

### When You Need the SDK

If your compiled code uses **dynamic linking** to shared libraries on the player (like glibc, libstdc++, etc.), you **must** use the BrightSign SDK. The SDK provides:
- Cross-compilation toolchain for ARM64
- Headers and libraries matching the player's runtime
- Ensures binary compatibility with the target OS version

**Note**: Extensions built with the SDK are **versioned** - they are tied to the specific BOS version the SDK was built from.

### When You Don't Need the SDK

- **Statically compiled** binaries (like Go) include everything needed - no runtime dependencies
- **Interpreted languages** use runtimes already on the player (Node.js is available on BrightSign players)

These extensions are **standalone** and will work across BOS versions.

## Extension Development Process

### Step 1: Develop Your Software

- Write and test your application on your development host
- For compiled languages: test natively first, then cross-compile
- For interpreted languages: test with the target runtime version

### Step 2: Create the Init Script

Every extension needs a `bsext_init` script at its root that handles:
- `start` - Start your software as a background daemon
- `stop` - Stop your software gracefully
- `run` - (Optional) Run in foreground for debugging

### Step 3: Package Your Extension

Use the provided packaging scripts to:
- Create a squashfs archive of your extension
- Generate an installation script

### Step 4: Test on Player (Development)

- [Un-secure a player](./docs/Un-Secure-Player.md) for development
- Install and test the unsigned extension
- Iterate until working correctly

### Step 5: Submit for Signing

- Extension **must have a globally unique name**
- BrightSign may require name changes to ensure uniqueness across all partners
- Contact your Partner Engineer for submission process
- Receive signed `.bsfw` file for production deployment

## Requirements

### All Extensions

- Linux development host with **x86 architecture CPU**
- `squashfs-tools` package (`apt install squashfs-tools` on Debian/Ubuntu)
- BrightSign Player running OS v9.x or later
- Serial cable for player connection

### C/C++ Extensions (SDK Required)

- Docker (recommended) for SDK build environment
- ~50GB disk space for SDK build
- Several hours for initial SDK build

### Go Extensions (No SDK)

- Go 1.21 or later
- Cross-compilation: `GOOS=linux GOARCH=arm64 CGO_ENABLED=0 go build`

### TypeScript/JavaScript Extensions (No SDK)

- Node.js 18+ and npm
- TypeScript and Webpack for compilation and bundling
- Verify Node.js version on target player matches development environment

## Un-Secure the Player for Development

Development extensions must be tested on an un-secured player.

### Prerequisites

- A player in production, factory reset condition with the Diagnostic Web Server (DWS) enabled
- Serial connection to the player - see [Serial Connection Guide](./docs/Serial-Connection.md)

### Steps

1. [Un-secure the player](./docs/Un-Secure-Player.md)
2. Set up and verify SSH communications - see [Telnet and SSH](https://docs.brightsign.biz/advanced/telnet-and-ssh)

### Validation

Ensure:
1. The player sends console output to your serial monitor
2. You can connect to the player over SSH
3. You can access the Linux shell (`Ctrl-C`, `exit`, `exit` from SSH)
4. You can inspect processes with `ps`

**Do not proceed until all the above are functional!**

## Example Extensions

This repository includes three example extensions demonstrating different approaches:

### C++ Extension: time_publisher

A C++ application that broadcasts the current time over UDP.

- **SDK Required**: Yes (dynamically linked)
- **Demonstrates**: Signal handling, UDP sockets, cross-compilation
- **Documentation**: [examples/time_publisher-cpp-extension/README.md](./examples/time_publisher-cpp-extension/README.md)

### TypeScript Extension: hello_world

A TypeScript/Node.js application that broadcasts device info and timestamps over UDP.

- **SDK Required**: No (uses player's Node.js runtime)
- **Demonstrates**: TypeScript setup, BrightSign JavaScript APIs, Webpack bundling
- **Documentation**: [examples/hello_world-ts-extension/README.md](./examples/hello_world-ts-extension/README.md)

### Go Extension: hello_world_go

A Go application that broadcasts "Hello World" messages over UDP.

- **SDK Required**: No (statically compiled)
- **Demonstrates**: Simple cross-compilation, minimal dependencies
- **Documentation**: [examples/hello_world-go-extension/README.md](./examples/hello_world-go-extension/README.md)

## Getting Started

1. Choose an example based on your preferred language and SDK requirements
2. Follow the README in that example's directory
3. Use it as a foundation for your own extension

### Quick Reference

| If you want to... | Use this example |
|-------------------|------------------|
| Use C/C++ with system libraries | [time_publisher-cpp-extension](./examples/time_publisher-cpp-extension/) |
| Use TypeScript/Node.js | [hello_world-ts-extension](./examples/hello_world-ts-extension/) |
| Use Go (simplest cross-compilation) | [hello_world-go-extension](./examples/hello_world-go-extension/) |

## Common Scripts

The `examples/common-scripts/` directory contains shared packaging scripts:

- `make-extension-lvm` - Creates LVM volume package (most common)
- `make-extension-ubi` - Creates UBI volume package
- `pkg-dev.sh` - Wrapper script for packaging

These scripts are used by all examples and can be used for your own extensions.

## Submitting Extensions for Signing

Contact your Partner Engineer for information about submitting your extension for signing.

**Important**: Your extension name must be **globally unique** across all BrightSign partners. When you submit for signing, BrightSign may require you to change the name to meet this requirement.

Once signed, the extension will be returned as a `.bsfw` file that can be applied to production (secure) players by placing it on the SD card. The extension will be installed on reboot.

## Checking if an Extension is Installed

### Using the Diagnostic Web Server (DWS)

1. Open the DWS in a browser (typically `http://<player-ip>`)
2. Navigate to **Control** > **Extensions**
3. Installed extensions will be listed with their names and status

### Using the Command Line

Connect via SSH and drop to the Linux shell (`Ctrl-C`, `exit`, `exit`), then:

```bash
# List installed extension volumes
ls /var/volatile/bsext/

# Check if a specific extension is mounted
mount | grep bsext

# View extension processes
ps | grep -E "(time_publisher|hello_world)"
```

## Removing an Extension

**The recommended way to remove an extension is to perform a factory reset.**

While it is technically possible to manually unmount and remove extension volumes (as shown in the individual example READMEs), a factory reset is the cleanest and most reliable method:

- Consult the [Factory Reset Documentation](https://docs.brightsign.biz/space/DOC/1936916598/Factory+Reset+a+Player)
- A full hard factory reset (2-button approach) is recommended

This ensures all extension data is completely removed and the player is returned to a known good state.

## Restoring Player State

To reset a player to factory state:
- Consult the [Factory Reset Documentation](https://docs.brightsign.biz/space/DOC/1936916598/Factory+Reset+a+Player)
- A full hard factory reset (2-button approach) is recommended

## Licensing

This project is released under the terms of the [Apache 2.0 License](./LICENSE.txt).
