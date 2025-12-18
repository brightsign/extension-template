# Plan: Prometheus + Grafana Monitoring Extension

## Overview

This plan outlines how to build a complex BrightSign extension that bundles **Prometheus** and **Grafana** to provide on-player monitoring and visualization capabilities.

> **⚠️ WARNING: FOR DEMONSTRATION AND TESTING ONLY**
>
> This extension is **NOT recommended for production use**. It is designed to:
> - Demonstrate building complex, multi-component extensions
> - Provide a useful testing and debugging tool during development
> - Show how to bundle third-party software into an extension
>
> **Limitations:**
> - All collected data is **ephemeral** and will be lost on reboot
> - Consumes significant resources (~150-200MB RAM, 5-10% CPU)
> - Large extension size (~650MB installed, ~200MB compressed)

## Reference Implementation

This plan is based on the existing demo at:
**https://github.com/brightsign/player-p-and-g-demo**

That repository provides:
- Pre-configured Prometheus and Grafana binaries (ARM64)
- A comprehensive dashboard for BrightSign player metrics
- Working `bsext_init` script for service management
- Build automation via Makefile

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    BrightSign Player                         │
│                                                              │
│  ┌──────────────────┐    ┌──────────────────┐               │
│  │  Node Exporter   │    │   Extension      │               │
│  │  (Built into OS) │    │   (ext_mon)      │               │
│  │                  │    │                  │               │
│  │  Port: 9100      │◄───┤  Prometheus      │               │
│  │  /metrics        │    │  Port: 9090      │               │
│  └──────────────────┘    │                  │               │
│                          │  Grafana         │               │
│                          │  Port: 3000      │               │
│                          └──────────────────┘               │
│                                   │                          │
└───────────────────────────────────┼──────────────────────────┘
                                    │
                              ┌─────▼─────┐
                              │  Browser  │
                              │ (User)    │
                              └───────────┘
```

### Components

1. **Node Exporter** (Built into BrightSign OS)
   - Exposes system metrics at `http://localhost:9100/metrics`
   - Must be enabled via registry key
   - Provides CPU, memory, disk, network, and temperature metrics

2. **Prometheus** (Bundled in extension)
   - Scrapes metrics from Node Exporter
   - Stores time-series data in `/tmp/prometheus_data` (ephemeral)
   - Web UI at `http://player:9090`

3. **Grafana** (Bundled in extension)
   - Visualizes Prometheus data
   - Pre-configured dashboard for BrightSign metrics
   - Web UI at `http://player:3000` (admin/admin)

---

## Phase 1: Prerequisites and Planning

### 1.1 Enable Node Exporter on Player

Before the extension can collect metrics, the built-in Node Exporter must be enabled:

```bash
# Via SSH on the player (Linux shell)
registry write networking prometheus_enabled 1

# Reboot to apply
reboot
```

Or via DWS:
1. Navigate to **Control** > **Registry**
2. Add key: `networking` / `prometheus_enabled` = `1`
3. Reboot the player

### 1.2 Verify Node Exporter is Running

After reboot, verify metrics are available:

```bash
# On player via SSH
curl http://localhost:9100/metrics | head -20
```

You should see Prometheus-format metrics.

### 1.3 Determine Resource Requirements

| Resource | Requirement |
|----------|-------------|
| RAM | ~150-200MB combined |
| CPU | ~5-10% during normal operation |
| Storage | ~650MB installed |
| Package Size | ~200MB compressed |

---

## Phase 2: Project Structure

### 2.1 Directory Layout

```
prometheus-grafana-extension/
├── README.md
├── Makefile                    # Build automation
├── bsext_init                  # Service lifecycle script
├── configs/
│   ├── prometheus.yml.template # Prometheus config template
│   ├── grafana.ini.template    # Grafana config template
│   └── dashboards/
│       └── brightsign-node-exporter.json  # Pre-built dashboard
├── binaries/                   # Downloaded at build time
│   ├── prometheus-2.48.0.linux-arm64/
│   └── grafana-10.2.3.linux-arm64/
└── install/                    # Build output
```

### 2.2 Key Files to Create

