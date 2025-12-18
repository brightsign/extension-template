# Plan: Generalize Extension Template to Multiple Example Types

## Overview

This plan outlines the work needed to expand the extension template from a single C++ example to a comprehensive guide with three different extension types, plus enhanced documentation explaining what extensions are and when the SDK is required.

---

## Phase 1: Documentation Restructuring

### 1.1 Add "What is an Extension?" Section

**Location:** New section in main README.md, placed before the examples

**Content to include:**

- **Definition**: A BrightSign OS Extension is a **squashfs filesystem** that is installed onto the player's NVRAM and can be removed later
- **Persistence**: Extensions survive reboots; they are mounted from internal storage at `/var/volatile/bsext/{extension_name}/`
- **Lifecycle**:
  - Automatically started on boot via Linux SysV init scripts (`bsext_init start`)
  - Automatically stopped on shutdown (`bsext_init stop`)
  - Can be manually controlled (`bsext_init run` for foreground execution)
- **Contents**: Can contain executables, scripts, libraries, data files, or any other files needed
- **Read-only**: The squashfs is read-only; runtime data should go to writable locations

### 1.2 Add "Types of Extension Software" Section

**Content to include:**

| Type | Language Examples | SDK Required? | Reason |
|------|-------------------|---------------|--------|
| Compiled (Dynamic Linking) | C, C++, Rust (default) | **YES** | Must link against player's glibc and shared libraries |
| Compiled (Static Linking) | Go, Rust (musl) | **NO** | Self-contained binary, no runtime dependencies |
| Interpreted/Scripted | JavaScript/TypeScript (Node.js), Python, Shell | **NO** | Uses interpreter already on player |

**Key points:**
- If your compiled code uses **dynamic linking** to shared libraries on the player (e.g., glibc, libstdc++), you **MUST** use the BrightSign SDK for cross-compilation
- If your code is **statically compiled** with no shared library dependencies (e.g., Go produces static binaries by default), you do **NOT** need the SDK
- Interpreted languages use the runtime environment on the player (Node.js is available on BrightSign players)

### 1.3 Add "Extension Development Process" Section

**Step 1: Develop Your Software**
- Write and test your application on your development host
- For compiled languages: test natively first, then cross-compile
- For interpreted languages: test with the target runtime version

**Step 2: Create the Init Script**
- Every extension needs a `bsext_init` script at its root
- Must handle `start`, `stop`, and optionally `run` commands
- Should use PID files for process management

**Step 3: Package Your Extension**
- Use provided packaging scripts (`make-extension-lvm` or `make-extension-ubi`)
- Creates a squashfs archive and installation script
- Package as a zip for transfer to the player

**Step 4: Test on Player (Development)**
- Un-secure a player for development
- Install and test the unsigned extension
- Iterate until working correctly

**Step 5: Submit for Signing**
- Extension **must have a globally unique name**
- BrightSign may require name changes to ensure uniqueness
- Contact your Partner Engineer for submission
- Receive signed `.bsfw` file for production deployment

### 1.4 Revise Requirements Section

Split requirements by extension type:

**All Extensions:**
- Linux development host (x86 architecture)
- `squashfs-tools` package
- BrightSign Player running OS v9.x or later
- Serial cable for player connection

**C/C++ Extensions (SDK Required):**
- Docker (recommended) for SDK build environment
- ~50GB disk space for SDK build
- Several hours for initial SDK build

**Go Extensions (No SDK):**
- Go 1.21+ installed
- Cross-compilation target: `GOOS=linux GOARCH=arm64`

**JavaScript/TypeScript Extensions (No SDK):**
- Node.js 18+ and npm/yarn
- Webpack or similar bundler

---

## Phase 2: Repository Structure Changes

### 2.1 Adopt New Directory Structure

Migrate from current flat structure to the organized structure from branch `PE-827-helloworld-js-extension`:

```
/extension-template/
├── README.md                          # Main guide (restructured)
├── LICENSE.txt
├── Dockerfile                         # Keep for SDK builds
├── docs/
│   ├── Serial-Connection.md
│   └── Un-Secure-Player.md
├── examples/
│   ├── common-scripts/
│   │   ├── make-extension-lvm
│   │   ├── make-extension-ubi
│   │   └── pkg-dev.sh
│   ├── time_publisher-cpp-extension/  # EXISTS (move from current)
│   │   ├── README.md
│   │   ├── CMakeLists.txt
│   │   ├── Dockerfile
│   │   ├── bsext_init
│   │   └── src/
│   │       └── main.cpp
│   ├── hello_world-js-extension/      # EXISTS (from branch)
│   │   ├── README.md
│   │   ├── package.json
│   │   ├── webpack.config.js
│   │   ├── yarn.lock
│   │   ├── bsext_init
│   │   ├── src/
│   │   │   ├── index.js
│   │   │   └── config.js
│   │   └── player-app/
│   │       ├── autorun.brs
│   │       └── listener.js
│   └── hello_world-go-extension/      # NEW - to be created
│       ├── README.md
│       ├── go.mod
│       ├── bsext_init
│       └── main.go
└── plans/
    └── generalize.md                  # This plan
```

