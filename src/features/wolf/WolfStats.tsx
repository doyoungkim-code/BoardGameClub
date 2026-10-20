import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { SectionTitle } from '@/components/SectionTitle'
import { RoleArt } from '@/features/wolf/RoleCard'
import { fetchWolfStats } from '@/services/wolf'

/** 프로필의 "한밤의 늑대 N판 M승" (한 판도 안 했으면 안 보인다) */
export function WolfStats({ uid }: { uid: string }) {
  const [stats, setStats] = useState<{ uid: string; played: number; won: number } | null>(null)

  useEffect(() => {
    let canceled = false
    fetchWolfStats(uid)
      .then((s) => {
        if (!canceled) setStats({ uid, ...s })
      })
      .catch((error) => console.error('한밤의 늑대 전적 불러오기 실패', error))
    return () => {
      canceled = true
    }
  }, [uid])

  if (!stats || stats.uid !== uid || stats.played === 0) return null
  return (
    <section className="space-y-2">
      <SectionTitle>보드게임 전적</SectionTitle>
      <Link to="/wolf" className="flex items-center gap-3 border-2 border-border bg-card p-3">
        <RoleArt role="werewolf" size={32} />
        <span className="flex-1 font-bold">한밤의 늑대</span>
        <span className="text-sm">
          {stats.played}판 {stats.won}승
        </span>
      </Link>
    </section>
  )
}
