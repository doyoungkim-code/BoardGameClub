# "Do you 보드게임?" 웹앱 기획서

## 1. 개요
보드게임 동호회 **한 곳만** 쓰는 내부 전용 웹앱이다. 여러 동호회용 범용 앱이 아니다.
동호회 관리 앱처럼 아래 기능을 하나로 묶는다.
- 구글 로그인, 오너 승인제 가입
- 채널형 단체채팅, 1:1 DM
- 모임 일정(정기모임·번개)
- 보드게임 라이브러리
- 통계 (모임 참석·출석 기준)
- 공지·게시판
- 회원관리

## 2. 확정된 결정사항
| 항목 | 결정 |
|---|---|
| 앱 이름 | `Do you 보드게임?` (동호회명은 앱에 표시하지 않음) |
| 프론트엔드 | React + Vite + TypeScript |
| UI | Tailwind CSS + shadcn/ui, lucide-react 아이콘 |
| 백엔드 | Firebase **Spark(무료) 요금제만 사용**: Auth(Google), Firestore, Hosting |
| 서버 코드 | 없음. Cloud Functions를 쓸 수 없어서 권한·검증은 전부 **Firestore Security Rules**로 처리 |
| 기기 | 모바일 기준 반응형 웹(PWA 설치 기능 없음), PC에서도 사용 |
| 역할 | **오너 / 일반회원** 2단계. 오너 = `kwat09k@gmail.com` (rules에 고정) |
| 생성 권한 | 공지·채팅 채널·정기모임은 오너만. 번개·게시글·게임 등록·플레이 기록은 승인된 회원 누구나 |
| 채팅 | 채널형 단체방 여러 개 + 1:1 DM |
| 코드 저장소 | **GitHub** — https://github.com/doyoungkim-code/BoardGameClub |
| 호스팅·배포 | **Firebase Hosting** + **GitHub Actions 자동 배포** (`main`에 push하면 배포. GitHub Pages를 쓰지 않는 이유는 3장 참고) |
| 가입 정보 | 구글 이름·이메일·사진(자동 수집) + **닉네임** + **소개해준 사람**("OO의 지인") |
| 회원관리 부가 기능 | 출석/활동 통계 (+ 기본 승인/거절/강퇴) |
| 이미지 업로드 | **MVP에서 제외**. 프로필은 구글 사진만 사용 (Spark 요금제에서는 신규 프로젝트가 Storage를 쓸 수 없음) |
| 게임 정보 | 직접 입력 + BGG 링크 칸. BGG 자동완성은 추후 과제 |

## 3. 기술 스택
- `firebase` v12 modular SDK. Firestore `persistentLocalCache`를 켜서 읽기 횟수를 줄임
- `react-router`(라우팅), `zustand`(인증·회원 상태)
- `react-hook-form` + `zod`(폼 검증), `date-fns` + `ko` 로케일
- shadcn/ui Calendar(react-day-picker)로 모임 캘린더 구현
- 개발: Firebase Emulator Suite(Auth/Firestore, **Java 21 이상 필요**), `vitest` + `@firebase/rules-unit-testing`(보안 규칙 테스트)
- 배포: GitHub Actions에서 `firebase-tools`로 Firebase Hosting(SPA rewrite)과 Firestore 규칙·인덱스를 배포

**GitHub → Firebase 자동 배포 흐름**
| 워크플로 | 실행 시점 | 하는 일 |
|---|---|---|
| `ci.yml` | 모든 push와 PR | `npm ci` → 타입체크·빌드 → 에뮬레이터로 보안 규칙 테스트 |
| `deploy.yml` | `main` 브랜치에 push | 빌드와 테스트가 통과하면 Hosting 배포 (보안 규칙·색인은 수동 배포 — PROGRESS.md 2-1) |

- 규칙 테스트가 실패하면 배포하지 않음. 권한 구멍이 생긴 규칙이 실제 서비스에 올라가는 것을 막기 위함
- **GitHub Secrets**
  - `FIREBASE_SERVICE_ACCOUNT_DOYOU_BOARDGAME`: 배포용 서비스 계정 키. `firebase init hosting:github`를 실행하면 자동으로 등록됨
