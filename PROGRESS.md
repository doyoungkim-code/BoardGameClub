# 진행 기록 & 개발 가이드

> 마지막 업데이트: 2026-09-13 (4단계 모임/일정 구현)
> 기획 전체는 [PLANNING.md](PLANNING.md), 이 문서는 "어디까지 했고 다음에 뭘 하는지"와 "개발 환경 세팅"을 기록한다.

## 1. 진행 상황

| 단계 | 내용 | 상태 | 커밋 |
|---|---|---|---|
| 1 | 셋업: Vite + React + TS, Tailwind + shadcn/ui, Firebase 연결, 기본 레이아웃 | ✅ 완료 | `f4cc3a6` |
| 2 | 구글 로그인, 가입 신청(닉네임·소개자), 오너 승인, 내 정보, users 규칙 | ✅ 완료 (실제 Firebase에서 동작 확인) | `702e06e` |
| 3 | 채널 단체채팅, 1:1 DM, 안 읽음 배지, 브라우저 알림 | ✅ 구현 완료 · ⚠️ 브라우저 실사용 확인 전 | `6813fb5` |
| 4 | 모임/일정: 정기모임·번개, 캘린더, 참석 신청, 출석 체크 | ✅ 구현 완료 · ⚠️ 브라우저 실사용 확인 전 | `b6f9666` |
| 5 | 보드게임 라이브러리 + 플레이 기록 + 통계 | ⏳ 다음 차례 | |
| 6 | 게시판/공지 | | |
| 7 | 회원관리/관리자 (회원 목록·프로필, 활동 통계, 강퇴, 관리자 메모) | | |
| 8 | GitHub Actions 자동 배포 | | |

- Firestore 보안 규칙은 **4단계까지 실제 프로젝트(`doyou-boardgame`)에 배포 완료**
- 아직 Hosting 배포는 안 함 (8단계에서 GitHub Actions로)
- 규칙 테스트 91개 통과 (users 34 + chat 31 + events 26)

## 2. 다음에 할 일

1. **4단계 모임 실사용 확인**
   - 오너/일반 계정으로: 번개 만들기, 참석 신청·취소, 정원 마감, 모임 취소·삭제, 출석 체크, 캘린더 달 이동
   - 일반 회원 화면에 정기모임 만들기가 안 보이는지 확인
   - 출석 체크는 모임 시작 시각이 지나야 보인다
2. **3단계 채팅 실사용 확인** (아직 못 함)
   - 오너 계정: 채팅 탭 → "기본 채널 만들기" → 메시지 보내기
   - 다른 계정(또는 휴대폰): 실시간 수신, 안 읽음 배지, DM 시작, 메시지 삭제
   - 마지막 메시지를 지우면 목록 미리보기가 "삭제된 메시지"로 바뀌는지
   - 모바일 화면에서 키보드가 올라올 때 입력창 위치 확인
3. **5단계 보드게임 라이브러리 + 플레이 기록 + 통계** (PLANNING.md 5장 `games`/`plays`)
   - `events.gameIds`는 필드만 만들어 두고 UI는 5단계에서 연결
4. 이후 PLANNING.md 10장 순서대로 6 → 8단계

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
  services/     Firestore 읽기·쓰기 함수 (컬렉션별: users, chat, events ...)
  stores/       zustand 전역 상태 + 앱 전체에서 한 번만 하는 실시간 구독 (auth, members, chat, events)
  hooks/        여러 화면에서 쓰는 훅 (useUnreadCount, useChatNotifications)
  features/     기능별 화면 (auth, home, chat, events, me, admin ...)
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
- **`events.gameIds`는 필드만 만들어 둠.** 게임 연결 UI는 5단계