1. **Makefile** - Automates downloading binaries and packaging
2. **bsext_init** - Manages Prometheus and Grafana lifecycle
3. **prometheus.yml.template** - Prometheus scrape configuration
4. **grafana.ini.template** - Grafana server configuration
5. **Dashboard JSON** - Pre-configured visualization

---

## Phase 3: Configuration Details

### 3.1 Prometheus Configuration

The Prometheus configuration must scrape:
1. Prometheus itself (for meta-metrics)
2. Node Exporter on the player
3. Optionally Grafana metrics

**prometheus.yml.template:**
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:${PROMETHEUS_PORT}']

  - job_name: 'node_exporter'
    static_configs:
      - targets: ['localhost:${NODE_EXPORTER_PORT}']

  - job_name: 'grafana'
    static_configs:
      - targets: ['localhost:${GRAFANA_PORT}']
```

### 3.2 Grafana Configuration

Grafana needs:
- Data directory in `/tmp` (ephemeral, writable)
- Log directory in `/tmp` or `/var/log`
- Pre-provisioned Prometheus datasource
- Pre-loaded dashboard

**Key Grafana settings:**
```ini
[paths]
data = /tmp/grafana_data
logs = /tmp/grafana_logs
plugins = /tmp/grafana_plugins
provisioning = ${EXTENSION_PATH}/provisioning

[server]
http_port = ${GRAFANA_PORT}
root_url = http://localhost:${GRAFANA_PORT}

[security]
admin_user = admin
admin_password = admin

[auth.anonymous]
enabled = true
```

### 3.3 Registry-Based Configuration

Allow runtime configuration via BrightSign registry:

| Registry Key | Default | Description |
|--------------|---------|-------------|
| `mon-disable-auto-start` | false | Disable auto-start on boot |
| `mon-prometheus-port` | 9090 | Prometheus web UI port |
| `mon-grafana-port` | 3000 | Grafana web UI port |
| `mon-prometheus-node-exporter-port` | 9100 | Node Exporter port to scrape |

**Reading registry in bsext_init:**
```bash
PROMETHEUS_PORT=$(registry mon-prometheus-port 2>/dev/null || echo "9090")
GRAFANA_PORT=$(registry mon-grafana-port 2>/dev/null || echo "3000")
NODE_EXPORTER_PORT=$(registry mon-prometheus-node-exporter-port 2>/dev/null || echo "9100")
```

---

## Phase 4: bsext_init Script Design

### 4.1 Script Structure

```bash
#!/bin/bash
### BEGIN INIT INFO
# Provides:          mon
# Description:       Prometheus + Grafana monitoring stack
### END INIT INFO

SCRIPT_PATH=$(dirname $(realpath $0))
EXTENSION_NAME="mon"
PROMETHEUS_PIDFILE="/var/run/prometheus.pid"
GRAFANA_PIDFILE="/var/run/grafana.pid"

# Read configuration from registry with defaults
PROMETHEUS_PORT=$(registry mon-prometheus-port 2>/dev/null || echo "9090")
GRAFANA_PORT=$(registry mon-grafana-port 2>/dev/null || echo "3000")
NODE_EXPORTER_PORT=$(registry mon-prometheus-node-exporter-port 2>/dev/null || echo "9100")