- 웹 설정값(`apiKey` 등)은 원래 브라우저에 공개되는 값이라 유출돼도 보안 문제가 아님. 실제 보호는 보안 규칙이 담당. 그래서 배포 빌드용 값은 시크릿 대신 `.env.production`으로 커밋한다 (2026-09-16 변경). 로컬 개발용 `.env.local`은 커밋하지 않음
- 서비스 계정 키 JSON 파일은 절대 커밋하지 않음(`.gitignore`에 등록)
- 저장소는 공개·비공개 모두 가능. 비공개여도 GitHub Actions 무료 한도(월 2,000분) 안에서 충분함
- (선택) PR마다 Firebase Hosting 미리보기 URL을 만드는 기능 사용 가능. 단, 미리보기 주소에서 구글 로그인을 하려면 Auth 승인된 도메인 등록이 필요할 수 있음

**GitHub Pages 대신 Firebase Hosting을 쓰는 이유** (둘 다 무료)
- **구글 로그인 안정성**: Safari·Chrome이 서드파티 쿠키를 막으면서 앱 도메인과 Firebase 인증 도메인이 다르면 모바일 로그인(특히 redirect 방식)이 실패할 수 있음. Firebase Hosting은 인증 도메인과 같은 도메인이라 이 문제가 없음
- **라우팅**: GitHub Pages는 `/events/123` 같은 주소로 새로고침하면 404가 남(404.html 우회나 `#/` 주소 필요). Firebase Hosting은 설정 한 줄로 해결
- **저장소 공개 여부**: GitHub Pages 무료는 공개 저장소에서만 쓸 수 있음. Firebase Hosting은 비공개 저장소도 상관없음
- **관리 편의**: 보안 규칙·DB·호스팅을 `firebase deploy` 한 번에 배포하고 콘솔 한 곳에서 관리

## 4. 인증 & 가입 승인 흐름 (서버 없음)
1. 구글 로그인(`signInWithPopup`). 모바일에서 팝업이 실패하면 `signInWithRedirect`로 전환
2. `users/{uid}` 문서가 없으면 가입 신청 화면(닉네임 + 소개해준 사람)을 보여주고, 입력하면 문서를 생성
   - 소개해준 사람은 **직접 입력(필수)**. 승인 전에는 회원 목록을 볼 수 없어서 목록에서 고를 수 없음
   - 오너가 승인할 때 입력값을 보고 실제 회원과 연결(`referrerId`). 해당 회원이 없으면 텍스트만 유지
   - rules: 본인 uid로만 생성 가능. `status`는 반드시 `pending`, `role`은 반드시 `member`
   - 예외: 토큰 email이 오너 이메일이고 `email_verified`가 참이면 `role: owner, status: approved`로 생성 허용
3. `pending` 상태면 "승인 대기" 화면만 보임. `rejected`/`removed` 상태는 안내 화면을 보여줌
4. 오너가 관리자 페이지에서 승인하면 `status: approved`로 바뀜. 클라이언트가 본인 문서를 `onSnapshot`으로 구독하고 있어서 새로고침 없이 바로 입장
5. 사용자는 자기 문서의 `status`/`role`을 바꿀 수 없음(rules). 문서 삭제도 막혀 있어서 강퇴된 사람은 다시 신청할 수 없음

**공통 rules 헬퍼**
- `isOwner()` = `request.auth.token.email == 'kwat09k@gmail.com' && request.auth.token.email_verified`
- `isMember()` = `get(/users/$(request.auth.uid)).data.status == 'approved'`

