import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

type Props = {
  name: string
  photoURL?: string | null
  className?: string
}

export function UserAvatar({ name, photoURL, className }: Props) {
  return (
    <Avatar className={cn('size-9', className)}>
      {/* 구글 프로필 이미지는 referrer가 붙으면 403이 나는 경우가 있다 */}
      {photoURL && <AvatarImage src={photoURL} alt={name} referrerPolicy="no-referrer" />}
      <AvatarFallback className="bg-secondary text-secondary-foreground">{name.slice(0, 1)}</AvatarFallback>
    </Avatar>
  )
}
