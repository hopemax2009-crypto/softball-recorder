import { buildRecorderJoinUrl, qrCodeImageUrl } from '../utils/liveRoom';
import { Button, Card } from './ui';

interface Props {
  roomId: string;
  pin: string;
  opponent: string;
  onClose: () => void;
}

export function QRShareModal({ roomId, pin, opponent, onClose }: Props) {
  const joinUrl = buildRecorderJoinUrl(roomId, pin);
  const qrUrl = qrCodeImageUrl(joinUrl);

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert(`已複製${label}`);
    } catch {
      prompt(`請手動複製${label}`, text);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="font-bold text-lg text-center text-field-green">即時共用場次</h3>
        <p className="text-sm text-center text-gray-600 mt-1">vs {opponent}</p>
        <p className="text-xs text-center text-gray-500 mt-2">
          請其他紀錄員用手機掃描 QR Code，即可加入紀錄（無需設定）
        </p>

        <div className="flex justify-center my-4">
          <img src={qrUrl} alt="QR Code" className="rounded-xl border-4 border-field-green/20" width={220} height={220} />
        </div>

        <div className="space-y-2 text-center">
          <div className="bg-gray-50 rounded-xl py-2">
            <p className="text-xs text-gray-500">場次代碼</p>
            <p className="text-xl font-bold tracking-widest">{roomId}</p>
          </div>
          <div className="bg-gray-50 rounded-xl py-2">
            <p className="text-xs text-gray-500">PIN 碼</p>
            <p className="text-2xl font-bold tracking-widest text-field-green">{pin}</p>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button variant="secondary" onClick={() => copyText(joinUrl, '連結')} className="flex-1 text-sm">
            複製連結
          </Button>
          <Button variant="secondary" onClick={() => copyText(`${roomId} / ${pin}`, '代碼')} className="flex-1 text-sm">
            複製代碼
          </Button>
        </div>

        <Button onClick={onClose} className="w-full mt-3">開始主控</Button>
      </Card>
    </div>
  );
}
