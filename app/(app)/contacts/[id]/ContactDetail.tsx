'use client'

import Link from 'next/link'
import { Building2, Home, User } from 'lucide-react'
import { BrikiiBadge } from '@/components/shared/BrikiiBadge'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Contact {
  id: string
  personne_type: string
  civilite?: string | null
  prenom?: string | null
  nom?: string | null
  date_naissance?: string | null
  lieu_naissance?: string | null
  nationalite?: string | null
  raison_sociale?: string | null
  forme_juridique?: string | null
  siren?: string | null
  representant_nom?: string | null
  representant_qualite?: string | null
  email?: string | null
  telephone?: string | null
  telephone_2?: string | null
  adresse?: string | null
  ville?: string | null
  code_postal?: string | null
  pays?: string | null
  types?: string[] | null
  score?: string | null
  statut: string
  origine?: string | null
  notes?: string | null
  created_at: string
}

interface ContactRole {
  type: string
  actif: boolean
}

interface BienLie {
  id: string
  role: string
  bien: {
    id: string
    reference?: string | null
    type?: string | null
    ville?: string | null
    statut?: string | null
  } | null
}

interface Interaction {
  id: string
  type: string
  titre?: string | null
  contenu?: string | null
  date_inter?: string | null
  created_at: string
}

// ── Référentiels labels ────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  proprietaire_vendeur: 'Propriétaire vendeur',
  proprietaire_bailleur: 'Propriétaire bailleur',
  locataire: 'Locataire',
  acquereur: 'Acquéreur',
  prospect_acquereur: 'Prospect acquéreur',
  prospect_vendeur: 'Prospect vendeur',
  agent_immobilier: 'Agent immobilier',
  mandataire: 'Mandataire',
  negociateur: 'Négociateur',
  notaire: 'Notaire',
  gestionnaire: 'Gestionnaire',
  diagnostiqueur: 'Diagnostiqueur',
  geometre: 'Géomètre',
  architecte: 'Architecte',
  artisan_maconnerie: 'Artisan maçonnerie',
  artisan_electricite: 'Artisan électricité',
  artisan_plomberie: 'Artisan plomberie',
  artisan_autre: 'Artisan autre',
  expert_immobilier: 'Expert immobilier',
  avocat: 'Avocat',
  huissier: 'Huissier',
  banquier: 'Banquier',
  courtier_credit: 'Courtier crédit',
  assureur: 'Assureur',
  comptable: 'Comptable',
  autre: 'Autre',
}

const BIEN_TYPE_LABELS: Record<string, string> = {
  maison: 'Maison', appartement: 'Appartement', terrain: 'Terrain',
  immeuble: 'Immeuble', commerce: 'Commerce', local: 'Local', autre: 'Autre',
}

const BIEN_STATUT_CONFIG: Record<string, { label: string; variant: 'neutral' | 'success' | 'warning' | 'info' }> = {
  brouillon:     { label: 'Brouillon',       variant: 'neutral' },
  sur_le_marche: { label: 'Sur le marché',   variant: 'success' },
  sous_offre:    { label: 'Sous offre',       variant: 'warning' },
  vendu:         { label: 'Vendu',            variant: 'info'    },
  archive:       { label: 'Archivé',          variant: 'neutral' },
}

const INTERACTION_LABELS: Record<string, string> = {
  appel: 'Appel', email: 'Email', sms: 'SMS', visite: 'Visite',
  rdv: 'RDV', note: 'Note', pass_adresse: "Pass'Adresse", autre: 'Autre',
}

const SCORE_CONFIG: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'neutral' }> = {
  A: { label: 'Score A', variant: 'success' },
  B: { label: 'Score B', variant: 'info' },
  C: { label: 'Score C', variant: 'warning' },
  D: { label: 'Score D', variant: 'neutral' },
}

const CIVILITE_LABELS: Record<string, string> = {
  monsieur: 'M.', madame: 'Mme',
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--brikii-text-muted)] border-b border-[var(--brikii-border)] pb-2">
        {title}
      </h2>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children?: React.ReactNode }) {
  if (!children) return null
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--brikii-text-muted)]">{label}</span>
      <span className="text-sm text-[var(--brikii-text)]">{children}</span>
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

