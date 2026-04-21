'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Building2,
  FileText,
  Users,
  MapPin,
  Bell,
  Settings,
  ChevronRight,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard',      label: 'Tableau de bord', icon: Home },
  { href: '/biens',          label: 'Mes biens',        icon: Building2 },
  { href: '/mandats',        label: 'Mandats',          icon: FileText },
  { href: '/pass-adresses',  label: "Pass'Adresses",    icon: MapPin },
  { href: '/contacts',       label: 'Contacts',         icon: Users },
]

interface UserProfile {
  prenom:      string | null
  nom:         string | null
  avatar_url?: string | null
}

interface PageLayoutProps {
  children: React.ReactNode
  profile?: UserProfile | null
}

export function PageLayout({ children, profile }: PageLayoutProps) {
  const pathname = usePathname()

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--brikii-bg-subtle)]">
      {/* Sidebar */}
      <aside
        className="flex flex-col shrink-0 bg-[var(--brikii-dark)] text-white overflow-y-auto"
        style={{ width: 'var(--brikii-sidebar-w)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-5 py-4 border-b border-white/10">
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--brikii-dark)] font-bold text-sm"
            style={{ background: 'var(--brikii-yellow)' }}
          >
            B
          </span>
          <span className="font-semibold text-sm tracking-wide">Brikii</span>
        </div>

        {/* User info */}
        {profile && (
          <div className="px-5 py-3 border-b border-white/10">
            <p className="text-xs font-medium text-white truncate">
              {[profile.prenom, profile.nom].filter(Boolean).join(' ') || '—'}
            </p>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={[
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                  active
                    ? 'bg-white/10 text-white font-medium'
                    : 'text-white/60 hover:bg-white/5 hover:text-white',
                ].join(' ')}
              >
                <Icon size={16} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-4 border-t border-white/10 space-y-0.5">
          <Link
            href="/notifications"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/60 hover:bg-white/5 hover:text-white transition-colors"
          >
            <Bell size={16} />
            Notifications
          </Link>
          <Link
            href="/settings"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/60 hover:bg-white/5 hover:text-white transition-colors"
          >
            <Settings size={16} />
            Paramètres
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

/* Breadcrumb utilitaire */
interface BreadcrumbProps {
  items: { label: string; href?: string }[]
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1 text-xs text-[var(--brikii-text-muted)] mb-4">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight size={12} />}
          {item.href ? (
            <Link href={item.href} className="hover:text-[var(--brikii-text)] transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-[var(--brikii-text)]">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
