"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import {
  Zap,
  StickyNote,
  CheckSquare,
  Send,
  Hash,
  Paperclip,
  Calendar,
  X,
  Plus,
  Loader2,
  Bold,
  Italic,
  List,
  ListOrdered,
  ListTodo,
  Code,
  Link as LinkIcon,
  Heading2,
  Quote,
  Building2,
  FileText,
  Receipt,
  CreditCard,
  Globe,
  Ticket,
  FileSignature,
  ChevronDown,
  Search,
} from "lucide-react"
import { TaskTextarea } from "./TaskTextarea"

interface Tag {
  id: string
  name: string
  color: string | null
}

interface EntityLink {
  entityType: string
  entityId: string
  entityName?: string
}

interface NoteQuickAddProps {
  onSubmit: (data: {
    content: string
    type: "quick" | "note" | "todo"
    tagIds: string[]
    entityLinks: EntityLink[]
    reminderAt: string | null
  }) => Promise<{ id: string } | void>
  tags?: Tag[]
  defaultEntityLink?: EntityLink
  placeholder?: string
  showEntitySelector?: boolean
}

const typeOptions = [
  { type: "quick" as const, icon: Zap, label: "Flash", color: "#DCB40A", bgColor: "#FFF9E6" },
  { type: "note" as const, icon: StickyNote, label: "Note", color: "#0064FA", bgColor: "#E6F0FF" },
  { type: "todo" as const, icon: CheckSquare, label: "Tâche", color: "#5F00BA", bgColor: "#F3E8FF" },
]

const entityTypes = [
  { type: "client", label: "Client", icon: Building2, color: "#0064FA" },
  { type: "invoice", label: "Facture", icon: Receipt, color: "#28B95F" },
  { type: "quote", label: "Devis", icon: FileText, color: "#5F00BA" },
  { type: "subscription", label: "Abonnement", icon: CreditCard, color: "#F0783C" },
  { type: "domain", label: "Domaine", icon: Globe, color: "#00B4D8" },
  { type: "ticket", label: "Ticket", icon: Ticket, color: "#F04B69" },
  { type: "contract", label: "Contrat", icon: FileSignature, color: "#DCB40A" },
]

interface ToolbarButton {
  icon: React.ComponentType<{ className?: string }>
  label: string
  action: "bold" | "italic" | "heading" | "quote" | "code" | "link" | "ul" | "ol" | "task"
  prefix?: string
  suffix?: string
  blockPrefix?: string
}

const toolbarButtons: ToolbarButton[] = [
  { icon: Bold, label: "Gras", action: "bold", prefix: "**", suffix: "**" },
  { icon: Italic, label: "Italique", action: "italic", prefix: "_", suffix: "_" },
  { icon: Heading2, label: "Titre", action: "heading", blockPrefix: "## " },
  { icon: Quote, label: "Citation", action: "quote", blockPrefix: "> " },
  { icon: Code, label: "Code", action: "code", prefix: "`", suffix: "`" },
  { icon: LinkIcon, label: "Lien", action: "link", prefix: "[", suffix: "](url)" },
  { icon: List, label: "Liste", action: "ul", blockPrefix: "- " },
  { icon: ListOrdered, label: "Liste numérotée", action: "ol", blockPrefix: "1. " },
  { icon: ListTodo, label: "Tâche", action: "task", blockPrefix: "- [ ] " },
]

