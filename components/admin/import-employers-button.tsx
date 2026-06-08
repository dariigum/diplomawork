'use client'

import { useRef, useState } from 'react'
import { Upload, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n/provider'

interface ImportEmployersButtonProps {
  onImported?: () => void
}

export function ImportEmployersButton({ onImported }: ImportEmployersButtonProps) {
  const { t } = useI18n()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      toast.error(t.admin.employers.importEmployersInvalidFile)
      return
    }

    const formData = new FormData()
    formData.set('file', file)

    setIsUploading(true)
    try {
      const response = await fetch('/api/admin/users/import-employers', {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || t.admin.employers.importEmployersFailed)
        if (Array.isArray(data.errors) && data.errors.length > 0) {
          console.warn('[import-employers]', data.errors)
        }
        return
      }

      toast.success(
        t.admin.employers.importEmployersSuccess
          .replace('{created}', String(data.created ?? 0))
          .replace('{skipped}', String(data.skipped ?? 0)),
      )

      if (Array.isArray(data.errors) && data.errors.length > 0) {
        toast.message(
          t.admin.employers.importEmployersPartialErrors.replace('{count}', String(data.errors.length)),
        )
      }

      onImported?.()
    } catch (error) {
      console.error('Import employers failed', error)
      toast.error(t.admin.employers.importEmployersFailed)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="sr-only"
        onChange={handleFileChange}
      />
      <Button
        type="button"
        variant="outline"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
      >
        {isUploading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Upload className="mr-2 h-4 w-4" />
        )}
        {isUploading ? t.admin.employers.importEmployersUploading : t.admin.employers.importEmployers}
      </Button>
    </>
  )
}