### 2.2 Move/Rename Files

| Current Location | New Location |
|------------------|--------------|
| `/src/main.cpp` | `/examples/time_publisher-cpp-extension/src/main.cpp` |
| `/CMakeLists.txt` | `/examples/time_publisher-cpp-extension/CMakeLists.txt` |
| `/sh/bsext_init` | `/examples/time_publisher-cpp-extension/bsext_init` |
| `/sh/make-extension-lvm` | `/examples/common-scripts/make-extension-lvm` |
| `/sh/make-extension-ubi` | `/examples/common-scripts/make-extension-ubi` |
| `/sh/pkg-dev.sh` | `/examples/common-scripts/pkg-dev.sh` |

---

## Phase 3: Example Implementations

### 3.1 C++ Example (time_publisher) - EXISTS, needs reorganization

**Status:** Code exists in current main branch

**Work needed:**
- Move files to new location under `examples/time_publisher-cpp-extension/`
- Create dedicated README.md with:
  - Prerequisites (SDK required)
  - Full SDK build instructions (extract from main README)
  - Build steps for the example
  - Packaging and deployment
- Update CMakeLists.txt paths if needed
- Update bsext_init paths

**Key documentation points:**
- This example **requires the SDK** because it dynamically links to glibc
- Demonstrates proper signal handling (SIGINT, SIGTERM)
- Shows UDP socket programming

### 3.2 JavaScript/TypeScript Example (hello_world) - EXISTS in branch

**Status:** Complete implementation exists in branch `PE-827-helloworld-js-extension`

**Work needed:**
- Merge/cherry-pick from branch `PE-827-helloworld-js-extension`
- Review and update README.md
- Ensure paths are correct for new structure
- Verify webpack config and package.json

**Key documentation points:**
- This example does **NOT require the SDK**
- Uses Node.js runtime available on player
- Uses `@brightsign/deviceinfo` API
- Shows webpack bundling for deployment
- Includes test presentation (`player-app/`)

### 3.3 Go Example (hello_world) - NEW, needs creation

**Status:** Does not exist - must be created from scratch

**Files to create:**

1. **`main.go`** - Simple hello world UDP broadcaster:
```go
package main

import (
    "fmt"
    "net"
    "os"
    "os/signal"
    "syscall"
    "time"
)

func main() {
    port := os.Getenv("PORT")
    if port == "" {
        port = "5010"
    }

    addr, _ := net.ResolveUDPAddr("udp", "127.0.0.1:"+port)
    conn, _ := net.DialUDP("udp", nil, addr)
    defer conn.Close()

    // Signal handling
    sigChan := make(chan os.Signal, 1)
    signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

    ticker := time.NewTicker(time.Second)
    defer ticker.Stop()

    fmt.Println("Hello World Go Extension starting...")

    for {
        select {
        case <-ticker.C:
            msg := fmt.Sprintf("Hello World from Go: %s", time.Now().UTC().Format(time.RFC3339))
            conn.Write([]byte(msg))
            fmt.Println(msg)
        case <-sigChan:
            fmt.Println("Shutting down...")
            return
        }
    }
}
```

2. **`go.mod`**:
```
module hello_world_go

go 1.21
```

3. **`bsext_init`** - Init script (similar to others but for Go binary)

4. **`README.md`** - Documentation:
   - Prerequisites (Go 1.21+, NO SDK required)
   - Explanation of static compilation
   - Cross-compilation: `GOOS=linux GOARCH=arm64 go build -o hello_world_go main.go`
   - Packaging and deployment steps
   - Testing instructions

**Key documentation points:**
- This example does **NOT require the SDK**
- Go produces statically-linked binaries by default
- Simple cross-compilation with environment variables
- No external dependencies

---

## Phase 4: Update Main README.md

### 4.1 New Structure for Main README

```markdown
# Building Extensions for BrightSign Players

## Introduction
(Keep existing intro)

## What is a BrightSign Extension?
(NEW - from Phase 1.1)

## Types of Extension Software
(NEW - from Phase 1.2)

## Extension Development Process
(NEW - from Phase 1.3)

## Requirements
(REVISED - from Phase 1.4, split by extension type)

## Un-Secure the Player for Development
(Keep existing content, possibly move to docs/)

## Getting Started with Examples
- Overview of the three examples
- Which to choose based on your needs
- Links to each example's README

## Examples
### C++ Extension (time_publisher)
- Brief description
- Link to examples/time_publisher-cpp-extension/README.md

### JavaScript Extension (hello_world)
- Brief description
- Link to examples/hello_world-js-extension/README.md

### Go Extension (hello_world)
- Brief description
- Link to examples/hello_world-go-extension/README.md

## Submitting Extensions for Signing
(Keep existing + add unique name requirement)

## Restoring Player State
(Keep existing)

## Licensing
(Keep existing)
```

