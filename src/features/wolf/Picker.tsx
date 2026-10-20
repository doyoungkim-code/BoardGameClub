import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { CardBack } from '@/features/wolf/RoleCard'
import { cn } from '@/lib/utils'

/**
 * 밤에 카드 고르기. 진짜 행동이든 가짜 선택이든 똑같은 모양이라, 옆 사람이 봐도 누가 무슨 역할인지 모른다.
 * player1: 남 1명 / player2: 남 2명 / center1: 가운데 1장 / seer: 남 1명 또는 가운데 2장 / any1: 아무거나 1장(가짜 선택)
 */
export type PickMode = 'player1' | 'player2' | 'center1' | 'seer' | 'any1'

type Props = {
  mode: PickMode
  names: string[]
  mySeat: number
  disabled?: boolean
  onConfirm: (targets: number[]) => void
}

export function Picker({ mode, names, mySeat, disabled, onConfirm }: Props) {
  const [picked, setPicked] = useState<number[]>([])
  const n = names.length
  const isCenter = (p: number) => p >= n

  const playersOk = mode !== 'center1'
  const centerOk = mode === 'center1' || mode === 'seer' || mode === 'any1'

  // 고를 수 없는 카드도 흐리게 하지 않는다 (가짜 선택과 똑같아 보이게). 누르면 그냥 무시
  const toggle = (p: number) => {
    if (disabled || (isCenter(p) ? !centerOk : !playersOk)) return
    setPicked((prev) => {
      if (prev.includes(p)) return prev.filter((x) => x !== p)
      switch (mode) {
        case 'player1':
        case 'center1':
        case 'any1':
          return [p]
        case 'player2':
          return prev.length >= 2 ? [prev[1], p] : [...prev, p]
        case 'seer':
          // 남 1명이거나 가운데 2장: 종류가 바뀌면 새로 고른다
          if (!isCenter(p)) return [p]
          return prev.some((x) => !isCenter(x)) ? [p] : prev.length >= 2 ? [prev[1], p] : [...prev, p]
      }
    })
  }

  const valid =
    mode === 'player2' ? picked.length === 2 : mode === 'seer' ? (picked.length === 1 && !isCenter(picked[0])) || picked.length === 2 : picked.length === 1

  return (
    <div className="space-y-4">
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {names.map((name, seat) =>
          seat === mySeat ? null : (
            <li key={seat}>
              <Tile on={picked.includes(seat)} disabled={disabled} onClick={() => toggle(seat)}>
                <CardBack size={32} />
                <span className="w-full truncate text-xs">{name}</span>
              </Tile>
            </li>
          ),
        )}
      </ul>
      <ul className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <li key={i}>
            <Tile on={picked.includes(n + i)} disabled={disabled} onClick={() => toggle(n + i)}>
              <CardBack size={32} />
              <span className="text-xs">가운데 {i + 1}</span>
            </Tile>
          </li>
        ))}
      </ul>
      <Button className="w-full" disabled={disabled || !valid} onClick={() => onConfirm(picked)}>
        확인
      </Button>
    </div>
  )
}

function Tile({ on, disabled, onClick, children }: { on: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        'flex w-full flex-col items-center gap-1 border-2 p-2 pixel-press disabled:opacity-40',
        on ? 'border-yellow-300 bg-white/20' : 'border-white/20 bg-white/5',
      )}
    >
      {children}
    </button>
  )
}
