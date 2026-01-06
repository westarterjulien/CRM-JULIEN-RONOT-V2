import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Documentation API - CRM Luelis",
  description: "Documentation complète de l'API REST du CRM Luelis",
}

export default function ApiDocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