## 5. Firestore 데이터 모델
```
users/{uid}                        // 공개 프로필: 승인된 회원 전체가 읽음
  nickname, googleName, photoURL
  role: 'owner'|'member', status: 'pending'|'approved'|'rejected'|'removed'
  referrerName     // 가입 시 본인이 입력한 소개자 이름 (예: "김철수")
  referrerId       // 오너가 승인 시 연결한 소개 회원 uid, 없으면 null (오너만 쓰기)
  createdAt, approvedAt, lastActiveAt
userPrivate/{uid}                  email            // 본인과 오너만 읽음. 생성 후 수정 불가
adminMemos/{uid}                   memo, updatedAt  // (7단계) 오너만 읽기·쓰기
users/{uid}/readStates/{roomId}     lastReadAt        // 채널·DM 안 읽음 배지

channels/{channelId}                name, description, order, createdAt, createdBy,
                                    lastMessageAt, lastMessagePreview, lastSenderId   // 생성·수정·삭제는 오너만
channels/{channelId}/messages/{id}  senderId, senderNickname, text, createdAt, deleted
                                    // 닉네임·사진은 회원 목록에서 현재 값을 찾아 표시. senderNickname은 강퇴 등으로 목록에 없을 때 대비
                                    // 삭제는 deleted=true, text='' 로 표시만 (보낸 사람, 채널은 오너도 가능)

dms/{uidA_uidB}                     memberIds[2](정렬), createdAt, lastMessageAt, lastMessagePreview, lastSenderId
dms/{dmId}/messages/{id}            (채널 메시지와 같은 구조)
                                    // 읽기·쓰기는 두 참여자만 (오너도 못 읽음). 강퇴되면 참여자도 접근 불가
                                    // 목록에는 메시지를 한 번이라도 주고받은 방만 표시

events/{eventId}
  type: 'regular'|'flash', title, description, location
  startAt, endAt, capacity(nullable), hostId, gameIds[]
  attendeeIds[]    // 본인 uid 추가/제거만 허용. rules로 size <= capacity 검증
  attendedIds[]    // 출석 체크. 호스트·오너만 수정 → 출석 통계에 사용
  canceled, createdAt

games/{gameId}
  name, altName, minPlayers, maxPlayers, playTimeMin, weight(1~5), tags[]
  description, bggUrl, ownership: 'club'|'member', ownerId
  borrowerId, borrowedAt              // 대여 현황(간단형)
  createdBy, createdAt

// plays/{playId} — 플레이 기록은 MVP에서 제외 (2026-09-14 결정). 11장 백로그 참고

posts/{postId}
  board: 'notice'|'free'|'review', title, content, authorId, authorNickname
  pinned, likeIds[], commentCount, createdAt, updatedAt
  // board == 'notice' 글 작성과 pinned 설정은 오너만
posts/{postId}/comments/{id}        authorId, authorNickname, content, createdAt
```
- **지인 표시 규칙**: `referrerId`가 있으면 그 회원의 현재 닉네임으로 "OO의 지인"을 표시(닉네임을 바꿔도 따라감). 없으면 `referrerName`으로 표시
- **소개 계보**: `referrerId`를 따라가면 "A → B의 지인 → C의 지인" 연결을 만들 수 있음. 회원 프로필에 "소개한 회원" 목록으로 표시
- 오너가 첫 회원이거나 앱을 만들기 전부터 있던 회원은 소개자 없이 등록할 수 있고, 나중에 오너가 수정 가능
- 수정·삭제 권한은 모든 컬렉션에서 작성자 본인과 오너
- `commentCount`, `lastMessageAt` 같은 집계 필드는 원래 쓰기와 같은 batch로 갱신. rules로 값이 +1/-1만 바뀌는지, 해당 필드만 바뀌는지 검증

## 6. 화면 & 라우트
- 모바일: 하단 탭 **홈 / 모임 / 채팅 / 게임 / 더보기**
- PC(md 이상): 좌측 사이드바

