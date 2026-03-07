#!/bin/bash
set -euo pipefail

awk '
  BEGIN {
    RS = ""
    ORS = ""
  }
  NR == 1 {
    next
  }
  $0 ~ /^#~/ {
    next
  }
  $0 ~ /(^|\n)msgstr ""($|\n)/ {
    print $0 "\n--\n"
  }
' ./src/locales/ro/messages.po
