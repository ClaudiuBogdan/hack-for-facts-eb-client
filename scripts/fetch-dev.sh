#!/bin/bash

# Fetch a deployed page into a local file for quick inspection.
URL="${URL:-https://transparenta.eu/ro/learning/budget-basics/budget-basics/pb101-your-money-at-work}"
OUTPUT="${OUTPUT:-dev.html}"

curl -L -s "${URL}" -o "${OUTPUT}"
