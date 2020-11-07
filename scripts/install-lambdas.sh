#!/usr/bin/env bash

root=$(PWD)
npm install
while read -r -d '' line; do
  cd $(dirname "$line")
  printf "Installing dependencies in $(basename $(pwd))"
  npm install
  cd $root
done < <(find ./src -type f -name 'package.json' -maxdepth 3 -mindepth 1 ! -path '*layers*' -print0 )