export function NoteQuickAdd({
  onSubmit,
  tags = [],
  defaultEntityLink,
  placeholder = "Écrivez une note... (Markdown supporté)",
  showEntitySelector = true,
}: NoteQuickAddProps) {
  const [content, setContent] = useState("")
  const [type, setType] = useState<"quick" | "note" | "todo">("note")
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [entityLinks, setEntityLinks] = useState<EntityLink[]>(
    defaultEntityLink ? [defaultEntityLink] : []
  )
  const [reminderAt, setReminderAt] = useState<string | null>(null)

  // Update entityLinks when defaultEntityLink changes (e.g., when project data loads)
  useEffect(() => {
    if (defaultEntityLink) {
      setEntityLinks(prev => {
        // Check if already present
        const exists = prev.some(
          l => l.entityType === defaultEntityLink.entityType && l.entityId === defaultEntityLink.entityId
        )
        if (!exists) {
          return [defaultEntityLink, ...prev]
        }
        return prev
      })
    }
  }, [defaultEntityLink])
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showTagPicker, setShowTagPicker] = useState(false)
  const [showEntityPicker, setShowEntityPicker] = useState(false)
  const [selectedEntityType, setSelectedEntityType] = useState<string | null>(null)
  const [entitySearchQuery, setEntitySearchQuery] = useState("")
  const [entitySearchResults, setEntitySearchResults] = useState<{ id: string; name: string }[]>([])
  const [isSearchingEntities, setIsSearchingEntities] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentTypeConfig = typeOptions.find((t) => t.type === type)!

  // Search entities
  const searchEntities = useCallback(async (entityType: string, query: string) => {
    if (!query.trim()) {
      setEntitySearchResults([])
      return
    }

    setIsSearchingEntities(true)
    try {
      let endpoint = ""
      switch (entityType) {
        case "client":
          endpoint = `/api/clients?search=${encodeURIComponent(query)}&limit=10`
          break
        case "invoice":
          endpoint = `/api/invoices?search=${encodeURIComponent(query)}&limit=10`
          break
        case "quote":
          endpoint = `/api/quotes?search=${encodeURIComponent(query)}&limit=10`
          break
        case "subscription":
          endpoint = `/api/subscriptions?search=${encodeURIComponent(query)}&limit=10`
          break
        case "domain":
          endpoint = `/api/domains?search=${encodeURIComponent(query)}&limit=10`
          break
        case "ticket":
          endpoint = `/api/tickets?search=${encodeURIComponent(query)}&limit=10`
          break
        case "contract":
          endpoint = `/api/contracts?search=${encodeURIComponent(query)}&limit=10`
          break
      }

      if (endpoint) {
        const response = await fetch(endpoint)
        const data = await response.json()

        // Map results based on entity type
        let results: { id: string; name: string }[] = []
        if (entityType === "client") {
          results = (data.clients || data || []).map((c: { id: string; companyName?: string; name?: string }) => ({
            id: c.id,
            name: c.companyName || c.name || `Client ${c.id}`,
          }))
        } else if (entityType === "invoice") {
          results = (data.invoices || data || []).map((i: { id: string; invoice_number?: string; invoiceNumber?: string }) => ({
            id: i.id,
            name: i.invoice_number || i.invoiceNumber || `Facture ${i.id}`,
          }))
        } else if (entityType === "quote") {
          results = (data.quotes || data || []).map((q: { id: string; quote_number?: string; quoteNumber?: string }) => ({
            id: q.id,
            name: q.quote_number || q.quoteNumber || `Devis ${q.id}`,
          }))
        } else if (entityType === "subscription") {
          results = (data.subscriptions || data || []).map((s: { id: string; name?: string; serviceName?: string }) => ({
            id: s.id,
            name: s.name || s.serviceName || `Abonnement ${s.id}`,
          }))
        } else if (entityType === "domain") {
          results = (data.domains || data || []).map((d: { id: string; domain?: string; name?: string }) => ({
            id: d.id,
            name: d.domain || d.name || `Domaine ${d.id}`,
          }))
        } else if (entityType === "ticket") {
          results = (data.tickets || data || []).map((t: { id: string; subject?: string; title?: string }) => ({
            id: t.id,
            name: t.subject || t.title || `Ticket ${t.id}`,
          }))
        } else if (entityType === "contract") {
          results = (data.contracts || data || []).map((c: { id: string; title?: string; name?: string }) => ({
            id: c.id,
            name: c.title || c.name || `Contrat ${c.id}`,
          }))
        }

        setEntitySearchResults(results.slice(0, 10))
      }
    } catch (error) {
      console.error("Error searching entities:", error)
      setEntitySearchResults([])
    } finally {
      setIsSearchingEntities(false)
    }
  }, [])

  useEffect(() => {
    if (selectedEntityType && entitySearchQuery) {
      const debounce = setTimeout(() => {
        searchEntities(selectedEntityType, entitySearchQuery)
      }, 300)
      return () => clearTimeout(debounce)
    } else {
      setEntitySearchResults([])
    }
  }, [selectedEntityType, entitySearchQuery, searchEntities])

  const handleToolbarAction = (button: ToolbarButton) => {
    let newContent = content

    if (button.blockPrefix) {
      // Block-level formatting (lists, headings, etc.)
      // Add on new line if content exists and doesn't end with newline
      if (content && !content.endsWith("\n")) {
        newContent = content + "\n" + button.blockPrefix
      } else {
        newContent = content + button.blockPrefix
      }
    } else if (button.prefix && button.suffix) {
      // Inline formatting (bold, italic, etc.)
      newContent = content + button.prefix + "texte" + button.suffix
    }

    setContent(newContent)
  }

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const result = await onSubmit({
        content: content.trim(),
        type,
        tagIds: selectedTagIds,
        entityLinks,
        reminderAt,
      })

      // Upload attachments if any and we got a note ID back
      if (result?.id && selectedFiles.length > 0) {
        const formData = new FormData()
        selectedFiles.forEach(file => {
          formData.append("files", file)
        })

        await fetch(`/api/notes/${result.id}/attachments`, {
          method: "POST",
          body: formData,
        })
      }

      // Reset form
      setContent("")
      setSelectedTagIds([])
      setReminderAt(null)
      setSelectedFiles([])
      if (!defaultEntityLink) {
        setEntityLinks([])
      }
      setIsExpanded(false)
    } catch (error) {
      console.error("Error creating note:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    // Filter out files that are too large (> 10MB)
    const validFiles = files.filter(f => f.size <= 10 * 1024 * 1024)
    setSelectedFiles(prev => [...prev, ...validFiles])
    // Reset input to allow selecting the same file again
    e.target.value = ""
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} o`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
  }

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    )
  }

  const addEntityLink = (entityType: string, entityId: string, entityName: string) => {
    // Check if already linked
    const exists = entityLinks.some(
      (l) => l.entityType === entityType && l.entityId === entityId
    )
    if (!exists) {
      setEntityLinks([...entityLinks, { entityType, entityId, entityName }])
    }
    setShowEntityPicker(false)
    setSelectedEntityType(null)
    setEntitySearchQuery("")
    setEntitySearchResults([])
  }

  const removeEntityLink = (entityType: string, entityId: string) => {
    setEntityLinks(entityLinks.filter(
      (l) => !(l.entityType === entityType && l.entityId === entityId)
    ))
  }

  const getEntityTypeConfig = (entityType: string) => {
    return entityTypes.find((e) => e.type === entityType)
  }

  return (
    <div
      className="rounded-2xl transition-all"
      style={{
        background: "#FFFFFF",
        boxShadow: isExpanded
          ? "0 8px 30px rgba(0,0,0,0.12)"
          : "0 2px 8px rgba(0,0,0,0.04)",
        border: `2px solid ${isExpanded ? currentTypeConfig.color : "#EEEEEE"}`,
      }}
    >
      {/* Type Selector - Always visible */}
      <div className="flex items-center gap-1 p-3 border-b" style={{ borderColor: "#EEEEEE" }}>
        {typeOptions.map((option) => {
          const Icon = option.icon
          const isSelected = type === option.type
          return (
            <button
              key={option.type}
              onClick={() => setType(option.type)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: isSelected ? option.bgColor : "transparent",
                color: isSelected ? option.color : "#999999",
              }}
            >
              <Icon className="w-4 h-4" />
              {option.label}
            </button>
          )
        })}
      </div>

      {/* Toolbar - Show when expanded */}
      {isExpanded && (
        <div className="flex items-center gap-0.5 px-3 py-2 border-b overflow-x-auto" style={{ borderColor: "#EEEEEE" }}>
          {toolbarButtons.map((button) => {
            const Icon = button.icon
            return (
              <button
                key={button.action}
                onClick={() => handleToolbarAction(button)}
                className="p-2 rounded-lg transition-colors hover:bg-gray-100"
                style={{ color: "#666666" }}
                title={button.label}
              >
                <Icon className="w-4 h-4" />
              </button>
            )
          })}
          <div className="w-px h-5 mx-1" style={{ background: "#EEEEEE" }} />
          <span className="text-xs px-2" style={{ color: "#999999" }}>
            Markdown supporté
          </span>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4" onClick={() => setIsExpanded(true)}>
        <TaskTextarea
          value={content}
          onChange={setContent}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              handleSubmit()
            }
            if (e.key === "Escape") {
              setIsExpanded(false)
            }
            if (e.metaKey || e.ctrlKey) {
              if (e.key === "b") {
                e.preventDefault()
                handleToolbarAction(toolbarButtons.find(b => b.action === "bold")!)
              } else if (e.key === "i") {
                e.preventDefault()
                handleToolbarAction(toolbarButtons.find(b => b.action === "italic")!)
              }
            }
          }}
          placeholder={placeholder}
          minHeight={isExpanded ? "150px" : "40px"}
        />

        {/* Entity Links */}
        {entityLinks.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {entityLinks.map((link) => {
              const config = getEntityTypeConfig(link.entityType)
              const Icon = config?.icon || Building2
              return (
                <span
                  key={`${link.entityType}-${link.entityId}`}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium"
                  style={{
                    background: `${config?.color || "#0064FA"}15`,
                    color: config?.color || "#0064FA",
                  }}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {link.entityName || `${config?.label} ${link.entityId}`}
                  <button
                    onClick={() => removeEntityLink(link.entityType, link.entityId)}
                    className="hover:opacity-70 ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )
            })}
          </div>
        )}

        {/* Tags */}
        {isExpanded && selectedTagIds.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {selectedTagIds.map((tagId) => {
              const tag = tags.find((t) => t.id === tagId)
              if (!tag) return null
              return (
                <span
                  key={tag.id}
                  className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                  style={{
                    background: `${tag.color || "#0064FA"}15`,
                    color: tag.color || "#0064FA",
                  }}
                >
                  #{tag.name}
                  <button
                    onClick={() => toggleTag(tag.id)}
                    className="hover:opacity-70"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )
            })}
          </div>
        )}

        {/* Reminder */}
        {isExpanded && reminderAt && (
          <div className="flex items-center gap-2 mt-3">
            <span
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs"
              style={{ background: "#FFF9E6", color: "#DCB40A" }}
            >
              <Calendar className="w-3.5 h-3.5" />
              Rappel: {new Date(reminderAt).toLocaleString("fr-FR")}
              <button onClick={() => setReminderAt(null)} className="hover:opacity-70">
                <X className="w-3 h-3" />
              </button>
            </span>
          </div>
        )}

        {/* Selected Files */}
        {isExpanded && selectedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {selectedFiles.map((file, idx) => (
              <span
                key={idx}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs"
                style={{ background: "#E6F0FF", color: "#0064FA" }}
              >
                <Paperclip className="w-3.5 h-3.5" />
                <span className="max-w-[150px] truncate">{file.name}</span>
                <span style={{ color: "#999999" }}>({formatFileSize(file.size)})</span>
                <button onClick={() => removeFile(idx)} className="hover:opacity-70 ml-1">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions Bar */}
      {isExpanded && (
        <div className="flex items-center justify-between p-3 border-t" style={{ borderColor: "#EEEEEE" }}>
          <div className="flex items-center gap-1">
            {/* Tags Button */}
            <div className="relative">
              <button
                onClick={() => setShowTagPicker(!showTagPicker)}
                className="p-2 rounded-lg transition-colors"
                style={{
                  background: showTagPicker ? "#E6F0FF" : "#F5F5F5",
                  color: showTagPicker ? "#0064FA" : "#666666",
                }}
                title="Ajouter un tag"
              >
                <Hash className="w-4 h-4" />
              </button>

              {showTagPicker && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowTagPicker(false)}
                  />
                  <div
                    className="absolute left-0 bottom-full mb-2 z-20 rounded-xl p-2 min-w-[200px] max-h-[200px] overflow-y-auto"
                    style={{
                      background: "#FFFFFF",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                      border: "1px solid #EEEEEE",
                    }}
                  >
                    {tags.length === 0 ? (
                      <p className="text-xs text-center py-2" style={{ color: "#999999" }}>
                        Aucun tag disponible
                      </p>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {tags.map((tag) => {
                          const isSelected = selectedTagIds.includes(tag.id)
                          return (
                            <button
                              key={tag.id}
                              onClick={() => toggleTag(tag.id)}
                              className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors text-left"
                              style={{
                                background: isSelected ? `${tag.color || "#0064FA"}15` : "transparent",
                                color: isSelected ? tag.color || "#0064FA" : "#333333",
                              }}
                            >
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ background: tag.color || "#0064FA" }}
                              />
                              {tag.name}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Entity Link Button */}
            {showEntitySelector && (
              <div className="relative">
                <button
                  onClick={() => setShowEntityPicker(!showEntityPicker)}
                  className="p-2 rounded-lg transition-colors"
                  style={{
                    background: showEntityPicker ? "#E6F0FF" : "#F5F5F5",
                    color: showEntityPicker ? "#0064FA" : "#666666",
                  }}
                  title="Lier à une entité"
                >
                  <LinkIcon className="w-4 h-4" />
                </button>

                {showEntityPicker && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => {
                        setShowEntityPicker(false)
                        setSelectedEntityType(null)
                        setEntitySearchQuery("")
                      }}
                    />
                    <div
                      className="absolute left-0 bottom-full mb-2 z-20 rounded-xl p-3 min-w-[280px]"
                      style={{
                        background: "#FFFFFF",
                        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                        border: "1px solid #EEEEEE",
                      }}
                    >
                      {!selectedEntityType ? (
                        <>
                          <p className="text-xs font-medium mb-2" style={{ color: "#666666" }}>
                            Choisir un type d&apos;entité
                          </p>
                          <div className="grid grid-cols-2 gap-1">
                            {entityTypes.map((entity) => {
                              const Icon = entity.icon
                              return (
                                <button
                                  key={entity.type}
                                  onClick={() => setSelectedEntityType(entity.type)}
                                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left hover:bg-gray-50"
                                  style={{ color: "#333333" }}
                                >
                                  <Icon className="w-4 h-4" style={{ color: entity.color }} />
                                  {entity.label}
                                </button>
                              )
                            })}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 mb-3">
                            <button
                              onClick={() => {
                                setSelectedEntityType(null)
                                setEntitySearchQuery("")
                                setEntitySearchResults([])
                              }}
                              className="p-1 rounded hover:bg-gray-100"
                            >
                              <ChevronDown className="w-4 h-4 rotate-90" style={{ color: "#666666" }} />
                            </button>
                            <span className="text-sm font-medium" style={{ color: "#333333" }}>
                              {getEntityTypeConfig(selectedEntityType)?.label}
                            </span>
                          </div>
                          <div className="relative mb-2">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#999999" }} />
                            <input
                              type="text"
                              value={entitySearchQuery}
                              onChange={(e) => setEntitySearchQuery(e.target.value)}
                              placeholder="Rechercher..."
                              className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none"
                              style={{ background: "#F5F5F5", border: "1px solid #EEEEEE" }}
                              autoFocus
                            />
                          </div>
                          <div className="max-h-[150px] overflow-y-auto">
                            {isSearchingEntities ? (
                              <div className="flex items-center justify-center py-4">
                                <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#999999" }} />
                              </div>
                            ) : entitySearchResults.length === 0 ? (
                              <p className="text-xs text-center py-3" style={{ color: "#999999" }}>
                                {entitySearchQuery ? "Aucun résultat" : "Tapez pour rechercher"}
                              </p>
                            ) : (
                              <div className="space-y-1">
                                {entitySearchResults.map((result) => (
                                  <button
                                    key={result.id}
                                    onClick={() => addEntityLink(selectedEntityType, result.id, result.name)}
                                    className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors hover:bg-gray-50"
                                    style={{ color: "#333333" }}
                                  >
                                    {result.name}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Attachment Button */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-lg transition-colors relative"
              style={{
                background: selectedFiles.length > 0 ? "#E6F0FF" : "#F5F5F5",
                color: selectedFiles.length > 0 ? "#0064FA" : "#666666",
              }}
              title="Ajouter une pièce jointe"
            >
              <Paperclip className="w-4 h-4" />
              {selectedFiles.length > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center"
                  style={{ background: "#0064FA", color: "#FFFFFF" }}
                >
                  {selectedFiles.length}
                </span>
              )}
            </button>

            {/* Reminder Button */}
            <button
              onClick={() => {
                const date = new Date()
                date.setDate(date.getDate() + 1)
                date.setHours(9, 0, 0, 0)
                setReminderAt(date.toISOString())
              }}
              className="p-2 rounded-lg transition-colors"
              style={{
                background: reminderAt ? "#FFF9E6" : "#F5F5F5",
                color: reminderAt ? "#DCB40A" : "#666666",
              }}
              title="Ajouter un rappel"
            >
              <Calendar className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setContent("")
                setSelectedTagIds([])
                setReminderAt(null)
                setIsExpanded(false)
              }}
              className="px-3 py-1.5 rounded-lg text-sm transition-colors"
              style={{ color: "#666666" }}
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={!content.trim() || isSubmitting}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
              style={{
                background: currentTypeConfig.color,
                color: "#FFFFFF",
              }}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Créer
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Collapsed hint */}
      {!isExpanded && content.trim() === "" && (
        <div className="px-4 pb-3">
          <p className="text-xs" style={{ color: "#999999" }}>
            Cliquez pour développer · Cmd+B: Gras · Cmd+I: Italique · Cmd+Entrée: Envoyer
          </p>
        </div>
      )}
    </div>
  )
}
