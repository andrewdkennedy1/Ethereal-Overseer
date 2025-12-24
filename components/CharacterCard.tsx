
import React from 'react';
import { Character } from '../types';

interface CharacterCardProps {
  character: Character;
  isActive?: boolean;
  onEdit?: () => void;
}

const CharacterCard: React.FC<CharacterCardProps> = ({ character, isActive, onEdit }) => {
  const hpPercent = (character.hp / character.maxHp) * 100;
  const mpPercent = (character.mp / character.maxMp) * 100;

  return (
    <div className={`relative overflow-hidden rounded-xl border-2 transition-all duration-500 transform ${
      isActive ? 'border-amber-400 scale-105 shadow-[0_0_30px_rgba(251,191,36,0.3)]' : 'border-neutral-900 opacity-70'
    }`}>
      <div className="h-40 w-full bg-neutral-900 relative overflow-hidden group">
        {character.image ? (
          <img src={character.image} alt={character.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-700 animate-pulse">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          </div>
        )}
        
        <div className="absolute top-2 right-2 bg-black/60 px-2 py-0.5 rounded border border-white/10 text-[9px] cinzel text-white">
          LVL {character.level}
        </div>

        <button 
          onClick={onEdit}
          className="absolute top-2 left-2 bg-black/60 p-1 rounded border border-white/10 text-white/40 hover:text-white transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        </button>

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/90 to-transparent p-3">
          <h3 className="cinzel text-sm font-bold text-white truncate">{character.name}</h3>
          <p className="text-[9px] text-amber-500 font-bold uppercase tracking-widest">{character.race} {character.class}</p>
        </div>
      </div>

      <div className="p-3 bg-black space-y-2">
        {/* Health Bar */}
        <div className="space-y-0.5">
          <div className="flex justify-between text-[7px] cinzel font-bold">
            <span className="text-neutral-500">VITALITY</span>
            <span className={character.hp < character.maxHp * 0.3 ? 'text-red-500 animate-pulse' : 'text-neutral-400'}>
              {character.hp} HP
            </span>
          </div>
          <div className="h-1 w-full bg-neutral-900 rounded-full overflow-hidden border border-white/5">
            <div 
              className={`h-full transition-all duration-1000 ${
                hpPercent > 60 ? 'bg-emerald-600 shadow-[0_0_5px_rgba(16,185,129,0.5)]' : hpPercent > 30 ? 'bg-amber-600' : 'bg-red-700'
              }`}
              style={{ width: `${hpPercent}%` }}
            />
          </div>
        </div>

        {/* Mana Bar */}
        <div className="space-y-0.5">
          <div className="flex justify-between text-[7px] cinzel font-bold">
            <span className="text-neutral-500">AETHER</span>
            <span className="text-blue-400">{character.mp} MP</span>
          </div>
          <div className="h-1 w-full bg-neutral-900 rounded-full overflow-hidden border border-white/5">
            <div 
              className="h-full bg-blue-600 transition-all duration-1000 shadow-[0_0_5px_rgba(37,99,235,0.5)]"
              style={{ width: `${mpPercent}%` }}
            />
          </div>
        </div>

        {/* Soul Log Summary */}
        <div className="pt-1.5 border-t border-neutral-900 flex justify-between items-center">
          <span className="text-[7px] cinzel text-neutral-600 uppercase">Soul Log</span>
          <span className="text-[7px] text-amber-600 font-bold">{character.memories.length} Entries</span>
        </div>
        {character.memories.length > 0 && (
          <p className="text-[8px] text-neutral-500 italic leading-tight line-clamp-1">
            "...{character.memories[character.memories.length - 1].content}"
          </p>
        )}
      </div>
    </div>
  );
};

export default CharacterCard;
