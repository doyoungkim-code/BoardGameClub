import type { Sprite } from '@/pixel/draw'

/**
 * 코인 상점 아이템 (프로필 배너 꾸미기). **가격을 바꾸면 firestore.rules 의 itemPrices() 도 같이 바꾼다**
 * (규칙이 같은 가격표로 '정확히 그만큼 코인이 빠졌는지' 검사한다).
 * id 는 회원 문서에 저장되므로 한 번 정하면 바꾸지 않는다. 배경은 'bg-', 소품은 'prop-' 로 시작해야 한다(규칙이 검사).
 *
 * - 배경 무늬: 8×8 칸 무늬를 배너 바탕에 반복해서 깐다 (한 칸 = 2px). 글자가 읽히도록 옅은 반투명 색만 쓴다
 * - 도트 소품: 배너 오른쪽 위에 올려 두는 작은 도트 그림 (한 칸 = 3px)
 */

export type ItemKind = 'background' | 'prop'

export type ShopItem = {
  id: string
  kind: ItemKind
  name: string
  price: number
  /** 배경: 반복 무늬 한 장, 소품: 그림 */
  sprite: Sprite
}

const OUTLINE = '#2a1d14'

const BACKGROUNDS: ShopItem[] = [
  {
    id: 'bg-checker',
    kind: 'background',
    name: '체크판',
    price: 30,
    sprite: {
      rows: ['aaaa....', 'aaaa....', 'aaaa....', 'aaaa....', '....aaaa', '....aaaa', '....aaaa', '....aaaa'],
      colors: { a: 'rgba(42, 29, 20, 0.10)' },
    },
  },
  {
    id: 'bg-pips',
    kind: 'background',
    name: '주사위 눈',
    price: 30,
    sprite: {
      rows: ['pp......', 'pp......', '........', '........', '....pp..', '....pp..', '........', '........'],
      colors: { p: 'rgba(120, 53, 15, 0.22)' },
    },
  },
  {
    id: 'bg-bricks',
    kind: 'background',
    name: '벽돌',
    price: 40,
    sprite: {
      rows: ['kkkkkkkk', '...k....', '...k....', '...k....', 'kkkkkkkk', '.......k', '.......k', '.......k'],
      colors: { k: 'rgba(42, 29, 20, 0.14)' },
    },
  },
  {
    id: 'bg-waves',
    kind: 'background',
    name: '물결',
    price: 40,
    sprite: {
      rows: ['........', '.bb.....', 'b..b...b', '....bbb.', '........', '.....bb.', '.b..b..b', 'b.bb....'],
      colors: { b: 'rgba(59, 111, 214, 0.22)' },
    },
  },
  {
    id: 'bg-wood',
    kind: 'background',
    name: '나뭇결',
    price: 50,
    sprite: {
      rows: ['gggggggg', '........', '..gggg..', '........', 'hhhhhhhh', '........', 'gg....gg', '........'],
      colors: { g: 'rgba(122, 75, 42, 0.16)', h: 'rgba(122, 75, 42, 0.08)' },
    },
  },
  {
    id: 'bg-stars',
    kind: 'background',
    name: '별빛',
    price: 60,
    sprite: {
      rows: ['........', '..y.....', '.yyy....', '..y.....', '......s.', '........', '....s...', '........'],
      colors: { y: 'rgba(224, 160, 20, 0.45)', s: 'rgba(224, 160, 20, 0.30)' },
    },
  },
]

const PROPS: ShopItem[] = [
  {
    id: 'prop-coffee',
    kind: 'prop',
    name: '커피 한 잔',
    price: 20,
    sprite: {
      rows: [
        '..s...s...',
        '...s...s..',
        '.######...',
        '#cccccc#..',
        '#wwwwww###',
        '#wwwwww#.#',
        '#wwwwww#.#',
        '#wwwwww###',
        '.#wwww#...',
        '..####....',
      ],
      colors: { '#': OUTLINE, c: '#4a2c1a', w: '#fbf8f1', s: '#b8a99a' },
    },
  },
  {
    id: 'prop-meeple',
    kind: 'prop',
    name: '빨간 미플',
    price: 30,
    sprite: {
      rows: [
        '....##....',
        '...#rr#...',
        '...#rr#...',
        '.###rr###.',
        '#rrrrrrrr#',
        '.###rr###.',
        '...#rr#...',
        '..#rrrr#..',
        '.#rr##rr#.',
        '.#r#..#r#.',
        '.##....##.',
      ],
      colors: { '#': OUTLINE, r: '#d64545' },
    },
  },
  {
    id: 'prop-cards',
    kind: 'prop',
    name: '하트 카드',
    price: 40,
    sprite: {
      rows: [
        '#########',
        '#wwwwwww#',
        '#wrrwrrw#',
        '#rrrrrrr#',
        '#wrrrrrw#',
        '#wwrrrww#',
        '#wwwrwww#',
        '#wwwwwww#',
        '#wwwwwww#',
        '#########',
      ],
      colors: { '#': OUTLINE, w: '#fbf8f1', r: '#d64545' },
    },
  },
  {
    id: 'prop-hourglass',
    kind: 'prop',
    name: '모래시계',
    price: 50,
    sprite: {
      rows: [
        '#########',
        '.#sssss#.',
        '.#sssss#.',
        '..#sss#..',
        '...#s#...',
        '...#s#...',
        '..#wsw#..',
        '.#wwsww#.',
        '.#wsssw#.',
        '#########',
      ],
      colors: { '#': '#7a4b2a', s: '#e0b02c', w: '#e9f2f7' },
    },
  },
  {
    id: 'prop-cat',
    kind: 'prop',
    name: '카페 고양이',
    price: 60,
    sprite: {
      rows: [
        '.#......#.',
        '#k#....#k#',
        '#kk####kk#',
        '#kkkkkkkk#',
        '#kykkkkyk#',
        '#kkkppkkk#',
        '.#kkkkkk#.',
        '.#kkkkkk#.',
        '#kkkkkkkk#',
        '#kkkkkkkk#',
        '.########.',
      ],
      colors: { '#': '#111114', k: '#3a3a44', y: '#f2c94c', p: '#e58fa0' },
    },
  },
  {
    id: 'prop-crown',
    kind: 'prop',
    name: '황금 왕관',
    price: 100,
    sprite: {
      rows: ['y....y....y', 'yy..yyy..yy', 'yyy.yyy.yyy', 'yyyyyyyyyyy', 'yryyybyyyry', 'yyyyyyyyyyy', '###########'],
      colors: { y: '#facc15', r: '#d64545', b: '#3b6fd6', '#': '#a16207' },
    },
  },
]

export const SHOP_ITEMS: ShopItem[] = [...BACKGROUNDS, ...PROPS]

export const ITEM_BY_ID: Record<string, ShopItem> = Object.fromEntries(SHOP_ITEMS.map((item) => [item.id, item]))
