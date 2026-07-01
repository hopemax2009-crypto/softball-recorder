import { useState } from 'react';
import { HELP_CONTENT, type HelpPageId } from '../data/helpContent';
import { HelpModal } from './HelpModal';

interface Props {
  pageId: HelpPageId;
  className?: string;
}

export function PageHelpButton({ pageId, className = '' }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="操作說明"
        onClick={() => setOpen(true)}
        className={`w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white font-bold text-base flex items-center justify-center shrink-0 ${className}`}
      >
        ?
      </button>
      {open && <HelpModal content={HELP_CONTENT[pageId]} onClose={() => setOpen(false)} />}
    </>
  );
}
