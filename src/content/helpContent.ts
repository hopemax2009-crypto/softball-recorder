export type HelpPageId = 'games' | 'record' | 'stats' | 'players' | 'settings' | 'recorder' | 'public-stats';

export interface HelpItem {
  label?: string;
  text: string;
}

export interface HelpSection {
  title: string;
  items: HelpItem[];
}

export interface HelpContent {
  title: string;
  sections: HelpSection[];
}

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
    title: '成績統計 · 操作說明',
    sections: [
      {
        title: '基本操作',
        items: [
          { text: '切換「打擊／投手／球隊戰績」與「賽季／累計」，點球員卡片查看詳細統計。' },
          { text: '「球隊戰績」分頁顯示各季與累計勝率，以及對各對手的對戰勝率表（需標記比賽完成）。' },
          { text: '投手成績依對方得分時紀錄的投手 P 計算失分與防禦率，詳情含投手雷達圖。' },
          { text: '「發布公開統計」可產生連結，供任何人唯讀查詢（無需登入）。' },
        ],
      },
      {
        title: '雷達圖七軸',
        items: [
          { label: '打擊率', text: '安打 ÷ 打數（滿分 .700）' },
          { label: '上壘率', text: '(安打+保送+死球) ÷ (打數+保送+死球+犧飛)（滿分 .750）' },
          { label: '幸運值', text: '失誤 ÷ 打數（滿分 .200）' },
          { label: '長打爆發力', text: '(二安+三安×2+全壘×3) ÷ 打數（滿分 .600）' },
          { label: '惡運值', text: '雙殺 ÷ 打數（雷達滿分 .150）' },
          { label: '滾球出局比率', text: '滾球出局 ÷ (滾球出局+飛球出局)（滿分 1.000）' },
          { label: '飛球出局比率', text: '飛球出局 ÷ (滾球出局+飛球出局)（滿分 1.000）' },
        ],
      },
      {
        title: '進攻指標',
        items: [
          { label: '慢壘 wOBA', text: '(0.7×保送+0.9×一安+1.25×二安+1.6×三安+2.0×全壘) ÷ 打席' },
          {
            label: '進攻貢獻分',
            text: '(球員 wOBA ÷ 全隊平均 wOBA) × 100。100＝平均，140＝高出 40%，70＝低 30%。',
          },
        ],
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
    sections: [
      {
        title: '使用方式',
        items: [
          { text: '此頁面為唯讀，由主控端發布後供任何人查詢。' },
          { text: '可切換賽季/累計，點球員查看雷達圖與各項指標。' },
        ],
      },
      {
        title: '指標說明',
        items: [
          { label: 'wOBA / 貢獻分', text: '衡量進攻貢獻；貢獻分 100 為全隊平均。' },
          { label: '雷達圖', text: '打擊率、上壘率、幸運值、長打爆發力、惡運值、滾球比率、飛球比率七維能力。' },
        ],
      },
    ],
  },
};
