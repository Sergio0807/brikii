'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BrikiiButton } from '@/components/shared/BrikiiButton'
import { BrikiiInput } from '@/components/shared/BrikiiInput'
import { BrikiiBadge } from '@/components/shared/BrikiiBadge'
import { AdresseAutocomplete } from '@/components/shared/AdresseAutocomplete'

// ─── Types ────────────────────────────────────────────────────────────────────

const BIEN_TYPES = ['maison', 'appartement', 'terrain', 'immeuble', 'commerce', 'local', 'autre'] as const
const STATUTS = ['brouillon', 'sur_le_marche', 'sous_offre', 'vendu', 'archive'] as const
const ETATS = ['neuf', 'tres_bon', 'bon', 'a_rafraichir', 'a_renover', 'a_demolir'] as const
const CHAUFFAGES = ['gaz', 'electrique', 'fioul', 'bois', 'pompe_chaleur', 'autre'] as const
const DPE_LETTRES = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const

const TYPE_LABELS: Record<string, string> = {
  maison: 'Maison', appartement: 'Appartement', terrain: 'Terrain',
  immeuble: 'Immeuble', commerce: 'Commerce', local: 'Local', autre: 'Autre',
}
const STATUT_LABELS: Record<string, string> = {
  brouillon: 'Brouillon', sur_le_marche: 'Sur le marché',
  sous_offre: 'Sous offre', vendu: 'Vendu', archive: 'Archivé',
}
const ETAT_LABELS: Record<string, string> = {
  neuf: 'Neuf', tres_bon: 'Très bon état', bon: 'Bon état',
  a_rafraichir: 'À rafraîchir', a_renover: 'À rénover', a_demolir: 'À démolir',
}
const CHAUFFAGE_LABELS: Record<string, string> = {
  gaz: 'Gaz', electrique: 'Électrique', fioul: 'Fioul',
  bois: 'Bois', pompe_chaleur: 'Pompe à chaleur', autre: 'Autre',
}

const TABS = [
  { id: 'apercu', label: 'Aperçu' },
  { id: 'adresses', label: "Pass'Adresses", disabled: true },
  { id: 'documents', label: 'Documents', disabled: true },
  { id: 'pools', label: 'Pools', disabled: true },
  { id: 'mandat', label: 'Mandat', disabled: true },
  { id: 'historique', label: 'Historique', disabled: true },
]

type BienType = typeof BIEN_TYPES[number]
type StatutType = typeof STATUTS[number]

interface Details {
  nb_pieces?: number | null
  nb_chambres?: number | null
  nb_sdb?: number | null
  nb_wc?: number | null
  nb_niveaux?: number | null
  etage?: number | null
  etat_general?: string | null
  travaux?: boolean | null
  montant_travaux?: number | null
  annee_construction?: number | null
  garage?: boolean | null
  nb_garages?: number | null
  parking?: boolean | null
  piscine?: boolean | null
  cave?: boolean | null
  type_chauffage?: string | null
  dpe_lettre?: string | null
  dpe_valeur?: number | null
  ges_lettre?: string | null
  ges_valeur?: number | null
  taxe_fonciere?: number | null
  charges_mensuelles?: number | null
  [key: string]: unknown
}

interface Photo { id: string; url: string; ordre: number }

interface MandatSummary {
  id: string
  numero: string
  numero_mandat: string | null
  type: string
  statut: string
  statut_metier: string | null
  date_debut: string
  date_fin: string | null
  prix_vente: number
  honoraires_pct: number | null
}

