# 진행 기록 & 개발 가이드

> 마지막 업데이트: 2026-09-19 (지도, 관리자 참석자 관리, 업적·활동 기록 추가)
> 기획 전체는 [PLANNING.md](PLANNING.md), 이 문서는 "어디까지 했고 다음에 뭘 하는지"와 "개발 환경 세팅"을 기록한다.

## 1. 진행 상황

| 단계 | 내용 | 상태 | 커밋 |
|---|---|---|---|
| 1 | 셋업: Vite + React + TS, Tailwind + shadcn/ui, Firebase 연결, 기본 레이아웃 | ✅ 완료 | `f4cc3a6` |
| 2 | 구글 로그인, 가입 신청(닉네임·소개자), 오너 승인, 내 정보, users 규칙 | ✅ 완료 (실제 Firebase에서 동작 확인) | `702e06e` |
| 3 | 채널 단체채팅, 1:1 DM, 안 읽음 배지, 브라우저 알림 | ✅ 구현 완료 · ⚠️ 브라우저 실사용 확인 전 | `6813fb5` |
| 4 | 모임/일정: 모임 만들기, 캘린더, 참석 신청, 출석 체크 | ✅ 구현 완료 · ⚠️ 브라우저 실사용 확인 전 | `b6f9666` |
| 5 | 보드게임 목록(보기 전용) + 통계 (플레이 기록은 제외) | ✅ 완료 · 게임은 9/16에 보기 전용으로 교체 | `97ee769` |
| 6 | 게시판/공지: 공지·자유·후기, 댓글, 좋아요, 고정 | ✅ 구현 완료 · ⚠️ 실사용 확인 전 | |
| 7 | 회원관리/관리자: 회원 목록·프로필, 활동 통계, 강퇴, 관리자 메모 | ✅ 구현 완료 · ⚠️ 실사용 확인 전 | |
| 8 | GitHub Actions 자동 배포 | ✅ 완료 (Hosting 자동, 규칙은 수동) | |
| + | 지도(주변 보드게임카페 + 오너 즐겨찾기), 관리자 참석자 관리(지난 모임 포함), 업적·활동 기록 | ✅ 완료 (사용자 확인) | |
| + | 홈 화면 앱(PWA): 앱 아이콘, 설치 안내, 오프라인 캐시, 카카오톡 브라우저 안내 | ✅ 구현 완료 · ⚠️ 실사용 확인 전 | |

- Firestore 보안 규칙은 **전부 실제 프로젝트(`doyou-boardgame`)에 배포 완료**
- **배포 주소: https://doyou-boardgame.web.app** — `main`에 push하면 자동 배포 (아래 2-1)
- 규칙 테스트 138개 통과 (users 41 + chat 31 + events 32 + posts 28 + places 6)
- `firestore.indexes.json`에 posts 복합 색인 1개 (board + pinned + createdAt)

## 2. 다음에 할 일

**1~8단계가 모두 끝났다. 남은 건 실사용 확인과 백로그.**

1. **전 기능 실사용 확인** (아직 브라우저로 돌려본 적 없음)
   - 채팅: 기본 채널 만들기 → 메시지 송수신, 안 읽음 배지, DM, 메시지 삭제 후 목록 미리보기
   - 모임: 모임 만들기(회원 누구나), 참석 신청·취소, 정원 마감, 취소·삭제, 출석 체크(시작 시각이 지나야 보임), 캘린더
   - 게임: 목록 39개와 표지, 검색, "몇 명이서" 필터
   - 게시판: 공지(오너만)·자유·후기 글쓰기, 댓글, 좋아요, 고정
   - 회원: 목록·프로필, DM 보내기, 관리자에서 강퇴·메모·소개자 수정
   - 지도: 주변 보드게임카페 자동 표시(지도 이동·확대 시 다시 뽑기), 지역으로 이동, 오너 즐겨찾기·메모, 길찾기
   - 관리자: 지난 모임을 만들고 "참석자 관리"로 회원 넣기 → 그 회원 프로필의 출석·업적에 반영되는지
   - 티어·업적·칭호: 내 정보 → "내 티어·업적·칭호 보기", 대표 칭호 고르기, 채팅·게시판에서 방패·칭호 표시,
     관리자 화면에서 칭호 주기, 통계 티어 랭킹
   - 홈 화면 앱: 안드로이드 "앱 설치" 버튼, 아이폰 홈 화면에 추가 → 설치한 앱에서 구글 로그인 되는지(특히 아이폰),
     카카오톡에서 링크 열었을 때 "다른 브라우저로 열기"
   - 모바일 화면에서 키보드가 올라올 때 채팅 입력창 위치
