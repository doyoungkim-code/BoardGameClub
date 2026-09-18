import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

/**
 * public/icon.svg 로 앱 아이콘 PNG 들을 만든다: npm run icons
 * icon.svg 가 이미 배경을 꽉 채우고 그림을 안전 영역 안에 두었으므로 여백(padding)은 넣지 않는다.
 */
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    transparent: { ...minimal2023Preset.transparent, padding: 0 },
    maskable: { ...minimal2023Preset.maskable, padding: 0 },
    apple: { ...minimal2023Preset.apple, padding: 0 },
  },
  images: ['public/icon.svg'],
})
