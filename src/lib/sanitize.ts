import DOMPurify from "isomorphic-dompurify"

/**
 * Sanitization utilities for XSS prevention
 * Use these functions whenever rendering user-provided HTML content
 */

// Default allowed tags for rich text content
const DEFAULT_ALLOWED_TAGS = [
  "p", "br", "strong", "b", "em", "i", "u", "s", "strike",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li",
  "a", "blockquote", "pre", "code",
  "table", "thead", "tbody", "tr", "th", "td",
  "div", "span", "hr",
]

// Default allowed attributes
const DEFAULT_ALLOWED_ATTR = [
  "href", "target", "rel", "class", "id",
  "colspan", "rowspan",
]

// Strict allowed tags for minimal formatting (comments, notes)
const STRICT_ALLOWED_TAGS = [
  "p", "br", "strong", "b", "em", "i",
  "ul", "ol", "li", "a",
]

// Strict allowed attributes
const STRICT_ALLOWED_ATTR = ["href", "target", "rel"]

/**
 * Sanitize HTML content with default settings
 * Use for rich text content like emails, markdown preview, etc.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return ""

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: DEFAULT_ALLOWED_TAGS,
    ALLOWED_ATTR: DEFAULT_ALLOWED_ATTR,
    // Add rel="noopener noreferrer" to links
    ADD_ATTR: ["target"],
    // Remove dangerous protocols
    FORBID_ATTR: ["style", "onerror", "onload", "onclick"],
    // Force all links to be safe
    ALLOW_DATA_ATTR: false,
  })
}

/**
 * Sanitize HTML content with strict settings
 * Use for user comments, notes, minimal formatting
 */
export function sanitizeHtmlStrict(html: string): string {
  if (!html) return ""

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: STRICT_ALLOWED_TAGS,
    ALLOWED_ATTR: STRICT_ALLOWED_ATTR,
    FORBID_ATTR: ["style", "onerror", "onload", "onclick"],
    ALLOW_DATA_ATTR: false,
  })
}

/**
 * Strip all HTML tags, leaving only text
 * Use for displaying in contexts where no HTML is wanted
 */
export function stripHtml(html: string): string {
  if (!html) return ""

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  })
}

/**
 * Sanitize email body content
 * Allows more tags for proper email formatting
 */
export function sanitizeEmailBody(html: string): string {
  if (!html) return ""

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      ...DEFAULT_ALLOWED_TAGS,
      "img", "style", "font", "center",
    ],
    ALLOWED_ATTR: [
      ...DEFAULT_ALLOWED_ATTR,
      "src", "alt", "width", "height",
      "align", "valign", "bgcolor", "color", "size", "face",
    ],
    // Allow data URLs for inline images
    ADD_DATA_URI_TAGS: ["img"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover"],
  })
}

/**
 * Sanitize markdown-rendered HTML
 * Allows code blocks and other markdown elements
 */
export function sanitizeMarkdown(html: string): string {
  if (!html) return ""

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      ...DEFAULT_ALLOWED_TAGS,
      "pre", "code", "kbd", "samp", "var",
      "img", "figure", "figcaption",
      "details", "summary",
      "mark", "del", "ins", "sup", "sub",
    ],
    ALLOWED_ATTR: [
      ...DEFAULT_ALLOWED_ATTR,
      "src", "alt", "title", "width", "height",
      "data-language", "data-line",
    ],
    // Allow syntax highlighting classes
    ADD_ATTR: ["class"],
    FORBID_ATTR: ["onerror", "onload", "onclick"],
    // Don't remove class attributes
    ALLOW_DATA_ATTR: true,
  })
}

/**
 * Escape HTML entities for safe display
 * Use when you want to show raw HTML as text
 */
export function escapeHtml(text: string): string {
  if (!text) return ""

  const escapeMap: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
  }

  return text.replace(/[&<>"'/]/g, (char) => escapeMap[char])
}

/**
 * Check if a string contains potentially malicious content
 * Use for validation before storing
 */
export function containsXss(input: string): boolean {
  if (!input) return false

  // Check for common XSS patterns
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /data:text\/html/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /<link\s+.*?href/gi,
    /expression\s*\(/gi,
    /url\s*\(/gi,
  ]

  return xssPatterns.some((pattern) => pattern.test(input))
}

export default {
  sanitizeHtml,
  sanitizeHtmlStrict,
  stripHtml,
  sanitizeEmailBody,
  sanitizeMarkdown,
  escapeHtml,
  containsXss,
}