2. 그 뒤에는 PLANNING.md 11장 백로그 (플레이 기록, 이미지 업로드, BGG 검색, 다크모드 …)

## 2-1. 배포 구조

| 무엇 | 어떻게 |
|---|---|
| **사이트(Hosting)** | `main`에 push → `deploy.yml`이 린트·빌드·규칙 테스트 통과 시 자동 배포 |
| **보안 규칙·색인(firestore)** | **수동.** `npm run test:rules` 통과 후 `npx firebase deploy --only firestore` |
| 모든 push·PR | `ci.yml`이 린트·빌드·규칙 테스트만 돌림 |

- 서비스 계정 키는 `npx firebase init hosting:github`로 만들었고, GitHub 시크릿
  `FIREBASE_SERVICE_ACCOUNT_DOYOU_BOARDGAME`에 자동 등록돼 있다
- **규칙을 자동 배포하지 않는 이유:** 위 명령이 만든 서비스 계정에는 Hosting 권한만 있다.
  자동화하려면 Google Cloud IAM에서 그 계정(`github-action-…`)에 "Firebase Rules 관리자"와
  "Cloud Datastore 색인 관리자" 역할을 더하고 `deploy.yml`에 firestore 배포 단계를 추가하면 된다
- **규칙을 바꾼 커밋은 순서 주의:** 앱 코드가 새 규칙에 의존하면, push 전에 규칙을 먼저 배포한다
- Firebase 웹 설정값은 GitHub 시크릿이 아니라 커밋된 `.env.production`에서 읽는다
  (브라우저에 공개되는 값이라 숨길 필요 없음. 로컬 개발은 `.env.local`이 덮어씀)
- `firebase init hosting:github`를 다시 실행하면 `firebase.json` 서식을 바꾸고
  `firebase-hosting-pull-request.yml`을 만든다. 둘 다 되돌리거나 지울 것

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
| `npm run build; npx firebase deploy --only hosting` | 사이트 수동 배포 (보통은 push로 자동 배포) |

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
  services/     Firestore 읽기·쓰기 함수 (users, chat, events, posts, members)
  stores/       zustand 전역 상태 + 한 번만 하는 실시간 구독 (auth, members, chat, events)
  data/games.ts 보드게임 목록 (Firestore 아님. 표지 이미지는 public/games/)
  data/achievementList.ts  업적·칭호 목록 (이름·조건. 오너가 채우는 파일)
  data/achievements.ts  경험치·티어 계산
  data/titles.ts        자동 칭호 목록
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
- **모임 종류 구분 없음** (2026-09-19 오너 요청). 처음엔 정기모임(오너만)·번개(누구나)로 나눴다가 없앴다.
  새 모임에는 `type` 필드가 없고(rules가 거부), 예전 문서에 남은 `type`은 읽지도 쓰지도 않는다
- **취소 vs 삭제:** 취소는 `canceled: true`로 남겨서 참석자가 볼 수 있게 하고, 삭제는 문서를 지움.
  화면에서는 취소를 먼저 권한다
- **만든 사람은 자동 참석:** `attendeeIds: [hostId]`로 생성 (rules가 이 값을 요구)
- **참석 신청은 본인 uid 하나만** 넣고 뺄 수 있다. (단, 9/19부터 오너는 "참석자 관리"로 직접 넣고 뺄 수 있다)
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

