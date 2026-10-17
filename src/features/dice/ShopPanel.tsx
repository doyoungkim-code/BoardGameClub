import { useState } from 'react'
import { toast } from 'sonner'
import { Check, Coins } from '@/components/icons'
import { SectionTitle } from '@/components/SectionTitle'
import { Button } from '@/components/ui/button'
import { SHOP_ITEMS, type ShopItem } from '@/data/shopItems'
import { ProfileBanner } from '@/features/home/ProfileBanner'
import type { BannerDecor } from '@/features/members/TierBanner'
import { toErrorMessage } from '@/lib/format'
import { cn } from '@/lib/utils'
import { PixelSprite } from '@/pixel/PixelSprite'
import { tileBackground } from '@/pixel/tile'
import { buyItem, equipItem } from '@/services/shop'
import { useAuth } from '@/stores/auth'

/** 코인 상점: 배너 배경 무늬·도트 소품을 사고 단다. 고르면 위의 내 배너에 미리 입혀 본다 */
export function ShopPanel() {
  const profile = useAuth((s) => s.profile)!
  const owned = new Set(profile.items ?? [])
  const coins = profile.coins ?? 0
  const equipped: BannerDecor = { background: profile.bannerBackground ?? null, prop: profile.bannerProp ?? null }
  // 미리 보기: 아무것도 안 골랐으면 지금 단 것
  const [preview, setPreview] = useState<BannerDecor | null>(null)
  const [busy, setBusy] = useState(false)

  const slot = (item: ShopItem) => (item.kind === 'background' ? 'background' : 'prop')

  const pick = (item: ShopItem) => setPreview((prev) => ({ ...(prev ?? equipped), [slot(item)]: item.id }))

  const run = async (task: () => Promise<void>, done: string) => {
    setBusy(true)
    try {
      await task()
      toast.success(done)
    } catch (error) {
      console.error('상점 처리 실패', error)
      toast.error(toErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  // 사면 바로 단다
  const buy = (item: ShopItem) =>
    run(async () => {
      await buyItem(profile.uid, item)
      await equipItem(profile.uid, item.kind, item.id)
      setPreview(null)
    }, `${item.name}을(를) 샀어요`)

  const equip = (item: ShopItem, on: boolean) =>
    run(
      async () => {
        await equipItem(profile.uid, item.kind, on ? item.id : null)
        setPreview(null)
      },
      on ? '배너에 달았어요' : '배너에서 뗐어요',
    )

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <SectionTitle count="아이템을 누르면 미리 입혀 봐요">내 배너</SectionTitle>
        <ProfileBanner preview={preview ?? equipped} />
        {preview && (
          <button type="button" className="text-xs text-muted-foreground underline" onClick={() => setPreview(null)}>
            미리 보기 그만하기
          </button>
        )}
      </section>

      {(['background', 'prop'] as const).map((kind) => (
        <section key={kind} className="space-y-2">
          <SectionTitle>{kind === 'background' ? '배너 배경 무늬' : '도트 소품'}</SectionTitle>
          <ul className="grid grid-cols-3 gap-2">
            {SHOP_ITEMS.filter((item) => item.kind === kind).map((item) => {
              const has = owned.has(item.id)
              const worn = equipped[slot(item)] === item.id
              const previewing = (preview ?? equipped)[slot(item)] === item.id
              return (
                <li key={item.id} className={cn('flex flex-col pixel-border bg-card', previewing && 'border-primary')}>
                  <button
                    type="button"
                    onClick={() => pick(item)}
                    aria-pressed={previewing}
                    aria-label={`${item.name} 미리 보기`}
                    className="flex h-16 items-center justify-center bg-background"
                    style={item.kind === 'background' ? { backgroundImage: tileBackground(item.sprite) } : undefined}
                  >
                    {item.kind === 'prop' && <PixelSprite sprite={item.sprite} scale={4} />}
                  </button>
                  <div className="space-y-1.5 border-t-2 border-border p-2 text-center">
                    <p className="flex items-center justify-center gap-1 truncate text-xs">
                      {worn && <Check className="size-3 text-primary" aria-label="배너에 단 것" />}
                      {item.name}
                    </p>
                    {has ? (
                      <Button
                        size="xs"
                        variant={worn ? 'secondary' : 'outline'}
                        className="w-full"
                        disabled={busy}
                        onClick={() => void equip(item, !worn)}
                      >
                        {worn ? '떼기' : '달기'}
                      </Button>
                    ) : (
                      <Button
                        size="xs"
                        className="w-full"
                        disabled={busy || coins < item.price}
                        onClick={() => void buy(item)}
                      >
                        <Coins />
                        {item.price}
                      </Button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
