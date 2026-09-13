# Do you 보드게임?

보드게임 동호회 전용 웹앱. 기획은 [PLANNING.md](PLANNING.md) 참고.

- React + Vite + TypeScript, Tailwind CSS + shadcn/ui
- Firebase (Spark 요금제): Authentication(Google), Firestore, Hosting

## 로컬 실행

필요: Node.js 22 이상

```bash
npm install
cp .env.example .env.local   # Firebase 콘솔의 firebaseConfig 값 입력
npm run dev                  # http://localhost:5173
```

### 에뮬레이터로 실행 (실제 Firebase 데이터에 영향 없음)

필요: Java 21 이상 (Firestore 에뮬레이터 요구사항)

```bash
npm run emulators   # 터미널 1: Auth/Firestore 에뮬레이터 + UI(http://localhost:4000)
npm run dev:emu     # 터미널 2: 에뮬레이터에 연결된 앱
```

## 스크립트

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 (실제 Firebase 프로젝트 연결) |
| `npm run dev:emu` | 개발 서버 (로컬 에뮬레이터 연결) |
| `npm run emulators` | Firebase 에뮬레이터 실행, 종료 시 데이터 `.emulator-data/`에 저장 |
| `npm run build` | 타입체크 + 프로덕션 빌드 |
| `npm run lint` | oxlint |

## 폴더 구조

```
src/
  lib/            firebase 초기화, 상수, 유틸
  components/ui/  shadcn 컴포넌트 (npx shadcn@latest add <name>)
  components/layout/  AppShell(PC 사이드바 / 모바일 하단 탭)
  features/       기능별 화면
firestore.rules   Firestore 보안 규칙 (권한 검증은 전부 여기서)
```
