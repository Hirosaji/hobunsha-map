#!/bin/sh

for file in *; do
    if [ ${file##*.} = "jpg" ]; then
        echo "Processing: ${file}"
        convert ${file} ${file//.jpg/.jpg.webp}
    fi
done