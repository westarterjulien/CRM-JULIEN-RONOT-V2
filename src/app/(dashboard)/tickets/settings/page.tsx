"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function TicketSettingsRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/settings?tab=integrations")
  }, [router])

  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" style={{ color: "#5F00BA" }} />
        <p style={{ color: "#666666" }}>Redirection vers les paramètres...</p>
      </div>
    </div>
  )
}