interface Bien {
  id: string
  reference?: string | null
  type: BienType
  statut: StatutType
  adresse?: string | null
  ville?: string | null
  code_postal?: string | null
  prix?: number | null
  surface_hab?: number | null
  surface_terrain?: number | null
  descriptif?: string | null
  a_verifier: boolean
  source_url?: string | null
  source_portail?: string | null
  created_at: string
  details?: Details | null
  photos?: Photo[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrix(prix: number | null | undefined) {
  if (!prix) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(prix)
}
function formatDate(dt: string) {
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(dt))
}
function prixM2(prix?: number | null, surface?: number | null) {
  if (!prix || !surface) return null
  return Math.round(prix / surface)
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

function SelectField({ label, value, onChange, options, required }: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  required?: boolean
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

function CheckField({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={value}
        onChange={e => onChange(e.target.checked)}
        className="w-4 h-4 accent-[var(--brikii-yellow)]"
      />
      <span className="text-sm text-[var(--brikii-text)]">{label}</span>
    </label>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

const MANDAT_TYPE_LABELS: Record<string, string> = {
  exclusif: 'Exclusif', simple: 'Simple', semi_exclusif: 'Semi-exclusif',
  recherche: 'Recherche', gestion: 'Gestion',
}
const MANDAT_STATUT_UI = {
  en_cours: { label: 'En cours', variant: 'success'  },
  expire:   { label: 'Expiré',  variant: 'danger'   },
  resilie:  { label: 'Résilié', variant: 'danger'   },
  vendu:    { label: 'Vendu',   variant: 'info'      },
  archive:  { label: 'Archivé', variant: 'neutral'   },
} as const

export function BienDetail({ bien: initial, mandats = [] }: { bien: Bien; mandats?: MandatSummary[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('apercu')
  const [selectedPhotoIdx, setSelectedPhotoIdx] = useState(0)

  const photos = initial.photos ?? []
  const prevPhoto = useCallback(() => setSelectedPhotoIdx(i => (i - 1 + photos.length) % photos.length), [photos.length])
  const nextPhoto = useCallback(() => setSelectedPhotoIdx(i => (i + 1) % photos.length), [photos.length])

  useEffect(() => {
    if (photos.length < 2) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') prevPhoto()
      if (e.key === 'ArrowRight') nextPhoto()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [photos.length, prevPhoto, nextPhoto])

  // Bien fields
  const [type, setType] = useState(initial.type)
  const [statut, setStatut] = useState(initial.statut)
  const [adresse, setAdresse] = useState(initial.adresse ?? '')
  const [ville, setVille] = useState(initial.ville ?? '')
  const [codePostal, setCodePostal] = useState(initial.code_postal ?? '')
  const [prix, setPrix] = useState(initial.prix?.toString() ?? '')
  const [surfaceHab, setSurfaceHab] = useState(initial.surface_hab?.toString() ?? '')
  const [surfaceTerrain, setSurfaceTerrain] = useState(initial.surface_terrain?.toString() ?? '')
  const [descriptif, setDescriptif] = useState(initial.descriptif ?? '')
  const [aVerifier, setAVerifier] = useState(initial.a_verifier)

  // Details fields (maison/appartement)
  const d = initial.details ?? {}
  const [nbPieces, setNbPieces] = useState(d.nb_pieces?.toString() ?? '')
  const [nbChambres, setNbChambres] = useState(d.nb_chambres?.toString() ?? '')
  const [nbSdb, setNbSdb] = useState(d.nb_sdb?.toString() ?? '')
  const [nbNiveaux, setNbNiveaux] = useState(d.nb_niveaux?.toString() ?? '')
  const [etage, setEtage] = useState(d.etage?.toString() ?? '')
  const [etatGeneral, setEtatGeneral] = useState(d.etat_general?.toString() ?? '')
  const [travaux, setTravaux] = useState(d.travaux ?? false)
  const [montantTravaux, setMontantTravaux] = useState(d.montant_travaux?.toString() ?? '')
  const [anneeConstruction, setAnneeConstruction] = useState(d.annee_construction?.toString() ?? '')
  const [garage, setGarage] = useState(d.garage ?? false)
  const [nbGarages, setNbGarages] = useState(d.nb_garages?.toString() ?? '')
  const [parking, setParking] = useState(d.parking ?? false)
  const [piscine, setPiscine] = useState(d.piscine ?? false)
  const [cave, setCave] = useState(d.cave ?? false)
  const [typeChauffage, setTypeChauffage] = useState(d.type_chauffage?.toString() ?? '')
  const [dpeLettre, setDpeLettre] = useState(d.dpe_lettre?.toString() ?? '')
  const [dpeValeur, setDpeValeur] = useState(d.dpe_valeur?.toString() ?? '')
  const [gesLettre, setGesLettre] = useState(d.ges_lettre?.toString() ?? '')
  const [gesValeur, setGesValeur] = useState(d.ges_valeur?.toString() ?? '')
  const [taxeFonciere, setTaxeFonciere] = useState(d.taxe_fonciere?.toString() ?? '')
  const [chargesMensuelles, setChargesMensuelles] = useState(d.charges_mensuelles?.toString() ?? '')

  const hasDetails = type === 'maison' || type === 'appartement'

  function cancelEdit() {
    setType(initial.type); setStatut(initial.statut)
    setAdresse(initial.adresse ?? ''); setVille(initial.ville ?? '')
    setCodePostal(initial.code_postal ?? ''); setPrix(initial.prix?.toString() ?? '')
    setSurfaceHab(initial.surface_hab?.toString() ?? '')
    setSurfaceTerrain(initial.surface_terrain?.toString() ?? '')
    setDescriptif(initial.descriptif ?? ''); setAVerifier(initial.a_verifier)
    setNbPieces(d.nb_pieces?.toString() ?? ''); setNbChambres(d.nb_chambres?.toString() ?? '')
    setNbSdb(d.nb_sdb?.toString() ?? ''); setNbNiveaux(d.nb_niveaux?.toString() ?? '')
    setEtage(d.etage?.toString() ?? ''); setEtatGeneral(d.etat_general?.toString() ?? '')
    setTravaux(d.travaux ?? false); setMontantTravaux(d.montant_travaux?.toString() ?? '')
    setAnneeConstruction(d.annee_construction?.toString() ?? '')
    setGarage(d.garage ?? false); setNbGarages(d.nb_garages?.toString() ?? '')
    setParking(d.parking ?? false); setPiscine(d.piscine ?? false); setCave(d.cave ?? false)
    setTypeChauffage(d.type_chauffage?.toString() ?? '')
    setDpeLettre(d.dpe_lettre?.toString() ?? ''); setDpeValeur(d.dpe_valeur?.toString() ?? '')
    setGesLettre(d.ges_lettre?.toString() ?? ''); setGesValeur(d.ges_valeur?.toString() ?? '')
    setTaxeFonciere(d.taxe_fonciere?.toString() ?? '')
    setChargesMensuelles(d.charges_mensuelles?.toString() ?? '')
    setEditing(false); setError(null)
  }

  async function handleSave() {
    setSaving(true); setError(null)
    try {
      const details = hasDetails ? {
        nb_pieces: nbPieces ? parseInt(nbPieces) : null,
        nb_chambres: nbChambres ? parseInt(nbChambres) : null,
        nb_sdb: nbSdb ? parseInt(nbSdb) : null,
        nb_niveaux: nbNiveaux ? parseInt(nbNiveaux) : null,
        etage: etage ? parseInt(etage) : null,
        etat_general: etatGeneral || null,
        travaux,
        montant_travaux: montantTravaux ? parseFloat(montantTravaux) : null,
        annee_construction: anneeConstruction ? parseInt(anneeConstruction) : null,
        garage,
        nb_garages: nbGarages ? parseInt(nbGarages) : null,
        parking,
        piscine,
        cave,
        type_chauffage: typeChauffage || null,
        dpe_lettre: dpeLettre || null,
        dpe_valeur: dpeValeur ? parseInt(dpeValeur) : null,
        ges_lettre: gesLettre || null,
        ges_valeur: gesValeur ? parseInt(gesValeur) : null,
        taxe_fonciere: taxeFonciere ? parseInt(taxeFonciere) : null,
        charges_mensuelles: chargesMensuelles ? parseInt(chargesMensuelles) : null,
      } : undefined

      const res = await fetch(`/api/biens/${initial.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          statut,
          // N'envoyer adresse/ville/cp que s'ils sont non-vides :
          // une chaîne vide '' échoue à min(1) dans le patchSchema
          ...(adresse    ? { adresse }                : {}),
          ...(ville      ? { ville }                  : {}),
          ...(codePostal ? { code_postal: codePostal }: {}),
          prix:            prix        ? parseInt(prix)             || null : null,
          surface_hab:     surfaceHab  ? parseFloat(surfaceHab)    || null : null,
          surface_terrain: surfaceTerrain ? parseFloat(surfaceTerrain) || null : null,
          descriptif:      descriptif || null,
          a_verifier:      aVerifier,
          ...(details ? { details } : {}),
        }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: unknown }
        setError(typeof data.error === 'string' ? data.error : 'Erreur lors de la sauvegarde.')
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

  // ─── View mode ───────────────────────────────────────────────────────────────
  if (!editing) {
    const m2 = prixM2(initial.prix, initial.surface_hab)
    const hasPhotos = photos.length > 0
    const hasInitialDetails = initial.type === 'maison' || initial.type === 'appartement'

    return (
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 items-start">

        {/* ─── LEFT column ─── */}
        <div
          className="flex flex-col overflow-hidden"
          style={{ border: '1px solid var(--brikii-border)', borderRadius: 'var(--brikii-radius-card)', background: 'var(--brikii-bg)' }}
        >
          {/* Photo area */}
          {hasPhotos ? (
            <div className="relative aspect-video overflow-hidden group">
              <img
                src={photos[selectedPhotoIdx].url}
                alt=""
                className="w-full h-full object-cover transition-opacity duration-200"
              />
              {photos.length > 1 && (
                <>
                  <button
                    onClick={prevPhoto}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
                    aria-label="Photo précédente"
                  >
                    ‹
                  </button>
                  <button
                    onClick={nextPhoto}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
                    aria-label="Photo suivante"
                  >
                    ›
                  </button>
                  <span className="absolute bottom-2 right-2 px-2 py-0.5 text-xs bg-black/50 text-white rounded-full">
                    {selectedPhotoIdx + 1} / {photos.length}
                  </span>
                </>
              )}
            </div>
          ) : (
            <div
              className="aspect-video"
              style={{
                backgroundColor: 'var(--brikii-bg-subtle)',
                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 8px, var(--brikii-border) 8px, var(--brikii-border) 9px)',
              }}
            />
          )}

          {/* Thumbnail strip */}
          {hasPhotos && photos.length > 1 && (
            <div className="flex gap-1 p-2 bg-[var(--brikii-bg-subtle)] overflow-x-auto">
              {photos.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPhotoIdx(i)}
                  className="shrink-0 focus:outline-none"
                  style={{ borderRadius: 'var(--brikii-radius-input)' }}
                >
                  <img
                    src={p.url}
                    alt=""
                    className="w-16 h-12 object-cover transition-opacity"
                    style={{
                      borderRadius: 'var(--brikii-radius-input)',
                      opacity: i === selectedPhotoIdx ? 1 : 0.55,
                      outline: i === selectedPhotoIdx ? '2px solid var(--brikii-dark)' : 'none',
                      outlineOffset: '1px',
                    }}
                  />
                </button>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-[var(--brikii-border)] overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => !tab.disabled && setActiveTab(tab.id)}
                className={[
                  'px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors border-b-2 -mb-px shrink-0',
                  tab.disabled
                    ? 'opacity-40 cursor-not-allowed border-transparent text-[var(--brikii-text-muted)]'
                    : activeTab === tab.id
                      ? 'border-[var(--brikii-dark)] text-[var(--brikii-text)]'
                      : 'border-transparent text-[var(--brikii-text-muted)] hover:text-[var(--brikii-text)]',
                ].join(' ')}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Aperçu tab content */}
          <div className="p-5 flex flex-col gap-6">

            {/* Description */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--brikii-text-muted)]">
                  Description
                </h2>
                <BrikiiButton variant="ghost" size="sm" onClick={() => setEditing(true)}>
                  Modifier
                </BrikiiButton>
              </div>
              {initial.descriptif ? (
                <p className="text-sm text-[var(--brikii-text)] leading-relaxed whitespace-pre-wrap">
                  {initial.descriptif}
                </p>
              ) : (
                <p className="text-sm text-[var(--brikii-text-muted)] italic">Aucune description.</p>
              )}
            </div>

            {/* Caractéristiques */}
            {hasInitialDetails && (
              <Section title="Caractéristiques">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <Field label="Type">{TYPE_LABELS[initial.type] ?? initial.type}</Field>
                  <Field label="Étages">{d.nb_niveaux ?? null}</Field>
                  <Field label="Chauffage">{d.type_chauffage ? CHAUFFAGE_LABELS[d.type_chauffage] ?? d.type_chauffage : null}</Field>
                  <Field label="Année construction">{d.annee_construction ?? null}</Field>
                  <Field label="État général">{d.etat_general ? ETAT_LABELS[d.etat_general] ?? d.etat_general : null}</Field>
                  <Field label="DPE">{d.dpe_lettre ? `${d.dpe_lettre}${d.dpe_valeur ? ` · ${d.dpe_valeur} kWh/m²` : ''}` : null}</Field>
                  <Field label="GES">{d.ges_lettre ? `${d.ges_lettre}${d.ges_valeur ? ` · ${d.ges_valeur} kg` : ''}` : null}</Field>
                  <Field label="Taxe foncière">{d.taxe_fonciere ? `${d.taxe_fonciere} €/an` : null}</Field>
                  {initial.type === 'appartement' && (
                    <Field label="Charges">{d.charges_mensuelles ? `${d.charges_mensuelles} €/mois` : null}</Field>
                  )}
                  <Field label="Garage">{d.garage === true ? 'Oui' : d.garage === false ? 'Non' : null}</Field>
                  <Field label="Parking">{d.parking === true ? 'Oui' : d.parking === false ? 'Non' : null}</Field>
                  <Field label="Piscine">{d.piscine === true ? 'Oui' : d.piscine === false ? 'Non' : null}</Field>
                  {d.cave != null && (
                    <Field label="Cave">{d.cave === true ? 'Oui' : 'Non'}</Field>
                  )}
                </div>
              </Section>
            )}

            {/* Source */}
            {initial.source_url && (
              <Section title="Source">
                <div className="flex flex-col gap-2">
                  {initial.source_portail && <Field label="Portail">{initial.source_portail}</Field>}
                  <Field label="URL annonce">
                    <a
                      href={initial.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--brikii-dark)] underline underline-offset-2 break-all"
                    >
                      {initial.source_url}
                    </a>
                  </Field>
                </div>
              </Section>
            )}
          </div>
        </div>

        {/* ─── RIGHT column ─── */}
        <div className="flex flex-col gap-4">

          {/* Stats card */}
          <div
            className="p-5 flex flex-col gap-4"
            style={{ background: 'var(--brikii-bg)', border: '1px solid var(--brikii-border)', borderRadius: 'var(--brikii-radius-card)' }}
          >
            {/* Ref + date */}
            <div className="flex items-center justify-between text-xs text-[var(--brikii-text-muted)]">
              <span className="font-mono">{initial.reference ?? '—'}</span>
              <span>{formatDate(initial.created_at)}</span>
            </div>

            {/* Title */}
            <div>
              <h2 className="text-base font-bold text-[var(--brikii-text)]">
                {TYPE_LABELS[initial.type] ?? initial.type}
                {d.nb_pieces ? ` ${d.nb_pieces} pièces` : ''}
                {initial.surface_hab ? ` · ${initial.surface_hab} m²` : ''}
              </h2>
              {initial.adresse && (
                <p className="text-sm text-[var(--brikii-text-muted)] mt-0.5">{initial.adresse}</p>
              )}
              {(initial.ville || initial.code_postal) && (
                <p className="text-sm text-[var(--brikii-text-muted)]">
                  {[initial.ville, initial.code_postal && `(${initial.code_postal})`].filter(Boolean).join(' ')}
                </p>
              )}
            </div>

            {/* Prix */}
            <div>
              <span className="text-3xl font-bold text-[var(--brikii-text)]">{formatPrix(initial.prix)}</span>
              {m2 && (
                <p className="text-xs text-[var(--brikii-text-muted)] mt-0.5">
                  {new Intl.NumberFormat('fr-FR').format(m2)} €/m²
                </p>
              )}
            </div>

            {/* Stats pills */}
            <div className="flex flex-wrap gap-2">
              {d.nb_pieces && (
                <span className="px-2.5 py-1 text-xs font-medium bg-[var(--brikii-bg-subtle)] text-[var(--brikii-text)] rounded-full">
                  {d.nb_pieces} pièces
                </span>
              )}
              {d.nb_chambres && (
                <span className="px-2.5 py-1 text-xs font-medium bg-[var(--brikii-bg-subtle)] text-[var(--brikii-text)] rounded-full">
                  {d.nb_chambres} chambres
                </span>
              )}
              {initial.surface_hab && (
                <span className="px-2.5 py-1 text-xs font-medium bg-[var(--brikii-bg-subtle)] text-[var(--brikii-text)] rounded-full">
                  {initial.surface_hab} m² hab.
                </span>
              )}
              {initial.surface_terrain && (
                <span className="px-2.5 py-1 text-xs font-medium bg-[var(--brikii-bg-subtle)] text-[var(--brikii-text)] rounded-full">
                  {initial.surface_terrain} m² terrain
                </span>
              )}
            </div>
          </div>

          {/* Mandats */}
          {(() => {
            const fmtDate = (d: string | null) => d
              ? new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(d))
              : '—'
            const fmtPrix = (v: number) =>
              new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)

            const enCours    = mandats.filter(m => !m.statut_metier)
            const historique = mandats.filter(m => !!m.statut_metier)

            return (
              <div
                className="p-5 flex flex-col gap-3"
                style={{ background: 'var(--brikii-bg)', border: '1px solid var(--brikii-border)', borderRadius: 'var(--brikii-radius-card)' }}
              >
                <div className="flex items-center justify-between border-b border-[var(--brikii-border)] pb-2">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--brikii-text-muted)]">
                    Mandats
                  </h3>
                  <Link href={`/mandats/nouveau?bien_id=${initial.id}`}>
                    <BrikiiButton variant="ghost" size="sm">Rattacher un mandat</BrikiiButton>
                  </Link>
                </div>

                {/* Mandat(s) en cours */}
                {enCours.length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    {enCours.map(m => (
                      <Link
                        key={m.id}
                        href={`/mandats/${m.id}`}
                        className="flex flex-col gap-2 px-3 py-3 bg-[var(--brikii-bg-subtle)] hover:bg-[var(--brikii-border)] transition-colors"
                        style={{ borderRadius: 'var(--brikii-radius-input)' }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-baseline gap-1.5 min-w-0">
                            <span className="text-sm font-semibold text-[var(--brikii-text)] truncate">
                              {m.numero_mandat ? `n° ${m.numero_mandat}` : 'Sans numéro'}
                            </span>
                            <span className="text-xs text-[var(--brikii-text-muted)] shrink-0">
                              — {MANDAT_TYPE_LABELS[m.type] ?? m.type}
                            </span>
                          </div>
                          <BrikiiBadge variant={MANDAT_STATUT_UI.en_cours.variant}>
                            {MANDAT_STATUT_UI.en_cours.label}
                          </BrikiiBadge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-[var(--brikii-text-muted)]">
                            {fmtDate(m.date_debut)}{m.date_fin ? ` → ${fmtDate(m.date_fin)}` : ''}
                          </span>
                          <span className="text-xs font-semibold text-[var(--brikii-text)]">
                            {fmtPrix(m.prix_vente)}
                            {m.honoraires_pct != null ? ` · ${m.honoraires_pct} %` : ''}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-[var(--brikii-text-muted)]">{m.numero}</span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--brikii-text-muted)]">Aucun mandat en cours.</p>
                )}

                {/* Historique */}
                {historique.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--brikii-text-muted)]">
                      Historique
                    </span>
                    {historique.map(m => {
                      const key = (m.statut_metier as keyof typeof MANDAT_STATUT_UI) ?? 'en_cours'
                      const cfg = MANDAT_STATUT_UI[key] ?? MANDAT_STATUT_UI.en_cours
                      return (
                        <Link
                          key={m.id}
                          href={`/mandats/${m.id}`}
                          className="flex items-center justify-between px-3 py-2 bg-[var(--brikii-bg-subtle)] hover:bg-[var(--brikii-border)] transition-colors opacity-70 hover:opacity-100"
                          style={{ borderRadius: 'var(--brikii-radius-input)' }}
                        >
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="text-xs font-medium text-[var(--brikii-text)]">
                              {m.numero_mandat ? `n° ${m.numero_mandat}` : 'Sans numéro'}
                              {' — '}{MANDAT_TYPE_LABELS[m.type] ?? m.type}
                            </span>
                            <span className="text-xs text-[var(--brikii-text-muted)]">
                              {fmtDate(m.date_debut)}{m.date_fin ? ` → ${fmtDate(m.date_fin)}` : ''}
                            </span>
                          </div>
                          <BrikiiBadge variant={cfg.variant}>{cfg.label}</BrikiiBadge>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })()}

          {/* Propriétaire placeholder */}
          <div
            className="p-5 flex flex-col gap-3"
            style={{ background: 'var(--brikii-bg)', border: '1px solid var(--brikii-border)', borderRadius: 'var(--brikii-radius-card)' }}
          >
            <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--brikii-text-muted)] border-b border-[var(--brikii-border)] pb-2">
              Propriétaire
            </h3>
            <p className="text-sm text-[var(--brikii-text-muted)]">Non renseigné.</p>
          </div>
        </div>
      </div>
    )
  }

  // ─── Edit mode ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      <div
        className="p-5 flex flex-col gap-5"
        style={{ background: 'var(--brikii-bg)', border: '1px solid var(--brikii-border)', borderRadius: 'var(--brikii-radius-card)' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--brikii-text)]">Modifier le bien</h2>
          <div className="flex gap-2">
            <BrikiiButton variant="ghost" size="sm" type="button" onClick={cancelEdit}>Annuler</BrikiiButton>
            <BrikiiButton size="sm" loading={saving} onClick={handleSave}>Enregistrer</BrikiiButton>
          </div>
        </div>
        {error && <p className="text-xs text-[var(--brikii-danger)]">{error}</p>}
      </div>

      {/* General */}
      <div
        className="p-5 flex flex-col gap-5"
        style={{ background: 'var(--brikii-bg)', border: '1px solid var(--brikii-border)', borderRadius: 'var(--brikii-radius-card)' }}
      >
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--brikii-text-muted)] border-b border-[var(--brikii-border)] pb-2">
          Informations générales
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <SelectField
            label="Type"
            value={type}
            onChange={v => setType(v as BienType)}
            options={BIEN_TYPES.map(t => ({ value: t, label: TYPE_LABELS[t] }))}
            required
          />
          <SelectField
            label="Statut"
            value={statut}
            onChange={v => setStatut(v as StatutType)}
            options={STATUTS.map(s => ({ value: s, label: STATUT_LABELS[s] }))}
          />
        </div>

        <AdresseAutocomplete
          label="Adresse"
          value={adresse}
          onChange={setAdresse}
          onSelect={s => { setAdresse(s.name); setVille(s.city); setCodePostal(s.postcode) }}
        />

        <div className="grid grid-cols-2 gap-4">
          <BrikiiInput label="Ville" value={ville} onChange={e => setVille(e.target.value)} placeholder="Albi" />
          <BrikiiInput label="Code postal" value={codePostal} onChange={e => setCodePostal(e.target.value)} placeholder="81000" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <BrikiiInput label="Prix (€)" type="number" min="0" value={prix} onChange={e => setPrix(e.target.value)} placeholder="350000" />
          <BrikiiInput label="Surface habitable (m²)" type="number" min="0" step="0.01" value={surfaceHab} onChange={e => setSurfaceHab(e.target.value)} placeholder="120" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <BrikiiInput label="Surface terrain (m²)" type="number" min="0" step="0.01" value={surfaceTerrain} onChange={e => setSurfaceTerrain(e.target.value)} placeholder="500" />
          <div />
        </div>

        <CheckField label="À vérifier" value={aVerifier} onChange={setAVerifier} />
      </div>

      {/* Details — maison / appartement */}
      {hasDetails && (
        <div
          className="p-5 flex flex-col gap-5"
          style={{ background: 'var(--brikii-bg)', border: '1px solid var(--brikii-border)', borderRadius: 'var(--brikii-radius-card)' }}
        >
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--brikii-text-muted)] border-b border-[var(--brikii-border)] pb-2">
            Caractéristiques
          </h2>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <BrikiiInput label="Pièces" type="number" min="0" value={nbPieces} onChange={e => setNbPieces(e.target.value)} placeholder="5" />
            <BrikiiInput label="Chambres" type="number" min="0" value={nbChambres} onChange={e => setNbChambres(e.target.value)} placeholder="3" />
            <BrikiiInput label="SDB" type="number" min="0" value={nbSdb} onChange={e => setNbSdb(e.target.value)} placeholder="2" />
            <BrikiiInput label="Niveaux" type="number" min="0" value={nbNiveaux} onChange={e => setNbNiveaux(e.target.value)} placeholder="2" />
            {type === 'appartement' && (
              <BrikiiInput label="Étage" type="number" min="0" value={etage} onChange={e => setEtage(e.target.value)} placeholder="3" />
            )}
            <BrikiiInput label="Année construction" type="number" min="1800" max="2030" value={anneeConstruction} onChange={e => setAnneeConstruction(e.target.value)} placeholder="1985" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <SelectField
              label="État général"
              value={etatGeneral}
              onChange={setEtatGeneral}
              options={[{ value: '', label: '— Non renseigné —' }, ...ETATS.map(e => ({ value: e, label: ETAT_LABELS[e] }))]}
            />
            <SelectField
              label="Chauffage"
              value={typeChauffage}
              onChange={setTypeChauffage}
              options={[{ value: '', label: '— Non renseigné —' }, ...CHAUFFAGES.map(c => ({ value: c, label: CHAUFFAGE_LABELS[c] }))]}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <SelectField
              label="DPE"
              value={dpeLettre}
              onChange={setDpeLettre}
              options={[{ value: '', label: '—' }, ...DPE_LETTRES.map(l => ({ value: l, label: l }))]}
            />
            <BrikiiInput label="DPE kWh/m²" type="number" min="0" value={dpeValeur} onChange={e => setDpeValeur(e.target.value)} placeholder="148" />
            <SelectField
              label="GES"
              value={gesLettre}
              onChange={setGesLettre}
              options={[{ value: '', label: '—' }, ...DPE_LETTRES.map(l => ({ value: l, label: l }))]}
            />
            <BrikiiInput label="GES kg/m²" type="number" min="0" value={gesValeur} onChange={e => setGesValeur(e.target.value)} placeholder="22" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <BrikiiInput label="Taxe foncière (€/an)" type="number" min="0" value={taxeFonciere} onChange={e => setTaxeFonciere(e.target.value)} placeholder="2180" />
            {type === 'appartement' && (
              <BrikiiInput label="Charges (€/mois)" type="number" min="0" value={chargesMensuelles} onChange={e => setChargesMensuelles(e.target.value)} placeholder="250" />
            )}
          </div>

          <div className="flex flex-wrap gap-4">
            <CheckField label="Garage" value={garage} onChange={setGarage} />
            {garage && (
              <BrikiiInput label="Nb garages" type="number" min="0" value={nbGarages} onChange={e => setNbGarages(e.target.value)} placeholder="1" />
            )}
            <CheckField label="Parking" value={parking} onChange={setParking} />
            <CheckField label="Piscine" value={piscine} onChange={setPiscine} />
            <CheckField label="Cave" value={cave} onChange={setCave} />
          </div>

          <div className="flex flex-wrap gap-4 items-start">
            <CheckField label="Travaux à prévoir" value={travaux} onChange={setTravaux} />
            {travaux && (
              <BrikiiInput label="Montant travaux (€)" type="number" min="0" value={montantTravaux} onChange={e => setMontantTravaux(e.target.value)} placeholder="25000" />
            )}
          </div>
        </div>
      )}

      {/* Descriptif */}
      <div
        className="p-5 flex flex-col gap-3"
        style={{ background: 'var(--brikii-bg)', border: '1px solid var(--brikii-border)', borderRadius: 'var(--brikii-radius-card)' }}
      >
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--brikii-text-muted)] border-b border-[var(--brikii-border)] pb-2">
          Descriptif
        </h2>
        <textarea
          value={descriptif}
          onChange={e => setDescriptif(e.target.value)}
          rows={6}
          placeholder="Description du bien…"
          className="w-full px-3 py-2 text-sm bg-[var(--brikii-bg)] text-[var(--brikii-text)] border border-[var(--brikii-border)] focus:border-[var(--brikii-dark)] outline-none transition-colors resize-none placeholder:text-[var(--brikii-text-muted)]"
          style={{ borderRadius: 'var(--brikii-radius-input)' }}
        />
      </div>

      {/* Save bar */}
      <div className="flex justify-end gap-2 pb-6">
        <BrikiiButton variant="ghost" type="button" onClick={cancelEdit}>Annuler</BrikiiButton>
        <BrikiiButton loading={saving} onClick={handleSave}>Enregistrer</BrikiiButton>
      </div>
    </div>
  )
}
