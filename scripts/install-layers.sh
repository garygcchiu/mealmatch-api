#!/usr/bin/env bash

root=$(PWD)
while read -r line; do
  cd $line
  printf "Installing dependencies in $(basename $(pwd))"
  npm install
  cd $root
done < <(find src/layers/nodejs/node_modules -type d -maxdepth 1 -mindepth 1)