# Data directories (ephemeral - in /tmp)
PROMETHEUS_DATA="/tmp/prometheus_data"
GRAFANA_DATA="/tmp/grafana_data"
GRAFANA_LOGS="/tmp/grafana_logs"
```

### 4.2 Service Functions

**Start function:**
```bash
do_start() {
    # Check auto-start registry
    DISABLE=$(registry ${EXTENSION_NAME}-disable-auto-start 2>/dev/null)
    if [ "$DISABLE" = "true" ]; then
        echo "Auto-start disabled"
        return
    fi

    # Create data directories
    mkdir -p ${PROMETHEUS_DATA} ${GRAFANA_DATA} ${GRAFANA_LOGS}

    # Generate configs from templates
    generate_prometheus_config
    generate_grafana_config

    # Start Prometheus
    echo "Starting Prometheus on port ${PROMETHEUS_PORT}..."
    nohup ${SCRIPT_PATH}/prometheus/prometheus \
        --config.file=${SCRIPT_PATH}/prometheus.yml \
        --storage.tsdb.path=${PROMETHEUS_DATA} \
        --web.listen-address=:${PROMETHEUS_PORT} \
        > /tmp/prometheus.log 2>&1 &
    echo $! > ${PROMETHEUS_PIDFILE}

    # Start Grafana
    echo "Starting Grafana on port ${GRAFANA_PORT}..."
    export GF_PATHS_DATA=${GRAFANA_DATA}
    export GF_PATHS_LOGS=${GRAFANA_LOGS}
    export GF_SERVER_HTTP_PORT=${GRAFANA_PORT}
    nohup ${SCRIPT_PATH}/grafana/bin/grafana-server \
        --homepath=${SCRIPT_PATH}/grafana \
        > /tmp/grafana.log 2>&1 &
    echo $! > ${GRAFANA_PIDFILE}
}
```

**Stop function:**
```bash
do_stop() {
    echo "Stopping services..."

    # Stop Prometheus
    if [ -f ${PROMETHEUS_PIDFILE} ]; then
        kill $(cat ${PROMETHEUS_PIDFILE}) 2>/dev/null
        rm -f ${PROMETHEUS_PIDFILE}
    fi

    # Stop Grafana
    if [ -f ${GRAFANA_PIDFILE} ]; then
        kill $(cat ${GRAFANA_PIDFILE}) 2>/dev/null
        rm -f ${GRAFANA_PIDFILE}
    fi

    # Wait for graceful shutdown
    sleep 2

    # Force kill if needed
    pkill -9 prometheus 2>/dev/null
    pkill -9 grafana-server 2>/dev/null
}
```

---

## Phase 5: Dashboard Configuration

### 5.1 BrightSign Node Exporter Dashboard

The dashboard from the reference repository displays:

**Top Row (3 panels):**
- CPU Core Usage (per-core percentages)
- System Load (1m, 5m, 15m averages)
- Uptime (minutes)

**Middle Row (3 panels):**
- Memory Usage (percentage, 0-100%)
- Thermal Zones (SoC, CPU cores, GPU, NPU - 25-45°C range)
- SD Card Utilization (percentage)

**Bottom Row (3 panels):**
- Memory Breakdown (total, available, cached, buffers)
- Network I/O (eth0 receive/transmit bytes)
- Disk I/O (eMMC and SD card read/write)

### 5.2 Dashboard Provisioning

Create `provisioning/dashboards/dashboards.yml`:
```yaml
apiVersion: 1
providers:
  - name: 'BrightSign'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    options:
      path: /var/volatile/bsext/ext_mon/dashboards
```

Create `provisioning/datasources/datasources.yml`:
```yaml
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://localhost:9090
    isDefault: true
    jsonData:
      timeInterval: "15s"
      queryTimeout: "60s"
```

---

## Phase 6: Build Process

### 6.1 Makefile Targets

```makefile
# Architecture detection
ARCH ?= $(shell uname -m)
ifeq ($(ARCH),aarch64)
    PROMETHEUS_ARCH = linux-arm64
    GRAFANA_ARCH = linux-arm64
else ifeq ($(ARCH),x86_64)
    PROMETHEUS_ARCH = linux-amd64
    GRAFANA_ARCH = linux-amd64
endif

PROMETHEUS_VERSION = 2.48.0
GRAFANA_VERSION = 10.2.3

# Download URLs
PROMETHEUS_URL = https://github.com/prometheus/prometheus/releases/download/v$(PROMETHEUS_VERSION)/prometheus-$(PROMETHEUS_VERSION).$(PROMETHEUS_ARCH).tar.gz
GRAFANA_URL = https://dl.grafana.com/oss/release/grafana-$(GRAFANA_VERSION).$(GRAFANA_ARCH).tar.gz

.PHONY: all clean download build package

all: package

download:
	mkdir -p binaries
	curl -L $(PROMETHEUS_URL) | tar xz -C binaries/
	curl -L $(GRAFANA_URL) | tar xz -C binaries/

