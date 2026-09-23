import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { useMoreItems } from '@/components/layout/nav'
import { PageHeader } from '@/components/PageHeader'
import { tappableRow } from '@/lib/styles'
import { cn } from '@/lib/utils'

export function MorePage() {
  const items = useMoreItems()

  return (
    <div className="space-y-6">
      <PageHeader title="더보기" />
      <ul className="divide-y overflow-hidden rounded-xl border bg-card">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <Link to={to} className={cn('flex items-center gap-3 px-4 py-3.5', tappableRow)}>
              <Icon className="size-5 text-primary" />
              <span className="flex-1">{label}</span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
