'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { BrikiiButton } from '@/components/shared/BrikiiButton'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

type ImportStatusValue = 'pending' | 'processing' | 'completed' | 'error'

interface ImportMandatStatusProps {
  importId:  string
  sourceUrl: string
  createdAt: number
  onRetry:   (url: string) => void
  onManual:  () => void
}

const STATUS_MESSAGES: Record<ImportStatusValue, string> = {
  pending:    'En attente de démarrage…',
  processing: 'Analyse du document en cours…',
  completed:  'Import terminé !',
  error:      'Une erreur est survenue.',
}

const STUCK_THRESHOLD_MS = 15 * 60 * 1000

export function ImportMandatStatus({ importId, sourceUrl, createdAt, onRetry, onManual }: ImportMandatStatusProps) {
  const router = useRouter()
  const [status, setStatus] = useState<ImportStatusValue>('pending')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [stuck, setStuck] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/mandats/import/${importId}`)
      if (!res.ok) return
      const data = await res.json() as { status: ImportStatusValue; mandat_id?: string; error_message?: string }

      setStatus(data.status)

      if (data.status === 'completed') {
        stopPolling()
        router.push(data.mandat_id ? `/mandats/${data.mandat_id}` : '/mandats')
        return
      }

      if (data.status === 'error') {
        setErrorMessage(data.error_message ?? 'Erreur inconnue')
        stopPolling()
        return
      }

      if (Date.now() - createdAt > STUCK_THRESHOLD_MS) {
        setStuck(true)
        stopPolling()
      }
    } catch {
      // erreur réseau — on continue à poller
    }
  }, [importId, createdAt, stopPolling, router])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    poll()
    intervalRef.current = setInterval(poll, 5_000)
    return stopPolling
  }, [poll, stopPolling])

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
    <div className="flex items-center gap-2">
      <LoadingSpinner size="sm" />
      <p className="text-sm text-[var(--brikii-text-muted)]">{STATUS_MESSAGES[status]}</p>
    </div>
  )
}
