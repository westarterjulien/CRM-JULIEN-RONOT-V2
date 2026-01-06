"use client"

import { useEffect, useRef } from "react"

export default function ApiDocsPage() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Load Scalar dynamically
    const loadScalar = async () => {
      // Add CSS
      const cssLink = document.createElement("link")
      cssLink.rel = "stylesheet"
      cssLink.href = "https://cdn.jsdelivr.net/npm/@scalar/api-reference@latest/dist/style.min.css"
      document.head.appendChild(cssLink)

      // Load Scalar script
      const script = document.createElement("script")
      script.src = "https://cdn.jsdelivr.net/npm/@scalar/api-reference@latest/dist/browser/standalone.min.js"
      script.async = true
      script.onload = () => {
        // @ts-ignore
        if (window.Scalar && containerRef.current) {
          // @ts-ignore
          window.Scalar.createApiReference(containerRef.current, {
            spec: {
              url: "/openapi.json",
            },
            theme: "purple",
            darkMode: true,
            layout: "modern",
            hideModels: false,
            hideDownloadButton: false,
            showSidebar: true,
            customCss: `
              .scalar-app {
                --scalar-background-1: #0a0a0b;
                --scalar-background-2: #121214;
                --scalar-background-3: #1a1a1e;
                --scalar-color-1: #ffffff;
                --scalar-color-2: #b4b4b4;
                --scalar-color-3: #8b8b8b;
                --scalar-color-accent: #8B5CF6;
              }
            `,
            metaData: {
              title: "CRM Luelis - Documentation API",
            },
          })
        }
      }
      document.body.appendChild(script)
    }

    loadScalar()

    return () => {
      // Cleanup
      const scripts = document.querySelectorAll('script[src*="scalar"]')
      scripts.forEach((s) => s.remove())
      const links = document.querySelectorAll('link[href*="scalar"]')
      links.forEach((l) => l.remove())
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0a0b]">
      <div ref={containerRef} className="min-h-screen" />
    </div>
  )
}