### 4.2 Remove SDK Build Instructions from Main README

- Move detailed SDK build instructions to `examples/time_publisher-cpp-extension/README.md`
- Main README should only mention that SDK is needed for dynamically-linked compiled code
- Link to C++ example for full SDK instructions

---

## Phase 5: Common Script Updates

### 5.1 Update Packaging Scripts

The scripts in `examples/common-scripts/` need to be parameterized:

- `make-extension-lvm`: Accept extension name as parameter or from environment
- `make-extension-ubi`: Accept extension name as parameter or from environment
- `pkg-dev.sh`: Work from any example directory, detect example name

### 5.2 Each Example's Package Script

Each example should have its own packaging command in its README:

**C++ Example:**
```bash
cd examples/time_publisher-cpp-extension
../../common-scripts/pkg-dev.sh install lvm
```

**JS Example:**
```bash
cd examples/hello_world-js-extension
yarn package-lvm
```

**Go Example:**
```bash
cd examples/hello_world-go-extension
../../common-scripts/pkg-dev.sh install lvm
```

---

## Implementation Order / Task Checklist

### Stage A: Foundation (Do First)
- [ ] Create new directory structure under `examples/`
- [ ] Create `examples/common-scripts/` directory
- [ ] Move and update common packaging scripts

### Stage B: C++ Example Migration
- [ ] Create `examples/time_publisher-cpp-extension/` directory
- [ ] Move `src/main.cpp` to new location
- [ ] Move `CMakeLists.txt` to new location (update paths)
- [ ] Move `sh/bsext_init` to new location
- [ ] Move `Dockerfile` to new location (optional, could stay at root)
- [ ] Create dedicated README.md with full SDK build instructions
- [ ] Update `.gitignore` for new structure

### Stage C: JavaScript Example Integration
- [ ] Merge content from branch `PE-827-helloworld-js-extension`
- [ ] Verify `examples/hello_world-js-extension/` structure
- [ ] Update paths in package.json and webpack.config.js
- [ ] Review and update README.md
- [ ] Test build process

### Stage D: Go Example Creation
- [ ] Create `examples/hello_world-go-extension/` directory
- [ ] Write `main.go` (simple UDP broadcaster)
- [ ] Write `go.mod`
- [ ] Write `bsext_init` script
- [ ] Write comprehensive README.md
- [ ] Test cross-compilation
- [ ] Test on player (if available)

### Stage E: Main README Rewrite
- [ ] Add "What is an Extension?" section
- [ ] Add "Types of Extension Software" section
- [ ] Add "Extension Development Process" section
- [ ] Revise Requirements section (split by type)
- [ ] Add example overview with links
- [ ] Add unique name requirement to signing section
- [ ] Remove detailed SDK instructions (move to C++ README)
- [ ] Update version number and date

### Stage F: Cleanup and Testing
- [ ] Remove old `sh/` directory (after migration)
- [ ] Remove old `src/` directory (after migration)
- [ ] Remove old `CMakeLists.txt` from root (after migration)
- [ ] Update all internal links/paths
- [ ] Verify all examples build correctly
- [ ] Test packaging scripts for each example
- [ ] Review all documentation for consistency

---

## Open Questions / Decisions Needed

1. **Dockerfile location**: Keep at root (shared) or move to C++ example only?
   - Recommendation: Keep at root since SDK builds happen at project level

2. **Branch strategy**: Create new branch for this work or work on main?
   - Recommendation: Create feature branch, merge when complete

3. **JavaScript example source**: Merge from `PE-827-helloworld-js-extension` or recreate?
   - Recommendation: Cherry-pick/merge from existing branch

4. **Go version requirement**: What minimum Go version to require?
   - Recommendation: Go 1.21+ (matches current LTS patterns)

5. **Player testing**: Are all three examples to be tested on actual hardware?
   - Recommendation: Yes, verify each works before finalizing

---

## Dependencies and Risks

**Dependencies:**
- Access to branch `PE-827-helloworld-js-extension` for JS example
- Go installation for testing Go example
- Player hardware for validation testing

**Risks:**
- Go cross-compilation might need CGO_ENABLED=0 for pure static binary
- Node.js version on player might affect JS example compatibility
- Path changes might break existing workflows for current users

---

## Success Criteria

1. Three working example extensions, each with complete documentation
2. Main README clearly explains what extensions are and SDK requirements
3. Each example can be built and packaged following only its README
4. Unique name requirement for signing is documented
5. Users can determine which example to use based on their language choice
