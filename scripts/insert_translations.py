#!/usr/bin/env python3
"""
Script to insert Romanian translations into messages.po file based on grep output.

Usage:
    python insert_translations.py < input_grep.txt

Input format (grep output with -B and -A context):
    --
    ../src/locales/ro/messages.po-33-#: src/routes/cookie-policy.lazy.tsx:53
    ../src/locales/ro/messages.po-34-msgid "<0>__clerk_*</0>: Various Clerk cookies..."
    ../src/locales/ro/messages.po:35:msgstr "<0>__clerk_*</0>: Diverse cookie-uri Clerk..."
    --

The script will:
1. Parse the grep output to extract msgid and msgstr pairs
2. Find matching msgid entries in the Romanian locale file
3. Update empty msgstr entries with the translations

Opt-in: --replace-source-copy
    python insert_translations.py --replace-source-copy ../src/locales/en/messages.po < input.txt

    The source catalog (en) is pre-filled by Lingui with msgstr == msgid (the
    Romanian source text), so the default mode, which fills only EMPTY msgstr,
    cannot translate it. With this flag, for ONLY the supplied msgids, an entry
    whose msgstr is exactly its msgid is replaced as well - and only when the
    entry is single-line, non-plural and has no msgctxt. Empty msgstr are
    filled as in the default mode; every other entry (an existing human
    translation, a context, a plural, a multi-line entry) is left untouched.
    Without the flag the behaviour is unchanged.
"""

import re
import sys
from typing import Dict, List, Tuple


def parse_grep_output(lines: List[str]) -> Dict[str, str]:
    """
    Parse grep output to extract msgid -> msgstr mappings.

    Args:
        lines: List of lines from grep output

    Returns:
        Dictionary mapping msgid to msgstr
    """
    translations = {}
    current_msgid = None

    for line in lines:
        line = line.strip()

        # Skip separator lines and empty lines
        if line == '--' or not line:
            continue

        # Extract the actual content after the grep prefix
        # Format: ../src/locales/ro/messages.po:35:msgstr "..."
        # or:     ../src/locales/ro/messages.po-34-msgid "..."
        match = re.match(r'.*\.po[-:](\d+)[-:](.+)', line)
        if not match:
            continue

        content = match.group(2)

        # Check if this is a msgid line
        if content.startswith('msgid '):
            msgid_content = content[6:]  # Remove 'msgid ' prefix
            current_msgid = msgid_content.strip()

        # Check if this is a msgstr line
        elif content.startswith('msgstr ') and current_msgid:
            msgstr_content = content[7:]  # Remove 'msgstr ' prefix
            msgstr_value = msgstr_content.strip()

            # Only store non-empty translations
            if msgstr_value and msgstr_value != '""':
                translations[current_msgid] = msgstr_value

            current_msgid = None

    return translations


def read_po_file(filepath: str) -> List[str]:
    """Read PO file and return lines."""
    with open(filepath, 'r', encoding='utf-8') as f:
        return f.readlines()


def write_po_file(filepath: str, lines: List[str]) -> None:
    """Write lines to PO file."""
    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(lines)


def has_msgctxt(po_lines: List[str], msgid_index: int) -> bool:
    """Whether the entry whose msgid line is at msgid_index carries a msgctxt (a multi-line one included)."""
    j = msgid_index - 1
    while j >= 0 and po_lines[j].lstrip().startswith('"'):
        j -= 1
    return j >= 0 and po_lines[j].strip().startswith('msgctxt ')


def is_source_copy(po_lines: List[str], i: int, msgid_content: str) -> bool:
    """
    Whether the entry whose msgid line is at i is a single-line, non-plural
    entry without msgctxt whose msgstr is exactly its msgid.
    """
    if msgid_content == '""' or i + 1 >= len(po_lines):
        return False
    if po_lines[i + 1].strip() != f'msgstr {msgid_content}':
        return False
    if i + 2 < len(po_lines) and po_lines[i + 2].lstrip().startswith('"'):
        return False
    return not has_msgctxt(po_lines, i)


def update_po_file(po_lines: List[str], translations: Dict[str, str], replace_source_copy: bool = False) -> Tuple[List[str], int]:
    """
    Update PO file lines with translations.

    Args:
        po_lines: List of lines from the PO file
        translations: Dictionary mapping msgid to msgstr
        replace_source_copy: also replace, for the supplied msgids only, a
            msgstr that is exactly its msgid (single-line, non-plural, no
            msgctxt); see the module docstring

    Returns:
        Tuple of (updated lines, count of updates)
    """
    updated_lines = []
    updates_count = 0
    i = 0

    while i < len(po_lines):
        line = po_lines[i]
        updated_lines.append(line)

        # Check if this is a msgid line
        if line.strip().startswith('msgid '):
            msgid_content = line.strip()[6:].strip()

            # Look ahead for the msgstr line
            if i + 1 < len(po_lines):
                next_line = po_lines[i + 1]

                # Check if next line is an empty msgstr
                if next_line.strip() == 'msgstr ""' or next_line.strip() == 'msgstr ""':
                    # Check if we have a translation for this msgid
                    if msgid_content in translations:
                        # Replace the empty msgstr with the translation
                        updated_lines.append(f'msgstr {translations[msgid_content]}\n')
                        updates_count += 1
                        i += 2  # Skip the original msgstr line
                        continue

                # Opt-in: a source copy (msgstr == msgid) of a supplied msgid
                if replace_source_copy and msgid_content in translations and is_source_copy(po_lines, i, msgid_content):
                    updated_lines.append(f'msgstr {translations[msgid_content]}\n')
                    updates_count += 1
                    i += 2  # Skip the original msgstr line
                    continue

        i += 1

    return updated_lines, updates_count


def main():
    """Main function."""
    # The opt-in flag, then the historical positional PO path.
    args = sys.argv[1:]
    replace_source_copy = '--replace-source-copy' in args
    positional = [arg for arg in args if arg != '--replace-source-copy']

    # Read input from stdin
    input_lines = sys.stdin.readlines()

    if not input_lines:
        print("Error: No input provided. Please pipe grep output to this script.", file=sys.stderr)
        print("Example: cat grep_output.txt | python insert_translations.py", file=sys.stderr)
        sys.exit(1)

    # Parse translations from grep output
    print(f"Parsing {len(input_lines)} lines of input...", file=sys.stderr)
    translations = parse_grep_output(input_lines)
    print(f"Found {len(translations)} translations", file=sys.stderr)

    if not translations:
        print("Warning: No translations found in input", file=sys.stderr)
        sys.exit(0)

    # Path to Romanian locale file. Keep the historical default for existing
    # callers, while allowing isolated catalog batches (admin, PNRR, etc.) to
    # target their own PO file explicitly.
    ro_po_path = positional[0] if positional else '../src/locales/ro/messages.po'

    # Read the current PO file
    print(f"Reading {ro_po_path}...", file=sys.stderr)
    po_lines = read_po_file(ro_po_path)
    print(f"Read {len(po_lines)} lines from PO file", file=sys.stderr)

    # Update the PO file
    print("Updating translations...", file=sys.stderr)
    updated_lines, updates_count = update_po_file(po_lines, translations, replace_source_copy)

    # Write the updated file
    if updates_count > 0:
        print(f"Writing {updates_count} updates to {ro_po_path}...", file=sys.stderr)
        write_po_file(ro_po_path, updated_lines)
        print(f"✓ Successfully updated {updates_count} translations!", file=sys.stderr)
    else:
        print("No updates needed - all translations already present", file=sys.stderr)


if __name__ == '__main__':
    main()
