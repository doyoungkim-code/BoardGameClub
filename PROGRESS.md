# 진행 기록 & 개발 가이드

> 마지막 업데이트: 2026-09-14 (6~8단계까지 구현 완료)
> 기획 전체는 [PLANNING.md](PLANNING.md), 이 문서는 "어디까지 했고 다음에 뭘 하는지"와 "개발 환경 세팅"을 기록한다.

## 1. 진행 상황

| 단계 | 내용 | 상태 | 커밋 |
|---|---|---|---|
| 1 | 셋업: Vite + React + TS, Tailwind + shadcn/ui, Firebase 연결, 기본 레이아웃 | ✅ 완료 | `f4cc3a6` |
| 2 | 구글 로그인, 가입 신청(닉네임·소개자), 오너 승인, 내 정보, users 규칙 | ✅ 완료 (실제 Firebase에서 동작 확인) | `702e06e` |
| 3 | 채널 단체채팅, 1:1 DM, 안 읽음 배지, 브라우저 알림 | ✅ 구현 완료 · ⚠️ 브라우저 실사용 확인 전 | `6813fb5` |
| 4 | 모임/일정: 정기모임·번개, 캘린더, 참석 신청, 출석 체크 | ✅ 구현 완료 · ⚠️ 브라우저 실사용 확인 전 | `b6f9666` |
| 5 | 보드게임 라이브러리 + 통계 (플레이 기록은 제외) | ✅ 구현 완료 · ⚠️ 실사용 확인 전 | `97ee769` |
| 6 | 게시판/공지: 공지·자유·후기, 댓글, 좋아요, 고정 | ✅ 구현 완료 · ⚠️ 실사용 확인 전 | |
| 7 | 회원관리/관리자: 회원 목록·프로필, 활동 통계, 강퇴, 관리자 메모 | ✅ 구현 완료 · ⚠️ 실사용 확인 전 | |
| 8 | GitHub Actions 자동 배포 | 🔶 워크플로 작성 완료 · **시크릿 등록 필요** | |

- Firestore 보안 규칙은 **전 단계 실제 프로젝트(`doyou-boardgame`)에 배포 완료**
- **배포 주소: https://doyou-boardgame.web.app** — 지금은 수동(`npx firebase deploy`)
- 규칙 테스트 142개 통과 (users 34 + chat 31 + events 26 + games 23 + posts 28)
- `firestore.indexes.json`에 posts 복합 색인 1개 (board + pinned + createdAt)

## 2. 다음에 할 일

**기능 구현은 1~8단계가 모두 끝났다. 남은 건 실사용 확인과 배포 자동화 마무리.**

1. **전 기능 실사용 확인** (아직 브라우저로 돌려본 적 없음)
   - 채팅: 기본 채널 만들기 → 메시지 송수신, 안 읽음 배지, DM, 메시지 삭제 후 목록 미리보기
   - 모임: 번개 만들기, 참석 신청·취소, 정원 마감, 취소·삭제, 출석 체크(시작 시각이 지나야 보임), 캘린더
   - 게임: 등록·수정·삭제, 필터, 빌리기·반납
   - 게시판: 공지(오너만)·자유·후기 글쓰기, 댓글, 좋아요, 고정
   - 회원: 목록·프로필, DM 보내기, 관리자에서 강퇴·메모·소개자 수정
   - 모바일 화면에서 키보드가 올라올 때 채팅 입력창 위치
2. **8단계 마무리 — GitHub Secrets 등록** (아래 "자동 배포 켜기" 참고)
3. 그 뒤에는 PLANNING.md 11장 백로그 (플레이 기록, 이미지 업로드, BGG 검색, 다크모드 …)

## 2-1. 자동 배포 켜기 (8단계 남은 작업)

`.github/workflows/ci.yml`(모든 push·PR)과 `deploy.yml`(main push)은 이미 만들어 뒀다.
**시크릿만 등록하면 push할 때마다 자동 배포된다.** 등록 전에는 워크플로가 실패하니
지금처럼 `npm run build` → `npx firebase deploy --only hosting,firestore`로 손수 올리면 된다.

