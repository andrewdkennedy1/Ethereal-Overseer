
import React, { useEffect, useState } from 'react';
import { SETTING_SUGGESTIONS } from '../constants';
import { Character } from '../types';

interface OnboardingProps {
  characters: Record<string, Character>;
  onUpdateCharacters: (next: Record<string, Character>) => void;
  onStart: (setting: string) => void;
}

type OnboardingStep = 'SETTING' | 'PARTY';

const Onboarding: React.FC<OnboardingProps> = ({ characters, onUpdateCharacters, onStart }) => {
  const [input, setInput] = useState('');
  const [selectedSetting, setSelectedSetting] = useState('');
  const [step, setStep] = useState<OnboardingStep>('SETTING');
  const [drafts, setDrafts] = useState<Record<string, Character>>({ ...characters });
  const [activeCharId, setActiveCharId] = useState<string | null>(null);

  useEffect(() => {
    setDrafts({ ...characters });
    if (!activeCharId) {
      const firstId = Object.keys(characters)[0] || null;
      setActiveCharId(firstId);
    }
  }, [characters, activeCharId]);

  const applyCharacterUpdate = (id: string, patch: Partial<Character>) => {
    setDrafts(prev => {
      const next = { ...prev, [id]: { ...prev[id], ...patch } };
      onUpdateCharacters(next);
      return next;
    });
  };

  const handleSelectSetting = (setting: string) => {
    setSelectedSetting(setting);
    setInput(setting);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 px-4 backdrop-blur-sm">
      <div className="w-full max-w-4xl text-center space-y-8 animate-in fade-in zoom-in duration-700">
        <div className="space-y-2">
          <h1 className="text-6xl cinzel text-amber-400 glow-gold">Ethereal Overseer</h1>
          <p className="text-neutral-400 tracking-[0.2em] font-light">INITIATING MULTI-AGENT ADVENTURE PROTOCOL</p>
        </div>

        {step === 'SETTING' ? (
          <div className="bg-neutral-900/50 p-8 rounded-2xl border border-neutral-800 shadow-2xl space-y-6">
            <p className="text-lg text-neutral-300">Where shall our brave souls venture today?</p>
            
            <div className="flex flex-wrap justify-center gap-2">
              {SETTING_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSelectSetting(s)}
                  className={`px-4 py-2 text-sm rounded-full border transition-all ${
                    selectedSetting === s
                      ? 'bg-amber-600 text-white border-amber-500'
                      : 'bg-neutral-800 hover:bg-amber-600 hover:text-white border-neutral-700 text-neutral-400'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="relative mt-8">
              <input
                type="text"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setSelectedSetting(e.target.value);
                }}
                placeholder="Or forge your own destiny..."
                className="w-full bg-black border border-neutral-700 rounded-xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                onKeyDown={(e) => e.key === 'Enter' && input.trim() && setStep('PARTY')}
              />
              <button
                onClick={() => input.trim() && setStep('PARTY')}
                className="absolute right-2 top-2 bottom-2 px-6 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold cinzel transition-all"
              >
                Next
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-neutral-900/50 p-8 rounded-2xl border border-neutral-800 shadow-2xl space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="text-left">
                <p className="text-[10px] text-neutral-500 cinzel uppercase tracking-widest">Campaign Setting</p>
                <input
                  value={selectedSetting}
                  onChange={(e) => setSelectedSetting(e.target.value)}
                  className="mt-2 bg-black border border-neutral-700 rounded-lg px-4 py-2 text-sm text-neutral-200 w-full"
                  placeholder="Name the realm..."
                />
              </div>
              <button
                onClick={() => setStep('SETTING')}
                className="px-4 py-2 text-[10px] cinzel bg-neutral-800 border border-neutral-700 rounded hover:bg-neutral-700"
              >
                Back
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6 text-left">
              <div className="space-y-2">
                <p className="text-[10px] text-neutral-500 cinzel uppercase tracking-widest">Party Roster</p>
                <div className="space-y-2">
                  {Object.values(drafts).map((char) => (
                    <button
                      key={char.id}
                      onClick={() => setActiveCharId(char.id)}
                      className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                        activeCharId === char.id
                          ? 'bg-amber-600/20 border-amber-500 text-amber-200'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      <div className="text-sm font-semibold">{char.name}</div>
                      <div className="text-[10px] text-neutral-500">{char.class} • {char.race}</div>
                    </button>
                  ))}
                </div>
              </div>

              {activeCharId && drafts[activeCharId] && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] cinzel text-neutral-500 uppercase tracking-widest">Name</label>
                      <input
                        value={drafts[activeCharId].name}
                        onChange={(e) => applyCharacterUpdate(activeCharId, { name: e.target.value })}
                        className="mt-2 w-full bg-black border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] cinzel text-neutral-500 uppercase tracking-widest">Age</label>
                      <input
                        type="number"
                        value={drafts[activeCharId].age}
                        onChange={(e) => applyCharacterUpdate(activeCharId, { age: Number(e.target.value) || 0 })}
                        className="mt-2 w-full bg-black border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] cinzel text-neutral-500 uppercase tracking-widest">Class</label>
                      <input
                        value={drafts[activeCharId].class}
                        onChange={(e) => applyCharacterUpdate(activeCharId, { class: e.target.value })}
                        className="mt-2 w-full bg-black border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] cinzel text-neutral-500 uppercase tracking-widest">Race</label>
                      <input
                        value={drafts[activeCharId].race}
                        onChange={(e) => applyCharacterUpdate(activeCharId, { race: e.target.value })}
                        className="mt-2 w-full bg-black border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] cinzel text-neutral-500 uppercase tracking-widest">Persona</label>
                    <textarea
                      value={drafts[activeCharId].persona}
                      onChange={(e) => applyCharacterUpdate(activeCharId, { persona: e.target.value })}
                      className="mt-2 w-full bg-black border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 h-20"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] cinzel text-neutral-500 uppercase tracking-widest">System Prompt</label>
                    <textarea
                      value={drafts[activeCharId].systemMessage}
                      onChange={(e) => applyCharacterUpdate(activeCharId, { systemMessage: e.target.value })}
                      className="mt-2 w-full bg-black border border-neutral-700 rounded-lg px-3 py-2 text-xs text-neutral-200 h-28"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] cinzel text-neutral-500 uppercase tracking-widest">Visual Description</label>
                    <textarea
                      value={drafts[activeCharId].visualDescription}
                      onChange={(e) => applyCharacterUpdate(activeCharId, { visualDescription: e.target.value })}
                      className="mt-2 w-full bg-black border border-neutral-700 rounded-lg px-3 py-2 text-xs text-neutral-200 h-20"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <p className="text-[10px] text-neutral-600">Edits apply immediately to the party roster.</p>
              <button
                onClick={() => selectedSetting.trim() && onStart(selectedSetting.trim())}
                className="px-6 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold cinzel transition-all"
              >
                Start Campaign
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