| 경로 | 화면 |
|---|---|
| `/login` | 구글 로그인 |
| `/signup` | 가입 신청: 닉네임, 소개해준 사람 입력 (최초 1회) |
| `/pending` | 승인 대기 / 거절·강퇴 안내 |
| `/` | 홈: 다가오는 모임, 고정 공지, 최근 플레이, 안 읽은 채팅 |
| `/events`, `/events/new`, `/events/:id` | 캘린더·리스트 전환, 참석 신청, 출석 체크, 모임 화면에서 바로 플레이 기록 작성 |
| `/chat`, `/chat/:channelId`, `/dm/:dmId` | 채널·DM 목록(안 읽음 배지), 채팅방(최근 50개 표시, 위로 스크롤하면 더 불러오기). PC는 목록+대화방 2단, 모바일은 대화방에서 하단 탭 숨김. 오너는 채널 추가(+ 기본 채널 전체·번개·잡담 한 번에 만들기)·수정·삭제 |
| `/games`, `/games/new`, `/games/:id` | 인원·시간·난이도·태그 필터, 상세(대여 현황) |
| `/stats` | 모임 참석·출석 랭킹, 모임 추이, 게임 보유 현황 |
| `/board/:board`, `/posts/:id`, `/posts/new` | 공지·자유·후기 게시판, 댓글·좋아요 |
| `/members`, `/members/:uid` | 회원 목록(닉네임 옆에 "OO의 지인"), 프로필(소개자, 소개한 회원, 참석·플레이·승리 통계, DM 보내기) |
| `/me` | 닉네임 수정, 로그아웃 |
| `/more` | (모바일) 하단 탭에 없는 메뉴 모음: 플레이 기록, 통계, 게시판, 회원, 내 정보, 관리자 |
| `/admin` | (오너만) 가입 승인 대기열(입력한 소개자 이름 표시 + 실제 회원 연결), 회원 상태 변경·메모·소개자 수정, 활동 통계(참석 횟수, 최근 활동일, 30/60일 미활동 표시) |

## 7. 알림 (Spark 요금제 제약)
- 서버 푸시(FCM 발송)는 발송 서버가 필요해서 쓸 수 없음
- 대신 앱 안의 **안 읽음 배지**(readStates와 lastMessageAt 비교)를 쓰고, 앱이 열려 있을 때는 브라우저 `Notification` API와 탭 제목 카운트로 알림
  - 안 읽음 = 다른 사람이 보낸 마지막 메시지 시각 > 내가 마지막으로 읽은 시각. 읽은 기록이 없는 방은 가입 승인 시각을 기준으로 계산
  - 브라우저 알림은 내 정보 화면에서 켬. 앱 탭을 열어둔 채 다른 탭을 보고 있을 때만 뜸(PC 크롬 등). 안드로이드 크롬처럼 페이지에서 직접 알림을 만들 수 없는 환경은 배지만 표시

## 8. 무료 한도 대응 (읽기 5만/일, 쓰기 2만/일)
- 채팅은 최근 50개만 실시간 구독하고, 이전 메시지는 페이지네이션으로 불러옴
- 목록 화면은 `limit` + 커서 방식
- 통계는 `getCountFromServer` 같은 집계 쿼리를 쓰고 필요한 범위만 조회
- `lastActiveAt`은 세션당 한 번만 갱신
- 오프라인 캐시 사용

## 9. 프로젝트 구조
```
BoardGameDong/
  PLANNING.md, README.md, .gitignore
  .github/workflows/        # ci.yml, deploy.yml
  firebase.json, .firebaserc, firestore.rules, firestore.indexes.json
  .env.example              # VITE_FIREBASE_* 설정값 양식 (.env.production 은 배포 빌드용 실제 값)
  src/
    main.tsx, App.tsx, router.tsx
    lib/firebase.ts         # 초기화, 에뮬레이터 연결
    lib/constants.ts        # OWNER_EMAIL, APP_NAME
    types/                  # User, Event, Game, Play, Post, Message ...
    stores/auth.ts          # 로그인 + users 문서 구독, 라우트 가드
    hooks/                  # useCollection/useDoc(onSnapshot 래퍼), useUnread ...
    services/               # 컬렉션별 CRUD (users, chat, events, games, plays, posts)
    components/ui/          # shadcn
    components/layout/      # AppShell, BottomTabs, Sidebar, RequireMember, RequireOwner
    features/{auth,home,chat,events,games,plays,stats,board,members,admin}/
  tests/rules/              # 보안 규칙 테스트
```

