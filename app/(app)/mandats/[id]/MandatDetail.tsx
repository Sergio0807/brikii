'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BrikiiButton } from '@/components/shared/BrikiiButton'
import { BrikiiInput } from '@/components/shared/BrikiiInput'
import { BrikiiBadge } from '@/components/shared/BrikiiBadge'
import { bienPhotoThumbUrl } from '@/lib/cloudflare-images'
import { Home } from 'lucide-react'

// ─── Constants ─────────────────────────────────────────────────────────────────

const MANDAT_TYPES    = ['exclusif', 'simple', 'semi_exclusif', 'recherche', 'gestion'] as const
const STATUTS         = ['brouillon', 'import_en_cours', 'a_completer', 'pret_a_valider', 'actif'] as const
const STATUTS_METIER  = ['expire', 'resilie', 'vendu', 'archive'] as const
const HONO_CHARGES    = ['vendeur', 'acquereur', 'partage'] as const

const TYPE_LABELS: Record<string, string> = {
  exclusif: 'Exclusif', simple: 'Simple', semi_exclusif: 'Semi-exclusif',
  recherche: 'Recherche', gestion: 'Gestion',
}
const STATUT_LABELS: Record<string, string> = {
  brouillon: 'Brouillon', import_en_cours: 'Import en cours',
  a_completer: 'À compléter', pret_a_valider: 'Prêt à valider', actif: 'Actif',
}
const STATUT_METIER_LABELS: Record<string, string> = {
  expire: 'Expiré', resilie: 'Résilié', vendu: 'Vendu', archive: 'Archivé',
}
const HONO_CHARGE_LABELS: Record<string, string> = {
  vendeur: 'Vendeur', acquereur: 'Acquéreur', partage: 'Partagé',
}
const BIEN_TYPE_LABELS: Record<string, string> = {
  maison: 'Maison', appartement: 'Appartement', terrain: 'Terrain',
  immeuble: 'Immeuble', commerce: 'Commerce', local: 'Local', autre: 'Autre',
}
const ROLE_LABELS: Record<string, string> = {
  proprietaire_principal: 'Propriétaire principal',
  coproprietaire: 'Co-propriétaire',
  mandataire_legal: 'Mandataire légal',
  representant_sci: 'Représentant SCI',
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface BienPhoto {
  url: string
  ordre: number
}

interface BienRef {
  id: string
  reference?: string | null
  type?: string | null
  statut?: string | null
  deleted_at?: string | null
  ville?: string | null
  code_postal?: string | null
  prix?: number | null
  surface_hab?: number | null
  bien_photos?: BienPhoto[] | null
}

interface Contact {
  id: string
  prenom?: string | null
  nom?: string | null
  email?: string | null
  telephone?: string | null
}

interface Proprietaire {
  id: string
  role: string
  ordre: number
  contact: Contact | null
}

interface Document {
  id: string
  type: string
  nom: string
  url: string
  taille?: number | null
  created_at: string
}

interface Mandat {
  id: string
  numero: string
  numero_mandat: string | null
  type: typeof MANDAT_TYPES[number]
  statut: typeof STATUTS[number]
  statut_metier: typeof STATUTS_METIER[number] | null
  bien_id: string | null
  date_signature: string
  date_debut: string
  date_fin: string | null
  duree_mois: number | null
  reconductible: boolean
  prix_vente: number
  prix_hono_inclus: boolean
  honoraires_charge: typeof HONO_CHARGES[number] | null
  honoraires_pct: number | null
  honoraires_montant: number | null
  taux_retrocession: number | null
  clauses: string | null
  created_at: string
  bien: BienRef | null
  proprietaires: Proprietaire[]
  documents: Document[]
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatPrix(v: number | null | undefined) {
  if (!v) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
}
function formatDate(d: string | null) {
  if (!d) return '—'
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(d))
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--brikii-text-muted)]">{label}</span>
      <span className="text-sm text-[var(--brikii-text)]">{children ?? '—'}</span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--brikii-text-muted)] border-b border-[var(--brikii-border)] pb-2">
        {title}
      </h2>
      {children}
    </div>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`p-5 flex flex-col gap-4 ${className}`}
      style={{ background: 'var(--brikii-bg)', border: '1px solid var(--brikii-border)', borderRadius: 'var(--brikii-radius-card)' }}
    >
      {children}
    </div>
  )
}

