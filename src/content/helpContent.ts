export type HelpPageId = 'games' | 'record' | 'stats' | 'players' | 'settings' | 'recorder' | 'public-stats';

export interface HelpItem {
  label?: string;
  text: string;
}

export interface HelpSection {
  title: string;
  items: HelpItem[];
}

export interface HelpTab {
  id: string;
  label: string;
  sections: HelpSection[];
}

export interface HelpContent {
  title: string;
  sections?: HelpSection[];
  tabs?: HelpTab[];
}

const STATS_BATTING_SECTIONS: HelpSection[] = [
  {
    title: '基本打擊指標',
    items: [
      { label: '打擊率 AVG', text: '安打 ÷ 打數' },
      { label: '上壘率 OBP', text: '(安打+保送+死球) ÷ (打數+保送+死球+犧飛)' },
      { label: '長打率 SLG', text: '總壘打數 ÷ 打數' },
      { label: '純長打率 ISO', text: '(二安+三安×2+全壘×3) ÷ 打數' },
      { label: '幸運值', text: '失誤上壘 ÷ 打數' },
      { label: '惡運值', text: '雙殺 ÷ 打數' },
      { label: '滾球出局比率', text: '滾球出局 ÷ (滾球出局+飛球出局)' },
      { label: '飛球出局比率', text: '飛球出局 ÷ (滾球出局+飛球出局)' },
    ],
  },
  {
    title: '進攻指標',
    items: [
      {
        label: '慢壘 wOBA',
        text: '(0.7×保送+0.9×一安+1.25×二安+1.6×三安+2.0×全壘) ÷ 打席',
      },
      {
        label: '進攻貢獻分',
        text: '(球員 wOBA ÷ 全隊平均 wOBA) × 100。100＝全隊平均。',
      },
    ],
  },
  {
    title: '打擊雷達圖（七軸，0～100）',
    items: [
      { label: '打擊率', text: '雷達分 = min(100, AVG ÷ 0.700 × 100)' },
      { label: '上壘率', text: '雷達分 = min(100, OBP ÷ 0.750 × 100)' },
      { label: '幸運值', text: '雷達分 = min(100, 幸運值 ÷ 0.200 × 100)' },
      { label: '惡運值', text: '雷達分 = min(100, 惡運值 ÷ 0.150 × 100)' },
      { label: '長打爆發力', text: '雷達分 = min(100, ISO ÷ 0.600 × 100)' },
      { label: '滾球出局比率', text: '雷達分 = min(100, 比率 ÷ 1.000 × 100)' },
      { label: '飛球出局比率', text: '雷達分 = min(100, 比率 ÷ 1.000 × 100)' },
    ],
  },
];

const STATS_PITCHING_SECTIONS: HelpSection[] = [
  {
    title: '資料來源',
    items: [
      { text: '失分：對方每得 1 分時，若紀錄的投手 P 為該球員則計入 1 失分。' },
      { text: '投球半局：對方半局「完成並下一局」時指派投手 P 的半局（含 0 失分）。' },
      { text: '出賽：有投球半局紀錄的不同比賽場數。' },
    ],
  },
  {
    title: '基本投手指標',
    items: [
      { label: '防禦率 ERA', text: '(失分 × 7) ÷ 投球半局（7 局制估算）' },
      { label: '零失分率', text: '零失分半局 ÷ 投球半局' },
      { label: '半局失分', text: '失分 ÷ 投球半局' },
      { label: '場均失分', text: '失分 ÷ 出賽' },
      { label: '出勤度', text: '投球半局 ÷ 出賽（平均每場投幾個半局）' },
    ],
  },
  {
    title: '投手雷達圖（五軸，越高越好）',
    items: [
      {
        label: '防禦率',
        text: '雷達分 = min(100, max(0, (10 − ERA) ÷ 10 × 100))。ERA 越低分數越高；ERA ≥ 10 為 0 分。',
      },
      { label: '零失分率', text: '雷達分 = min(100, 零失分率 × 100)' },
      {
        label: '半局失分',
        text: '雷達分 = min(100, max(0, (1.5 − 半局失分) ÷ 1.5 × 100))。越低越好。',
      },
      { label: '出勤度', text: '雷達分 = min(100, 出勤度 ÷ 5 × 100)。平均每場 5 半局為滿分。' },
      {
        label: '場均失分',
        text: '雷達分 = min(100, max(0, (4 − 場均失分) ÷ 4 × 100))。越低越好。',
      },
    ],
  },
];

const STATS_TEAM_SECTIONS: HelpSection[] = [
  {
    title: '納入條件',
    items: [
      { text: '僅統計已標記「比賽完成」且有得分紀錄的場次。' },
      { text: '勝負依雙方總分判定；和局另計。' },
    ],
  },
  {
    title: '計算方式',
    items: [
      { label: '勝率', text: '勝 ÷ (勝 + 敗)。和局不計入勝率分母。' },
      { label: '各季戰績', text: '依賽季篩選比賽後加總勝敗和。' },
      { label: '對戰勝率表', text: '依對手名稱分組，分別計算勝敗和與勝率。' },
    ],
  },
];