### 보드게임 목록 (2026-09-16 교체)
처음엔 회원이 게임을 등록·대여하는 Firestore 기능(`games` 컬렉션)으로 만들었지만,
**"어떤 게임이 있는지만 알면 된다"**는 결정으로 보기 전용 목록으로 바꿨다.
등록·수정·대여 화면, `services/stores/types`의 games 코드, `games` 보안 규칙과 테스트를 모두 지웠다.

- **데이터:** `src/data/games.ts`의 `GAME_LIST`에 오너가 정리한 텍스트를 **그대로** 붙여넣었다.
  `이름 (인원) - 설명` 한 줄 형식을 코드가 읽어서 나눈다. Firestore 읽기가 없어서 무료 한도도 안 쓴다
- **게임 추가하는 법:** `GAME_LIST`에 같은 형식으로 한 줄 추가 → push → 자동 배포.
  형식이 틀린 줄은 개발 서버 콘솔에 경고가 뜨고 목록에서 빠진다
- **인원 표기:** `2~4인`, `2인`, `4인 이상`, `4~8인 이상`을 읽어 "몇 명이서" 필터에 쓴다.
  "이상"이 붙으면 상한 없음. 화면에는 원래 적힌 글자를 그대로 보여준다
- **표지 이미지:** BoardGameGeek(BGG)에서 한 번 내려받아 `public/games/<BGG번호>.png|jpg`로 커밋했다
  (39개, 총 0.75MB). 앱이 실행 중에 BGG를 부르지 않는다 — BGG 공식 API는 인증이 필요하고
  브라우저에서 직접 부를 수 없어서다. 노터치크라켄·프로포즈·애니모크레이지는 한국판 표지
- **새 게임 표지 받는 법:** `https://api.geekdo.com/api/geekitems?objectid=<BGG번호>&objecttype=thing`
  응답의 `item.imageurl`을 내려받아 `public/games/`에 두고 `GAME_IMAGES`에 `이름: 파일명` 추가.
  (한국판 표지는 BGG "버전" 번호 + `objecttype=version`) 이미지가 없으면 이름 첫 글자 표지가 나온다
- 예전 기능으로 Firestore `games` 컬렉션에 문서를 만들어 뒀다면 이제 규칙상 아무도 못 읽는 채로 남는다

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

### 2026-09-19 추가 기능에서 정한 것
**지도 (`/places`, `places` 컬렉션)**
- **카카오맵**을 쓴다 (처음엔 OpenStreetMap이었다가 같은 날 교체).
  네이버 지도는 가게 이름 검색이 서버에서만 되고 클라우드 가입에 결제수단이 필요해서 제외
- **주변 보드게임카페는 저장하지 않고 카카오에서 그때그때 뽑는다** (`searchBoardCafesIn`).
  지도 이동·확대가 끝나면(idle, 0.3초 뒤) 보이는 영역으로 "보드게임카페"를 검색하고,
  카카오 분류(`category_name`)에 "보드카페"가 들어간 곳만 남긴다
  - 카카오 검색은 한 번에 **최대 45곳**(15개 × 3쪽). 넘치면 "확대하면 나머지도 나와요" 안내
  - 지도가 너무 넓으면(level 8 이상) 검색하지 않고 확대하라고 안내 (`MAX_SEARCH_LEVEL`)
- **지역으로 이동**(`findArea`): "홍대" 같은 이름의 첫 검색 결과로 지도를 옮긴다
- **처음 위치:** 모임 화면에서 넘어온 카페(`?place=`) → **내 위치**(권한을 묻고 파란 점 표시) →
  위치를 못 잡으면 즐겨찾기 전체 → 강남역 순. 위치를 기다리는 사이 사용자가 옮겼으면 점만 찍고 이동하지 않는다
- **즐겨찾기는 오너만** (rules). 회원이 장소를 등록하던 방식은 같은 날 없앴다.
  문서 ID가 카카오 장소 ID라서 같은 곳이 두 번 들어가지 않는다. 메모에 "9월 모임 장소" 같은 기록을 남긴다
