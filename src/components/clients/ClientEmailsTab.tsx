"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Mail, Eye, Send, CheckCircle, Clock, AlertCircle, RefreshCw, ChevronDown, ChevronUp } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { sanitizeEmailBody } from "@/lib/sanitize"

interface Email {
  id: string
  clientId: string
  subject: string
  body: string
  fromEmail: string
  toEmail: string
  cc: string | null
  bcc: string | null
  attachments: string[] | null
  status: string
  sentAt: string | null
  openedAt: string | null
  createdAt: string | null
  updatedAt: string | null
}

interface ClientEmailsTabProps {
  clientId: string
}

function getStatusBadge(status: string, openedAt: string | null) {
  if (openedAt) {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
        style={{ background: "#E8F8EE", color: "#28B95F" }}
      >
        <CheckCircle className="h-3 w-3" />
        Lu
      </span>
    )
  }

  const styles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    sent: { bg: "#E6F0FF", text: "#0064FA", icon: <Send className="h-3 w-3" /> },
    pending: { bg: "#FFF9E6", text: "#DCB40A", icon: <Clock className="h-3 w-3" /> },
    failed: { bg: "#FEE2E8", text: "#F04B69", icon: <AlertCircle className="h-3 w-3" /> },
  }

  const labels: Record<string, string> = {
    sent: "Envoyé",
    pending: "En attente",
    failed: "Échoué",
  }

  const style = styles[status] || styles.pending
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
      style={{ background: style.bg, color: style.text }}
    >
      {style.icon}
      {labels[status] || status}
    </span>
  )
}