export const HELP_CONTENT: Record<HelpPageId, HelpContent> = {
  games: {
    title: '比賽管理 · 操作說明',
    sections: [
      {
        title: '基本操作',
        items: [
          { text: '新增賽季後，可建立比賽並選擇先攻或後攻。' },
          { text: '點擊比賽卡片進入紀錄；若顯示「未排先發」，請先到紀錄頁「守位」排定先發。' },
          { text: '「開啟 QR 共用」可讓紀錄員掃描加入即時紀錄。' },
          { text: '比賽結束後按「標記比賽完成」，紀錄將變為唯讀。' },
        ],
      },
      {
        title: '字卡標示',
        items: [
          { label: '勝 / 負', text: '比賽完成且雙方有得分紀錄時，依總分顯示勝或負。' },
          { label: '已完成', text: '已標記結束的比賽，無法再編輯或開 QR。' },
          { label: '即時共用中', text: 'QR 房間仍開啟，紀錄員可同步紀錄。' },
          { label: '未排先發', text: '尚未設定上場球員與棒次。' },
        ],
      },
    ],
  },
  record: {
    title: '打擊紀錄 · 操作說明',
    sections: [
      {
        title: '計分表',
        items: [
          { text: '先攻時我方在上方、後攻時我方在下方（符合棒球场次順序）。' },
          { text: '點擊局次可切換紀錄位置；綠色為我方半局，橘色為對方半局。' },
          { text: '我方 3 出局自動換局；對方進攻時可用 ± 輸入得分（每分自動紀錄當下投手 P）。' },
        ],
      },
      {
        title: '紀錄打席',
        items: [
          { text: '「紀錄」分頁：點打序中的球員 → 選結果 → 設定打點與出局數。' },
          { text: '「守位」分頁：點守位選球員並排棒次（守備位置；DH/EP 請至棒次頁）。' },
          { text: '「棒次」分頁：選人後可一併設定守位；DH/EP 僅排棒次、不佔守備。' },
          { text: '紀錄分頁：上方為目前棒次，下方為下 3 棒；其餘棒次每頁 3 棒翻頁。' },
          { text: '點擊紀錄列表可編輯打點/出局；已完成比賽僅供查閱。' },
        ],
      },
    ],
  },
  stats: {
    title: '成績統計 · 說明',
    tabs: [
      {
        id: 'usage',
        label: '操作',
        sections: [
          {
            title: '基本操作',
            items: [
              { text: '切換「打擊／投手／球隊戰績」與「賽季／累計」，點球員卡片查看詳細統計與雷達圖。' },
              { text: '「發布公開統計」可產生連結，供任何人唯讀查詢（無需登入）。' },
            ],
          },
        ],
      },
      {
        id: 'batting',
        label: '打擊',
        sections: STATS_BATTING_SECTIONS,
      },
      {
        id: 'pitching',
        label: '投手',
        sections: STATS_PITCHING_SECTIONS,
      },
      {
        id: 'team',
        label: '球隊戰績',
        sections: STATS_TEAM_SECTIONS,
      },
    ],
  },
  players: {
    title: '球員管理 · 操作說明',
    sections: [
      {
        title: '基本操作',
        items: [
          { text: '新增球員姓名與背號（選填）。' },
          { text: '球員資料全隊共用，可在紀錄頁「先發」分頁選擇上場。' },
          { text: '刪除球員不會刪除既有打席紀錄，但統計仍會保留歷史資料。' },
        ],
      },
    ],
  },
  settings: {
    title: '設定 · 操作說明',
    sections: [
      {
        title: '雲端存檔',
        items: [
          { text: '登入帳號後資料自動同步 Firebase，換裝置登入同一帳號即可取回。' },
          { text: '「立即同步到雲端」可手動強制上傳最新資料。' },
        ],
      },
      {
        title: '本機備份',
        items: [
          { text: '匯出 JSON 可備份完整資料；匯入 JSON 可還原或合併資料。' },
        ],
      },
    ],
  },
  recorder: {
    title: '紀錄員模式 · 操作說明',
    sections: [
      {
        title: '加入比賽',
        items: [
          { text: '掃描主控端 QR Code 或輸入場次代碼與 PIN 加入。' },
          { text: '加入後可即時紀錄打席，變更會同步至主控端。' },
        ],
      },
      {
        title: '紀錄操作',
        items: [
          { text: '與主控端相同：點打序球員紀錄打席、輸入對方得分。' },
          { text: '紀錄員無法修改先發名單，請由主控端設定。' },
        ],
      },
    ],
  },
  'public-stats': {
    title: '公開統計 · 說明',
    tabs: [
      {
        id: 'usage',
        label: '操作',
        sections: [
          {
            title: '使用方式',
            items: [
              { text: '此頁面為唯讀，由主控端發布後供任何人查詢。' },
              { text: '可切換賽季/累計，點球員查看雷達圖與各項指標。' },
            ],
          },
        ],
      },
      {
        id: 'batting',
        label: '打擊',
        sections: STATS_BATTING_SECTIONS,
      },
      {
        id: 'pitching',
        label: '投手',
        sections: STATS_PITCHING_SECTIONS,
      },
      {
        id: 'team',
        label: '球隊戰績',
        sections: STATS_TEAM_SECTIONS,
      },
    ],
  },
};
