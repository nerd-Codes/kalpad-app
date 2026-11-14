// src/lib/byok/jsonSanitizer.js
/**
 * Utility for sanitizing raw LLM JSON outputs before JSON.parse.
 * Mirrors KalPad Android's JsonSanitizer.kt:
 * 1. Strips markdown code fences (```json ... ```)
 * 2. Isolates outer JSON object {...} or array [...]
 * 3. Escapes literal control chars (\n, \r, \t) and invalid LaTeX escapes inside JSON string literals
 * 4. Removes trailing commas outside string literals
 */

const VALID_JSON_ESCAPES = new Set(['"', '\\', '/', 'b', 'f', 'n', 'r', 't', 'u']);

/**
 * Normalizes trailing commas, literal newlines/tabs inside JSON strings, and single-backslash LaTeX commands.
 * @param {string} json
 * @returns {string}
 */
function sanitizeTokens(json) {
  let out = '';
  let inString = false;
  let isEscaped = false;

  for (let i = 0; i < json.length; i += 1) {
    const c = json[i];

    if (inString) {
      if (isEscaped) {
        let isLatexOrInvalid = false;
        if (!VALID_JSON_ESCAPES.has(c)) {
          isLatexOrInvalid = true;
        } else if ((c === 'f' || c === 'b' || c === 't') && i + 1 < json.length && /[a-zA-Z]/.test(json[i + 1])) {
          // LaTeX commands e.g. \frac, \beta, \theta, \times, \begin
          isLatexOrInvalid = true;
        } else if (c === 'u' && !/^[0-9a-fA-F]{4}/.test(json.slice(i + 1, i + 5))) {
          // Non-hex unicode like \unit, \uparrow
          isLatexOrInvalid = true;
        }

        if (isLatexOrInvalid) {
          // Escape invalid escape sequence (e.g. \frac, \sqrt, \alpha) cleanly for JSON.parse
          out += '\\';
        }
        out += c;
        isEscaped = false;
      } else if (c === '\\') {
        out += c;
        isEscaped = true;
      } else if (c === '"') {
        out += c;
        inString = false;
      } else if (c === '\n') {
        out += '\\n';
      } else if (c === '\r') {
        out += '\\r';
      } else if (c === '\t') {
        out += '\\t';
      } else {
        out += c;
      }
    } else if (c === '"') {
      inString = true;
      out += c;
    } else if (c === ',') {
      let j = i + 1;
      while (j < json.length && /\s/.test(json[j])) {
        j += 1;
      }
      if (j < json.length && (json[j] === '}' || json[j] === ']')) {
        // Drop trailing comma before '}' or ']'
        continue;
      }
      out += c;
    } else {
      out += c;
    }
  }

  return out;
}

/**
 * Cleans an LLM output string so it can be parsed safely via JSON.parse.
 * @param {string} input
 * @returns {string}
 */
export function cleanJson(input) {
  if (typeof input !== 'string') return '';
  let text = input.trim();

  if (text.startsWith('```')) {
    text = text.replace(/^```[a-zA-Z]*\s*/, '').replace(/\s*```$/, '').trim();
  }

  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');
  let startIdx = -1;
  if (firstBrace >= 0 && firstBracket >= 0) {
    startIdx = Math.min(firstBrace, firstBracket);
  } else if (firstBrace >= 0) {
    startIdx = firstBrace;
  } else if (firstBracket >= 0) {
    startIdx = firstBracket;
  }

  const lastBrace = text.lastIndexOf('}');
  const lastBracket = text.lastIndexOf(']');
  const endIdx = Math.max(lastBrace, lastBracket);

  if (startIdx >= 0 && startIdx <= endIdx) {
    text = text.slice(startIdx, endIdx + 1);
  }

  return sanitizeTokens(text);
}

/**
 * Parses raw LLM text into a JavaScript object/array using JSON.parse + sanitizer recovery.
 * @param {string} rawText
 * @returns {any}
 */
export function parseAiJson(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('AI returned empty output instead of JSON.');
  }
  try {
    return JSON.parse(rawText);
  } catch (_) {
    const cleaned = cleanJson(rawText);
    try {
      return JSON.parse(cleaned);
    } catch (err) {
      throw new Error(`AI returned malformed JSON: ${err.message}`);
    }
  }
}

/**
 * Collapses accidental double-escaped LaTeX sequences for KaTeX rendering.
 * @param {string} text
 * @returns {string}
 */
export function sanitizeDoubleEscapedLatex(text) {
  if (typeof text !== 'string') return '';
  return text.replace(/\\\\([a-zA-Z]+|[,;:!{}%_&$#|\s])/g, '\\$1');
}
