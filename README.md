# KEYBOARD_WAR

두 손이 무기다. 정글의 구절을 먼저 베어라.

1:1 타이핑 배틀 웹게임. 다크 판타지 / 정글 모험 톤(LoL·로스트아크 계열), 한국어·영어 지원.

- **배포 주소**: https://keyboard-war-kellyhh.vercel.app
- Vercel 프로젝트: `keyboard-war`
- Supabase 프로젝트: `gbplwnjgzcmyqueumwgj`

---

## 버전

| 버전 | 위치 | 설명 |
| --- | --- | --- |
| v0.1 프로토타입 | `index.html` | 단일 HTML 파일. 브라우저로 바로 열어 실행. 같은 브라우저의 탭끼리만(localStorage + BroadcastChannel) 대전 가능. **삭제하지 않고 보존합니다.** |
| v0.3 (현재) | `app/`, `components/`, `lib/` | Next.js 16 + TypeScript + React 19. Supabase Realtime으로 실제 다른 사람과 매칭, Postgres에 전적 저장. Vercel 배포본. |

프로토타입은 저장소 루트의 `index.html` 하나로 끝납니다. 빌드도 설치도 필요 없습니다.

---

## 실행

```bash
npm install
cp .env.local.example .env.local   # 이미 있으면 생략
npm run dev                        # http://localhost:3000
```

`.env.local` 이 없어도 게임은 돌아갑니다. 이때는 상단 배지가 "오프라인"으로 바뀌고 봇 대전만 가능합니다.

환경변수는 두 개뿐이며 둘 다 공개 키입니다.

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

`service_role` 키는 클라이언트에 절대 넣지 않습니다.

---

## 게임 규칙 요약

- **라운드**: 제시된 구절을 먼저 정확히 완성한 쪽이 상대 체력을 깎습니다. 체력 100에서 시작.
- **한글 판정**: 한 음절을 초성·중성·종성으로 분해해 조합 중인 상태를 오타로 세지 않습니다. 라운드가 바뀔 때마다 입력창 자체를 교체해 IME 조합 상태를 버립니다(이전 음절이 다음 라운드에 붙는 버그 방지).
- **언어**: 오른쪽 상단 드롭다운. `한국어` = 한국어·영어 문제 혼합, `English` = 영어 문제만. 실제 대전 중에는 드롭다운을 숨깁니다.
- **콤보 / 기세**: 연속 격파로 콤보가 쌓이고 기세 게이지가 차면 필살 타격.
- **포션**: 공격력 포션(빨강)과 회복 포션(파랑)이 무작위로 떨어지며, 둘 모두에게 동시에 주어질 때도 있습니다. 콤보 5를 달성해도 지급됩니다. 받는 즉시 사용됩니다.
- **봇**: 난이도 1~10. 5에서 시작해 2문제마다 조정. **봇 대전은 끝나지 않습니다** — 세트가 끝나면 다음 세트로 이어지고, 실제 대기자가 나타나면 3초 안내 화면을 거쳐 곧바로 사람과의 대전으로 전환됩니다.
- **기권승**: 상대가 도중에 떠나면 남은 쪽에 기권승 결과(재도전 / 메뉴로)를 보여줍니다.
- **재도전**: 새 대기자가 있으면 그 사람과, 없으면 직전 상대와. 직전 상대가 사라졌다면 5초 대기 후 사람 또는 봇과 연결합니다.

메뉴는 `랭킹전` / `대전` / `스토리` 가로 배치.
`랭킹전` → 아직 시즌이 열리지 않았다는 안내.
`스토리` → 우주가 아직 생성되지 않았다는 안내 + 기운 모으기 클릭.
`대전` → `랜덤`(사람 먼저 찾고 없으면 봇, 봇이면 닉네임에 "봇" 표기) / `친구와 함께하기`(6자리 고유번호 교환, 대기실에서 시작 버튼).

---

## 구조

```
app/
  layout.tsx      메타데이터, 폰트(Cinzel / Noto Serif KR / Gowun Batang)
  page.tsx        화면 전환 오케스트레이터 (menu·ranked·story·versus·search·handoff·friend·room·battle·result)
  globals.css     프로토타입 스타일을 그대로 옮긴 전역 CSS
components/
  Battle.tsx      BattleEngine 마운트 (matchKey가 바뀔 때만 재생성)
  Backdrop.tsx    정글 배경 SVG, 안개, 포자, 엠블럼
lib/
  engine.ts       실제 전투 DOM과 루프를 직접 다루는 명령형 엔진 (키 입력마다 React 리렌더 없음)
  net.ts          Hall(매칭용 Presence 채널) + MatchLink(대전별 broadcast 채널)
  hangul.ts       한글 음절 분해 / 접두 비교
  words.ts        문제 풀(3단계), 봇 이름
  rules.ts        체력·피해량·봇 속도·포션 확률 등 상수와 계산
  i18n.ts         한국어·영어 문자열
  records.ts      전적 저장 / 최근 전적 조회
  supabase.ts     클라이언트 (키가 없으면 null → 오프라인 모드)
index.html        v0.1 프로토타입 (단일 파일, 그대로 보존)
```

React는 화면 전환만 담당하고, 전투 중 DOM은 `BattleEngine` 이 직접 씁니다. 타이핑마다 리렌더가 일어나지 않게 하려는 의도적인 분리입니다.

### 네트워크

- 매칭은 Supabase Realtime **Presence** 채널 `kw-hall-v1` 한 곳에서 이루어집니다. 대기 중인 사람이 모두 여기 모여 있고, 짝이 맞으면 id가 작은 쪽이 방을 만듭니다.
- 대전은 `kw-match-<matchId>` broadcast 채널에서 `round | prog | done | res | start | bye` 이벤트로 주고받습니다.
- 이탈 감지는 Presence의 `leave` 이벤트를 씁니다(프로토타입의 하트비트 감시 방식은 백그라운드 탭에서 오탐이 있었습니다).

### 전적

`public.guest_matches` 테이블에 한 대전당 한 행. **이긴 쪽만** 기록하므로 중복 행이 생기지 않습니다.
로그인은 아직 없고 닉네임은 일회용이며 중복을 허용합니다.

---

## 배포

Vercel 프로젝트 `keyboard-war` 로 배포합니다. 환경변수는 Vercel 프로젝트 설정에 production/preview/development 모두 등록되어 있습니다.

로컬에서 직접 배포하려면:

```bash
npm i -g vercel
vercel login
vercel link      # 기존 keyboard-war 프로젝트 선택
vercel --prod
```

깃 저장소(GitHub 등)에 올리고 Vercel에 연결하면 push마다 자동 배포됩니다. 이 방식이 가장 안전합니다.

---

## 다음 단계 후보

- 로그인 / 계정 (지금은 닉네임만)
- 랭킹전 시즌, 점수 계산
- 스토리 모드(모은 기운을 DB에 저장)
- 문제 풀 확장, 난이도별 구절 길이 조정
- 관전 / 리플레이
