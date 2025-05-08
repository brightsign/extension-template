#!/bin/bash

# get script directory
script_dir=$(dirname "$(realpath "$0")")

# shift to target directory to squash
cd $1

${script_dir}/make-extension-$2

zip -r ../time_publisher-$(date +%s).zip time_publisher*

rm -rf ext_time_publisher*
