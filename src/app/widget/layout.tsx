import "@/app/globals.css"

export const metadata = {
  title: "Widget Notes",
}

// Simple layout without any chrome for widget pages
export default function WidgetLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className="bg-transparent">{children}</body>
    </html>
  )
}
