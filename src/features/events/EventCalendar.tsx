import { useMemo } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ko } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { dayKey } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ClubEvent } from '@/types/event'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

type Props = {
  month: Date
  onMonthChange: (month: Date) => void
  selected: Date
  onSelect: (date: Date) => void
  /** dayKey → 그 날 모임 */
  eventsByDay: Map<string, ClubEvent[]>
}

/**
 * 모임이 있는 날에 점을 찍는 월 달력.
 * react-day-picker 없이 date-fns 만으로 그린다 (표시 항목이 단순해서 의존성을 늘리지 않음).
 */
export function EventCalendar({ month, onMonthChange, selected, onSelect, eventsByDay }: Props) {
  const days = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(month)),
        end: endOfWeek(endOfMonth(month)),
      }),
    [month],
  )

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => onMonthChange(addMonths(month, -1))} aria-label="이전 달">
          <ChevronLeft className="size-4" />
        </Button>
        <p className="font-semibold">{format(month, 'yyyy년 M월', { locale: ko })}</p>
        <Button variant="ghost" size="icon" onClick={() => onMonthChange(addMonths(month, 1))} aria-label="다음 달">
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 text-center text-xs text-muted-foreground">
        {WEEKDAYS.map((label) => (
          <div key={label} className="py-1">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {days.map((day) => {
          const events = eventsByDay.get(dayKey(day)) ?? []
          const outside = !isSameMonth(day, month)
          const isSelected = isSameDay(day, selected)
          return (
            <button
              key={day.getTime()}
              type="button"
              onClick={() => onSelect(day)}
              aria-pressed={isSelected}
              aria-label={`${format(day, 'M월 d일', { locale: ko })} 모임 ${events.length}개`}
              className={cn(
                'mx-auto flex size-10 flex-col items-center justify-center rounded-lg text-sm transition-colors hover:bg-accent',
                outside && 'text-muted-foreground/50',
                isToday(day) && !isSelected && 'font-bold text-primary',
                isSelected && 'bg-primary font-semibold text-primary-foreground hover:bg-primary',
              )}
            >
              {day.getDate()}
              <span className="flex h-1.5 items-center gap-0.5">
                {events.slice(0, 3).map((event) => (
                  <span
                    key={event.id}
                    className={cn(
                      'size-1 rounded-full',
                      isSelected ? 'bg-primary-foreground' : event.canceled ? 'bg-muted-foreground/40' : 'bg-primary',
                    )}
                  />
                ))}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
