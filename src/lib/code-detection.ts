interface LanguagePattern {
  pattern: RegExp;
  indicators: string[];
}

type LanguagePatterns = {
  [key: string]: LanguagePattern;
};

// Common programming language patterns for auto-detection
const languagePatterns: LanguagePatterns = {
  javascript: {
    pattern:
      /\b(const|let|var|function|=>|import|export|class|extends|return|if|else|for|while|null|undefined)\b/,
    indicators: ["()", "=>", ";", "const", "let", "var"],
  },
  typescript: {
    pattern:
      /\b(interface|type|enum|namespace|readonly|private|public|protected|as|is|keyof|typeof)\b/,
    indicators: ["interface", "type", "<>", "as"],
  },
  python: {
    pattern:
      /\b(def|class|import|from|if|elif|else|for|while|return|try|except|raise|with|in|is|not|and|or)\b/,
    indicators: ["def", "class", ":"],
  },
  java: {
    pattern:
      /\b(public|private|protected|class|interface|extends|implements|return|if|else|for|while|try|catch|throw|new)\b/,
    indicators: ["public", "class", ";"],
  },
  rust: {
    pattern:
      /\b(fn|let|mut|pub|use|mod|struct|enum|impl|trait|match|if|else|for|while|loop)\b/,
    indicators: ["fn", "let mut", "impl"],
  },
  go: {
    pattern:
      /\b(func|var|const|type|struct|interface|package|import|if|else|for|range|return|defer|go|chan)\b/,
    indicators: ["func", ":=", "package"],
  },
  html: {
    pattern: /(<\/?[a-z][\s\S]*>)/i,
    indicators: ["<", ">", "/>"],
  },
  css: {
    pattern:
      /[{}[\];:]|\b(margin|padding|border|color|background|font|width|height)\b/,
    indicators: ["{", "}", ";"],
  },
  sql: {
    pattern:
      /\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN|GROUP BY|ORDER BY|HAVING)\b/i,
    indicators: ["SELECT", "FROM", "WHERE"],
  },
  bash: {
    pattern:
      /\b(echo|export|read|if|then|else|fi|for|while|do|done|case|esac)\b/,
    indicators: ["#!/bin/bash", "echo", "$"],
  },
  json: {
    pattern: /^[\s]*[{[][\s\S]*[}\]][\s]*$/,
    indicators: ["{", "}", "[]"],
  },
  yaml: {
    pattern: /^[\s]*[a-zA-Z0-9_-]+:.*$/m,
    indicators: [":", "- "],
  },
  xml: {
    pattern: /(<\/?[a-z][\s\S]*>)/i,
    indicators: ["<?xml", "</", ">"],
  },
  markdown: {
    pattern: /^(#{1,6} |[*-] |\d+\. |\[.*\]|\|)/m,
    indicators: ["#", "##", "- ", "* "],
  },
};

export const detectLanguage = (code: string): string => {
  // Remove leading/trailing whitespace
  const trimmedCode = code.trim();

  // Quick check for common indicators first
  for (const [lang, { indicators }] of Object.entries(languagePatterns)) {
    if (indicators.some((indicator) => trimmedCode.includes(indicator))) {
      if (languagePatterns[lang].pattern.test(trimmedCode)) {
        return lang;
      }
    }
  }

  // Fallback to full pattern matching
  for (const [lang, { pattern }] of Object.entries(languagePatterns)) {
    if (pattern.test(trimmedCode)) {
      return lang;
    }
  }

  return "";
};

// Create a clean theme based on vscDarkPlus but without backgrounds
export const cleanTheme = {
  'pre[class*="language-"]': {
    background: "none",
    margin: 0,
    padding: "0.75rem",
    fontSize: "0.875rem",
    lineHeight: 1.5,
  },
  'code[class*="language-"]': {
    background: "none",
    textShadow: "none",
    fontSize: "0.875rem",
    lineHeight: 1.5,
  },
};
