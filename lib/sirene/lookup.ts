const SIRENE_BASE = 'https://api.insee.fr/entreprises/sirene/V3.11'
const NAF_IMMOBILIER = ['6820A', '6820B', '6831Z', '6832A', '6832B']

export interface SireneAgence {
  siret:    string
  nom:      string
  ville:    string | null
  codeNaf:  string
  adresse:  string | null
  source:   'sirene'
}

function getToken(): string | null {
  return process.env.SIRENE_API_TOKEN ?? null
}

function headers(): HeadersInit {
  const token = getToken()
  if (!token) throw new Error('SIRENE_API_TOKEN manquant')
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  }
}

function normalizeEtablissement(e: Record<string, unknown>): SireneAgence {
  const ul = e.uniteLegale as Record<string, unknown> | undefined
  const adresseObj = e.adresseEtablissement as Record<string, unknown> | undefined

  const nom =
    (ul?.denominationUniteLegale as string) ||
    `${ul?.prenomUsuelUniteLegale ?? ''} ${ul?.nomUniteLegale ?? ''}`.trim()

  const ville = (adresseObj?.libelleCommuneEtablissement as string) ?? null
  const codeNaf = (ul?.activitePrincipaleUniteLegale as string) ?? ''
  const voie = [
    adresseObj?.numeroVoieEtablissement,
    adresseObj?.typeVoieEtablissement,
    adresseObj?.libelleVoieEtablissement,
  ]
    .filter(Boolean)
    .join(' ')

  return {
    siret:   e.siret as string,
    nom,
    ville,
    codeNaf,
    adresse: voie || null,
    source:  'sirene',
  }
}

export async function lookupSiret(siret: string): Promise<SireneAgence | null> {
  try {
    const res = await fetch(`${SIRENE_BASE}/siret/${siret}`, {
      headers: headers(),
      next: { revalidate: 3600 },
    })
    if (res.status === 404) return null
    if (!res.ok) return null

    const data = await res.json()
    const etablissement = data.etablissement as Record<string, unknown>
    return normalizeEtablissement(etablissement)
  } catch {
    return null
  }
}

export async function searchAgences(query: string): Promise<SireneAgence[]> {
  try {
    const nafFilter = NAF_IMMOBILIER.map(c => `activitePrincipaleUniteLegale:${c}`).join(' OR ')
    const q = encodeURIComponent(
      `denominationUniteLegale:*${query}* AND (${nafFilter})`
    )

    const res = await fetch(
      `${SIRENE_BASE}/siret?q=${q}&nombre=10&champs=siret,uniteLegale,adresseEtablissement`,
      { headers: headers() }
    )
    if (!res.ok) return []

    const data = await res.json()
    const etablissements = (data.etablissements ?? []) as Record<string, unknown>[]
    return etablissements.map(normalizeEtablissement)
  } catch {
    return []
  }
}

export function isNafImmobilier(codeNaf: string): boolean {
  return NAF_IMMOBILIER.includes(codeNaf)
}
