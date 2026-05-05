# hello_world-java-extension

A minimal Java extension that satisfies the extension contract:

- Starts an HTTP server on port 8080
- `GET /` returns `{"message":"Hello from BrightSign!","uptime_seconds":N}`
- Writes one line to `/tmp/hello-extension.log` on startup
- Handles SIGTERM and SIGINT and exits cleanly
- Bundles Eclipse Temurin 11 JRE for `linux/aarch64` — no system Java required on the player

## Usage

This directory is a starting point. Copy its contents to the root of your extension repo
before building, then run `make` from the repo root:

```
cp -r examples/hello_world-java-extension/. .
make build
make test-local
make package
```

`make` must be run from the repository root. The Makefile references
`examples/common-scripts/` which is only present at the repo root level.

## Makefile targets

| Target | Action |
|---|---|
| `make build` | Compile the fat JAR with Maven |
| `make download-jre` | Download Temurin 11 JRE for linux/aarch64 into `install/jre/` |
| `make test-local` | Run the extension locally and curl-verify the endpoint |
| `make package` | Build, download JRE, and produce the deployable ZIP |
| `make clean` | Remove `target/`, `install/`, and generated ZIPs |

## Extension contract

Any extension that replaces this one must:

1. Start an HTTP server on port 8080
2. Respond to `GET /` with `{"message":"...","uptime_seconds":N}` and `Content-Type: application/json`
3. Write one line to `/tmp/hello-extension.log` on startup
4. Handle SIGTERM and SIGINT and exit cleanly
5. Provide a `bsext_init` script with a matching `DAEMON_NAME`
