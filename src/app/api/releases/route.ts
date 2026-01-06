import { NextResponse } from "next/server"

const GITHUB_OWNER = "LUELIS"
const GITHUB_REPO = "CRM-JULIEN-RONOT-V2"

interface GitHubAsset {
  name: string
  browser_download_url: string
  size: number
  download_count: number
  content_type: string
}

interface GitHubRelease {
  tag_name: string
  name: string
  body: string
  published_at: string
  assets: GitHubAsset[]
  prerelease: boolean
  draft: boolean
}

export async function GET() {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "CRM-Luelis",
        },
        next: { revalidate: 300 }, // Cache 5 minutes
      }
    )

    if (!response.ok) {
      // If no releases yet, return empty array
      if (response.status === 404) {
        return NextResponse.json({ releases: [], latest: null })
      }
      throw new Error(`GitHub API error: ${response.status}`)
    }

    const releases: GitHubRelease[] = await response.json()

    // Filter out drafts and format the data
    const formattedReleases = releases
      .filter((r) => !r.draft)
      .map((release) => ({
        version: release.tag_name,
        name: release.name || release.tag_name,
        description: release.body,
        publishedAt: release.published_at,
        prerelease: release.prerelease,
        assets: release.assets.map((asset) => ({
          name: asset.name,
          url: asset.browser_download_url,
          size: asset.size,
          downloads: asset.download_count,
          platform: getPlatform(asset.name),
        })),
      }))

    const latest = formattedReleases.find((r) => !r.prerelease) || formattedReleases[0] || null

    return NextResponse.json({
      releases: formattedReleases,
      latest,
    })
  } catch (error) {
    console.error("Error fetching releases:", error)
    return NextResponse.json(
      { error: "Failed to fetch releases", releases: [], latest: null },
      { status: 500 }
    )
  }
}

function getPlatform(filename: string): "windows" | "mac" | "linux" | "unknown" {
  const lower = filename.toLowerCase()
  if (lower.includes(".exe") || lower.includes("win")) return "windows"
  if (lower.includes(".dmg") || lower.includes("mac") || lower.includes(".zip")) return "mac"
  if (lower.includes(".appimage") || lower.includes(".deb") || lower.includes("linux")) return "linux"
  return "unknown"
}