1. 서비스 계정 키 만들기 — 아래 둘 중 하나
   - `npx firebase init hosting:github` (대화형, 브라우저 인증 필요). 시크릿까지 자동 등록해준다
   - 또는 [Google Cloud 콘솔](https://console.cloud.google.com/iam-admin/serviceaccounts?project=doyou-boardgame)에서
     키(JSON)를 직접 만들고, GitHub 저장소 Settings → Secrets → Actions 에 붙여넣기
2. GitHub Secrets 에 등록할 값
   - `FIREBASE_SERVICE_ACCOUNT` — 위 JSON 전체
   - `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`,
     `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`
     (`.env.local` 의 값과 같다)
3. 서비스 계정에 필요한 권한: Firebase Hosting 관리자, Cloud Datastore 소유자(규칙·색인 배포용),
   서비스 사용량 소비자

### 나중에 손볼 것
- 채널을 삭제해도 하위 메시지 문서는 남음 (화면에서는 안 보임). 필요하면 Blaze 전환 후 정리
- 닉네임 중복 방지 없음
- 로그아웃 시 오프라인 캐시(IndexedDB)를 지우지 않음. 공용 PC 사용이 문제되면 추가
- 모임을 삭제해도 참석자에게 따로 알려주지 않음 (취소 표시를 권장)
- 다가오는 모임은 최대 50개까지만 구독 (`stores/events.ts`의 `UPCOMING_LIMIT`)

## 3. 새 컴퓨터에서 이어서 하기

### 필요한 프로그램
- **Node.js 22 이상** (지금까지 v24 사용). Vite 8이 Node 20.12 미만에서는 아예 실행되지 않는다
  (`SyntaxError: ... does not provide an export named 'styleText'`)
- **Git**
- **Java 21 이상**: Firestore 에뮬레이터·규칙 테스트에 필요. 앱 실행(`npm run dev`)만 할 거면 없어도 됨
- 윈도우에서 설치: `winget install OpenJS.NodeJS.LTS` / `winget install Microsoft.OpenJDK.21`
  (설치 후 터미널을 새로 열어야 PATH가 반영됨)

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
| `npx firebase deploy --only firestore:rules` | 보안 규칙만 배포 |
| `npx firebase deploy --only firestore` | 보안 규칙 + 색인 배포 |
| `npm run build; npx firebase deploy --only hosting,firestore` | 전체 수동 배포 (자동 배포를 켜기 전까지) |

> 배포하려면 `npx firebase login`으로 **kwat09k@gmail.com** 로그인이 되어 있어야 한다.

### 포트 8080이 이미 쓰이고 있을 때
다른 프로그램이 8080을 잡고 있으면 에뮬레이터가 뜨지 않는다. 그 경우 `firebase.json`의
`emulators.firestore.port`와 `tests/rules/helpers.ts`의 `port`를 **같은 값**(예: 8085)으로
함께 바꿔서 돌리고, 끝나면 되돌린다.

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
  services/     Firestore 읽기·쓰기 함수 (users, chat, events, games, posts, members)
  stores/       zustand 전역 상태 + 한 번만 하는 실시간 구독 (auth, members, chat, events, games)
  hooks/        여러 화면에서 쓰는 훅 (useUnreadCount, useChatNotifications)
  features/     기능별 화면 (auth, home, chat, events, games, stats, board, members, me, more, admin)
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
- **마지막 메시지 삭제:** 방 목록 미리보기가 지운 내용으로 남지 않게, 마지막 메시지를 지우면
  `lastMessagePreview`만 `'삭제된 메시지'`로 바꾼다 (시각·보낸사람은 그대로라 목록 순서가 흔들리지 않음)

### 4단계에서 정한 것
- **모임 유형(`type`)은 만들 때만 정함.** 나중에 정기↔번개로 바꿀 수 없다(rules)
- **취소 vs 삭제:** 취소는 `canceled: true`로 남겨서 참석자가 볼 수 있게 하고, 삭제는 문서를 지움.
  화면에서는 취소를 먼저 권한다
- **만든 사람은 자동 참석:** `attendeeIds: [hostId]`로 생성 (rules가 이 값을 요구)
- **참석 신청은 본인 uid 하나만** 넣고 뺄 수 있다. 오너도 남을 대신 신청시킬 수 없음
- **출석 체크는 모임이 시작된 뒤부터** 호스트·오너가 함. 참석자 중에서만 고를 수 있음(rules)
- **정원**은 rules에서 `attendeeIds.size() <= capacity`로 막고, 이미 참석한 인원보다 적게 줄일 수도 없다
- **색인을 만들지 않으려고** events 쿼리는 `startAt` 한 필드로만 필터·정렬한다.
  취소 여부 같은 조건은 화면에서 거른다 (`firestore.indexes.json` 비어 있음)
- **캘린더는 `date-fns`로 직접 그림** (`features/events/EventCalendar.tsx`).
  기획서에는 shadcn Calendar(react-day-picker)라고 적었지만, 필요한 게 "모임 있는 날에 점 찍기"뿐이라
  의존성을 늘리지 않았다
- **`events.gameIds`는 필드만 만들어 둠.** 연결 UI는 아직 없음

### 5단계에서 정한 것
- **플레이 기록은 MVP에서 제외** (2026-09-14 결정). `plays` 컬렉션·`/plays` 화면을 만들지 않고,
  홈의 "최근 플레이" 카드도 "통계"로 바꿨다. 되살릴 때 필요한 내용은 PLANNING.md 11장에 적어둠
- **통계 기준:** 플레이 기록이 없으므로 **모임 참석·출석**으로 집계한다.
  출석 체크를 한 모임은 `attendedIds`, 안 한 모임은 `attendeeIds`를 센다. 최근 6개월만 읽음
- **게임 목록은 전부 구독하고 필터는 화면에서** 건다 (`stores/games.ts`).
  동호회 규모상 게임 수가 많지 않아서, 색인·쿼리를 늘리지 않고 필터 UX를 자유롭게 하기 위함
- **소장 구분:** 폼에서 소장자를 고르면 `ownership: 'member'`, 안 고르면 `'club'`.
  rules가 둘의 짝(`club`↔`ownerId == null`)을 검사한다
- **대여:** 비어 있을 때만 본인 이름으로 빌릴 수 있고, 반납은 빌린 본인·소장자·등록자·오너가 할 수 있다.
  대여 이력은 남기지 않고 현재 상태만 본다(간단형)

### 6~7단계에서 정한 것
- **게시판 이동 금지:** 글을 쓴 뒤에는 `board`를 바꿀 수 없다(rules). 자유글을 공지로 옮겨
  공지 작성 권한을 우회하는 걸 막기 위함
- **댓글은 소프트 삭제하지 않는다.** 채팅 메시지와 달리 문서를 지운다(글쓴이 본인·오너)
- **`commentCount`는 댓글 문서와 같은 batch로** ±1만 갱신한다(rules가 검사). 음수가 되지 않게 막음
- **복합 색인 1개 추가:** posts(board, pinned desc, createdAt desc).
  이걸로 "고정 글을 위로 + 최신순"을 쿼리 하나로 처리하고, 홈 공지 카드도 같은 색인을 쓴다
- **회원 활동 통계는 모임 참석·출석 기준**(최근 6개월). 통계 화면과 회원 프로필이 같은 계산을 쓴다
  (`services/members.ts`의 `countActivity`)
- **관리자 메모(`adminMemos/{uid}`)는 회원 패널을 펼칠 때만 읽는다.** 오너만 접근 가능
- **강퇴는 `status: 'removed'`**. 관리자 화면 아래쪽 "거절·이용 중지 계정"에서 되돌릴 수 있다
- `PlaceholderPage`는 모든 화면이 만들어져서 삭제했다
