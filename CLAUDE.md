# CLAUDE.md - LLM Guidance for BrightSign Extension Development

This file provides context for AI assistants (Claude Code, GitHub Copilot, etc.) working on BrightSign extension projects.

## Project Overview

This is a **BrightSign OS Extension template repository**. Extensions are squashfs filesystems installed on BrightSign digital signage players that run custom code automatically on boot.

## Key Concepts

### What is an Extension?

- A **squashfs filesystem** written to NVRAM on the player
- Mounted at `/var/volatile/bsext/{extension_name}/` on boot
- Started/stopped via `bsext_init` script (SysV init style)
- Must have a **globally unique name** for signing

### Extension Types

| Type | SDK Required | Examples |
|------|--------------|----------|
| **Standalone** | No | Go (static), TypeScript/Node.js |
| **Versioned** | Yes | C/C++ (dynamic linking) |

### Directory Structure

```
extension-template/
├── README.md                    # Main documentation
├── CLAUDE.md                    # This file
├── Dockerfile                   # SDK build environment (C++ only)
├── LICENSE.txt                  # Apache 2.0
├── docs/                        # Setup guides
│   ├── Serial-Connection.md
│   └── Un-Secure-Player.md
└── examples/
    ├── common-scripts/          # Shared packaging scripts
    │   ├── make-extension-lvm   # LVM packaging
    │   ├── make-extension-ubi   # UBI packaging
    │   └── pkg-dev.sh           # Wrapper script
    ├── hello_world-ts-extension/  # TypeScript example (NO SDK)
    ├── hello_world-go-extension/  # Go example (NO SDK)
    └── time_publisher-cpp-extension/  # C++ example (REQUIRES SDK)
```

## Common Tasks

### Creating a New Extension from TypeScript Template

1. Copy/rename `examples/hello_world-ts-extension/` to `examples/{name}-extension/`
2. Update `DAEMON_NAME` in `bsext_init`
3. Update `package.json` name and description
4. Modify `src/index.ts` with new functionality
5. Update `src/config.ts` as needed
6. Test with `npm run build`

### Creating a New Extension from Go Template

1. Copy/rename `examples/hello_world-go-extension/` to `examples/{name}-extension/`
2. Update `DAEMON_NAME` in `bsext_init`
3. Update `go.mod` module name
4. Modify `main.go` with new functionality
5. Cross-compile: `GOOS=linux GOARCH=arm64 CGO_ENABLED=0 go build`

### Creating a New Extension from C++ Template

1. Copy/rename `examples/time_publisher-cpp-extension/` to `examples/{name}-extension/`
2. Update `DAEMON_NAME` in `bsext_init`
3. Update `CMakeLists.txt` project name
4. Modify `src/main.cpp` with new functionality
5. **Requires SDK** - see C++ example README for build instructions

### Packaging an Extension

```bash
# From the extension directory
# For TypeScript:
npm run package-lvm

# For Go:
../common-scripts/pkg-dev.sh install lvm {extension_name}

# For C++:
../common-scripts/pkg-dev.sh install lvm {extension_name}
```

### Cleaning Up Template Files

When user creates a new repo from template, they typically want to remove:
- Unused example directories under `examples/`
- `Dockerfile` (if not using C++)
- `plans/` directory
- Example-specific content from README.md

## Important Files to Understand

### bsext_init

The init script that controls the extension lifecycle. Key variables:
- `DAEMON_NAME` - Must match extension name
- `PIDFILE` - PID file location
- Configuration variables (e.g., `UDP_PORT`)

Must handle:
- `start` - Start as background daemon
- `stop` - Stop gracefully
- `run` - Run in foreground (debugging)

### package.json (TypeScript)

Key scripts:
- `build` - Compile TypeScript via Webpack
- `build:check` - Type-check without emitting
- `package-lvm` - Build and create deployment package

### webpack.config.js (TypeScript)

Important settings:
- `entry: './src/index.ts'`
- `target: 'node'`
- `externals` - BrightSign APIs loaded at runtime

### tsconfig.json (TypeScript)

Configured for:
- ES2020 target (Node.js 18+)
- CommonJS modules
- Strict mode enabled

## BrightSign-Specific Information

### Node.js on Player

- Players include Node.js (typically v18.x on BOS 9.x)
- Check version: `node --version` (via SSH on player)
- BrightSign APIs available as Node.js modules

### BrightSign APIs

Available at runtime (mark as externals in Webpack):
- `@brightsign/deviceinfo`
- `@brightsign/networkconfiguration`
- `@brightsign/screenshot`
- `@brightsign/registry`
- `@brightsign/videooutput`

Documentation: https://github.com/BrightDevelopers/developer-documentation/blob/main/part-3-javascript-development/02-javascript-node-programs.md

### Player Communication

- Extensions typically communicate via UDP to localhost
- Default ports used in examples: 5000 (TS), 5005 (C++), 5010 (Go)
- Can also use TCP, files, or BrightSign registry

### Extension Installation Path

Extensions are mounted at: `/var/volatile/bsext/ext_{name}/`

### Checking Extension Status

```bash
# List installed extensions
ls /var/volatile/bsext/

# Check if mounted
mount | grep bsext

# Check running processes
ps | grep {daemon_name}
```

## Code Patterns

### Signal Handling (Required)

Extensions MUST handle SIGINT and SIGTERM for graceful shutdown:

**TypeScript:**
```typescript
process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
});
```

**Go:**
```go
sigChan := make(chan os.Signal, 1)
signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
```

**C++:**
```cpp
signal(SIGINT, signalHandler);
signal(SIGTERM, signalHandler);
```

### Configuration Pattern

Use environment variables for configuration, with defaults:

**TypeScript:**
```typescript
export const PORT = parseInt(process.env.PORT || '5000', 10);
```

**Go:**
```go
port := os.Getenv("PORT")
if port == "" {
    port = "5010"
}
```

## Naming Conventions

- Extension names: lowercase, underscores allowed (e.g., `my_extension`)
- Must be globally unique across all BrightSign partners
- DAEMON_NAME in bsext_init must match
- Package names use hyphens (e.g., `my-extension`)

## Testing Workflow

1. Build extension locally
2. Package with `package-lvm` or `package-ubi`
3. Copy zip to un-secured player (via DWS or SD card)
4. SSH to player, install via bash script
5. Reboot to activate
6. Check with `ps` and test functionality

## Common Issues

### Extension Not Starting
- Check `bsext_init` has execute permissions
- Verify DAEMON_NAME matches everywhere
- Check for errors via serial console

### Node.js Version Mismatch
- Verify player Node.js version matches development
- Use `node --version` on player

### Build Failures
- TypeScript: Run `npm run build:check` for type errors
- Go: Ensure `CGO_ENABLED=0` for static binary
- C++: Ensure SDK is sourced before building

## Don't Do

- Don't use yarn (npm preferred for consistency)
- Don't bundle Node.js unless necessary (use player's runtime)
- Don't use dynamic linking in Go (use `CGO_ENABLED=0`)
- Don't forget signal handling
- Don't hardcode paths (use relative or environment variables)
- Don't skip the startup delay for BrightSign APIs in TypeScript
