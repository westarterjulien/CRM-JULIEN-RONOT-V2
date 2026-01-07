"use client"

import { useState, useEffect } from "react"
import { Monitor, Apple, Download, Shield, Headphones, Loader2, CheckCircle } from "lucide-react"
import Image from "next/image"

interface DownloadFile {
  id: string
  platform: "windows" | "macos"
  fileName: string
  version: string | null
  fileSize: number
  downloadCount: number
}

interface TenantInfo {
  name: string
  logo: string | null
  supportPhone: string | null
  supportEmail: string | null
}

export default function SupportDownloadPage() {
  const [downloads, setDownloads] = useState<DownloadFile[]>([])
  const [tenant, setTenant] = useState<TenantInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const response = await fetch("/api/public/support-downloads")
      if (response.ok) {
        const data = await response.json()
        setDownloads(data.downloads || [])
        setTenant(data.tenant || null)
      }
    } catch (error) {
      console.error("Error fetching downloads:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (file: DownloadFile) => {
    setDownloading(file.id)
    try {
      const response = await fetch(`/api/public/support-downloads/${file.id}`)
      if (response.ok) {
        const data = await response.json()
        window.location.href = data.url
      }
    } catch (error) {
      console.error("Error downloading:", error)
    } finally {
      setTimeout(() => setDownloading(null), 1000)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const windowsFile = downloads.find((d) => d.platform === "windows")
  const macFile = downloads.find((d) => d.platform === "macos")

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F5F5F7" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#0064FA" }} />
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: "#F5F5F7" }}>
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        {/* Header */}
        <div className="text-center mb-10">
          {tenant?.logo ? (
            <div className="flex justify-center mb-6">
              {tenant.logo.startsWith("data:") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={tenant.logo}
                  alt={tenant.name}
                  className="h-16 w-auto object-contain"
                />
              ) : (
                <Image
                  src={`/uploads/${tenant.logo}`}
                  alt={tenant.name}
                  width={180}
                  height={64}
                  className="h-16 w-auto object-contain"
                />
              )}
            </div>
          ) : (
            <div className="flex justify-center mb-6">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: "#0064FA", boxShadow: "0 4px 12px rgba(0, 100, 250, 0.3)" }}
              >
                <Headphones className="w-8 h-8 text-white" />
              </div>
            </div>
          )}

          <h1 className="text-3xl font-bold mb-3" style={{ color: "#111111" }}>
            Assistance à distance
          </h1>
          <p className="text-base max-w-xl mx-auto" style={{ color: "#666666" }}>
            Téléchargez notre logiciel pour permettre à notre équipe de vous assister directement sur votre ordinateur.
          </p>
        </div>

        {/* Download Cards */}
        <div className="grid md:grid-cols-2 gap-5 mb-8">
          {/* Windows Card */}
          <div
            className="rounded-2xl p-6"
            style={{
              background: "#FFFFFF",
              boxShadow: "0 4px 24px rgba(0, 0, 0, 0.06)",
            }}
          >
            <div className="flex items-center gap-4 mb-5">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: "#0064FA" }}
              >
                <Monitor className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold" style={{ color: "#111111" }}>Windows</h2>
                <p className="text-sm" style={{ color: "#999999" }}>Windows 10 / 11</p>
              </div>
            </div>

            {windowsFile ? (
              <>
                <div className="space-y-1.5 mb-5 text-sm" style={{ color: "#666666" }}>
                  <p>Version : {windowsFile.version || "Dernière"}</p>
                  <p>Taille : {formatFileSize(windowsFile.fileSize)}</p>
                </div>
                <button
                  onClick={() => handleDownload(windowsFile)}
                  disabled={downloading === windowsFile.id}
                  className="w-full py-3 px-5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
                  style={{
                    background: "#0064FA",
                    boxShadow: "0 4px 12px rgba(0, 100, 250, 0.25)",
                  }}
                >
                  {downloading === windowsFile.id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Download className="w-5 h-5" />
                  )}
                  Télécharger
                </button>
              </>
            ) : (
              <div className="text-center py-6" style={{ color: "#AEAEAE" }}>
                <Monitor className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Bientôt disponible</p>
              </div>
            )}
          </div>

          {/* Mac Card */}
          <div
            className="rounded-2xl p-6"
            style={{
              background: "#FFFFFF",
              boxShadow: "0 4px 24px rgba(0, 0, 0, 0.06)",
            }}
          >
            <div className="flex items-center gap-4 mb-5">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: "#111111" }}
              >
                <Apple className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold" style={{ color: "#111111" }}>macOS</h2>
                <p className="text-sm" style={{ color: "#999999" }}>macOS 11+</p>
              </div>
            </div>

            {macFile ? (
              <>
                <div className="space-y-1.5 mb-5 text-sm" style={{ color: "#666666" }}>
                  <p>Version : {macFile.version || "Dernière"}</p>
                  <p>Taille : {formatFileSize(macFile.fileSize)}</p>
                </div>
                <button
                  onClick={() => handleDownload(macFile)}
                  disabled={downloading === macFile.id}
                  className="w-full py-3 px-5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
                  style={{
                    background: "#111111",
                  }}
                >
                  {downloading === macFile.id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Download className="w-5 h-5" />
                  )}
                  Télécharger
                </button>
              </>
            ) : (
              <div className="text-center py-6" style={{ color: "#AEAEAE" }}>
                <Apple className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Bientôt disponible</p>
              </div>
            )}
          </div>
        </div>

        {/* Instructions Card */}
        <div
          className="rounded-2xl p-6 mb-6"
          style={{
            background: "#FFFFFF",
            boxShadow: "0 4px 24px rgba(0, 0, 0, 0.06)",
          }}
        >
          <h3 className="text-base font-semibold mb-5" style={{ color: "#111111" }}>
            Comment utiliser ?
          </h3>
          <ol className="space-y-4">
            {[
              "Téléchargez le logiciel correspondant à votre système",
              "Lancez le fichier (pas d'installation requise)",
              "Communiquez votre ID et mot de passe au technicien",
              "Notre équipe prendra le contrôle pour vous aider",
            ].map((step, index) => (
              <li key={index} className="flex items-start gap-3">
                <span
                  className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold"
                  style={{ background: "#E8F0FE", color: "#0064FA" }}
                >
                  {index + 1}
                </span>
                <p className="text-sm pt-0.5" style={{ color: "#444444" }}>{step}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* Security Notice */}
        <div
          className="flex items-start gap-4 rounded-xl p-5"
          style={{ background: "#E8F5E9" }}
        >
          <div
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "#28B95F" }}
          >
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-1" style={{ color: "#28B95F" }}>
              Connexion sécurisée
            </h4>
            <p className="text-sm" style={{ color: "#666666" }}>
              Connexion chiffrée. Vous gardez le contrôle et pouvez arrêter à tout moment.
            </p>
          </div>
        </div>

        {/* Contact */}
        {(tenant?.supportPhone || tenant?.supportEmail) && (
          <div className="text-center mt-10" style={{ color: "#666666" }}>
            <p className="text-sm">Besoin d&apos;aide ?</p>
            <div className="flex items-center justify-center gap-4 mt-2">
              {tenant.supportPhone && (
                <a
                  href={`tel:${tenant.supportPhone}`}
                  className="text-sm font-medium hover:opacity-80 transition-opacity"
                  style={{ color: "#0064FA" }}
                >
                  {tenant.supportPhone}
                </a>
              )}
              {tenant.supportEmail && (
                <a
                  href={`mailto:${tenant.supportEmail}`}
                  className="text-sm font-medium hover:opacity-80 transition-opacity"
                  style={{ color: "#0064FA" }}
                >
                  {tenant.supportEmail}
                </a>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center mt-12 text-xs" style={{ color: "#AEAEAE" }}>
          <p>&copy; {new Date().getFullYear()} {tenant?.name || "Support"}. Tous droits réservés.</p>
        </footer>
      </div>
    </div>
  )
}
