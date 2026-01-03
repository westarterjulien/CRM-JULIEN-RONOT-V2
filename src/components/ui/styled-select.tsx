"use client"

import { ChevronDown, Check } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export interface SelectOption {
  value: string
  label: string
  icon?: React.ReactNode
  color?: string
  description?: string
}

interface StyledSelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
  disabled?: boolean
  showCheckmark?: boolean
}

export function StyledSelect({
  value,
  onChange,
  options,
  placeholder = "Sélectionner...",
  className = "",
  disabled = false,
  showCheckmark = true,
}: StyledSelectProps) {
  const selectedOption = options.find((opt) => opt.value === value)

  const inputStyle = {
    background: "#F5F5F7",
    border: "1px solid #EEEEEE",
    color: "#111111",
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          className={`w-full h-10 px-3 rounded-xl text-sm flex items-center justify-between cursor-pointer outline-none transition-all hover:border-[#CCCCCC] disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
          style={inputStyle}
        >
          <div className="flex items-center gap-2 min-w-0">
            {selectedOption?.icon}
            {selectedOption?.color && !selectedOption?.icon && (
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: selectedOption.color }}
              />
            )}
            <span
              className="truncate"
              style={{ color: selectedOption ? (selectedOption.color || "#111111") : "#999999" }}
            >
              {selectedOption?.label || placeholder}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 flex-shrink-0 ml-2" style={{ color: "#999999" }} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[180px]">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => onChange(option.value)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              {option.icon}
              {option.color && !option.icon && (
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: option.color }}
                />
              )}
              <div className="min-w-0">
                <span
                  className="block truncate"
                  style={{ color: option.color || "#111111" }}
                >
                  {option.label}
                </span>
                {option.description && (
                  <span className="text-xs text-gray-500 block truncate">
                    {option.description}
                  </span>
                )}
              </div>
            </div>
            {showCheckmark && value === option.value && (
              <Check className="h-4 w-4 text-blue-500 flex-shrink-0 ml-2" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Preset configurations for common select types
export const statusOptions: SelectOption[] = [
  { value: "all", label: "Tous les statuts" },
  { value: "new", label: "Nouveau", color: "#3B82F6" },
  { value: "open", label: "Ouvert", color: "#F59E0B" },
  { value: "pending", label: "En attente", color: "#8B5CF6" },
  { value: "resolved", label: "Résolu", color: "#10B981" },
  { value: "closed", label: "Fermé", color: "#6B7280" },
]

export const priorityOptions: SelectOption[] = [
  { value: "all", label: "Toutes les priorités" },
  { value: "low", label: "Basse", color: "#6B7280" },
  { value: "normal", label: "Normale", color: "#3B82F6" },
  { value: "high", label: "Haute", color: "#F59E0B" },
  { value: "urgent", label: "Urgente", color: "#EF4444" },
]

export const invoiceStatusOptions: SelectOption[] = [
  { value: "all", label: "Tous les statuts" },
  { value: "draft", label: "Brouillon", color: "#6B7280" },
  { value: "sent", label: "Envoyée", color: "#3B82F6" },
  { value: "paid", label: "Payée", color: "#10B981" },
  { value: "partial", label: "Partielle", color: "#F59E0B" },
  { value: "overdue", label: "En retard", color: "#EF4444" },
  { value: "cancelled", label: "Annulée", color: "#6B7280" },
]

export const quoteStatusOptions: SelectOption[] = [
  { value: "all", label: "Tous les statuts" },
  { value: "draft", label: "Brouillon", color: "#6B7280" },
  { value: "sent", label: "Envoyé", color: "#3B82F6" },
  { value: "accepted", label: "Accepté", color: "#10B981" },
  { value: "rejected", label: "Refusé", color: "#EF4444" },
  { value: "expired", label: "Expiré", color: "#F59E0B" },
]

export const contractStatusOptions: SelectOption[] = [
  { value: "all", label: "Tous les statuts" },
  { value: "draft", label: "Brouillon", color: "#6B7280" },
  { value: "pending", label: "En attente", color: "#F59E0B" },
  { value: "signed", label: "Signé", color: "#10B981" },
  { value: "cancelled", label: "Annulé", color: "#EF4444" },
]

export const domainStatusOptions: SelectOption[] = [
  { value: "all", label: "Tous les statuts" },
  { value: "active", label: "Actif", color: "#10B981" },
  { value: "expiring_soon", label: "Expire bientôt", color: "#F59E0B" },
  { value: "expired", label: "Expiré", color: "#EF4444" },
]

export const activeStatusOptions: SelectOption[] = [
  { value: "all", label: "Tous" },
  { value: "active", label: "Actifs", color: "#10B981" },
  { value: "inactive", label: "Inactifs", color: "#EF4444" },
]
