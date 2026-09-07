import * as React from "react"
import { useState } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export function TagInput({
  tags,
  onChange,
  placeholder = "Adicionar tag...",
}: {
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}) {
  const [input, setInput] = useState("")

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      const val = input.trim().replace(/^#+/, "")
      if (val && !tags.includes(val)) {
        onChange([...tags, val])
      }
      setInput("")
    } else if (e.key === "Backspace" && input === "" && tags.length > 0) {
      e.preventDefault()
      onChange(tags.slice(0, -1))
    }
  }

  const removeTag = (indexToRemove: number) => {
    onChange(tags.filter((_, index) => index !== indexToRemove))
  }

  return (
    <div
      className={cn(
        "flex min-h-11 w-full flex-wrap items-center gap-1.5 rounded-lg border border-input bg-card px-3 py-2 text-sm",
        "focus-within:outline-none focus-within:ring-2 focus-within:ring-ring"
      )}
    >
      {tags.map((tag, index) => (
        <span
          key={index}
          className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground"
        >
          #{tag}
          <button
            type="button"
            onClick={() => removeTag(index)}
            className="rounded-full opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Remover tag ${tag}`}
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[120px] bg-transparent focus-visible:outline-none placeholder:text-muted-foreground"
      />
    </div>
  )
}
