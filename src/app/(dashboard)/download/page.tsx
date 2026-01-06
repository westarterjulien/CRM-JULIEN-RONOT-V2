"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Download,
  Monitor,
  Apple,
  MonitorSmartphone,
  Rocket,
  Bell,
  Layers,
  RefreshCw,
  ExternalLink,
  HardDrive
} from "lucide-react"

interface Asset {
  name: string
  url: string
  size: number
  downloads: number
  platform: "windows" | "mac" | "linux" | "unknown"
}

interface Release {
  version: string
  name: string
  description: string
  publishedAt: string
  prerelease: boolean
  assets: Asset[]
}

interface ReleasesData {
  releases: Release[]
  latest: Release | null
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }) + " à " + date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function PlatformIcon({ platform }: { platform: string }) {
  switch (platform) {
    case "windows":
      return <Monitor className="h-5 w-5" />
    case "mac":
      return <Apple className="h-5 w-5" />
    case "linux":
      return <MonitorSmartphone className="h-5 w-5" />
    default:
      return <HardDrive className="h-5 w-5" />
  }
}

function PlatformName({ platform }: { platform: string }) {
  switch (platform) {
    case "windows":
      return "Windows"
    case "mac":
      return "macOS"
    case "linux":
      return "Linux"
    default:
      return "Autre"
  }
}

export default function DownloadPage() {
  const [data, setData] = useState<ReleasesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchReleases = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/releases")
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError("Impossible de charger les versions disponibles")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReleases()
  }, [])

  const features = [
    {
      icon: Bell,
      title: "Notifications natives",
      description: "Recevez des notifications système pour les déploiements et alertes",
    },
    {
      icon: Layers,
      title: "Overlay de déploiement",
      description: "Un widget discret apparaît pendant les déploiements en cours",
    },
    {
      icon: Rocket,
      title: "Accès rapide",
      description: "Lancez le CRM en un clic depuis votre barre des tâches",
    },
  ]

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/70 mb-4">
          <span className="text-4xl font-bold text-white">L</span>
        </div>
        <h1 className="text-3xl font-bold mb-2">CRM Luelis Desktop</h1>
        <p className="text-muted-foreground text-lg">
          Application native pour Windows, macOS et Linux
        </p>
      </div>

      {/* Features */}
      <div className="grid md:grid-cols-3 gap-4 mb-10">
        {features.map((feature) => (
          <Card key={feature.title} className="bg-muted/30">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Download Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Téléchargements
              </CardTitle>
              <CardDescription>
                Choisissez la version correspondant à votre système
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchReleases} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>{error}</p>
              <Button variant="link" onClick={fetchReleases}>
                Réessayer
              </Button>
            </div>
          ) : !data?.latest ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                <Rocket className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-2">Aucune version disponible</h3>
              <p className="text-sm text-muted-foreground mb-4">
                L&apos;application desktop sera bientôt disponible au téléchargement.
              </p>
              <p className="text-xs text-muted-foreground">
                La première version est en cours de préparation...
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Latest Release */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="font-semibold">Dernière version</h3>
                  <Badge variant="default">{data.latest.version}</Badge>
                  {data.latest.prerelease && (
                    <Badge variant="secondary">Pré-release</Badge>
                  )}
                  <span className="text-sm text-muted-foreground ml-auto">
                    {formatDateTime(data.latest.publishedAt)}
                  </span>
                </div>

                <div className="grid gap-3">
                  {/* Windows */}
                  {data.latest.assets
                    .filter((a) => a.platform === "windows")
                    .map((asset) => (
                      <a
                        key={asset.name}
                        href={asset.url}
                        className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent transition-colors"
                      >
                        <div className="p-3 rounded-lg bg-blue-500/10">
                          <Monitor className="h-6 w-6 text-blue-500" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">Windows</div>
                          <div className="text-sm text-muted-foreground">
                            {asset.name} • {formatBytes(asset.size)}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {asset.downloads} téléchargements
                        </div>
                        <Button>
                          <Download className="h-4 w-4 mr-2" />
                          Télécharger
                        </Button>
                      </a>
                    ))}

                  {/* macOS */}
                  {data.latest.assets
                    .filter((a) => a.platform === "mac")
                    .slice(0, 1) // Just show DMG
                    .map((asset) => (
                      <a
                        key={asset.name}
                        href={asset.url}
                        className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent transition-colors"
                      >
                        <div className="p-3 rounded-lg bg-gray-500/10 dark:bg-gray-400/10">
                          <Apple className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">macOS</div>
                          <div className="text-sm text-muted-foreground">
                            {asset.name} • {formatBytes(asset.size)}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {asset.downloads} téléchargements
                        </div>
                        <Button variant="outline">
                          <Download className="h-4 w-4 mr-2" />
                          Télécharger
                        </Button>
                      </a>
                    ))}

                  {/* Linux */}
                  {data.latest.assets
                    .filter((a) => a.platform === "linux" && a.name.includes(".AppImage"))
                    .map((asset) => (
                      <a
                        key={asset.name}
                        href={asset.url}
                        className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent transition-colors"
                      >
                        <div className="p-3 rounded-lg bg-orange-500/10">
                          <MonitorSmartphone className="h-6 w-6 text-orange-500" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">Linux</div>
                          <div className="text-sm text-muted-foreground">
                            {asset.name} • {formatBytes(asset.size)}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {asset.downloads} téléchargements
                        </div>
                        <Button variant="outline">
                          <Download className="h-4 w-4 mr-2" />
                          Télécharger
                        </Button>
                      </a>
                    ))}
                </div>
              </div>

              {/* All assets expandable */}
              {data.latest.assets.length > 3 && (
                <details className="group">
                  <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                    Voir tous les fichiers ({data.latest.assets.length})
                  </summary>
                  <div className="mt-3 space-y-2">
                    {data.latest.assets.map((asset) => (
                      <a
                        key={asset.name}
                        href={asset.url}
                        className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent text-sm"
                      >
                        <PlatformIcon platform={asset.platform} />
                        <span className="flex-1 font-mono text-xs">{asset.name}</span>
                        <span className="text-muted-foreground">{formatBytes(asset.size)}</span>
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    ))}
                  </div>
                </details>
              )}

              {/* Release notes */}
              {data.latest.description && (
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Notes de version</h4>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <pre className="whitespace-pre-wrap text-sm text-muted-foreground bg-muted p-4 rounded-lg">
                      {data.latest.description}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Previous versions */}
      {data && data.releases.length > 1 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Versions précédentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.releases.slice(1, 5).map((release) => (
                <div
                  key={release.version}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{release.version}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(release.publishedAt)}
                    </span>
                    {release.prerelease && (
                      <Badge variant="secondary" className="text-xs">
                        Pré-release
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {release.assets.some((a) => a.platform === "windows") && (
                      <a
                        href={release.assets.find((a) => a.platform === "windows")?.url}
                        className="p-2 hover:bg-accent rounded"
                        title="Windows"
                      >
                        <Monitor className="h-4 w-4" />
                      </a>
                    )}
                    {release.assets.some((a) => a.platform === "mac") && (
                      <a
                        href={release.assets.find((a) => a.platform === "mac")?.url}
                        className="p-2 hover:bg-accent rounded"
                        title="macOS"
                      >
                        <Apple className="h-4 w-4" />
                      </a>
                    )}
                    {release.assets.some((a) => a.platform === "linux") && (
                      <a
                        href={release.assets.find((a) => a.platform === "linux")?.url}
                        className="p-2 hover:bg-accent rounded"
                        title="Linux"
                      >
                        <MonitorSmartphone className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
