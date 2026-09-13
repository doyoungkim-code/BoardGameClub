import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { MORE_ITEMS } from '@/components/layout/nav'

export function MorePage() {
  // TODO(2단계): 오너 여부에 따라 ownerOnly 메뉴 노출
  const items = MORE_ITEMS.filter((item) => !item.ownerOnly)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">더보기</h1>
      <ul className="divide-y overflow-hidden rounded-xl border bg-card">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <Link to={to} className="flex items-center gap-3 px-4 py-3.5 active:bg-muted">
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
