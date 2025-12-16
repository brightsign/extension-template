#!/bin/bash
set -e

# Get script directory (where common-scripts live)
script_dir=$(dirname "$(realpath "$0")")

# Usage: pkg-dev.sh <install_dir> <lvm|ubi> [extension_name]
# If extension_name not provided, will try to auto-detect from bsext_init

if [ -z "$1" ] || [ -z "$2" ]; then
    echo "Usage: $0 <install_dir> <lvm|ubi> [extension_name]" 1>&2
    echo "  install_dir: Directory containing built extension files" 1>&2
    echo "  lvm|ubi: Volume type for packaging" 1>&2
    echo "  extension_name: Optional, will auto-detect from bsext_init if not provided" 1>&2
    exit 1
fi

install_dir="$1"
vol_type="$2"
ext_name="${3:-}"

# Change to target directory
cd "${install_dir}"

# Try to auto-detect extension name if not provided
if [ -z "${ext_name}" ] && [ -f "bsext_init" ]; then
    ext_name=$(grep -E '^DAEMON_NAME=' bsext_init 2>/dev/null | cut -d'"' -f2 | head -1)
fi

if [ -z "${ext_name}" ]; then
    echo "Error: Could not determine extension name" 1>&2
    echo "Please provide extension name as third argument or ensure bsext_init has DAEMON_NAME set" 1>&2
    exit 1
fi

# Run the appropriate packaging script
${script_dir}/make-extension-${vol_type} "${ext_name}"

# Create zip with extension files
zip -r ../${ext_name}-$(date +%s).zip ext_${ext_name}*

# Clean up generated files in install directory
rm -rf ext_${ext_name}*

echo ""
echo "Package created: ../${ext_name}-$(date +%s).zip"
