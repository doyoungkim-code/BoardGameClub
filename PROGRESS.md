# 진행 기록 & 개발 가이드

> 마지막 업데이트: 2026-09-13
> 기획 전체는 [PLANNING.md](PLANNING.md), 이 문서는 "어디까지 했고 다음에 뭘 하는지"와 "개발 환경 세팅"을 기록한다.

## 1. 진행 상황

| 단계 | 내용 | 상태 | 커밋 |
|---|---|---|---|
| 1 | 셋업: Vite + React + TS, Tailwind + shadcn/ui, Firebase 연결, 기본 레이아웃 | ✅ 완료 | `f4cc3a6` |
| 2 | 구글 로그인, 가입 신청(닉네임·소개자), 오너 승인, 내 정보, users 규칙 | ✅ 완료 (실제 Firebase에서 동작 확인) | `702e06e` |
| 3 | 채널 단체채팅, 1:1 DM, 안 읽음 배지, 브라우저 알림 | ✅ 구현 완료 · ⚠️ 브라우저 실사용 확인 전 | `6813fb5` |
| 4 | 모임/일정 | ⏳ 다음 차례 | |
| 5 | 보드게임 라이브러리 + 플레이 기록 + 통계 | | |
| 6 | 게시판/공지 | | |
| 7 | 회원관리/관리자 (회원 목록·프로필, 활동 통계, 강퇴, 관리자 메모) | | |
| 8 | GitHub Actions 자동 배포 | | |

- Firestore 보안 규칙은 **3단계까지 실제 프로젝트(`doyou-boardgame`)에 배포 완료**
- 아직 Hosting 배포는 안 함 (8단계에서 GitHub Actions로)
- 규칙 테스트 61개 통과 (users 34 + chat 27)

## 2. 다음에 할 일

1. **3단계 채팅 실사용 확인**
   - 오너 계정: 채팅 탭 → "기본 채널 만들기" → 메시지 보내기
   - 다른 계정(또는 휴대폰): 실시간 수신, 안 읽음 배지, DM 시작, 메시지 삭제
   - 모바일 화면에서 키보드가 올라올 때 입력창 위치 확인
2. **4단계 모임/일정** (PLANNING.md 5장 `events`, 6장 `/events`)
   - 정기모임은 오너만, 번개는 모든 회원이 생성
   - 캘린더·리스트 전환, 참석 신청(정원 초과를 rules로 차단), 출석 체크(호스트·오너)
   - 홈 "다가오는 모임" 카드 연결
   - rules + 테스트 먼저 작성 → 규칙 배포 → 화면
3. 이후 PLANNING.md 10장 순서대로 5 → 8단계

### 나중에 손볼 것
- 채널을 삭제해도 하위 메시지 문서는 남음 (화면에서는 안 보임). 필요하면 Blaze 전환 후 정리
- 닉네임 중복 방지 없음
- 로그아웃 시 오프라인 캐시(IndexedDB)를 지우지 않음. 공용 PC 사용이 문제되면 추가

## 3. 새 컴퓨터에서 이어서 하기

### 필요한 프로그램
- **Node.js 22 이상** (지금까지 v24 사용)
- **Git**
- **Java 21 이상**: Firestore 에뮬레이터·규칙 테스트에 필요. 앱 실행(`npm run dev`)만 할 거면 없어도 됨

### 세팅 순서
```powershell
git clone https://github.com/doyoungkim-code/BoardGameClub.git
cd BoardGameClub
npm install
copy .env.example .env.local
```

