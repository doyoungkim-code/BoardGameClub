# Do you 보드게임?

보드게임 동호회 한 곳만을 위한 회원 전용 웹앱. React + Vite + TypeScript, Firebase(Spark 무료 요금제: Auth, Firestore, Hosting).

## 작업 시작 전에 읽을 것
- [PLANNING.md](PLANNING.md) — 기획서 (데이터 모델, 화면, 구현 단계)
- [PROGRESS.md](PROGRESS.md) — 진행 상황, 다음 할 일, 개발 환경·명령어, 주의사항

## 규칙
- 사용자와의 대화, 코드 주석, 커밋 메시지는 한국어
- 서버 코드 없음: 권한 검증은 `firestore.rules`에서. 규칙을 바꾸면 `tests/rules` 테스트 추가 → `npm run test:rules` → 배포
- 커밋·push는 사용자 확인 후
- 한 단계를 끝내면 PROGRESS.md의 진행 상황과 다음 할 일을 갱신
