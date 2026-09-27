import type { Lang } from './words';

export interface Strings {
  tagline: string;
  ranked: string; versus: string; story: string;
  menuHint: string;
  nickLabel: string; nickPlaceholder: string; nickNote: string;
  rkTitle: string; rkLead: string; rkSub: string;
  stTitle: string; stLead: string; stSub: string;
  energyLabel: string;
  energyGoal: (n: number, g: number) => string;
  energyDone: string;
  vsTitle: string; vsLead: string; vsRandom: string; vsFriend: string;
  frTitle: string; frMyLabel: string; frMyNote: string; frEnterLabel: string;
  frPlaceholder: string;
  confirm: string; back: string; leave: string; startBtn: string; cancel: string;
  rmTitle: string; rmLead: string; rmYou: string; rmFriend: string;
  skTitle: string; skLead: string; skFound: string; skNone: string;
  skRematchAsk: string; skRematchGo: string;
  hoTitle: string; hoLead: string; hoYou: string; hoThem: string;
  rematchAsked: string;
  netSelf: string; netBad: string; netSearching: string; netNone: string;
  netJoined: string; netLeft: string; netDown: string;
  roomHost: string; roomGuest: string; copied: string;
  allyTitle: string; foeTitle: string;
  rage: string; round: string; you: string; rival: string;
  placeholder: string;
  modeBot: (lv: number) => string;
  modeRandom: string; modeFriend: string;
  wordKoTag: string; wordEnTag: string;
  imeKo: string; imeEn: string;
  capsOn: string; capsWarn: string;
  potAtk: string; potHeal: string;
  buffAtk: (n: number) => string;
  supply: string;
  setWin: string; setLose: string;
  seekFlag: string; exitHint: string;
  speedUnit: string;
  win: string; lose: string; forfeit: string;
  winSub: string; loseSub: string; forfeitSub: string;
  hitGood: string; hitBad: string; ult: string; countGo: string;
  comboFmt: (n: number) => string;
  stSpeedL: string; stAccL: string; stComboL: string; stRoundsL: string; stHpL: string;
  again: string; toMenu: string; resultHint: string;
  saved: string; saveFailed: string;
}

const ko: Strings = {
  tagline: '두 손이 무기다. 정글의 구절을 먼저 베어라.',
  ranked: '랭킹전', versus: '대전', story: '스토리',
  menuHint: '우측 상단에서 언어를 바꿀 수 있습니다.',
  nickLabel: '닉네임', nickPlaceholder: '이름을 정하세요',
  nickNote: '일회용입니다. 같은 이름을 여러 명이 써도 됩니다.',
  rkTitle: '랭킹전', rkLead: '아직 대전 기간이 아니에요.',
  rkSub: '시즌이 열리면 여기에서 순위를 겨루게 됩니다.',
  stTitle: '스토리', stLead: '우주가 아직 생성되지 않았어요.',
  stSub: '힘을 모아주세요. 기운이 충분히 쌓이면 첫 번째 별이 태어납니다.',
  energyLabel: '모인 기운',
  energyGoal: (n, g) => '첫 별까지 ' + (g - n).toLocaleString() + ' 남음',
  energyDone: '첫 번째 별이 깨어나고 있습니다.',
  vsTitle: '대전', vsLead: '상대를 고르세요.',
  vsRandom: '랜덤', vsFriend: '친구와 함께하기',
  frTitle: '친구와 함께하기', frMyLabel: '내 고유번호',
  frMyNote: '이 번호를 친구에게 알려주세요. 클릭하면 복사됩니다.',
  frEnterLabel: '친구 고유번호 입력', frPlaceholder: '예: K7X2M9',
  confirm: '확인', back: '돌아가기', leave: '나가기', startBtn: '시작', cancel: '취소',
  rmTitle: '대기실', rmLead: '둘 다 준비되면 시작하세요.',
  rmYou: '그대', rmFriend: '친구',
  skTitle: '랜덤 대전', skLead: '상대를 찾는 중…',
  skFound: '상대를 찾았습니다.',
  skNone: '접속 중인 상대가 없어 봇과 대전합니다.',
  skRematchAsk: '직전 상대에게 재대결을 청하는 중…',
  skRematchGo: '같은 상대와 다시 맞붙습니다.',
  hoTitle: '상대를 찾았습니다', hoLead: '실제 상대와의 대전이 곧 시작됩니다.',
  hoYou: '그대', hoThem: '상대',
  rematchAsked: '상대가 재대결을 청했습니다 — 곧 시작합니다',
  netSelf: '자기 번호는 입력할 수 없어요.',
  netBad: '6자리 번호를 입력해주세요.',
  netSearching: '친구를 찾는 중…',
  netNone: '그 번호로 접속한 친구를 찾지 못했어요. 친구가 같은 페이지를 열어둔 상태인지 확인해주세요.',
  netJoined: '연결되었습니다.', netLeft: '친구가 나갔습니다.',
  netDown: '서버에 연결하지 못했습니다. 봇과는 계속 대전할 수 있어요.',
  roomHost: '방장이라 시작 버튼을 누를 수 있어요.',
  roomGuest: '친구가 시작하기를 기다리는 중…',
  copied: '복사했습니다.',
  allyTitle: '그대', foeTitle: '적',
  rage: '기세', round: '라운드', you: '그대', rival: '적',
  placeholder: '여기에 입력하여 베어라',
  modeBot: (lv) => '봇 Lv.' + lv,
  modeRandom: '랜덤 대전', modeFriend: '친구 대전',
  wordKoTag: '한국어', wordEnTag: 'English',
  imeKo: '한글 입력 상태에서 진행하세요 · 한/영 키로 전환',
  imeEn: '영문 입력 상태에서 진행하세요 · 한/영 키로 전환',
  capsOn: 'CAPS LOCK', capsWarn: 'Caps Lock 이 켜져 있습니다 — 꺼주세요',
  potAtk: '공격력 포션', potHeal: '회복 포션',
  buffAtk: (n) => '공격 ×1.5 · ' + n,
  supply: '보 급',
  setWin: '세트 승리', setLose: '세트 패배',
  seekFlag: '대기자 탐색 중…', exitHint: 'Esc 로 나가기',
  speedUnit: '타/분',
  win: 'VICTORY', lose: 'DEFEAT', forfeit: '기권승',
  winSub: '내가 이겼다!', loseSub: '힝 졌당..',
  forfeitSub: '상대가 줄행랑을 쳤습니다. 당신의 포스가 대단합니다.',
  hitGood: '격파', hitBad: '피격', ult: '필살', countGo: '개전',
  comboFmt: (n) => n + ' 연격',
  stSpeedL: '타속', stAccL: '정확도', stComboL: '최고 연격',
  stRoundsL: '교전 수', stHpL: '남은 생명',
  again: '재도전', toMenu: '메뉴로', resultHint: 'Enter 로 재도전 · Esc 로 메뉴',
  saved: '전적이 기록되었습니다.', saveFailed: '전적을 기록하지 못했습니다.',
};

