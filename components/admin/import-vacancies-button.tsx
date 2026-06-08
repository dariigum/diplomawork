'use client'

import { useRef, useState } from 'react'
import { Upload, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n/provider'

interface ImportVacanciesButtonProps {
  onImported?: () => void
}

export function ImportVacanciesButton({ onImported }: ImportVacanciesButtonProps) {
  const { t } = useI18n()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      toast.error(t.admin.vacancies.importVacanciesInvalidFile)
      return
    }

    const formData = new FormData()
    formData.set('file', file)

    setIsUploading(true)
    try {
      const response = await fetch('/api/admin/vacancies/import', {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()

      if (!response.ok) {
        const details =
          Array.isArray(data.errors) && data.errors.length > 0
            ? data.errors
                .slice(0, 3)
                .map((item: { row?: number; message?: string }) =>
                  item.row ? `Строка ${item.row}: ${item.message}` : item.message,
                )
                .filter(Boolean)
                .join('; ')
            : ''
        toast.error(details || data.error || t.admin.vacancies.importVacanciesFailed, {
          duration: 12000,
        })
        if (Array.isArray(data.errors) && data.errors.length > 0) {
          console.warn('[import-vacancies]', data.errors)
        }
        return
      }

      toast.success(
        t.admin.vacancies.importVacanciesSuccess
          .replace('{created}', String(data.created ?? 0))
          .replace('{skipped}', String(data.skipped ?? 0)),
      )

      if (Array.isArray(data.errors) && data.errors.length > 0) {
        toast.message(
          t.admin.vacancies.importVacanciesPartialErrors.replace('{count}', String(data.errors.length)),
        )
      }

      onImported?.()
    } catch (error) {
      console.error('Import vacancies failed', error)
      toast.error(t.admin.vacancies.importVacanciesFailed)
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
        {isUploading ? t.admin.vacancies.importVacanciesUploading : t.admin.vacancies.importVacancies}
      </Button>
    </>
  )
}