function formatDate(d: string | null | undefined) {
  if (!d) return null
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(d))
}

function formatDateShort(d: string | null | undefined) {
  if (!d) return null
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(d))
}

// ── Main Component ────────────────────────────────────────────────────────────

interface ContactDetailProps {
  contact: Contact
  roles: ContactRole[]
  biens: BienLie[]
  interactions: Interaction[]
}

export function ContactDetail({ contact, roles, biens, interactions }: ContactDetailProps) {
  const isPhysique = contact.personne_type === 'physique'
  const scoreConfig = contact.score ? SCORE_CONFIG[contact.score] : null

  // Fusionner types[] (snapshot) et roles normalises pour affichage
  const typesSnapshot = contact.types ?? []
  const typesNorm = roles.filter(r => r.actif).map(r => r.type)
  const allTypes = [...new Set([...typesSnapshot, ...typesNorm])]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-5 items-start">

      {/* ─── GAUCHE : identité ─── */}
      <div className="flex flex-col gap-5">

        {/* Carte identité */}
        <Card>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 flex-shrink-0 flex items-center justify-center"
              style={{ background: 'var(--brikii-bg-subtle)', borderRadius: 'var(--brikii-radius-input)' }}
            >
              {isPhysique
                ? <User className="w-5 h-5 text-[var(--brikii-text-muted)]" />
                : <Building2 className="w-5 h-5 text-[var(--brikii-text-muted)]" />
              }
            </div>
            <div>
              <p className="text-xs text-[var(--brikii-text-muted)]">
                {isPhysique ? 'Personne physique' : 'Personne morale'}
              </p>
              {scoreConfig && (
                <BrikiiBadge variant={scoreConfig.variant} className="mt-0.5">{scoreConfig.label}</BrikiiBadge>
              )}
            </div>
          </div>

          {isPhysique ? (
            <Section title="Identité">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                {contact.civilite && (
                  <Field label="Civilité">{CIVILITE_LABELS[contact.civilite] ?? contact.civilite}</Field>
                )}
                <Field label="Prénom">{contact.prenom}</Field>
                <Field label="Nom">{contact.nom}</Field>
                {contact.date_naissance && (
                  <Field label="Date de naissance">{formatDate(contact.date_naissance)}</Field>
                )}
                {contact.nationalite && (
                  <Field label="Nationalité">{contact.nationalite}</Field>
                )}
              </div>
            </Section>
          ) : (
            <Section title="Identité">
              <div className="flex flex-col gap-3">
                <Field label="Raison sociale">{contact.raison_sociale}</Field>
                {contact.forme_juridique && (
                  <Field label="Forme juridique">{contact.forme_juridique}</Field>
                )}
                {contact.siren && (
                  <Field label="SIREN">{contact.siren}</Field>
                )}
                {contact.representant_nom && (
                  <Field label="Représentant">
                    {[contact.representant_nom, contact.representant_qualite].filter(Boolean).join(' — ')}
                  </Field>
                )}
              </div>
            </Section>
          )}
        </Card>

        {/* Coordonnées */}
        <Card>
          <Section title="Coordonnées">
            <div className="flex flex-col gap-3">
              {contact.telephone && (
                <Field label="Téléphone">
                  <a href={`tel:${contact.telephone}`} className="hover:text-[var(--brikii-dark)] transition-colors">
                    {contact.telephone}
                  </a>
                </Field>
              )}
              {contact.telephone_2 && (
                <Field label="Téléphone 2">
                  <a href={`tel:${contact.telephone_2}`} className="hover:text-[var(--brikii-dark)] transition-colors">
                    {contact.telephone_2}
                  </a>
                </Field>
              )}
              {contact.email && (
                <Field label="Email">
                  <a href={`mailto:${contact.email}`} className="hover:text-[var(--brikii-dark)] transition-colors break-all">
                    {contact.email}
                  </a>
                </Field>
              )}
              {(contact.adresse || contact.ville) && (
                <Field label="Adresse">
                  {[contact.adresse, [contact.code_postal, contact.ville].filter(Boolean).join(' ')].filter(Boolean).join(', ')}
                </Field>
              )}
              {contact.pays && contact.pays !== 'France' && (
                <Field label="Pays">{contact.pays}</Field>
              )}
              {!contact.telephone && !contact.email && !contact.ville && (
                <p className="text-sm text-[var(--brikii-text-muted)]">Aucune coordonnée renseignée.</p>
              )}
            </div>
          </Section>
        </Card>

        {/* Notes */}
        {contact.notes && (
          <Card>
            <Section title="Notes">
              <p className="text-sm text-[var(--brikii-text)] whitespace-pre-wrap leading-relaxed">
                {contact.notes}
              </p>
            </Section>
          </Card>
        )}

      </div>

      {/* ─── DROITE : rôles, biens, historique ─── */}
      <div className="flex flex-col gap-5">

        {/* Types / rôles */}
        <Card>
          <Section title="Types de contact">
            {allTypes.length === 0 ? (
              <p className="text-sm text-[var(--brikii-text-muted)]">Aucun type renseigné.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {allTypes.map(t => (
                  <BrikiiBadge key={t} variant="neutral">
                    {TYPE_LABELS[t] ?? t}
                  </BrikiiBadge>
                ))}
              </div>
            )}
          </Section>
        </Card>

        {/* Biens liés */}
        <Card>
          <Section title="Biens liés">
            {biens.length === 0 ? (
              <p className="text-sm text-[var(--brikii-text-muted)]">Aucun bien associé.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {biens.map(cb => {
                  const b = cb.bien
                  if (!b) return null
                  const statutCfg = b.statut ? BIEN_STATUT_CONFIG[b.statut] : null
                  return (
                    <Link
                      key={cb.id}
                      href={`/biens/${b.id}`}
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--brikii-bg-subtle)] transition-colors"
                      style={{ border: '1px solid var(--brikii-border)', borderRadius: 'var(--brikii-radius-input)' }}
                    >
                      <Home className="w-4 h-4 text-[var(--brikii-text-muted)] flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--brikii-text)] truncate">
                          {b.reference ?? (b.type ? BIEN_TYPE_LABELS[b.type] ?? b.type : '—')}
                          {b.ville && <span className="font-normal text-[var(--brikii-text-muted)]"> · {b.ville}</span>}
                        </p>
                        <p className="text-xs text-[var(--brikii-text-muted)]">
                          {TYPE_LABELS[cb.role] ?? cb.role}
                        </p>
                      </div>
                      {statutCfg && (
                        <BrikiiBadge variant={statutCfg.variant}>{statutCfg.label}</BrikiiBadge>
                      )}
                    </Link>
                  )
                })}
              </div>
            )}
          </Section>
        </Card>

        {/* Interactions */}
        <Card>
          <Section title="Historique des interactions">
            {interactions.length === 0 ? (
              <p className="text-sm text-[var(--brikii-text-muted)]">Aucune interaction enregistrée.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {interactions.map(inter => (
                  <div
                    key={inter.id}
                    className="flex gap-3 px-3 py-2.5"
                    style={{ border: '1px solid var(--brikii-border)', borderRadius: 'var(--brikii-radius-input)' }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-[var(--brikii-text-muted)] uppercase tracking-wide">
                          {INTERACTION_LABELS[inter.type] ?? inter.type}
                        </span>
                        {inter.titre && (
                          <span className="text-sm text-[var(--brikii-text)] truncate">{inter.titre}</span>
                        )}
                      </div>
                      {inter.contenu && (
                        <p className="text-xs text-[var(--brikii-text-muted)] mt-0.5 line-clamp-2">
                          {inter.contenu}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-[var(--brikii-text-muted)] flex-shrink-0 mt-0.5">
                      {formatDateShort(inter.date_inter ?? inter.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </Card>

        {/* Méta */}
        <p className="text-xs text-[var(--brikii-text-muted)] px-1">
          Contact créé le {formatDate(contact.created_at)}
          {contact.origine && ` · ${contact.origine.replace(/_/g, ' ')}`}
        </p>

      </div>
    </div>
  )
}
