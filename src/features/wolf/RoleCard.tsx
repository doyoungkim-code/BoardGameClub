import { CARD_BACK, ROLE_CARD, TEAM_COLOR } from '@/games/wolf/cardArt'
import { ROLES, type RoleId } from '@/games/wolf/roles'
import { PixelSprite } from '@/pixel/PixelSprite'
import { cn } from '@/lib/utils'

/** 역할 카드 그림 (64×64 도트를 정수배로 키운다). 테두리는 팀 색 */
export function RoleArt({ role, size = 64, className }: { role: RoleId; size?: 32 | 64 | 128 | 192; className?: string }) {
  return (
    <img
      src={ROLE_CARD[role]}
      alt={ROLES[role].name}
      width={size}
      height={size}
      className={cn('pixel-crisp shrink-0 border-2', className)}
      style={{ borderColor: TEAM_COLOR[ROLES[role].team], background: '#26304a', imageRendering: 'pixelated' }}
    />
  )
}

/** 카드 뒷면 */
export function CardBack({ size = 64, className }: { size?: 32 | 64 | 128; className?: string }) {
  return <PixelSprite sprite={CARD_BACK} scale={size / 16} className={className} label="카드 뒷면" />
}

/** 크게 보여 주는 내 카드 (이름·능력 포함) */
export function RoleCard({ role, className }: { role: RoleId; className?: string }) {
  const info = ROLES[role]
  return (
    <div className={cn('flex flex-col items-center gap-2 text-center', className)}>
      <RoleArt role={role} size={128} />
      <p className="text-lg font-bold">{info.name}</p>
      <p className="text-sm opacity-80">{info.ability}</p>
    </div>
  )
}
