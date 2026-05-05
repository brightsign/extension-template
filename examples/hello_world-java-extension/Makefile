.DEFAULT_GOAL := help

EXTENSION_NAME := hello_extension
JAR_NAME       := hello-extension-1.0.0.jar
JAR_PATH       := target/$(JAR_NAME)
INSTALL_DIR    := install
JRE_DIR        := $(INSTALL_DIR)/jre
# Must be run from the repository root — examples/common-scripts/ is at the repo root level.
COMMON_SCRIPTS := examples/common-scripts

# Eclipse Temurin 11 JRE for BrightSign (ARM64 Linux).
# This JRE is bundled inside the squashfs image — the player has no system Java.
JRE_ARCH    := aarch64
JRE_VERSION := 11
JRE_URL     := https://api.adoptium.net/v3/binary/latest/$(JRE_VERSION)/ga/linux/$(JRE_ARCH)/jre/hotspot/normal/eclipse

.PHONY: help build download-jre package test-local clean

help: ## Print available targets
	@grep -E '^[a-zA-Z_-]+:.*##' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*##"}; {printf "  %-14s %s\n", $$1, $$2}'

build: ## Build the fat JAR (mvn clean package)
	mvn clean package -q

download-jre: ## Download Temurin JRE 11 for linux/aarch64 into install/jre/
	@if [ -d "$(JRE_DIR)" ]; then \
		echo "JRE already present at $(JRE_DIR) — skipping download."; \
	else \
		echo "Downloading Eclipse Temurin JRE $(JRE_VERSION) for linux/$(JRE_ARCH)..."; \
		mkdir -p $(JRE_DIR); \
		wget -q --show-progress -O /tmp/jre.tar.gz "$(JRE_URL)" || \
			{ echo "ERROR: JRE download failed. Check network access."; exit 1; }; \
		tar -xzf /tmp/jre.tar.gz -C $(JRE_DIR) --strip-components=1; \
		rm /tmp/jre.tar.gz; \
		echo "JRE installed at $(JRE_DIR)"; \
	fi

package: build download-jre ## Package extension into a deployable squashfs ZIP
	@if [ ! -d "$(COMMON_SCRIPTS)" ]; then \
		echo "ERROR: $(COMMON_SCRIPTS) not found."; \
		echo "Run make from the root of your extension repo."; \
		echo "examples/common-scripts/ must be present (it comes from the template)."; \
		exit 1; \
	fi
	mkdir -p $(INSTALL_DIR)
	cp $(JAR_PATH) $(INSTALL_DIR)/$(JAR_NAME)
	cp bsext_init $(INSTALL_DIR)/bsext_init
	$(COMMON_SCRIPTS)/pkg-dev.sh $(INSTALL_DIR) lvm $(EXTENSION_NAME)

test-local: build ## Run the extension locally and verify the HTTP endpoint
	@echo "Starting extension locally..."; \
	java -jar $(JAR_PATH) & EXT_PID=$$!; \
	sleep 2; \
	echo "Testing endpoint..."; \
	curl -sf http://localhost:8080/ | python3 -m json.tool; \
	CURL_STATUS=$$?; \
	echo "Stopping extension..."; \
	kill $$EXT_PID 2>/dev/null; \
	exit $$CURL_STATUS

clean: ## Remove build artifacts, install/, and generated ZIPs
	mvn clean -q
	rm -rf $(INSTALL_DIR) *.zip