export function ClientEmailsTab({ clientId }: ClientEmailsTabProps) {
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchEmails()
  }, [clientId])

  const fetchEmails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/clients/${clientId}/emails`)
      if (!response.ok) throw new Error("Failed to fetch emails")
      const data = await response.json()
      setEmails(data)
      setError(null)
    } catch (err) {
      console.error("Error fetching emails:", err)
      setError("Erreur lors du chargement des emails")
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async (emailId: string) => {
    try {
      setResendingId(emailId)
      const response = await fetch(`/api/emails/${emailId}/resend`, {
        method: "POST",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to resend email")
      }

      fetchEmails() // Refresh the list
    } catch (err) {
      console.error("Error resending email:", err)
      setError("Erreur lors du renvoi de l'email")
    } finally {
      setResendingId(null)
    }
  }

  const toggleRowExpand = (emailId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(emailId)) {
        next.delete(emailId)
      } else {
        next.add(emailId)
      }
      return next
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin" style={{ color: "#0064FA" }} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "#FEE2E8" }}>
          <AlertCircle className="h-8 w-8" style={{ color: "#F04B69" }} />
        </div>
        <p className="font-medium" style={{ color: "#F04B69" }}>{error}</p>
        <Button
          onClick={fetchEmails}
          className="mt-4 rounded-xl"
          variant="outline"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Réessayer
        </Button>
      </div>
    )
  }

  if (emails.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "#E6F0FF" }}>
          <Mail className="h-8 w-8" style={{ color: "#0064FA" }} />
        </div>
        <p className="font-medium" style={{ color: "#666666" }}>Aucun email envoyé</p>
        <p className="text-sm mt-2" style={{ color: "#999999" }}>
          Les emails envoyés depuis le CRM apparaîtront ici.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-8"></TableHead>
              <TableHead>Sujet</TableHead>
              <TableHead>Destinataire</TableHead>
              <TableHead>Date d'envoi</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {emails.map((email) => (
              <>
                <TableRow
                  key={email.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleRowExpand(email.id)}
                >
                  <TableCell className="w-8">
                    <button className="p-1 rounded hover:bg-gray-100">
                      {expandedRows.has(email.id) ? (
                        <ChevronUp className="h-4 w-4" style={{ color: "#666666" }} />
                      ) : (
                        <ChevronDown className="h-4 w-4" style={{ color: "#666666" }} />
                      )}
                    </button>
                  </TableCell>
                  <TableCell className="font-medium max-w-[250px]">
                    <div className="flex items-center gap-2">
                      {email.openedAt && (
                        <CheckCircle className="h-4 w-4 flex-shrink-0" style={{ color: "#28B95F" }} />
                      )}
                      <span className="truncate">{email.subject}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm" style={{ color: "#666666" }}>
                    {email.toEmail}
                  </TableCell>
                  <TableCell>
                    {email.sentAt ? formatDate(email.sentAt) : "-"}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(email.status, email.openedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-lg"
                        onClick={() => setSelectedEmail(email)}
                        title="Voir le contenu"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-lg"
                        onClick={() => handleResend(email.id)}
                        disabled={resendingId === email.id}
                        title="Renvoyer l'email"
                      >
                        {resendingId === email.id ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" style={{ color: "#0064FA" }} />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                {expandedRows.has(email.id) && (
                  <TableRow key={`${email.id}-expanded`}>
                    <TableCell colSpan={6} className="p-0">
                      <div
                        className="p-4 mx-4 mb-4 rounded-xl"
                        style={{ background: "#F5F5F7", border: "1px solid #EEEEEE" }}
                      >
                        <div className="flex items-start gap-6 mb-4">
                          <div>
                            <p className="text-xs font-medium mb-1" style={{ color: "#999999" }}>De</p>
                            <p className="text-sm" style={{ color: "#111111" }}>{email.fromEmail}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium mb-1" style={{ color: "#999999" }}>À</p>
                            <p className="text-sm" style={{ color: "#111111" }}>{email.toEmail}</p>
                          </div>
                          {email.cc && (
                            <div>
                              <p className="text-xs font-medium mb-1" style={{ color: "#999999" }}>CC</p>
                              <p className="text-sm" style={{ color: "#111111" }}>{email.cc}</p>
                            </div>
                          )}
                          {email.openedAt && (
                            <div className="ml-auto">
                              <p className="text-xs font-medium mb-1" style={{ color: "#999999" }}>Lu le</p>
                              <p className="text-sm" style={{ color: "#28B95F" }}>{formatDate(email.openedAt)}</p>
                            </div>
                          )}
                        </div>
                        <div
                          className="prose prose-sm max-w-none p-4 rounded-lg"
                          style={{ background: "#FFFFFF" }}
                          dangerouslySetInnerHTML={{ __html: sanitizeEmailBody(email.body) }}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Email Detail Modal */}
      <Dialog open={!!selectedEmail} onOpenChange={() => setSelectedEmail(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: "#E6F0FF" }}
              >
                <Mail className="h-5 w-5" style={{ color: "#0064FA" }} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="block truncate">{selectedEmail?.subject}</span>
                <span className="text-sm font-normal" style={{ color: "#666666" }}>
                  {selectedEmail?.sentAt ? formatDate(selectedEmail.sentAt) : "Non envoyé"}
                </span>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedEmail && (
            <div className="flex-1 overflow-auto">
              {/* Email metadata */}
              <div className="p-4 rounded-xl mb-4" style={{ background: "#F5F5F7" }}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: "#999999" }}>De</p>
                    <p className="text-sm font-medium" style={{ color: "#111111" }}>{selectedEmail.fromEmail}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: "#999999" }}>À</p>
                    <p className="text-sm font-medium" style={{ color: "#111111" }}>{selectedEmail.toEmail}</p>
                  </div>
                  {selectedEmail.cc && (
                    <div>
                      <p className="text-xs font-medium mb-1" style={{ color: "#999999" }}>CC</p>
                      <p className="text-sm" style={{ color: "#666666" }}>{selectedEmail.cc}</p>
                    </div>
                  )}
                  {selectedEmail.bcc && (
                    <div>
                      <p className="text-xs font-medium mb-1" style={{ color: "#999999" }}>BCC</p>
                      <p className="text-sm" style={{ color: "#666666" }}>{selectedEmail.bcc}</p>
                    </div>
                  )}
                </div>

                {/* Read status */}
                <div className="mt-4 pt-4" style={{ borderTop: "1px solid #EEEEEE" }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium" style={{ color: "#999999" }}>Statut :</span>
                      {getStatusBadge(selectedEmail.status, selectedEmail.openedAt)}
                    </div>
                    {selectedEmail.openedAt && (
                      <span className="text-xs" style={{ color: "#28B95F" }}>
                        Ouvert le {formatDate(selectedEmail.openedAt)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Email body */}
              <div
                className="prose prose-sm max-w-none p-4 rounded-xl"
                style={{ background: "#FFFFFF", border: "1px solid #EEEEEE" }}
                dangerouslySetInnerHTML={{ __html: sanitizeEmailBody(selectedEmail.body) }}
              />

              {/* Action buttons */}
              <div className="flex justify-end gap-3 mt-4 pt-4" style={{ borderTop: "1px solid #EEEEEE" }}>
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => setSelectedEmail(null)}
                >
                  Fermer
                </Button>
                <Button
                  className="rounded-xl text-white"
                  style={{ background: "#0064FA" }}
                  onClick={() => {
                    handleResend(selectedEmail.id)
                    setSelectedEmail(null)
                  }}
                  disabled={resendingId === selectedEmail.id}
                >
                  {resendingId === selectedEmail.id ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Envoi...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Renvoyer l'email
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
