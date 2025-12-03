#!/bin/bash

# get script directory
script_dir=$(dirname "$(realpath "$0")")

ext_name="$3"

# find the folder one level up that begins with ext_name
ext_folder_path=$(find ../ -maxdepth 1 -type d -name "${ext_name}*" | head -n 1)

# shift to target directory to squash
cd $1

${script_dir}/make-extension-$2 $3

zip -r ${ext_folder_path}/${ext_name}-$(date +%s).zip ext_${ext_name}*

rm -rf ext_${ext_name}*