- 핀 색: 주변 카페 회색(작게), 즐겨찾기 주황, 고른 곳 빨강 (`index.css`의 `.place-pin-*`)
- 길찾기·크게 보기는 카카오맵 링크로 넘긴다 (`kakaoMapUrl`, `kakaoRouteUrl`)
- SDK는 지도가 처음 그려질 때 한 번만 불러온다 (`lib/kakaoMap.ts`). 핀은 CustomOverlay + `.place-pin` CSS.
  지도 박스에 `isolate`를 걸어 지도 안의 z-index가 헤더·하단 탭·팝업 위로 올라오지 않게 했다

**카카오 개발자 콘솔 설정** (앱: Do you 보드게임?, kwat09k 카카오 계정)
- JavaScript 키: `VITE_KAKAO_MAP_KEY` (`.env.production`, `.env.local`, `.env.emulator`).
  등록한 도메인에서만 동작해서 커밋해도 된다
- 등록한 사이트 도메인: `https://doyou-boardgame.web.app`, `https://doyou-boardgame.firebaseapp.com`,
  `http://localhost:5173`. **다른 주소(예: 미리보기 채널)에서 지도를 쓰려면 여기에 추가해야 한다**
- 카카오맵 사용 설정 ON (꺼지면 지도·검색이 모두 안 된다)
- 키 확인: `dapi.kakao.com/v2/local/search/keyword.json`에 `Authorization: KakaoAK <키>`와 등록한 `Origin`을 붙여 부르면 200
- 모임과의 연결은 **이름 일치**로 한다: 모임 만들기에서 등록된 카페를 고르면 장소 칸에 이름이 들어가고,
  모임 화면에서 장소 이름이 지도의 카페와 같으면 "지도 보기" 링크가 뜬다 (events 스키마는 그대로)

**관리자 참석자 관리**
- 오너는 `attendeeIds`·`attendedIds`를 직접 바꿀 수 있다. 정원·취소·지난 모임과 상관없다(rules)
- 출석자는 항상 참석자 안에 있어야 한다. 참석자에서 빼면 출석에서도 같이 뺀다
- 이미 출석 체크를 쓴 지난 모임에 사람을 넣으면 "출석으로도 체크" 선택지가 나온다.
  출석 체크를 안 쓴 모임은 참석자 전원이 출석으로 집계되므로 묻지 않는다
- 지난 모임 기록은 오너가 모임 만들기에서 **지난 날짜로 만들고** 참석자를 넣으면 된다

**업적·활동 기록 (회원 프로필)**
- **저장하지 않고 매번 계산한다.** 서버가 없어서 클라이언트가 쓰는 업적은 조작을 막을 수 없기 때문.
  이미 rules로 검증된 기록(모임 참석·주최, 게시글, 가입일)에서 센다 (`services/activity.ts`)
- **출석 기준은 앱 전체에서 하나**(`countsAsAttended`): 시작했고 취소되지 않은 모임에 참석자로 있고,
  출석 체크를 한 모임이면 체크된 경우만. 통계 화면 랭킹·티어도 같은 함수를 쓴다
- 프로필 하나를 열 때 쿼리 3개(참석 모임, 연 모임, 쓴 글). 모두 한 필드 조건이라 색인 추가 없음

### 출석 업적 · 경험치 · 티어 · 칭호 (2026-09-19 개편)
처음 만든 업적 14개(출석·주최·게시글·가입일 섞음)를 비우고 다시 짰다.
- **업적·칭호 목록은 `src/data/achievementList.ts` 한 파일** (오너가 이름을 직접 채우는 파일, 9/19 분리)
  - `ACHIEVEMENT_LIST`: 출석 횟수·보너스 XP·아이콘·이름. 이름·아이콘이 비면 "출석 N회"·🎲로 나온다
  - `TITLE_LIST`: 칭호 id·조건(metric·goal)·이름. **이름이 비어 있으면 앱에 나오지 않는다**. 조건 설명은 자동 생성
  - id는 회원이 고른 대표 칭호로 저장되니 바꾸지 말 것
- 계산식·티어는 `src/data/achievements.ts`(`XP_PER_ATTENDANCE` 10, `TIERS` 기준 XP·색),
  칭호 표시 규칙은 `src/data/titles.ts`