build: download
	mkdir -p install
	cp -r binaries/prometheus-* install/prometheus
	cp -r binaries/grafana-* install/grafana
	cp bsext_init install/
	cp -r configs/* install/
	cp -r dashboards install/
	chmod +x install/bsext_init

package: build
	../common-scripts/pkg-dev.sh install lvm mon
```

### 6.2 Cross-Architecture Building

For building on x86 for ARM64 player:

```bash
# Override architecture
make ARCH=aarch64 package
```

---

## Phase 7: Deployment and Testing

### 7.1 Installation Steps

1. **Enable Node Exporter** (if not already done):
   ```bash
   registry write networking prometheus_enabled 1
   reboot
   ```

2. **Install Extension**:
   ```bash
   cd /usr/local
   unzip /storage/sd/mon-*.zip -o -d /usr/local/
   bash ./ext_mon_install-lvm.sh
   reboot
   ```

3. **Access Dashboards**:
   - Prometheus: `http://<player-ip>:9090`
   - Grafana: `http://<player-ip>:3000` (admin/admin)

### 7.2 Verification Commands

```bash
# Check services are running
ps | grep -E "(prometheus|grafana)"

# Check Prometheus is scraping
curl http://localhost:9090/api/v1/targets

# Check Node Exporter metrics
curl http://localhost:9100/metrics | head

# View logs
cat /tmp/prometheus.log
cat /tmp/grafana.log
```

### 7.3 Configuration Changes

To change ports or settings:

```bash
# Set custom ports
registry write mon-prometheus-port 9091
registry write mon-grafana-port 3001

# Restart services
/var/volatile/bsext/ext_mon/bsext_init restart
```

---

## Phase 8: Important Limitations

### 8.1 Data is Ephemeral

**All collected metrics data is stored in `/tmp` and will be lost on reboot.**

This is by design because:
- `/tmp` is the only reliably writable location
- Prevents filling up limited NVRAM storage
- Extension filesystem is read-only (squashfs)

If persistent storage is needed, consider writing to SD card, but be aware of:
- SD card wear from frequent writes
- Potential for filling up presentation storage

### 8.2 Resource Consumption

This extension consumes significant resources:
- ~150-200MB RAM (may impact players with limited memory)
- ~5-10% CPU (continuous scraping and serving)
- ~650MB storage in NVRAM

### 8.3 Security Considerations

- Default Grafana credentials are admin/admin
- No authentication on Prometheus
- All interfaces bound to all network interfaces
- **Not suitable for production or public networks**

### 8.4 No Alerting

This demo configuration does not include:
- Prometheus alerting rules
- AlertManager integration
- External notification systems

---

## Phase 9: Cleanup and Removal

### 9.1 Recommended: Factory Reset

The cleanest removal method is a factory reset:
- Consult [Factory Reset Documentation](https://docs.brightsign.biz/space/DOC/1936916598/Factory+Reset+a+Player)

### 9.2 Manual Removal

```bash
# Stop services
/var/volatile/bsext/ext_mon/bsext_init stop

# Unmount and remove
umount /var/volatile/bsext/ext_mon
rm -rf /var/volatile/bsext/ext_mon
lvremove --yes /dev/mapper/bsos-ext_mon

# Clean up data directories
rm -rf /tmp/prometheus_data /tmp/grafana_data /tmp/grafana_logs

# Reboot
reboot
```

### 9.3 Disable Node Exporter

If you want to disable the Node Exporter after removing the extension:

```bash
registry delete networking prometheus_enabled
reboot
```

---

## Summary

This plan outlines building a complex monitoring extension that:

1. **Bundles third-party software** (Prometheus + Grafana)
2. **Integrates with player features** (Node Exporter via registry)
3. **Provides runtime configuration** (via registry keys)
4. **Manages multiple services** (coordinated start/stop)
5. **Includes pre-built visualizations** (Grafana dashboard)

**Key Takeaways:**
- Complex extensions are possible but require careful resource management
- Data persistence is challenging due to read-only filesystem
- Registry integration allows runtime configuration
- This is for demonstration/testing only - not production use

**Reference Implementation:**
https://github.com/brightsign/player-p-and-g-demo
