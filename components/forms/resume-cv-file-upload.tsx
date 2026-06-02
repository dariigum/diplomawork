'use client'

import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatSelectedFileLabel } from '@/lib/format-selected-file-label'

type ResumeCvFileUploadProps = {
  id?: string
  name?: string
  accept?: string
  /** Shown on the button before a file is chosen (e.g. "Upload CV (PDF)"). */
  chooseLabel: string
  className?: string
}

export function ResumeCvFileUpload({
  id = 'cvFile',
  name = 'cvFile',
  accept = '.pdf',
  chooseLabel,
  className,
}: ResumeCvFileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null)

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0]
          setSelectedLabel(file ? formatSelectedFileLabel(file.name) : null)
        }}
      />
      <Button
        type="button"
        variant="outline"
        className="h-10 w-full max-w-sm justify-start gap-2 font-normal sm:w-auto sm:min-w-[12rem]"
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="truncate">{selectedLabel ?? chooseLabel}</span>
      </Button>
    </div>
  )
}
