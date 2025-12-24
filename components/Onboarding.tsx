
import React, { useState } from 'react';
import { SETTING_SUGGESTIONS } from '../constants';

interface OnboardingProps {
  onStart: (setting: string) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onStart }) => {
  const [input, setInput] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 px-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl text-center space-y-8 animate-in fade-in zoom-in duration-700">
        <div className="space-y-2">
          <h1 className="text-6xl cinzel text-amber-400 glow-gold">Ethereal Overseer</h1>
          <p className="text-neutral-400 tracking-[0.2em] font-light">INITIATING MULTI-AGENT ADVENTURE PROTOCOL</p>
        </div>

        <div className="bg-neutral-900/50 p-8 rounded-2xl border border-neutral-800 shadow-2xl space-y-6">
          <p className="text-lg text-neutral-300">Where shall our brave souls venture today?</p>
          
          <div className="flex flex-wrap justify-center gap-2">
            {SETTING_SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => onStart(s)}
                className="px-4 py-2 text-sm rounded-full bg-neutral-800 hover:bg-amber-600 hover:text-white border border-neutral-700 transition-all text-neutral-400"
              >
                {s}
              </button>
            ))}
          </div>

          <div className="relative mt-8">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Or forge your own destiny..."
              className="w-full bg-black border border-neutral-700 rounded-xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
              onKeyDown={(e) => e.key === 'Enter' && input.trim() && onStart(input)}
            />
            <button
              onClick={() => input.trim() && onStart(input)}
              className="absolute right-2 top-2 bottom-2 px-6 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold cinzel transition-all"
            >
              Begin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
