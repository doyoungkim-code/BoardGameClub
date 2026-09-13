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

PATH에 더 낮은 버전의 Java가 먼저 잡혀 있으면, 해당 터미널에서 Java 21을 먼저 지정한다.

```powershell
# PowerShell 예시 (설치 경로는 PC마다 다름)
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-21.0.12.101-hotspot"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
```

```bash
npm run emulators   # 터미널 1: Auth/Firestore 에뮬레이터 + UI(http://localhost:4000)
npm run dev:emu     # 터미널 2: 에뮬레이터에 연결된 앱
```

에뮬레이터의 구글 로그인 창에서 "Add new account"로 가짜 계정을 만들 수 있다.
오너로 테스트하려면 이메일을 `kwat09k@gmail.com`으로 입력한다.

## 보안 규칙 테스트

```bash
npm run test:rules  # Firestore 에뮬레이터를 띄워 tests/rules 실행 (Java 21 필요)
```

`firestore.rules`를 고치면 반드시 테스트를 함께 추가·실행한다.

## 스크립트

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 (실제 Firebase 프로젝트 연결) |
| `npm run dev:emu` | 개발 서버 (로컬 에뮬레이터 연결) |
| `npm run emulators` | Firebase 에뮬레이터 실행, 종료 시 데이터 `.emulator-data/`에 저장 |
| `npm run build` | 타입체크 + 프로덕션 빌드 |
| `npm run lint` | oxlint |
| `npm run test:rules` | Firestore 보안 규칙 테스트 |

## 폴더 구조

```
src/
  lib/            firebase 초기화, 상수, 유틸
  components/ui/  shadcn 컴포넌트 (npx shadcn@latest add <name>)
  components/layout/  AppShell(PC 사이드바 / 모바일 하단 탭)
  features/       기능별 화면
firestore.rules   Firestore 보안 규칙 (권한 검증은 전부 여기서)
```