const en: Strings = {
  tagline: 'Your hands are the weapon. Cut the jungle’s words first.',
  ranked: 'Ranked', versus: 'Versus', story: 'Story',
  menuHint: 'Change the language from the top right.',
  nickLabel: 'Nickname', nickPlaceholder: 'Pick a name',
  nickNote: 'Throwaway — several people may share the same one.',
  rkTitle: 'Ranked', rkLead: 'The season hasn’t opened yet.',
  rkSub: 'Standings will be contested here once it does.',
  stTitle: 'Story', stLead: 'The universe hasn’t been created yet.',
  stSub: 'Lend your strength. When enough gathers, the first star is born.',
  energyLabel: 'Energy gathered',
  energyGoal: (n, g) => (g - n).toLocaleString() + ' to the first star',
  energyDone: 'The first star is waking.',
  vsTitle: 'Versus', vsLead: 'Choose your opponent.',
  vsRandom: 'Random', vsFriend: 'Play with a friend',
  frTitle: 'Play with a friend', frMyLabel: 'Your code',
  frMyNote: 'Share this with your friend. Click to copy.',
  frEnterLabel: 'Enter your friend’s code', frPlaceholder: 'e.g. K7X2M9',
  confirm: 'Connect', back: 'Back', leave: 'Leave', startBtn: 'Start', cancel: 'Cancel',
  rmTitle: 'Lobby', rmLead: 'Start once you’re both ready.',
  rmYou: 'You', rmFriend: 'Friend',
  skTitle: 'Random match', skLead: 'Looking for an opponent…',
  skFound: 'Opponent found.',
  skNone: 'Nobody is online right now — you’ll face a bot.',
  skRematchAsk: 'Asking your last opponent for a rematch…',
  skRematchGo: 'Facing the same opponent again.',
  hoTitle: 'Opponent found', hoLead: 'A live match begins in a moment.',
  hoYou: 'You', hoThem: 'Rival',
  rematchAsked: 'Your opponent wants a rematch — starting shortly',
  netSelf: 'That’s your own code.',
  netBad: 'Enter a 6-character code.',
  netSearching: 'Looking for your friend…',
  netNone: 'No friend found with that code. Make sure they have this page open.',
  netJoined: 'Connected.', netLeft: 'Your friend left.',
  netDown: 'Could not reach the server. Bot matches still work.',
  roomHost: 'You’re the host — press Start when ready.',
  roomGuest: 'Waiting for your friend to start…',
  copied: 'Copied.',
  allyTitle: 'You', foeTitle: 'Rival',
  rage: 'Rage', round: 'Round', you: 'You', rival: 'Rival',
  placeholder: 'Type here to strike',
  modeBot: (lv) => 'Bot Lv.' + lv,
  modeRandom: 'Random match', modeFriend: 'Friend match',
  wordKoTag: 'Korean', wordEnTag: 'English',
  imeKo: 'Switch your IME to Korean', imeEn: 'Type in English',
  capsOn: 'CAPS LOCK', capsWarn: 'Caps Lock is on — turn it off',
  potAtk: 'Power potion', potHeal: 'Healing potion',
  buffAtk: (n) => 'ATK ×1.5 · ' + n,
  supply: 'SUPPLY',
  setWin: 'SET WON', setLose: 'SET LOST',
  seekFlag: 'looking for players…', exitHint: 'Esc to leave',
  speedUnit: 'wpm',
  win: 'VICTORY', lose: 'DEFEAT', forfeit: 'WIN BY FORFEIT',
  winSub: 'I won!', loseSub: 'Aww, I lost…',
  forfeitSub: 'Your rival turned tail and fled. That presence of yours is fearsome.',
  hitGood: 'STRIKE', hitBad: 'STRUCK', ult: 'FINISHER', countGo: 'FIGHT',
  comboFmt: (n) => n + 'x combo',
  stSpeedL: 'Speed', stAccL: 'Accuracy', stComboL: 'Best combo',
  stRoundsL: 'Exchanges', stHpL: 'HP left',
  again: 'Fight Again', toMenu: 'Menu', resultHint: 'Enter to fight again · Esc for menu',
  saved: 'Result recorded.', saveFailed: 'Could not record the result.',
};

export const T: Record<Lang, Strings> = { ko, en };
