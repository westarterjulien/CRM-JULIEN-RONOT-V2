"use client"

import { useMemo, useCallback } from "react"
import { Circle, CheckCircle2 } from "lucide-react"
import { sanitizeMarkdown } from "@/lib/sanitize"

interface MarkdownPreviewProps {
  content: string
  maxLength?: number
  className?: string
  onTaskToggle?: (taskIndex: number, checked: boolean) => void
  interactive?: boolean
}

interface ParsedElement {
  type: "text" | "task" | "heading" | "list" | "quote" | "code"
  content: string
  checked?: boolean
  level?: number
  taskIndex?: number
}

function parseContent(content: string): ParsedElement[] {
  const lines = content.split("\n")
  const elements: ParsedElement[] = []
  let taskIndex = 0

  for (const line of lines) {
    // Task list - [ ] or [x]
    const uncheckedMatch = line.match(/^- \[ \] (.+)$/)
    const checkedMatch = line.match(/^- \[x\] (.+)$/i)

    if (uncheckedMatch) {
      elements.push({
        type: "task",
        content: uncheckedMatch[1],
        checked: false,
        taskIndex: taskIndex++,
      })
    } else if (checkedMatch) {
      elements.push({
        type: "task",
        content: checkedMatch[1],
        checked: true,
        taskIndex: taskIndex++,
      })
    }
    // Headers
    else if (line.startsWith("### ")) {
      elements.push({ type: "heading", content: line.slice(4), level: 3 })
    } else if (line.startsWith("## ")) {
      elements.push({ type: "heading", content: line.slice(3), level: 2 })
    } else if (line.startsWith("# ")) {
      elements.push({ type: "heading", content: line.slice(2), level: 1 })
    }
    // Blockquote
    else if (line.startsWith("> ")) {
      elements.push({ type: "quote", content: line.slice(2) })
    }
    // Unordered list
    else if (line.startsWith("- ")) {
      elements.push({ type: "list", content: line.slice(2) })
    }
    // Ordered list
    else if (/^\d+\. /.test(line)) {
      elements.push({ type: "list", content: line.replace(/^\d+\. /, "") })
    }
    // Regular text
    else {
      elements.push({ type: "text", content: line })
    }
  }

  return elements
}

// Sanitize URL to prevent javascript: and other dangerous protocols
function sanitizeUrl(url: string): string {
  const trimmed = url.trim().toLowerCase()
  // Block dangerous protocols
  if (
    trimmed.startsWith("javascript:") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("vbscript:") ||
    trimmed.startsWith("file:")
  ) {
    return "#"
  }
  return url
}

function formatInlineMarkdown(text: string): string {
  let result = text
    // Escape HTML
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/__(.+?)__/g, '<strong class="font-semibold">$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
    .replace(/_(.+?)_/g, '<em class="italic">$1</em>')
    // Strikethrough
    .replace(/~~(.+?)~~/g, '<del class="line-through opacity-60">$1</del>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded text-xs bg-gray-100 text-pink-600 font-mono">$1</code>')
    // Links - with URL sanitization
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      (_match, linkText, url) => {
        const safeUrl = sanitizeUrl(url)
        return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">${linkText}</a>`
      }
    )

  // Final sanitization pass with DOMPurify
  return sanitizeMarkdown(result)
}

export function MarkdownPreview({
  content,
  maxLength,
  className = "",
  onTaskToggle,
  interactive = false,
}: MarkdownPreviewProps) {
  const elements = useMemo(() => {
    let text = content
    if (maxLength && text.length > maxLength) {
      text = text.substring(0, maxLength).trim() + "..."
    }
    return parseContent(text)
  }, [content, maxLength])

  const handleTaskClick = useCallback(
    (taskIndex: number, currentChecked: boolean) => {
      if (interactive && onTaskToggle) {
        onTaskToggle(taskIndex, !currentChecked)
      }
    },
    [interactive, onTaskToggle]
  )

  return (
    <div className={`markdown-preview space-y-1 ${className}`}>
      {elements.map((el, idx) => {
        switch (el.type) {
          case "task":
            return (
              <div
                key={idx}
                className={`flex items-start gap-2.5 group ${interactive ? "cursor-pointer" : ""}`}
                onClick={() => handleTaskClick(el.taskIndex!, el.checked!)}
              >
                {el.checked ? (
                  <CheckCircle2
                    className="w-[18px] h-[18px] mt-0.5 flex-shrink-0 transition-colors"
                    style={{ color: "#28B95F" }}
                  />
                ) : (
                  <Circle
                    className={`w-[18px] h-[18px] mt-0.5 flex-shrink-0 transition-colors ${
                      interactive ? "group-hover:text-blue-400" : ""
                    }`}
                    style={{ color: "#CCCCCC" }}
                  />
                )}
                <span
                  className={`flex-1 ${el.checked ? "line-through opacity-50" : ""}`}
                  dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(el.content) }}
                />
              </div>
            )

          case "heading":
            const headingClasses =
              el.level === 1
                ? "text-lg font-bold mt-3 mb-1"
                : el.level === 2
                ? "text-base font-semibold mt-2 mb-1"
                : "text-sm font-semibold mt-2 mb-1"
            if (el.level === 1) {
              return (
                <h1
                  key={idx}
                  className={headingClasses}
                  dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(el.content) }}
                />
              )
            } else if (el.level === 2) {
              return (
                <h2
                  key={idx}
                  className={headingClasses}
                  dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(el.content) }}
                />
              )
            } else {
              return (
                <h3
                  key={idx}
                  className={headingClasses}
                  dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(el.content) }}
                />
              )
            }

          case "quote":
            return (
              <blockquote
                key={idx}
                className="border-l-4 border-gray-300 pl-3 py-0.5 text-gray-600 italic"
                dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(el.content) }}
              />
            )

          case "list":
            return (
              <div key={idx} className="flex items-start gap-2">
                <span className="text-gray-400 mt-1.5">•</span>
                <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(el.content) }} />
              </div>
            )

          case "text":
          default:
            if (!el.content.trim()) {
              return <div key={idx} className="h-2" />
            }
            return (
              <p
                key={idx}
                dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(el.content) }}
              />
            )
        }
      })}
    </div>
  )
}
