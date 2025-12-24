
import React, { useRef, useEffect } from 'react';
import { GameMessage } from '../types';

interface GameChatProps {
  messages: GameMessage[];
}

const GameChat: React.FC<GameChatProps> = ({ messages }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div ref={scrollRef} className="absolute inset-0 overflow-y-auto px-6 py-10 space-y-12 scroll-smooth">
      {messages.length === 0 && (
        <div className="h-full flex flex-col items-center justify-center opacity-10">
          <p className="cinzel text-4xl tracking-[1em] mb-4 text-center">THE CHRONICLE</p>
          <div className="w-32 h-[1px] bg-neutral-500"></div>
        </div>
      )}
      
      {messages.map((msg) => (
        <div 
          key={msg.id} 
          className={`flex flex-col opacity-0 animate-fade-in ${
            msg.type === 'narrative' || msg.type === 'encounter' 
              ? 'items-center text-center max-w-4xl mx-auto' 
              : 'items-start max-w-2xl'
          }`}
          style={{ animationFillMode: 'forwards' }}
        >
          <div className="flex items-center gap-3 mb-4">
            <span className={`text-[10px] px-4 py-1.5 rounded-full uppercase tracking-[0.2em] font-bold border transition-colors ${
              msg.type === 'narrative' ? 'bg-amber-950/20 text-amber-500 border-amber-500/30' :
              msg.type === 'encounter' ? 'bg-red-950/40 text-red-500 border-red-500/40' :
              'bg-neutral-900/50 text-neutral-400 border-neutral-800'
            }`}>
              {msg.senderName}
            </span>
          </div>
          
          <div className={`relative transition-all duration-700 ${
            msg.type === 'narrative' ? 'text-2xl font-light text-amber-50/90 leading-relaxed font-serif italic' :
            msg.type === 'encounter' ? 'text-3xl font-bold text-red-50 py-8 px-10 bg-red-950/10 border-y border-red-500/20 shadow-[0_0_100px_rgba(239,68,68,0.05)]' :
            'text-lg text-neutral-300 leading-relaxed font-medium bg-neutral-900/10 px-6 py-4 rounded-2xl border border-white/5'
          }`}>
            {msg.content}
            
            {msg.imageUrl && (
              <div className="mt-8 rounded-2xl overflow-hidden shadow-2xl border border-neutral-800/50 transform hover:scale-[1.01] transition-transform duration-500">
                <img src={msg.imageUrl} alt="Scene Visual" className="w-full h-auto object-cover max-h-[600px]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"></div>
              </div>
            )}
          </div>
        </div>
      ))}
      <div className="h-24"></div>
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default GameChat;