## 10. 구현 단계
1. **셋업**: git 초기화와 `.gitignore`, Vite+TS, Tailwind+shadcn, Firebase 프로젝트 연결, 에뮬레이터, 기본 레이아웃
   - 사용자 준비물: GitHub에 저장소 생성(이름·공개 여부 결정)
   - 사용자 준비물: Firebase 콘솔에서 프로젝트 생성, Authentication에서 Google 로그인 활성화, 웹 앱 등록 후 설정값 전달
2. **인증·가입 승인**: 로그인 → 닉네임·소개자 입력 → 승인 대기 → 오너 승인(소개 회원 연결), 라우트 가드, users rules + 테스트
3. **채팅**: 채널(오너가 생성) + DM, 안 읽음 배지
4. **모임/일정**: 정기모임·번개, 캘린더, 참석 신청(정원 제한), 출석 체크
5. **게임 라이브러리 + 통계** (플레이 기록은 제외 — 11장 백로그)
6. **게시판/공지**: 댓글, 좋아요, 공지 고정
7. **회원관리/관리자**: 회원 목록·프로필, 활동 통계, 상태 변경
8. **배포 자동화**: `firebase init hosting:github`로 서비스 계정 Secret 등록, `ci.yml`/`deploy.yml` 작성, Auth 승인된 도메인 확인
   - 배포 빌드의 `VITE_FIREBASE_AUTH_DOMAIN`은 `doyou-boardgame.web.app`(호스팅 도메인)으로 설정. 로그인 도메인과 앱 도메인을 같게 해서 모바일 Safari 등에서 리디렉트 로그인이 막히지 않게 함. 이때 Google Cloud 콘솔 OAuth 클라이언트의 승인된 리디렉션 URI에 `https://doyou-boardgame.web.app/__/auth/handler` 추가
   - 첫 배포를 1단계 직후에 해두고, 이후 단계는 기능이 완성될 때마다 `main`에 머지해서 바로 반영하는 방식도 가능

## 11. 추후 과제 (백로그)
- **플레이 기록·승률 통계** (2026-09-14에 MVP에서 제외). 넣게 되면 `plays` 컬렉션과
  `/plays` 화면을 되살리고, 통계에 게임별 인기·승률과 회원별 플레이 수·승수를 더한다
- 이미지 업로드 (Blaze 전환 후 Storage 사용, 또는 Cloudinary 연동)
- BGG 검색 자동완성 (프록시 필요)
- 서버 푸시 알림 (Blaze + Cloud Functions)
- PWA 설치, 다크모드
- 회비 관리, 회원 명부 CSV 내보내기, 경고/정지 단계
- 모임별 채팅방 자동 생성

## 12. 검증 방법
- `npm run test:rules`: 에뮬레이터에서 보안 규칙 테스트
  - 미승인 사용자의 읽기 차단
  - 본인 status 변경 차단
  - 오너 이메일 사칭 차단
  - 일반회원이 본인 `referrerId` 변경 차단
  - DM에 제3자 접근 차단
  - 정원 초과 참석 차단
  - 공지 작성 권한
- `firebase emulators:start` + `npm run dev`로 오너/일반 계정 두 개를 써서 전체 흐름 확인: 가입 신청 → 승인 → 채팅 실시간 송수신 → 모임 참석 → 플레이 기록 → 통계 반영
- 크롬 DevTools 모바일 뷰(360~430px)와 데스크톱 레이아웃 확인
- `npm run build` 타입체크 통과
- GitHub에 push → Actions의 `ci.yml` 통과 → `main` 머지 후 `deploy.yml`이 성공하는지 확인 → 실제 도메인(`<프로젝트>.web.app`)에서 휴대폰으로 구글 로그인 확인
