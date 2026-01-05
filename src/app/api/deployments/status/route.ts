import { NextResponse } from "next/server"

const DOKPLOY_SERVERS = [
  {
    id: 7,
    name: "Orion",
    url: "http://57.129.101.188:3000",
    token: "TCKeNZKoJikPGzKhZOyKXkxzHruGfUQAkEdahaXbvnIMQWvjDscNukRqMAwNfORU",
  },
  {
    id: 8,
    name: "Andromeda",
    url: "http://157.90.135.243:3000",
    token: "CElixReOpXvxPXNLChkoqCgUUZioKgZfPduPEmIifqUcFkmJjPbBqtTWNjCHUMEA",
  },
  {
    id: 9,
    name: "Cassiopeia",
    url: "http://62.210.65.57:3000",
    token: "tKGYTJfGgZQVuDgZYqoHMmrUtfGIsvpqUYoPUiodYkUHSEjnwyclPOGMJHQNNHAY",
  },
]

interface Deployment {
  id: string
  appName: string
  projectName: string
  serverName: string
  status: "running" | "done" | "error"
  startedAt: string
  duration?: number
}

// GET: Fetch active deployments from all Dokploy servers
export async function GET() {
  try {
    const activeDeployments: Deployment[] = []

    // Fetch from all servers in parallel
    const results = await Promise.allSettled(
      DOKPLOY_SERVERS.map(async (server) => {
        try {
          // Get all projects with their applications
          const response = await fetch(`${server.url}/api/trpc/project.all`, {
            method: "GET",
            headers: {
              "x-api-key": server.token,
              "Content-Type": "application/json",
            },
          })

          if (!response.ok) {
            console.error(`[Deployments] Server ${server.name} error:`, response.status)
            return []
          }

          const data = await response.json()
          const projects = data?.result?.data?.json || []

          const deployments: Deployment[] = []

          // Check each project's applications for active deployments
          for (const project of projects) {
            for (const env of project.environments || []) {
              for (const app of env.applications || []) {
                // Check if application is currently building/deploying
                if (app.applicationStatus === "running" || app.applicationStatus === "idle") {
                  // Get recent deployments for this app
                  try {
                    const deploymentsRes = await fetch(
                      `${server.url}/api/trpc/deployment.all?input=${encodeURIComponent(JSON.stringify({ json: { applicationId: app.applicationId } }))}`,
                      {
                        method: "GET",
                        headers: {
                          "x-api-key": server.token,
                          "Content-Type": "application/json",
                        },
                      }
                    )

                    if (deploymentsRes.ok) {
                      const deploymentsData = await deploymentsRes.json()
                      const appDeployments = deploymentsData?.result?.data?.json || []

                      // Find running deployments
                      for (const dep of appDeployments.slice(0, 3)) {
                        if (dep.status === "running") {
                          const startTime = new Date(dep.createdAt).getTime()
                          const now = Date.now()
                          const duration = Math.floor((now - startTime) / 1000)

                          deployments.push({
                            id: dep.deploymentId,
                            appName: app.name,
                            projectName: project.name,
                            serverName: server.name,
                            status: "running",
                            startedAt: dep.createdAt,
                            duration,
                          })
                        }
                      }
                    }
                  } catch (err) {
                    // Skip this app if we can't fetch deployments
                  }
                }
              }
            }
          }

          return deployments
        } catch (err) {
          console.error(`[Deployments] Error fetching from ${server.name}:`, err)
          return []
        }
      })
    )

    // Collect all deployments from successful fetches
    for (const result of results) {
      if (result.status === "fulfilled") {
        activeDeployments.push(...result.value)
      }
    }

    return NextResponse.json({
      deployments: activeDeployments,
      count: activeDeployments.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[Deployments] Error:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des déploiements", deployments: [], count: 0 },
      { status: 500 }
    )
  }
}
