"use client"

import { useState, useEffect, useRef } from "react"
import {
  Monitor,
  Apple,
  Upload,
  Trash2,
  Download,
  Power,
  PowerOff,
  ExternalLink,
  CheckCircle,
  XCircle,
  Loader2,
  HardDrive,
  Cloud,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  Link,
} from "lucide-react"

interface DownloadFile {
  id: string
  platform: "windows" | "macos"
  fileName: string
  originalName: string
  fileSize: number
  version: string | null
  downloadCount: number
  isActive: boolean
  createdAt: string
  uploadedBy: { name: string; email: string } | null
}

interface S3Config {
  s3Endpoint: string
  s3Region: string
  s3AccessKey: string
  s3SecretKey: string
  s3Bucket: string
  s3ForcePathStyle: boolean
}

interface RemoteSupportSettingsProps {
  settings: {
    s3Endpoint?: string
    s3Region?: string
    s3AccessKey?: string
    s3SecretKey?: string
    s3Bucket?: string
    s3ForcePathStyle?: boolean
  }
  onSave: (settings: S3Config) => Promise<void>
}

export function RemoteSupportSettings({ settings, onSave }: RemoteSupportSettingsProps) {
  // S3 Config state
  const [s3Endpoint, setS3Endpoint] = useState(settings.s3Endpoint || "https://s3.fr-par.scw.cloud")
  const [s3Region, setS3Region] = useState(settings.s3Region || "fr-par")
  const [s3AccessKey, setS3AccessKey] = useState(settings.s3AccessKey || "")
  const [s3SecretKey, setS3SecretKey] = useState(settings.s3SecretKey || "")
  const [s3Bucket, setS3Bucket] = useState(settings.s3Bucket || "")
  const [s3ForcePathStyle, setS3ForcePathStyle] = useState(settings.s3ForcePathStyle ?? true)
  const [showSecretKey, setShowSecretKey] = useState(false)
  const [savingS3, setSavingS3] = useState(false)
  const [s3Saved, setS3Saved] = useState(false)
  const [testingS3, setTestingS3] = useState(false)
  const [s3TestResult, setS3TestResult] = useState<{ success: boolean; message: string } | null>(null)

  // Downloads state
  const [downloads, setDownloads] = useState<DownloadFile[]>([])
  const [loadingDownloads, setLoadingDownloads] = useState(true)
  const [uploading, setUploading] = useState<"windows" | "macos" | null>(null)
  const [uploadVersion, setUploadVersion] = useState("")
  const [deleting, setDeleting] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  const windowsInputRef = useRef<HTMLInputElement>(null)
  const macInputRef = useRef<HTMLInputElement>(null)

  const isS3Configured = s3Endpoint && s3AccessKey && s3SecretKey && s3Bucket

  useEffect(() => {
    if (isS3Configured) {
      fetchDownloads()
    } else {
      setLoadingDownloads(false)
    }
  }, [])

  const fetchDownloads = async () => {
    try {
      const response = await fetch("/api/settings/support-downloads")
      if (response.ok) {
        const data = await response.json()
        setDownloads(data.downloads || [])
      }
    } catch (error) {
      console.error("Error fetching downloads:", error)
    } finally {
      setLoadingDownloads(false)
    }
  }

  const handleSaveS3Config = async () => {
    setSavingS3(true)
    try {
      await onSave({
        s3Endpoint,
        s3Region,
        s3AccessKey,
        s3SecretKey,
        s3Bucket,
        s3ForcePathStyle,
      })
      setS3Saved(true)
      setTimeout(() => setS3Saved(false), 2000)
      // Reload downloads after saving
      fetchDownloads()
    } catch (error) {
      console.error("Error saving S3 config:", error)
    } finally {
      setSavingS3(false)
    }
  }

  const handleTestS3 = async () => {
    setTestingS3(true)
    setS3TestResult(null)
    try {
      const response = await fetch("/api/settings/s3-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          s3Endpoint,
          s3Region,
          s3AccessKey,
          s3SecretKey,
          s3Bucket,
          s3ForcePathStyle,
        }),
      })
      const data = await response.json()
      if (response.ok) {
        setS3TestResult({ success: true, message: data.message })
      } else {
        setS3TestResult({ success: false, message: data.error || "Erreur de connexion" })
      }
    } catch (error) {
      console.error("Error testing S3:", error)
      setS3TestResult({ success: false, message: "Erreur lors du test" })
    } finally {
      setTestingS3(false)
      // Clear result after 5 seconds
      setTimeout(() => setS3TestResult(null), 5000)
    }
  }

  const handleUpload = async (platform: "windows" | "macos", file: File) => {
    setUploading(platform)
    try {
      // Step 1: Get presigned URL from our API
      const urlResponse = await fetch("/api/settings/support-downloads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "get-upload-url",
          fileName: file.name,
          fileSize: file.size,
          contentType: file.type || "application/octet-stream",
          platform,
        }),
      })

      if (!urlResponse.ok) {
        const data = await urlResponse.json()
        alert(data.error || "Erreur lors de la préparation de l'upload")
        return
      }

      const { uploadUrl, s3Key, fileName } = await urlResponse.json()

      // Step 2: Upload directly to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
      })

      if (!uploadResponse.ok) {
        alert("Erreur lors de l'upload vers S3")
        return
      }

      // Step 3: Confirm upload in our API
      const confirmResponse = await fetch("/api/settings/support-downloads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm-upload",
          s3Key,
          fileName,
          originalName: file.name,
          fileSize: file.size,
          platform,
          version: uploadVersion || null,
        }),
      })

      if (confirmResponse.ok) {
        setUploadVersion("")
        fetchDownloads()
      } else {
        const data = await confirmResponse.json()
        alert(data.error || "Erreur lors de la confirmation")
      }
    } catch (error) {
      console.error("Error uploading:", error)
      alert("Erreur lors de l'upload")
    } finally {
      setUploading(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce fichier ?")) return

    setDeleting(id)
    try {
      const response = await fetch(`/api/settings/support-downloads/${id}`, {
        method: "DELETE",
      })
      if (response.ok) {
        fetchDownloads()
      }
    } catch (error) {
      console.error("Error deleting:", error)
    } finally {
      setDeleting(null)
    }
  }

  const handleToggleActive = async (id: string, isActive: boolean) => {
    setToggling(id)
    try {
      const response = await fetch(`/api/settings/support-downloads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      })
      if (response.ok) {
        fetchDownloads()
      }
    } catch (error) {
      console.error("Error toggling:", error)
    } finally {
      setToggling(null)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const windowsFiles = downloads.filter((d) => d.platform === "windows")
  const macFiles = downloads.filter((d) => d.platform === "macos")

  const inputStyle = {
    background: "#F5F5F7",
    border: "1px solid #EEEEEE",
    color: "#111111",
  }

  return (
    <div className="space-y-6">
      {/* S3 Configuration */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "#E8F5E9" }}
          >
            <Cloud className="h-5 w-5" style={{ color: "#28B95F" }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: "#111111" }}>
              Configuration S3 (Scaleway)
            </h2>
            <p className="text-sm" style={{ color: "#666666" }}>
              Stockage des fichiers de téléchargement
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: "#444444" }}>
              Endpoint S3 *
            </label>
            <input
              value={s3Endpoint}
              onChange={(e) => setS3Endpoint(e.target.value)}
              placeholder="https://s3.fr-par.scw.cloud"
              className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2"
              style={inputStyle}
            />
            <p className="text-xs" style={{ color: "#999999" }}>
              Scaleway: s3.fr-par.scw.cloud ou s3.nl-ams.scw.cloud
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: "#444444" }}>
              Région
            </label>
            <input
              value={s3Region}
              onChange={(e) => setS3Region(e.target.value)}
              placeholder="fr-par"
              className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2"
              style={inputStyle}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: "#444444" }}>
              Access Key ID *
            </label>
            <input
              value={s3AccessKey}
              onChange={(e) => setS3AccessKey(e.target.value)}
              placeholder="SCW..."
              className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2"
              style={inputStyle}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: "#444444" }}>
              Secret Access Key *
            </label>
            <div className="relative">
              <input
                type={showSecretKey ? "text" : "password"}
                value={s3SecretKey}
                onChange={(e) => setS3SecretKey(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 pr-12"
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => setShowSecretKey(!showSecretKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showSecretKey ? (
                  <EyeOff className="h-4 w-4" style={{ color: "#666666" }} />
                ) : (
                  <Eye className="h-4 w-4" style={{ color: "#666666" }} />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: "#444444" }}>
              Nom du Bucket *
            </label>
            <input
              value={s3Bucket}
              onChange={(e) => setS3Bucket(e.target.value)}
              placeholder="mon-bucket-support"
              className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2"
              style={inputStyle}
            />
          </div>

          <div className="flex items-center gap-3 pt-6">
            <input
              type="checkbox"
              id="forcePathStyle"
              checked={s3ForcePathStyle}
              onChange={(e) => setS3ForcePathStyle(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <label htmlFor="forcePathStyle" className="text-sm" style={{ color: "#666666" }}>
              Force Path Style (requis pour Scaleway/MinIO)
            </label>
          </div>
        </div>

        {/* Test Result */}
        {s3TestResult && (
          <div
            className="mt-4 p-3 rounded-xl flex items-center gap-3"
            style={{
              background: s3TestResult.success ? "#E8F5E9" : "#FFEBEE",
              border: `1px solid ${s3TestResult.success ? "#A5D6A7" : "#EF9A9A"}`,
            }}
          >
            {s3TestResult.success ? (
              <CheckCircle className="h-5 w-5 flex-shrink-0" style={{ color: "#28B95F" }} />
            ) : (
              <XCircle className="h-5 w-5 flex-shrink-0" style={{ color: "#F04B69" }} />
            )}
            <p
              className="text-sm font-medium"
              style={{ color: s3TestResult.success ? "#2E7D32" : "#C62828" }}
            >
              {s3TestResult.message}
            </p>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={handleTestS3}
            disabled={testingS3 || !s3Endpoint || !s3AccessKey || !s3SecretKey || !s3Bucket}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
            style={{ background: "#F5F5F7", color: "#444444" }}
          >
            {testingS3 ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Tester la connexion
          </button>
          <button
            onClick={handleSaveS3Config}
            disabled={savingS3 || !s3Endpoint || !s3AccessKey || !s3SecretKey || !s3Bucket}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50"
            style={{ background: "#28B95F" }}
          >
            {savingS3 ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : s3Saved ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {s3Saved ? "Sauvegardé" : "Sauvegarder"}
          </button>
        </div>
      </div>

      {/* Downloads Management */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "#E3F2FD" }}
            >
              <HardDrive className="h-5 w-5" style={{ color: "#0064FA" }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: "#111111" }}>
                Fichiers de support à distance
              </h2>
              <p className="text-sm" style={{ color: "#666666" }}>
                RustDesk ou autre logiciel de prise en main
              </p>
            </div>
          </div>

          <a
            href="/support"
            target="_blank"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80"
            style={{ background: "#F5F5F7", color: "#666666" }}
          >
            <ExternalLink className="h-4 w-4" />
            Voir la page publique
          </a>
        </div>

        {!isS3Configured ? (
          <div
            className="rounded-xl p-8 text-center"
            style={{ background: "#FFF3E0", border: "1px solid #FFE0B2" }}
          >
            <Cloud className="h-12 w-12 mx-auto mb-3" style={{ color: "#F57C00" }} />
            <p className="font-medium" style={{ color: "#E65100" }}>
              Configuration S3 requise
            </p>
            <p className="text-sm mt-1" style={{ color: "#FF8F00" }}>
              Configurez le stockage S3 ci-dessus pour pouvoir uploader des fichiers
            </p>
          </div>
        ) : loadingDownloads ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#5F00BA" }} />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Windows Section */}
            <div
              className="rounded-xl p-5"
              style={{ background: "#F8F9FA", border: "1px solid #EEEEEE" }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "#E3F2FD" }}
                >
                  <Monitor className="h-5 w-5" style={{ color: "#0064FA" }} />
                </div>
                <div>
                  <h3 className="font-semibold" style={{ color: "#111111" }}>
                    Windows
                  </h3>
                  <p className="text-xs" style={{ color: "#666666" }}>
                    .exe uniquement
                  </p>
                </div>
              </div>

              {windowsFiles.length > 0 ? (
                <div className="space-y-3">
                  {windowsFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 rounded-lg"
                      style={{
                        background: file.isActive ? "#E8F5E9" : "#FFFFFF",
                        border: `1px solid ${file.isActive ? "#A5D6A7" : "#EEEEEE"}`,
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <p
                          className="font-medium truncate text-sm"
                          style={{ color: "#111111" }}
                        >
                          {file.originalName}
                        </p>
                        <p className="text-xs" style={{ color: "#666666" }}>
                          {formatFileSize(file.fileSize)}
                          {file.version && ` • v${file.version}`}
                          {` • ${file.downloadCount} DL`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        <button
                          onClick={() => handleToggleActive(file.id, file.isActive)}
                          disabled={toggling === file.id}
                          className="p-1.5 rounded-lg transition-all hover:opacity-70"
                          title={file.isActive ? "Désactiver" : "Activer"}
                        >
                          {toggling === file.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : file.isActive ? (
                            <Power className="h-4 w-4" style={{ color: "#28B95F" }} />
                          ) : (
                            <PowerOff className="h-4 w-4" style={{ color: "#999999" }} />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(file.id)}
                          disabled={deleting === file.id}
                          className="p-1.5 rounded-lg transition-all hover:opacity-70"
                        >
                          {deleting === file.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" style={{ color: "#F04B69" }} />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-center py-4" style={{ color: "#999999" }}>
                  Aucun fichier Windows
                </p>
              )}

              <input
                ref={windowsInputRef}
                type="file"
                accept=".exe"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleUpload("windows", file)
                  e.target.value = ""
                }}
              />
              <button
                onClick={() => windowsInputRef.current?.click()}
                disabled={uploading === "windows"}
                className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50"
                style={{ background: "#0064FA" }}
              >
                {uploading === "windows" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Uploader .exe Windows
              </button>
            </div>

            {/* Mac Section */}
            <div
              className="rounded-xl p-5"
              style={{ background: "#F8F9FA", border: "1px solid #EEEEEE" }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "#F3E5F5" }}
                >
                  <Apple className="h-5 w-5" style={{ color: "#7B1FA2" }} />
                </div>
                <div>
                  <h3 className="font-semibold" style={{ color: "#111111" }}>
                    macOS
                  </h3>
                  <p className="text-xs" style={{ color: "#666666" }}>
                    .dmg ou .pkg
                  </p>
                </div>
              </div>

              {macFiles.length > 0 ? (
                <div className="space-y-3">
                  {macFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 rounded-lg"
                      style={{
                        background: file.isActive ? "#E8F5E9" : "#FFFFFF",
                        border: `1px solid ${file.isActive ? "#A5D6A7" : "#EEEEEE"}`,
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <p
                          className="font-medium truncate text-sm"
                          style={{ color: "#111111" }}
                        >
                          {file.originalName}
                        </p>
                        <p className="text-xs" style={{ color: "#666666" }}>
                          {formatFileSize(file.fileSize)}
                          {file.version && ` • v${file.version}`}
                          {` • ${file.downloadCount} DL`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        <button
                          onClick={() => handleToggleActive(file.id, file.isActive)}
                          disabled={toggling === file.id}
                          className="p-1.5 rounded-lg transition-all hover:opacity-70"
                          title={file.isActive ? "Désactiver" : "Activer"}
                        >
                          {toggling === file.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : file.isActive ? (
                            <Power className="h-4 w-4" style={{ color: "#28B95F" }} />
                          ) : (
                            <PowerOff className="h-4 w-4" style={{ color: "#999999" }} />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(file.id)}
                          disabled={deleting === file.id}
                          className="p-1.5 rounded-lg transition-all hover:opacity-70"
                        >
                          {deleting === file.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" style={{ color: "#F04B69" }} />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-center py-4" style={{ color: "#999999" }}>
                  Aucun fichier Mac
                </p>
              )}

              <input
                ref={macInputRef}
                type="file"
                accept=".dmg,.pkg"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleUpload("macos", file)
                  e.target.value = ""
                }}
              />
              <button
                onClick={() => macInputRef.current?.click()}
                disabled={uploading === "macos"}
                className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50"
                style={{ background: "#7B1FA2" }}
              >
                {uploading === "macos" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Uploader .dmg/.pkg Mac
              </button>
            </div>
          </div>
        )}

        {/* Version input for uploads */}
        {isS3Configured && (
          <div className="mt-6 pt-6 border-t" style={{ borderColor: "#EEEEEE" }}>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium" style={{ color: "#444444" }}>
                  Version (optionnel)
                </label>
                <input
                  value={uploadVersion}
                  onChange={(e) => setUploadVersion(e.target.value)}
                  placeholder="ex: 1.2.3"
                  className="w-full mt-1 px-4 py-2 rounded-xl text-sm focus:outline-none focus:ring-2"
                  style={inputStyle}
                />
                <p className="text-xs mt-1" style={{ color: "#999999" }}>
                  Sera associée au prochain fichier uploadé
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Support page URL info */}
        <div
          className="mt-6 p-4 rounded-xl flex items-start gap-3"
          style={{ background: "#E8F5E9", border: "1px solid #A5D6A7" }}
        >
          <Link className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: "#2E7D32" }} />
          <div>
            <p className="font-medium text-sm" style={{ color: "#2E7D32" }}>
              Page publique de téléchargement
            </p>
            <p className="text-sm mt-1" style={{ color: "#388E3C" }}>
              Les fichiers actifs seront disponibles sur{" "}
              <code className="px-1.5 py-0.5 rounded bg-white/50">/support</code>
              {" "}ou sur un domaine dédié (ex: support.votredomaine.fr)
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