1. `.env.local`에 Firebase 웹 설정값 입력
   - 위치: [Firebase 콘솔](https://console.firebase.google.com/project/doyou-boardgame/settings/general) → 프로젝트 설정 → 일반 → 내 앱(web) → `firebaseConfig`
   - 이 파일은 git에 올리지 않음(`.gitignore`)
2. `npx firebase login` → **kwat09k@gmail.com** 으로 로그인 (규칙 배포할 때 필요)
3. `npm run dev` → http://localhost:5173

## 4. 명령어

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 (실제 Firebase 프로젝트에 연결) |
| `npm run build` | 타입체크 + 프로덕션 빌드 |
| `npm run lint` | oxlint |
| `npm run test:rules` | Firestore 에뮬레이터를 띄워 `tests/rules` 보안 규칙 테스트 (Java 21 필요) |
| `npm run emulators` | Auth/Firestore 에뮬레이터 + UI(http://localhost:4000). 데이터는 `.emulator-data/`에 저장 |
| `npm run dev:emu` | 에뮬레이터에 연결된 개발 서버 (실제 DB에 영향 없음) |
| `npx firebase deploy --only firestore:rules` | 보안 규칙을 실제 프로젝트에 배포 |

### 에뮬레이터로 테스트
- 터미널 1: `npm run emulators`, 터미널 2: `npm run dev:emu`
- 로그인 창에서 "Add new account"로 가짜 계정 생성. 이메일을 `kwat09k@gmail.com`으로 하면 오너

### Java 버전이 여러 개일 때
PATH에 낮은 버전(17 등)이 먼저 잡혀 있으면 에뮬레이터가 실행되지 않는다. 그 터미널에서만 21을 지정:
```powershell
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-21.0.12.101-hotspot"   # 설치 경로는 PC마다 다름
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
```

## 5. 작업 규칙 & 주의사항

### 보안 규칙
- 서버 코드가 없으므로(Spark 요금제) **권한 검증은 전부 `firestore.rules`**
- 규칙을 고칠 때 순서: `tests/rules`에 테스트 추가 → `npm run test:rules` 통과 → `npx firebase deploy --only firestore:rules`
- 오너 이메일은 **두 곳**에 있음: `firestore.rules`의 `isOwner()`, `src/lib/constants.ts`의 `OWNER_EMAIL`

### 코드 구조
```
src/
  services/     Firestore 읽기·쓰기 함수 (컬렉션별: users, chat ...)
  stores/       zustand 전역 상태 + 앱 전체에서 한 번만 하는 실시간 구독 (auth, members, chat)
  hooks/        여러 화면에서 쓰는 훅 (useUnreadCount, useChatNotifications)
  features/     기능별 화면 (auth, home, chat, me, admin ...)
  features/lazyPages.ts   화면별 코드 분할(React.lazy) 목록. 새 기능 화면은 여기에 추가
  components/layout/      AppShell(PC 사이드바/모바일 하단 탭), AuthGate(로그인·승인 가드), nav, routeHandle
  components/ui/          shadcn 컴포넌트
tests/rules/    보안 규칙 테스트
```
- 라우트 `handle`: `{ layout: 'chat' }` = 여백 없이 화면 꽉 채움, `{ immersive: true }` = 모바일에서 헤더·하단 탭 숨김
- 무료 한도(읽기 5만/일) 때문에 실시간 구독은 꼭 필요한 곳만. 회원 목록·채팅 목록은 `stores`에서 한 번만 구독해 공유

### 알려진 함정
- **shadcn 컴포넌트 추가 시** `import { cn } from "cn"`으로 잘못 생성되고 `cn` 패키지가 설치됨
  → `@/lib/utils`로 고치고 `npm uninstall cn`
- **Windows PowerShell에서 `git commit -m "..."`** 메시지 안에 큰따옴표가 있으면 인자가 깨짐 → 메시지를 파일로 저장해 `git commit -F 파일`
- shadcn 컴포넌트는 `oxlint` 검사에서 제외됨 (`.oxlintrc.json`)

## 6. 구현하면서 정한 것 (기획서 보충)
- **이메일 분리:** 이메일은 `users`가 아니라 `userPrivate/{uid}`에 저장 (본인·오너만 읽음)
- **소개자 연결:** 가입 신청 때는 이름(`referrerName`)만 입력하고, 오너가 승인할 때 실제 회원(`referrerId`)과 연결
- **채팅 메시지 삭제:** 문서를 지우지 않고 `deleted: true, text: ''`로 표시만 함
- **DM 방 ID:** 두 uid를 정렬해 `_`로 연결. DM 목록에는 메시지를 주고받은 방만 표시
- **안 읽음 기준:** 다른 사람의 마지막 메시지 시각 > 내 `readStates` 시각. 읽은 기록이 없으면 가입 승인 시각을 기준으로 함
- **채널 관리 위치:** 관리자 화면이 아니라 채팅 화면에서 오너가 직접 함
