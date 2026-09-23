import { Badge } from '@/components/ui/badge'
import { CATEGORY_LABEL, type PostCategory } from '@/types/post'

/** 글 제목 앞에 붙는 카테고리 태그. 공지는 눈에 띄게 */
export function CategoryTag({ category }: { category: PostCategory }) {
  return (
    <Badge variant={category === 'notice' ? 'default' : 'secondary'} className="shrink-0 font-normal">
      {CATEGORY_LABEL[category]}
    </Badge>
  )
}