- 다른 회원 프로필에서는 **달성한 업적만 한 줄**로 보인다. 본인 프로필은 전체 목록(진행도 포함)
- **경험치** = 출석 1회 10XP + 달성한 출석 업적 보너스. 티어 기준은 대략 출석 2회 실버 · 5회 골드 · 10회 플래티넘 ·
  20회 다이아 · 30회 마스터 · 50회 챌린저 (오너 요청 "빨리 오르게")
- **칭호**
  - 자동 칭호 9개 조건(모임 주최 1·5·20회, 모임 출석 10·30회, 게시글, 후기, 가입 1년, 4주 연속 출석. 이름은 오너가 작성). 형용사 칭호 4개는 조건을 받으면 추가
  - 관리자가 주는 칭호: 관리자 화면 회원 패널에서 이름을 적어 준다 → `users.grantedTitles` (`granted:<이름>`)
  - 대표 칭호: 본인이 프로필에서 고른다 → `users.titleId`. 닉네임 앞에 붙는다 ("모임의 신 홍길동")
  - rules: `titleId`는 본인만, `grantedTitles`는 오너만. 수여 칭호는 받은 것만 고를 수 있게 검사하지만,
    **자동 칭호는 계산 결과라 rules로 검증할 수 없다** (개발자 도구로 못 얻은 자동 칭호를 고를 수는 있음.
    화면은 프로필에서 조건을 다시 확인한다. 동호회 규모라 허용)
- **닉네임 옆 티어**(`components/MemberName.tsx`, `TierShield.tsx`): 채팅·게시판·모임 참석자·회원 목록·통계
  - 모든 회원 출석 수는 `stores/progress.ts`가 모임 전체를 읽어 센다. **무료 한도 때문에 기기에 저장해 두고
    6시간에 한 번만** 다시 읽는다 → 다른 회원 티어는 최대 6시간 늦게 반영될 수 있다
  - 참석자 관리·출석 체크 직후에는 그 기기에서 3초 뒤 다시 센다 (`scheduleProgressRefresh`)
  - 읽기 비용: 모임 수(N) × 기기 수 × 하루 최대 4번. 모임이 수백 개로 늘어 한도가 걱정되면 주기를 늘릴 것
- **NEW 표시**: 본인 프로필에서, 지난번 본 이후 새로 생긴 업적·칭호·티어. 기기별 저장(`seenProgress:<uid>`).
  내 정보 화면 버튼의 빨간 점은 출석 업적·티어만 본다 (칭호는 다른 기록이 필요해서)
- **통계**: 맨 위 "티어 랭킹"(전체 기간 XP), 그 아래 기존 최근 6개월 참석 랭킹
- 댓글 수는 칭호 조건에 넣지 않았다 (회원별 댓글을 세려면 collection group 색인이 필요)

### 홈 화면 앱 (PWA, 2026-09-19)
- 스토어 앱 대신 **PWA**로 했다. 비용·심사가 없고 push하면 설치한 앱에도 바로 반영된다.
  스토어 등록(TWA/Capacitor)은 PLANNING.md 11장 백로그
- `vite-plugin-pwa`가 `manifest.webmanifest`와 서비스 워커(`sw.js`)를 만든다 (`vite.config.ts`)
  - `registerType: 'autoUpdate'`: 새 버전을 배포하면 다음에 열 때 자동으로 바뀐다
  - 앱 화면(JS·CSS·아이콘·게임 표지)을 기기에 저장해 빠르게 연다. 데이터는 여전히 Firestore에서 받는다
  - `/__/`(Firebase 로그인 경로)는 서비스 워커가 가로채지 않게 뺐다
  - `firebase.json`에서 `sw.js`·`index.html`·`manifest`는 `no-cache` (새 버전이 바로 퍼지게)
- **앱 아이콘 원본은 `public/icon.svg`** (주황 배경 + 주사위). 고치면 `npm run icons`로 PNG를 다시 만든다
  (`pwa-assets.config.ts`). 탭 아이콘은 `public/favicon.svg`. 홈 화면 아이콘 밑 이름은 manifest의 `short_name`("보드게임", 길면 잘려서 짧게). 앱 안에서는 "Do you 보드게임?"
