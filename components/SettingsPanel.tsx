import React from 'react';
import { AppSettings, LlmProvider } from '../types';

interface SettingsPanelProps {
  settings: AppSettings;
  onChange: (next: AppSettings) => void;
  onClose: () => void;
}

const providerLabels: Record<LlmProvider, string> = {
  gemini: 'Gemini',
  lmstudio: 'LM Studio'
};

const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onChange, onClose }) => {
  const update = (patch: Partial<AppSettings>) => onChange({ ...settings, ...patch });

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[120] backdrop-blur-sm">
      <div className="bg-neutral-950 border border-neutral-800 w-full max-w-lg rounded-2xl p-6 space-y-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="cinzel text-xl text-amber-500">Arcane Settings</h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-200 text-lg font-bold">✕</button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] cinzel text-neutral-500 uppercase tracking-widest">LLM Provider</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(providerLabels) as LlmProvider[]).map((provider) => (
                <button
                  key={provider}
                  onClick={() => update({ llmProvider: provider })}
                  className={`py-2 rounded-lg border text-[11px] cinzel transition-all ${
                    settings.llmProvider === provider
                      ? 'bg-amber-600/20 border-amber-500 text-amber-300'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  {providerLabels[provider]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] cinzel text-neutral-500 uppercase tracking-widest">Model</label>
            <input
              value={settings.llmModel}
              onChange={(e) => update({ llmModel: e.target.value })}
              className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-xs"
              placeholder="Model name"
            />
            <p className="text-[10px] text-neutral-600">Used for all text calls in the current session.</p>
          </div>

          {settings.llmProvider === 'lmstudio' && (
            <div className="space-y-2">
              <label className="text-[10px] cinzel text-neutral-500 uppercase tracking-widest">LM Studio URL</label>
              <input
                value={settings.lmStudioBaseUrl}
                onChange={(e) => update({ lmStudioBaseUrl: e.target.value })}
                className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-xs"
                placeholder="http://localhost:1234/v1"
              />
            </div>
          )}

          <div className="flex items-center justify-between border border-neutral-800 rounded-xl px-4 py-3 bg-neutral-900/40">
            <div>
              <div className="text-[11px] cinzel text-neutral-400">Image Generation</div>
              <div className="text-[10px] text-neutral-600">Disable to skip portraits and scene art.</div>
            </div>
            <button
              onClick={() => update({ enableImageGeneration: !settings.enableImageGeneration })}
              className={`w-12 h-6 rounded-full border transition-all ${
                settings.enableImageGeneration
                  ? 'bg-amber-600/30 border-amber-500'
                  : 'bg-neutral-800 border-neutral-700'
              }`}
            >
              <span
                className={`block w-5 h-5 rounded-full transition-transform ${
                  settings.enableImageGeneration ? 'translate-x-6 bg-amber-400' : 'translate-x-1 bg-neutral-500'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[11px] cinzel bg-amber-600 rounded-lg text-white shadow-lg shadow-amber-900/20"
          >
            Seal Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
