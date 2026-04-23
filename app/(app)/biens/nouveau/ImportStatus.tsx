'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { BrikiiButton } from '@/components/shared/BrikiiButton'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

type ImportStatusValue = 'pending' | 'scraping' | 'mapping' | 'completed' | 'error'

interface ImportStatusProps {
  importId: string
  sourceUrl: string
  createdAt: number
  onRetry: (url: string) => void
  onManual: () => void
}

const STATUS_MESSAGES: Record<ImportStatusValue, string> = {
  pending: 'En attente de démarrage…',
  scraping: 'Analyse de l\'annonce en cours…',
  mapping: 'Enregistrement du bien en cours…',
  completed: 'Import terminé !',
  error: 'Une erreur est survenue.',
}

const STUCK_THRESHOLD_MS = 15 * 60 * 1000
const MAPPING_STUCK_THRESHOLD_MS = 2 * 60 * 1000

export function ImportStatus({ importId, sourceUrl, createdAt, onRetry, onManual }: ImportStatusProps) {
  const router = useRouter()
  const [status, setStatus] = useState<ImportStatusValue>('pending')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [stuck, setStuck] = useState(false)
  const [mappingStuck, setMappingStuck] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/biens/import/${importId}`)
      if (!res.ok) return
      const data = await res.json() as { status: ImportStatusValue; bien_id?: string; error_message?: string }

      setStatus(data.status)

      if (data.status === 'completed') {
        stopPolling()
        router.push('/biens')
        return
      }

      if (data.status === 'error') {
        setErrorMessage(data.error_message ?? 'Erreur inconnue')
        stopPolling()
        return
      }

      const now = Date.now()

      if ((data.status === 'pending' || data.status === 'scraping') && now - createdAt > STUCK_THRESHOLD_MS) {
        setStuck(true)
        stopPolling()
        return
      }

      if (data.status === 'mapping' && now - createdAt > MAPPING_STUCK_THRESHOLD_MS) {
        setMappingStuck(true)
      }
    } catch {
      // network error — keep polling
    }
  }, [importId, createdAt, stopPolling, router])

  useEffect(() => {
    poll()
    intervalRef.current = setInterval(poll, 5_000)
    return stopPolling
  }, [poll, stopPolling])

  const isTerminal = status === 'completed' || status === 'error' || stuck
  const showSpinner = !isTerminal

  if (stuck) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-[var(--brikii-warning)]">
          L&apos;import prend plus de temps que prévu ou a rencontré un problème.
        </p>
        <div className="flex gap-2">
          <BrikiiButton variant="secondary" size="sm" onClick={() => onRetry(sourceUrl)}>
            Relancer l&apos;import
          </BrikiiButton>
          <BrikiiButton variant="ghost" size="sm" onClick={onManual}>
            Saisir manuellement
          </BrikiiButton>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-[var(--brikii-danger)]">{errorMessage}</p>
        <div className="flex gap-2">
          <BrikiiButton variant="secondary" size="sm" onClick={() => onRetry(sourceUrl)}>
            Relancer l&apos;import
          </BrikiiButton>
          <BrikiiButton variant="ghost" size="sm" onClick={onManual}>
            Saisir manuellement
          </BrikiiButton>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {showSpinner && <LoadingSpinner size="sm" />}
        <p className="text-sm text-[var(--brikii-text-muted)]">
          {STATUS_MESSAGES[status]}
        </p>
      </div>
      {mappingStuck && (
        <p className="text-xs text-[var(--brikii-text-muted)]">
          Enregistrement en cours, cela prend plus longtemps que prévu…
        </p>
      )}
    </div>
  )
}
