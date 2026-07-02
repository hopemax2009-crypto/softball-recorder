import { useState } from 'react';
import type { HelpContent, HelpItem, HelpSection } from '../content/helpContent';

interface Props {
  content: HelpContent;
  onClose: () => void;
}

function HelpSections({ sections }: { sections: HelpSection[] }) {
  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <div key={section.title}>
          <h3 className="text-sm font-semibold text-gray-800 mb-2">{section.title}</h3>
          <ul className="space-y-2">
            {section.items.map((item: HelpItem, i) => (
              <li key={i} className="text-sm text-gray-600 leading-relaxed">
                {item.label && (
                  <span className="font-medium text-field-green">{item.label}：</span>
                )}
                {item.text}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function HelpModal({ content, onClose }: Props) {
  const tabs = content.tabs ?? [];
  const [activeTabId, setActiveTabId] = useState(tabs[0]?.id ?? '');
  const activeSections =
    tabs.length > 0
      ? tabs.find((tab) => tab.id === activeTabId)?.sections ?? tabs[0].sections
      : content.sections ?? [];

  return (
    <>
      <button
        type="button"
        aria-label="關閉說明"
        className="fixed inset-0 z-[80] bg-black/40"
        onClick={onClose}
      />
      <div className="fixed inset-x-4 top-[10dvh] z-[90] bg-white rounded-2xl shadow-2xl max-h-[80dvh] flex flex-col max-w-lg mx-auto">
        <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-lg text-field-green">{content.title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 font-bold"
          >
            ✕
          </button>
        </div>

        {tabs.length > 0 && (
          <div className="flex-shrink-0 px-4 pt-3 pb-2 border-b border-gray-100">
            <div className="flex gap-1.5 bg-gray-100 rounded-xl p-1">
              {tabs.map((tab) => {
                const isActive = tab.id === activeTabId;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTabId(tab.id)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                      isActive ? 'bg-white text-field-green shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          <HelpSections sections={activeSections} />
        </div>
      </div>
    </>
  );
}