- **설치 안내**(`components/InstallAppCard.tsx`): 홈(닫기 가능, 다시 안 뜸)과 내 정보(항상)
  - 안드로이드 크롬: `beforeinstallprompt`를 앱 시작 때 받아 두고(`stores/install.ts`) "앱 설치" 버튼 한 번
  - 아이폰: 공유 → 홈 화면에 추가 순서 안내
  - 카카오톡 안 브라우저: 설치도 구글 로그인도 안 되므로 `kakaotalk://web/openExternal`로 기본 브라우저에서 다시 열기
- **로그인 화면에도 카카오톡·인스타 등 앱 안 브라우저 안내**를 넣었다 (구글이 403 disallowed_useragent로 막는다)
- **뒤로가기** (`hooks/useAppHistory.ts`, 갤럭시에서 "뒤로가기를 계속 눌러도 안 꺼진다"는 문제로 추가)
  - 원인이었던 것: 화면 위 `<` 버튼이 목록 주소로 *새로 이동*해서 기록이 계속 쌓였고, 하단 탭도 누를 때마다 쌓였다
  - `<` 버튼은 `components/BackButton.tsx`로 통일: 한 칸 뒤로 (앱 안 기록이 없으면 `fallback`으로 바꿔 끼움)
  - 하단 탭·사이드바 탭·앱 이름은 `useTabNavigate`로 이동: 기록을 항상 [홈, 탭, 그 안의 화면…]으로 유지한다.
    그래서 어느 탭에서든 뒤로가기 = 홈
  - **설치한 앱에서만** 홈 위에 "종료 방지" 기록(`state.exitGuard`)을 하나 올려 둔다. 홈에서 뒤로가기 →
    "한 번 더 누르면 종료돼요" → 한 번 더 → 돌아갈 기록이 없어 휴대폰이 앱을 닫는다
  - **종료 방지는 사용자가 화면을 누를 때(`pointerup`/`keydown`) 건다.** 크롬(안드로이드)은 사용자 입력 없이
    추가된 기록을 뒤로가기에서 건너뛰기 때문 (처음엔 앱이 열릴 때 자동으로 걸었다가 한 번에 꺼지는 문제가 있었다).
    그래서 앱을 열자마자 아무것도 안 누르고 뒤로가기를 누르면 한 번에 닫힌다 (크롬 정책상 막을 수 없음).
    안내가 뜬 뒤 화면을 누르면 다시 걸린다 (시간 제한 없음)
  - react-router가 `history.state.idx`에 적는 기록 번호를 읽는다 (`historyIndex`). 라우터를 바꾸면 확인할 것
  - 알려진 한계: 팝업(다이얼로그)이 열린 상태에서 뒤로가기를 누르면 팝업이 아니라 화면이 뒤로 간다
- **화면 전환 때 번쩍임 없애기**
  - 강조색(`--accent`)이 연두색이라 로딩 자리 표시(스켈레톤)가 초록 상자로 번쩍였다 → 원목 톤 베이지로 바꿈
  - 스켈레톤·로딩 빙글이·시작 화면은 **0.3초 넘게 걸릴 때만** 나타난다 (`index.css`의 `skeleton-loading`,
    `appear-delayed`). 캐시에서 바로 오는 로딩에는 아무것도 안 보이고 바로 화면이 뜬다
  - 화면 이동은 React Router가 이미 transition으로 처리해서, 새 화면이 준비될 때까지 이전 화면이 유지된다
- **아이폰 홈 화면 앱은 Safari와 저장공간이 따로라 앱에서 한 번 더 로그인해야 한다.**
  만약 앱 안에서 구글 로그인이 안 되면: `.env.production`의 `VITE_FIREBASE_AUTH_DOMAIN`을
  `doyou-boardgame.web.app`으로 바꾸고, Google Cloud 콘솔 OAuth 클라이언트의 승인된 리디렉션 URI에
  `https://doyou-boardgame.web.app/__/auth/handler`를 **먼저** 추가한다 (순서를 바꾸면 모든 로그인이 깨진다)
