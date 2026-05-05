#!/bin/bash
set -e

# Detect extension name from this script's location inside the mounted squashfs.
# When installed, this script lives at /var/volatile/bsext/ext_{name}/uninstall.sh
SCRIPT_PATH=$(dirname "$(realpath "$0")")
dir_name=$(basename "${SCRIPT_PATH}")
name="${dir_name#ext_}"

if [ -z "${name}" ] || [ "${name}" = "${dir_name}" ]; then
    echo "Error: could not determine extension name from path ${SCRIPT_PATH}" 1>&2
    exit 1
fi

mount_name="ext_${name}"
mount_path="/var/volatile/bsext/${mount_name}"

echo "Uninstalling extension: ${name}"

"${mount_path}/bsext_init" stop 2>/dev/null || true

if mountpoint -q "${mount_path}" 2>/dev/null; then
    umount "${mount_path}"
fi
rm -rf "${mount_path}"

if [ -b "/dev/mapper/bsos-${mount_name}-verified" ]; then
    veritysetup close "bsos-${mount_name}-verified" || true
fi

if [ -b "/dev/mapper/bsos-${mount_name}" ]; then
    lvremove --yes "/dev/mapper/bsos-${mount_name}"
fi
rm -f "/dev/mapper/bsos-${mount_name}"

echo "Extension ${name} uninstalled. Reboot to complete removal."