function SelectField({ label, value, onChange, options, required }: {
  label: string; value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]; required?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-[var(--brikii-text)]">
        {label}{required && <span className="text-[var(--brikii-danger)] ml-0.5">*</span>}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full h-9 px-3 text-sm bg-[var(--brikii-bg)] text-[var(--brikii-text)] border border-[var(--brikii-border)] focus:border-[var(--brikii-dark)] outline-none transition-colors"
        style={{ borderRadius: 'var(--brikii-radius-input)' }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

// ─── Bien thumbnail ────────────────────────────────────────────────────────────

function BienThumb({ photos }: { photos?: BienPhoto[] | null }) {
  const sorted = photos ? [...photos].sort((a, b) => a.ordre - b.ordre) : []
  const thumbUrl = bienPhotoThumbUrl(sorted[0]?.url, 200)

  if (!thumbUrl) {
    return (
      <div
        className="w-20 h-16 flex-shrink-0 flex items-center justify-center"
        style={{ background: 'var(--brikii-bg-subtle)', borderRadius: 'var(--brikii-radius-input)' }}
      >
        <Home className="w-5 h-5 text-[var(--brikii-text-muted)]" />
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={thumbUrl}
      alt="Photo du bien"
      className="w-20 h-16 flex-shrink-0 object-cover"
      style={{ borderRadius: 'var(--brikii-radius-input)' }}
      loading="lazy"
    />
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function MandatDetail({ mandat: initial }: { mandat: Mandat }) {
  const router = useRouter()
  const [editing, setEditing]     = useState(false)
  const [saving, setSaving]       = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [error, setError]         = useState<string | null>(null)

  async function handleArchiver() {
    if (!confirm('Archiver ce mandat ? Cette action ne supprime aucune donnée.')) return
    setArchiving(true)
    try {
      const res = await fetch(`/api/mandats/${initial.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut_metier: 'archive' }),
      })
      if (!res.ok) {
        const d = await res.json() as { error?: unknown }
        setError(typeof d.error === 'string' ? d.error : 'Erreur lors de l\'archivage.')
        return
      }
      router.refresh()
    } catch {
      setError('Erreur réseau. Veuillez réessayer.')
    } finally {
      setArchiving(false)
    }
  }

  // Editable fields
  const [numeroMandat, setNumeroMandat]           = useState(initial.numero_mandat ?? '')
  const [type, setType]                           = useState(initial.type)
  const [statut, setStatut]                       = useState(initial.statut)
  const [statutMetier, setStatutMetier]           = useState(initial.statut_metier ?? '')
  const [dateSignature, setDateSignature]         = useState(initial.date_signature)
  const [dateDebut, setDateDebut]                 = useState(initial.date_debut)
  const [dureeMois, setDureeMois]                 = useState(initial.duree_mois?.toString() ?? '')
  const [reconductible, setReconductible]         = useState(initial.reconductible)
  const [prixVente, setPrixVente]                 = useState(initial.prix_vente.toString())
  const [honorairesPct, setHonorairesPct]         = useState(initial.honoraires_pct?.toString() ?? '')
  const [honorairesCharge, setHonorairesCharge]   = useState(initial.honoraires_charge ?? '')
  const [taux, setTaux]                           = useState(initial.taux_retrocession?.toString() ?? '')
  const [clauses, setClauses]                     = useState(initial.clauses ?? '')

  function cancelEdit() {
    setNumeroMandat(initial.numero_mandat ?? '')
    setType(initial.type)
    setStatut(initial.statut)
    setStatutMetier(initial.statut_metier ?? '')
    setDateSignature(initial.date_signature)
    setDateDebut(initial.date_debut)
    setDureeMois(initial.duree_mois?.toString() ?? '')
    setReconductible(initial.reconductible)
    setPrixVente(initial.prix_vente.toString())
    setHonorairesPct(initial.honoraires_pct?.toString() ?? '')
    setHonorairesCharge(initial.honoraires_charge ?? '')
    setTaux(initial.taux_retrocession?.toString() ?? '')
    setClauses(initial.clauses ?? '')
    setEditing(false)
    setError(null)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)

    if (statut === 'actif' && !initial.bien_id) {
      setError('Un mandat actif doit être rattaché à un bien.')
      setSaving(false)
      return
    }

    try {
      const res = await fetch(`/api/mandats/${initial.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numero_mandat:      numeroMandat || null,
          type,
          statut,
          statut_metier:      statutMetier || null,
          date_signature:     dateSignature,
          date_debut:         dateDebut,
          duree_mois:         dureeMois ? parseInt(dureeMois) : null,
          reconductible,
          prix_vente:         parseFloat(prixVente) || 0,
          honoraires_pct:     honorairesPct ? parseFloat(honorairesPct) : null,
          honoraires_charge:  honorairesCharge || null,
          taux_retrocession:  taux ? parseFloat(taux) : null,
          clauses:            clauses || null,
        }),
      })
      if (!res.ok) {
        const d = await res.json() as { error?: unknown }
        setError(typeof d.error === 'string' ? d.error : 'Erreur lors de la sauvegarde.')
        return
      }
      setEditing(false)
      router.refresh()
    } catch {
      setError('Erreur réseau. Veuillez réessayer.')
    } finally {
      setSaving(false)
    }
  }

  // ─── View mode ─────────────────────────────────────────────────────────────

  if (!editing) {
    const bien = initial.bien
    const bienIncoherent = bien && (bien.deleted_at != null || bien.statut === 'archive')

    return (
      <div className="flex flex-col gap-5">

        {/* Barre d'actions */}
        <div className="flex justify-end gap-2">
          {error && (
            <p className="text-sm text-[var(--brikii-danger)] self-center mr-2">{error}</p>
          )}
          <BrikiiButton onClick={() => setEditing(true)}>
            Modifier le mandat
          </BrikiiButton>
        </div>

        {/* Alerte bien archivé / supprimé */}
        {bienIncoherent && (
          <div
            className="px-4 py-4 flex flex-col gap-3"
            style={{ background: 'var(--brikii-warning-bg, #fffbeb)', border: '1px solid var(--brikii-warning, #f59e0b)', borderRadius: 'var(--brikii-radius-card)' }}
          >
            <p className="text-sm font-medium text-[var(--brikii-warning, #b45309)]">
              {bien!.deleted_at != null
                ? 'Le bien rattaché à ce mandat a été supprimé.'
                : 'Le bien rattaché à ce mandat est archivé.'}
            </p>
            <p className="text-xs text-[var(--brikii-text-muted)]">
              Ce mandat ne peut pas être activé tant qu&apos;il est lié à ce bien.
              Rattachez un autre bien ou archivez le mandat.
            </p>
            <div className="flex gap-2 flex-wrap">
              <Link href={`/mandats/${initial.id}/rattacher-bien`}>
                <BrikiiButton variant="secondary" size="sm">Changer de bien</BrikiiButton>
              </Link>
              {!initial.statut_metier && (
                <BrikiiButton
                  variant="ghost"
                  size="sm"
                  loading={archiving}
                  onClick={handleArchiver}
                >
                  Archiver le mandat
                </BrikiiButton>
              )}
            </div>
          </div>
        )}

        {/* Grille principale */}
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 items-start">

          {/* ─── GAUCHE ─── */}
          <div className="flex flex-col gap-5">

            <Card>
              <Section title="Dates">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <Field label="Date de signature">{formatDate(initial.date_signature)}</Field>
                  <Field label="Date de début">{formatDate(initial.date_debut)}</Field>
                  <Field label="Date de fin">{formatDate(initial.date_fin)}</Field>
                  <Field label="Durée">{initial.duree_mois ? `${initial.duree_mois} mois` : null}</Field>
                  <Field label="Reconductible">{initial.reconductible ? 'Oui' : 'Non'}</Field>
                </div>
              </Section>

              <Section title="Prix et honoraires">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <Field label="Prix de vente">{formatPrix(initial.prix_vente)}</Field>
                  <Field label="Honoraires">
                    {initial.honoraires_pct != null ? `${initial.honoraires_pct} %` : null}
                    {initial.honoraires_montant != null ? ` · ${formatPrix(initial.honoraires_montant)}` : null}
                  </Field>
                  <Field label="Charge honoraires">
                    {initial.honoraires_charge ? HONO_CHARGE_LABELS[initial.honoraires_charge] ?? initial.honoraires_charge : null}
                  </Field>
                  {initial.taux_retrocession != null && (
                    <Field label="Taux rétrocession">{initial.taux_retrocession} %</Field>
                  )}
                </div>
              </Section>

              {initial.clauses && (
                <Section title="Clauses particulières">
                  <p className="text-sm text-[var(--brikii-text)] whitespace-pre-wrap leading-relaxed">
                    {initial.clauses}
                  </p>
                </Section>
              )}
            </Card>

            {/* Documents */}
            {initial.documents.length > 0 && (
              <Card>
                <Section title="Documents">
                  <div className="flex flex-col gap-2">
                    {initial.documents.map(doc => (
                      <a
                        key={doc.id}
                        href={`/api/mandats/${initial.id}/documents/${doc.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between px-3 py-2.5 text-sm hover:bg-[var(--brikii-bg-subtle)] transition-colors"
                        style={{ border: '1px solid var(--brikii-border)', borderRadius: 'var(--brikii-radius-input)' }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base flex-shrink-0">📄</span>
                          <span className="text-[var(--brikii-text)] truncate">{doc.nom}</span>
                        </div>
                        <span className="text-xs text-[var(--brikii-text-muted)] shrink-0 ml-3">
                          {doc.taille ? `${Math.round(doc.taille / 1024)} ko` : 'Ouvrir →'}
                        </span>
                      </a>
                    ))}
                  </div>
                </Section>
              </Card>
            )}
          </div>

          {/* ─── DROITE ─── */}
          <div className="flex flex-col gap-4">

            {/* Carte identité mandat */}
            <Card>
              <div className="flex items-center justify-between text-xs text-[var(--brikii-text-muted)]">
                <span className="font-mono">{initial.numero}</span>
                <span>{formatDate(initial.created_at)}</span>
              </div>

              <div>
                <p className="text-2xl font-bold text-[var(--brikii-text)]">
                  {initial.numero_mandat ? `n° ${initial.numero_mandat}` : 'Sans numéro'}
                </p>
                <p className="text-sm text-[var(--brikii-text-muted)] mt-0.5">
                  {TYPE_LABELS[initial.type] ?? initial.type}
                </p>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {initial.statut_metier ? (
                  <BrikiiBadge variant="danger">
                    {STATUT_METIER_LABELS[initial.statut_metier] ?? initial.statut_metier}
                  </BrikiiBadge>
                ) : (
                  <BrikiiBadge variant={
                    initial.statut === 'actif'           ? 'success' :
                    initial.statut === 'pret_a_valider'  ? 'yellow'  :
                    initial.statut === 'a_completer'     ? 'warning' :
                    initial.statut === 'import_en_cours' ? 'info'    : 'neutral'
                  }>
                    {STATUT_LABELS[initial.statut] ?? initial.statut}
                  </BrikiiBadge>
                )}
              </div>

              <div className="pt-1 border-t border-[var(--brikii-border)]">
                <span className="text-3xl font-bold text-[var(--brikii-text)]">{formatPrix(initial.prix_vente)}</span>
                {initial.honoraires_pct != null && (
                  <p className="text-xs text-[var(--brikii-text-muted)] mt-0.5">
                    Honoraires {initial.honoraires_pct} %
                    {initial.honoraires_charge ? ` · charge ${HONO_CHARGE_LABELS[initial.honoraires_charge]}` : ''}
                  </p>
                )}
              </div>
            </Card>

            {/* Bien associé */}
            <Card>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--brikii-text-muted)] border-b border-[var(--brikii-border)] pb-2">
                Bien
              </h3>
              {bien ? (
                <div className="flex flex-col gap-3">
                  {/* Photo + infos */}
                  <Link
                    href={`/biens/${bien.id}`}
                    className="flex gap-3 hover:opacity-80 transition-opacity"
                  >
                    <BienThumb photos={bien.bien_photos} />
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm font-medium text-[var(--brikii-dark)] underline underline-offset-2">
                        {bien.reference ?? (bien.type ? BIEN_TYPE_LABELS[bien.type] ?? bien.type : '—')}
                      </span>
                      {(bien.ville || bien.code_postal) && (
                        <span className="text-xs text-[var(--brikii-text-muted)]">
                          {[bien.ville, bien.code_postal && `(${bien.code_postal})`].filter(Boolean).join(' ')}
                        </span>
                      )}
                      {bien.surface_hab && (
                        <span className="text-xs text-[var(--brikii-text-muted)]">{bien.surface_hab} m²</span>
                      )}
                    </div>
                  </Link>
                  <Link href={`/mandats/${initial.id}/rattacher-bien`}>
                    <BrikiiButton variant="ghost" size="sm">Changer de bien</BrikiiButton>
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-[var(--brikii-text-muted)]">Aucun bien rattaché.</p>
                  <Link href={`/mandats/${initial.id}/rattacher-bien`}>
                    <BrikiiButton variant="secondary" size="sm">Rattacher à un bien</BrikiiButton>
                  </Link>
                </div>
              )}
            </Card>

            {/* Propriétaires */}
            <Card>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--brikii-text-muted)] border-b border-[var(--brikii-border)] pb-2">
                Propriétaires
              </h3>
              {initial.proprietaires.length === 0 ? (
                <p className="text-sm text-[var(--brikii-text-muted)]">Aucun propriétaire renseigné.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {initial.proprietaires
                    .sort((a, b) => a.ordre - b.ordre)
                    .map(p => {
                      const c = p.contact
                      const name = c ? [c.prenom, c.nom].filter(Boolean).join(' ') || '—' : '—'
                      return (
                        <div key={p.id} className="flex flex-col gap-0.5">
                          <span className="text-sm text-[var(--brikii-text)]">{name}</span>
                          <span className="text-xs text-[var(--brikii-text-muted)]">
                            {ROLE_LABELS[p.role] ?? p.role}
                          </span>
                          {c?.email && (
                            <span className="text-xs text-[var(--brikii-text-muted)]">{c.email}</span>
                          )}
                        </div>
                      )
                    })}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // ─── Edit mode ─────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl flex flex-col gap-5">

      {/* Barre d'actions sticky */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ background: 'var(--brikii-bg)', border: '1px solid var(--brikii-border)', borderRadius: 'var(--brikii-radius-card)' }}
      >
        <h2 className="text-sm font-semibold text-[var(--brikii-text)]">Modifier le mandat</h2>
        <div className="flex gap-2">
          <BrikiiButton variant="ghost" size="sm" type="button" onClick={cancelEdit}>Annuler</BrikiiButton>
          <BrikiiButton size="sm" loading={saving} onClick={handleSave}>Enregistrer</BrikiiButton>
        </div>
      </div>

      {error && (
        <div
          className="px-4 py-3 text-sm text-[var(--brikii-danger)]"
          style={{ background: 'var(--brikii-danger-bg)', border: '1px solid var(--brikii-danger)', borderRadius: 'var(--brikii-radius-card)' }}
        >
          {error}
        </div>
      )}

      {/* Numéro de mandat — prominent */}
      <Card>
        <BrikiiInput
          label="Numéro de mandat"
          value={numeroMandat}
          onChange={e => setNumeroMandat(e.target.value)}
          placeholder="ex. 5503"
          hint={`Numéro inscrit sur le document papier. Référence interne : ${initial.numero}`}
        />
      </Card>

      {/* Type et statut */}
      <Card>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--brikii-text-muted)] border-b border-[var(--brikii-border)] pb-2">
          Type et statut
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <SelectField
            label="Type de mandat"
            value={type}
            onChange={v => setType(v as typeof type)}
            options={MANDAT_TYPES.map(t => ({ value: t, label: TYPE_LABELS[t] }))}
            required
          />
          <SelectField
            label="Statut workflow"
            value={statut}
            onChange={v => setStatut(v as typeof statut)}
            options={STATUTS.map(s => ({ value: s, label: STATUT_LABELS[s] }))}
          />
        </div>
        <SelectField
          label="Statut métier"
          value={statutMetier}
          onChange={setStatutMetier}
          options={[
            { value: '', label: '— En cours —' },
            ...STATUTS_METIER.map(s => ({ value: s, label: STATUT_METIER_LABELS[s] })),
          ]}
        />
        {statut === 'actif' && !initial.bien_id && (
          <p className="text-xs text-[var(--brikii-warning)]">
            ⚠ Un bien doit être rattaché avant de passer ce mandat en statut &quot;Actif&quot;.
          </p>
        )}
        {statut === 'actif' && initial.bien && (initial.bien.deleted_at != null || initial.bien.statut === 'archive') && (
          <p className="text-xs text-[var(--brikii-warning)]">
            ⚠ Le bien rattaché est {initial.bien.deleted_at != null ? 'supprimé' : 'archivé'} — impossible de passer en statut &quot;Actif&quot;.
          </p>
        )}
      </Card>

      {/* Dates */}
      <Card>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--brikii-text-muted)] border-b border-[var(--brikii-border)] pb-2">
          Dates
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <BrikiiInput label="Date de signature *" type="date" value={dateSignature} onChange={e => setDateSignature(e.target.value)} required />
          <BrikiiInput label="Date de début *"     type="date" value={dateDebut}     onChange={e => setDateDebut(e.target.value)}     required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <BrikiiInput
            label="Durée (mois)"
            type="number" min="1"
            value={dureeMois}
            onChange={e => setDureeMois(e.target.value)}
            placeholder="12"
          />
          <div className="flex flex-col gap-1 justify-end pb-0.5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={reconductible}
                onChange={e => setReconductible(e.target.checked)}
                className="w-4 h-4 accent-[var(--brikii-yellow)]"
              />
              <span className="text-sm text-[var(--brikii-text)]">Reconductible</span>
            </label>
          </div>
        </div>
      </Card>

      {/* Prix et honoraires */}
      <Card>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--brikii-text-muted)] border-b border-[var(--brikii-border)] pb-2">
          Prix et honoraires
        </h2>
        <BrikiiInput
          label="Prix de vente (€) *"
          type="number" min="0"
          value={prixVente}
          onChange={e => setPrixVente(e.target.value)}
          required
        />
        <div className="grid grid-cols-2 gap-4">
          <BrikiiInput
            label="Honoraires (%)"
            type="number" min="0" max="100" step="0.1"
            value={honorairesPct}
            onChange={e => setHonorairesPct(e.target.value)}
            placeholder="5"
          />
          <SelectField
            label="Charge honoraires"
            value={honorairesCharge}
            onChange={setHonorairesCharge}
            options={[
              { value: '', label: '— Non renseigné —' },
              ...HONO_CHARGES.map(c => ({ value: c, label: HONO_CHARGE_LABELS[c] })),
            ]}
          />
        </div>
        <BrikiiInput
          label="Taux rétrocession (%)"
          type="number" min="0" max="100" step="0.1"
          value={taux}
          onChange={e => setTaux(e.target.value)}
          placeholder="40"
        />
      </Card>

      {/* Clauses */}
      <Card>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--brikii-text-muted)] border-b border-[var(--brikii-border)] pb-2">
          Clauses particulières
        </h2>
        <textarea
          value={clauses}
          onChange={e => setClauses(e.target.value)}
          rows={5}
          placeholder="Clauses spécifiques au mandat…"
          className="w-full px-3 py-2 text-sm bg-[var(--brikii-bg)] text-[var(--brikii-text)] border border-[var(--brikii-border)] focus:border-[var(--brikii-dark)] outline-none transition-colors resize-none placeholder:text-[var(--brikii-text-muted)]"
          style={{ borderRadius: 'var(--brikii-radius-input)' }}
        />
      </Card>

      {/* Actions bas de page */}
      <div className="flex justify-end gap-2 pb-8">
        <BrikiiButton variant="ghost" type="button" onClick={cancelEdit}>Annuler</BrikiiButton>
        <BrikiiButton loading={saving} onClick={handleSave}>Enregistrer</BrikiiButton>
      </div>
    </div>
  )
}
