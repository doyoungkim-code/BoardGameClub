import { useLayoutEffect, useRef, useState } from 'react'
import { SendHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MAX_MESSAGE_LENGTH } from '@/services/chat'

// 터치 기기에서는 Enter가 줄바꿈, 전송은 버튼으로
const isCoarsePointer = () => window.matchMedia('(pointer: coarse)').matches

export function Composer({ onSend }: { onSend: (text: string) => void }) {
  const [text, setText] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  // 내용에 맞춰 높이 자동 조절 (최대 약 6줄)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`
  }, [text])

  const send = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    onSend(trimmed.slice(0, MAX_MESSAGE_LENGTH))
    setText('')
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        send()
      }}
      className="pb-safe shrink-0 border-t bg-background"
    >
      <div className="flex items-end gap-2 px-3 py-2">
        <textarea
          ref={ref}
          rows={1}
          value={text}
          maxLength={MAX_MESSAGE_LENGTH}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // 한글 조합 중 Enter는 무시해야 마지막 글자가 따로 전송되지 않는다
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && !isCoarsePointer()) {
              e.preventDefault()
              send()
            }
          }}
          placeholder="메시지 보내기"
          aria-label="메시지"
          className="min-h-10 flex-1 resize-none rounded-2xl border bg-card px-4 py-2 text-base leading-6 outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50 md:text-sm"
        />
        <Button
          type="submit"
          size="icon"
          className="size-10 shrink-0 rounded-full"
          disabled={!text.trim()}
          // 버튼을 눌러도 입력창 포커스(모바일 키보드)가 유지되도록
          onPointerDown={(e) => e.preventDefault()}
          aria-label="보내기"
        >
          <SendHorizontal className="size-5" />
        </Button>
      </div>
    </form>
  )
}
