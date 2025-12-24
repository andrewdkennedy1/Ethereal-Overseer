
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AgentType, AppSettings, Character, GameMessage, GameState, InventoryItem, WorldImpact, MemoryEntry } from './types';
import { DEFAULT_SETTINGS, INITIAL_CHARACTERS, SYSTEM_PROMPTS } from './constants';
import { generateImage, getLLMResponse, summarizeChronicle } from './services/llm';
import CharacterCard from './components/CharacterCard';
import GameChat from './components/GameChat';
import Onboarding from './components/Onboarding';
import SettingsPanel from './components/SettingsPanel';

type AutoPhase = 'IDLE' | 'PARTY_INTENT' | 'DM_RESOLUTION' | 'META_COMMENT';
type SideTab = 'LOG' | 'OVERSEER';
const SETTINGS_STORAGE_KEY = 'eo-settings';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    currentScene: 'Introduction',
    setting: '',
    history: [],
    inventory: [
      { id: '1', name: 'Rations', quantity: 10, description: 'Standard trail food.' },
      { id: '2', name: 'Torch', quantity: 5, description: 'Standard torch.' }
    ],
    gold: 50,
    worldAlmanac: [],
    sharedMemories: [],
    combat: { isActive: false, round: 1, turnIndex: 0, order: [] }
  });

  const [characters, setCharacters] = useState<Record<string, Character>>(INITIAL_CHARACTERS);
  const [isStarted, setIsStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [activeCharacterId, setActiveCharacterId] = useState<string | null>(null);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [activeTab, setActiveTab] = useState<SideTab>('LOG');
  const [settings, setSettings] = useState<AppSettings>({ ...DEFAULT_SETTINGS });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [autoPhase, setAutoPhase] = useState<AutoPhase>('IDLE');
  const [injectionQueue, setInjectionQueue] = useState<string[]>([]);
  
  const autoLoopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const imageCache = useRef<Record<string, string>>({});
  const settingsLoadedRef = useRef(false);
  const forcedSpeakerQueueRef = useRef<string[]>([]);
  const playerTurnsSinceDmRef = useRef(0);

  useEffect(() => {
    if (settingsLoadedRef.current) return;
    settingsLoadedRef.current = true;
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      setSettings(prev => ({
        ...prev,
        ...parsed
      }));
    } catch {
      console.warn('Failed to parse saved settings');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const addMessage = useCallback((msg: Partial<GameMessage>) => {
    const newMsg: GameMessage = {
      id: Math.random().toString(36).substr(2, 9),
      sender: msg.sender || 'System',
      senderName: msg.senderName || 'Overseer',
      content: msg.content || '',
      timestamp: Date.now(),
      type: msg.type || 'system',
      imageUrl: msg.imageUrl,
      metadata: msg.metadata
    };
    setGameState(prev => ({
      ...prev,
      history: [...prev.history, newMsg]
    }));
  }, []);

  const handleToolCalls = useCallback((calls: any[], speakerId: string) => {
    calls.forEach(call => {
      const { name, args } = call;
      
      let result = "Success";

      switch (name) {
        case 'update_health':
          setCharacters(prev => {
            const char = prev[args.characterId];
            if (!char) return prev;
            return {
              ...prev,
              [args.characterId]: { ...char, hp: Math.max(0, Math.min(char.maxHp, char.hp + args.amount)) }
            };
          });
          break;
        case 'update_mana':
          setCharacters(prev => {
            const char = prev[args.characterId];
            if (!char) return prev;
            return {
              ...prev,
              [args.characterId]: { ...char, mp: Math.max(0, Math.min(char.maxMp, char.mp + args.amount)) }
            };
          });
          break;
        case 'record_memory':
          const newEntry: MemoryEntry = {
            id: Math.random().toString(36).substr(2, 9),
            content: args.content,
            timestamp: Date.now(),
            tags: args.tags || [],
            isShared: !!args.isShared,
            sourceId: speakerId
          };
          if (args.isShared) {
            setGameState(prev => ({ ...prev, sharedMemories: [...prev.sharedMemories, newEntry] }));
          } else {
            setCharacters(prev => {
              const char = prev[speakerId];
              if (!char) return prev;
              return { ...prev, [speakerId]: { ...char, memories: [...char.memories, newEntry] } };
            });
          }
          break;
        case 'query_memories':
          const query = (args.query || "").toLowerCase();
          const charMem = characters[speakerId]?.memories || [];
          const globalMem = gameState.sharedMemories;
          const found = [...charMem, ...globalMem].filter(m => 
            m.content.toLowerCase().includes(query) || 
            m.tags.some(t => t.toLowerCase().includes(query))
          );
          result = found.length > 0 
            ? `Found ${found.length} relevant memories:\n` + found.map(m => `- ${m.content}`).join('\n')
            : "No relevant memories found in database.";
          break;
        case 'modify_inventory':
          setGameState(prev => {
            const existing = prev.inventory.find(i => i.name === args.itemName);
            if (args.action === 'ADD') {
              if (existing) return { ...prev, inventory: prev.inventory.map(i => i.name === args.itemName ? { ...i, quantity: i.quantity + args.quantity } : i) };
              return { ...prev, inventory: [...prev.inventory, { id: Math.random().toString(), name: args.itemName, quantity: args.quantity, description: args.description || "" }] };
            } else {
              return { ...prev, inventory: prev.inventory.filter(i => i.name !== args.itemName || i.quantity > args.quantity).map(i => i.name === args.itemName ? { ...i, quantity: i.quantity - args.quantity } : i) };
            }
          });
          break;
        case 'update_gold':
          setGameState(prev => ({
            ...prev,
            gold: args.action === 'ADD' ? prev.gold + args.amount : Math.max(0, prev.gold - args.amount)
          }));
          break;
        case 'log_world_event':
          setGameState(prev => ({
            ...prev,
            worldAlmanac: [...prev.worldAlmanac, { ...args, timestamp: Date.now() }]
          }));
          break;
        case 'set_combat_state':
          setGameState(prev => ({
            ...prev,
            combat: { ...prev.combat, isActive: args.active, order: args.initiativeOrder || [], round: 1, turnIndex: 0 }
          }));
          break;
        case 'address_character':
          if (args.targetId) {
            const directId = String(args.targetId);
            const foundById = characters[directId] ? directId : null;
            const foundByName = Object.values(characters).find(c => c.name.toLowerCase() === directId.toLowerCase());
            const resolvedId = foundById || foundByName?.id;
            if (resolvedId) forcedSpeakerQueueRef.current.push(resolvedId);
          }
          break;
      }

      // Log formatted tool call with result
      addMessage({
        sender: 'system',
        senderName: 'Engine',
        content: `Mechanical update: ${name.replace(/_/g, ' ')}`,
        type: 'mechanic',
        metadata: {
          toolName: name,
          args: args,
          result: result
        }
      });
      
      return result;
    });
  }, [addMessage, characters, gameState.sharedMemories]);

  const getStoryWindow = useCallback((history: GameMessage[]) => {
    return history
      .filter(m => m.type === 'narrative' || m.type === 'dialogue' || m.type === 'encounter')
      .slice(-12)
      .map(m => `${m.senderName}: ${m.content}`)
      .join('\n');
  }, []);

  const getPlayerStoryWindow = useCallback((history: GameMessage[]) => {
    return history
      .filter(m => m.type === 'narrative' || m.type === 'dialogue' || m.type === 'encounter')
      .slice(-8)
      .map(m => {
        const speaker = m.senderName === 'Dungeon Master' ? 'Narration' : m.senderName;
        return `${speaker}: ${m.content}`;
      })
      .join('\n');
  }, []);

  const formatMemories = (entries: MemoryEntry[], limit = 4) => {
    if (!entries.length) return 'None yet.';
    return entries.slice(-limit).map(m => `- ${m.content}`).join('\n');
  };

  const formatPartyInventory = (items: InventoryItem[]) => {
    if (!items.length) return 'None.';
    return items.map(i => `${i.name} x${i.quantity}`).join(', ');
  };

  const playerResponseRules = [
    'Respond only in-character, first person.',
    'No out-of-character analysis or system references.',
    'Do not repeat or quote narration or other speakers.',
    'Do not include speaker labels like "Dungeon Master:".',
    'Do not narrate the world beyond your immediate senses.',
    'Keep it concise: 2-4 sentences plus a brief intention or question.',
    'If you want another party member to respond next, call address_character with their id exactly as shown.'
  ].join(' ');

  const enforceShortReply = (text: string, maxSentences: number, maxChars: number) => {
    if (!text) return text;
    const trimmed = text.replace(/\s+/g, ' ').trim();
    if (!trimmed) return trimmed;
    const sentences = trimmed.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [trimmed];
    const limited = sentences.slice(0, maxSentences).join(' ').trim();
    return limited.length > maxChars ? `${limited.slice(0, maxChars).trim()}...` : limited;
  };

  const sanitizePlayerReply = (text: string) => {
    if (!text) return text;
    const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
    const filtered = lines.filter(line => {
      const lower = line.toLowerCase();
      if (lower.startsWith('dungeon master:')) return false;
      if (lower.startsWith('narration:')) return false;
      if (lower.startsWith('dm:')) return false;
      return true;
    });
    const unique: string[] = [];
    filtered.forEach(line => {
      if (!unique.includes(line)) unique.push(line);
    });
    return enforceShortReply(unique.join(' '), 3, 360);
  };

  const shouldRunDmTurn = (opts: { injected: boolean; forcedQueued: boolean }) => {
    if (opts.injected) return true;
    if (playerTurnsSinceDmRef.current >= 2) return true;
    if (!opts.forcedQueued && playerTurnsSinceDmRef.current >= 1) return true;
    return false;
  };

  const processStructuredTurn = useCallback(async () => {
    if (!isStarted || isLoading) return;
    setIsLoading(true);

    let currentHistory = [...gameState.history];
    const historyContext = getStoryWindow(currentHistory);

    // PHASE 1: PARTY INTENT
    setAutoPhase('PARTY_INTENT');
    let turnContext = "";
    let injectedInThisTurn = false;

    const runPlayerTurn = async () => {
      if (injectionQueue.length > 0) {
        const injected = injectionQueue[0];
        setInjectionQueue(prev => prev.slice(1));
        addMessage({ sender: 'player', senderName: 'The Guide', content: injected, type: 'dialogue' });
        injectedInThisTurn = true;
        turnContext = `The Guide intervenes: "${injected}"`;
        return;
      }

      const partyKeys = Object.keys(characters);
      const forcedSpeakerId = forcedSpeakerQueueRef.current.shift();
      const speakerId = forcedSpeakerId && characters[forcedSpeakerId]
        ? forcedSpeakerId
        : partyKeys[Math.floor(Math.random() * partyKeys.length)];
      setActiveCharacterId(speakerId);
      
      const char = characters[speakerId];
      // Inject few recent memories automatically to nudge the AI
      const workingMemory = char.memories.slice(-3).map(m => m.content).join("; ");
      
      const playerContext = [
        `Setting: ${gameState.setting || 'Unknown'}`,
        `Current Scene: ${gameState.currentScene}`,
        `Story so far:\n${getPlayerStoryWindow(currentHistory) || 'No narrative yet.'}`,
        `Shared Memories:\n${formatMemories(gameState.sharedMemories)}`,
        `Your Memories:\n${formatMemories(char.memories)}`,
        `Your Status: HP ${char.hp}/${char.maxHp}, MP ${char.mp}/${char.maxMp}, AC ${char.ac}, Level ${char.level}`,
        `Party Inventory: ${formatPartyInventory(gameState.inventory)}`,
        `Party Member IDs: ${Object.values(characters).map(c => `${c.name} = ${c.id}`).join(', ')}`
      ].join('\n\n');

      const { text, functionCalls } = await getLLMResponse(
        settings,
        char.systemMessage,
        `${playerContext}\n\nRules: ${playerResponseRules}\n\nRespond to the most recent events.`
      );
      if (functionCalls) handleToolCalls(functionCalls, speakerId);
      const cleanedText = sanitizePlayerReply(text);
      addMessage({ sender: speakerId, senderName: char.name, content: cleanedText, type: 'dialogue' });
      turnContext = `${char.name}: ${cleanedText}`;
      setActiveCharacterId(null);
    };

    let playerTurnsThisCycle = 0;
    do {
      await runPlayerTurn();
      playerTurnsThisCycle += 1;
      playerTurnsSinceDmRef.current += 1;
    } while (forcedSpeakerQueueRef.current.length > 0 && playerTurnsThisCycle < 2);

    await new Promise(r => setTimeout(r, 800));

    if (shouldRunDmTurn({ injected: injectedInThisTurn, forcedQueued: forcedSpeakerQueueRef.current.length > 0 })) {
      // PHASE 2: DM RESOLUTION
      setAutoPhase('DM_RESOLUTION');
      const dmContext = [
        `Setting: ${gameState.setting || 'Unknown'}`,
        `Current Scene: ${gameState.currentScene}`,
        `Chronicle Window:\n${historyContext || 'No narrative yet.'}`,
        `Latest Turn:\n${turnContext}`,
        `Party Gold: ${gameState.gold}`,
        `Party Inventory: ${formatPartyInventory(gameState.inventory)}`
      ].join('\n\n');

      const { text: dmText, functionCalls: dmCalls } = await getLLMResponse(
        settings,
        SYSTEM_PROMPTS[AgentType.DM],
        `${dmContext}\n\nResolve the scene with vivid narration.`
      );
      if (dmCalls) handleToolCalls(dmCalls, AgentType.DM);
      const trimmedDmText = enforceShortReply(dmText, 4, 520);
      addMessage({ sender: AgentType.DM, senderName: 'Dungeon Master', content: trimmedDmText, type: 'narrative' });
      playerTurnsSinceDmRef.current = 0;

      // PHASE 3: META COMMENT
      setAutoPhase('META_COMMENT');
      const { text: metaText } = await getLLMResponse(
        settings,
        SYSTEM_PROMPTS[AgentType.META],
        `Sharp observation for the Overseer tab on: "${dmText.substring(0, 120)}..."`
      );
      addMessage({ sender: AgentType.META, senderName: 'Overseer', content: enforceShortReply(metaText, 2, 240), type: 'meta' });
    }

    setAutoPhase('IDLE');
    setIsLoading(false);
  }, [isStarted, isLoading, injectionQueue, characters, gameState, handleToolCalls, addMessage, getStoryWindow, getPlayerStoryWindow, settings]);

  const handleStartGame = async (setting: string) => {
    setIsStarted(true);
    setIsLoading(true);
    setGameState(prev => ({ ...prev, setting }));
    
    const updatedChars = { ...characters };
    const charIds = Object.keys(updatedChars);
    
    if (settings.enableImageGeneration) {
      const imagePromises = charIds.map(async (id) => {
        const desc = updatedChars[id].visualDescription;
        if (imageCache.current[desc]) {
          return { id, img: imageCache.current[desc] };
        } else {
          const img = await generateImage(settings, desc);
          if (img) imageCache.current[desc] = img;
          return { id, img };
        }
      });

      imagePromises.forEach(p => p.then(({ id, img }) => {
        if (img) setCharacters(prev => ({ ...prev, [id]: { ...prev[id], image: img } }));
      }));
    }

    const { text, functionCalls } = await getLLMResponse(
      settings,
      SYSTEM_PROMPTS[AgentType.DM],
      `Introduction to: ${setting}. Be atmospheric.`
    );

    if (functionCalls) handleToolCalls(functionCalls, AgentType.DM);
    addMessage({ sender: AgentType.DM, senderName: 'Dungeon Master', content: text, type: 'narrative' });
    setIsLoading(false);
  };

  const handleUserInput = useCallback(() => {
    if (userInput.trim()) {
      if (isAutoMode) {
        setInjectionQueue(p => [...p, userInput]);
      } else {
        processStructuredTurn();
      }
      setUserInput('');
    }
  }, [userInput, isAutoMode, processStructuredTurn]);

  useEffect(() => {
    if (isAutoMode && isStarted && !isLoading && injectionQueue.length === 0) {
      autoLoopTimeoutRef.current = setTimeout(processStructuredTurn, 10000);
    } else if (isAutoMode && isStarted && !isLoading && injectionQueue.length > 0) {
      processStructuredTurn();
    }
    return () => { if (autoLoopTimeoutRef.current) clearTimeout(autoLoopTimeoutRef.current); };
  }, [isAutoMode, isStarted, isLoading, injectionQueue, processStructuredTurn]);

  const chronicles = gameState.history.filter(m => ['narrative', 'dialogue', 'encounter', 'system'].includes(m.type));
  const engineLogs = gameState.history.filter(m => m.type === 'mechanic');
  const metaLogs = gameState.history.filter(m => m.type === 'meta');

  // Helper to render tool args clearly
  const renderToolLog = (log: GameMessage) => {
    const { toolName, args, result } = log.metadata || {};
    if (!toolName || !args) return <span className="text-neutral-400">{log.content}</span>;

    const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const getIcon = (name: string) => {
      if (name.includes('health')) return '❤️';
      if (name.includes('mana')) return '⚡';
      if (name.includes('inventory')) return '🎒';
      if (name.includes('gold')) return '🪙';
      if (name.includes('world')) return '🌍';
      if (name.includes('memory')) return '🧠';
      if (name.includes('combat')) return '⚔️';
      return '⚙️';
    };

    const formatName = (name: string) => name.replace(/_/g, ' ').toUpperCase();

    return (
      <div className="space-y-2 group">
        <div className="flex items-center gap-2">
          <span className="text-amber-800 font-mono text-[9px]">[{timeStr}]</span>
          <span className="text-[10px] font-bold text-amber-500/80 tracking-tighter flex items-center gap-1">
            <span>{getIcon(toolName)}</span>
            <span>{formatName(toolName)}</span>
          </span>
        </div>
        
        <div className="ml-4 border-l border-neutral-800 pl-3 py-1 space-y-1">
          {Object.entries(args).map(([key, value]) => (
            <div key={key} className="flex gap-2 text-[10px] leading-tight">
              <span className="text-neutral-600 font-mono uppercase">{key}:</span>
              <span className={`text-neutral-400 ${typeof value === 'number' ? 'text-amber-400' : ''}`}>
                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
              </span>
            </div>
          ))}
          {result && result !== "Success" && (
            <div className="mt-1 pt-1 border-t border-neutral-900/50">
              <span className="text-[9px] text-emerald-600 cinzel font-bold block mb-1">RESULT:</span>
              <p className="text-[9px] text-neutral-500 italic leading-relaxed">{result}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen w-full flex flex-col bg-[#050505] text-neutral-200 overflow-hidden">
      {!isStarted && (
        <Onboarding
          characters={characters}
          onUpdateCharacters={setCharacters}
          onStart={handleStartGame}
        />
      )}

      <header className="h-16 flex-shrink-0 flex items-center justify-between px-6 border-b border-neutral-800 bg-black/90 backdrop-blur-lg z-50">
        <div className="flex items-center gap-4">
          <h1 className="cinzel text-xl text-amber-500 font-bold glow-gold">Ethereal Overseer</h1>
          <div className="h-4 w-[1px] bg-neutral-800"></div>
          <button 
            onClick={() => setIsAutoMode(!isAutoMode)}
            className={`px-4 py-1.5 rounded-full text-[10px] font-bold cinzel border transition-all ${
              isAutoMode ? 'bg-amber-600 border-amber-400 text-white animate-pulse' : 'bg-neutral-800 border-neutral-700 text-neutral-500'
            }`}
          >
            {isAutoMode ? '● AUTO ACTIVE' : '○ MANUAL WEAVE'}
          </button>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[9px] text-amber-600 cinzel tracking-widest uppercase">Party Vault</span>
            <span className="text-sm font-bold text-amber-400">🪙 {gameState.gold} gp</span>
          </div>
          <button 
            onClick={async () => {
              setIsLoading(true);
              const summary = await summarizeChronicle(settings, getStoryWindow(gameState.history));
              setSummaryText(summary);
              setShowSummary(true);
              setIsLoading(false);
            }} 
            className="px-3 py-1 text-[10px] cinzel bg-neutral-900 border border-neutral-800 rounded hover:bg-neutral-800"
          >
            📜 Archive
          </button>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="px-3 py-1 text-[10px] cinzel bg-neutral-900 border border-neutral-800 rounded hover:bg-neutral-800"
          >
            ⚙️ Settings
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-64 flex-shrink-0 border-r border-neutral-800 bg-neutral-950/30 p-4 space-y-4 overflow-y-auto hidden lg:block">
          <h2 className="cinzel text-[10px] text-neutral-500 uppercase tracking-widest px-1">Active Souls</h2>
          {Object.values(characters).map(char => (
            <CharacterCard 
              key={char.id} 
              character={char} 
              isActive={activeCharacterId === char.id} 
              onEdit={() => setEditingCharacter(char)}
            />
          ))}
        </aside>

        {/* Center: The Chronicle */}
        <section className="flex-1 flex flex-col relative bg-[#080808]">
          <div className="flex-1 min-h-0 relative">
            <GameChat messages={chronicles} />
          </div>
          
          <div className="p-6 bg-black/80 border-t border-neutral-800 backdrop-blur-xl flex-shrink-0">
            <div className="max-w-4xl mx-auto flex items-end gap-3">
              <div className="flex-1 relative">
                <textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleUserInput())}
                  placeholder={isAutoMode ? "Queue a divine intervention..." : "Command the chronicle..."}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-1 focus:ring-amber-600 resize-none h-16 shadow-2xl transition-all"
                />
                <div className="absolute right-3 bottom-3 flex gap-2">
                  {isAutoMode && injectionQueue.length > 0 && (
                    <span className="text-[9px] cinzel bg-amber-600/20 text-amber-500 border border-amber-600/30 px-2 py-1 rounded">
                      {injectionQueue.length} QUEUED
                    </span>
                  )}
                  <button onClick={handleUserInput} className="bg-amber-600 p-2.5 rounded-xl hover:bg-amber-500 transition-colors shadow-lg shadow-amber-900/20">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {isLoading && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-amber-600 text-[10px] font-bold px-8 py-2.5 rounded-full cinzel z-50 shadow-2xl border border-amber-400">
              {autoPhase !== 'IDLE' ? `PHASE: ${autoPhase.replace('_', ' ')}` : 'WEAVING FATE...'}
            </div>
          )}
        </section>

        {/* Right Sidebar: Tabs */}
        <aside className="w-80 flex-shrink-0 border-l border-neutral-800 bg-neutral-950/80 flex flex-col hidden xl:flex">
          <div className="flex border-b border-neutral-800">
            <button 
              onClick={() => setActiveTab('LOG')}
              className={`flex-1 py-4 text-[10px] cinzel tracking-widest border-b-2 transition-all ${activeTab === 'LOG' ? 'border-amber-500 text-amber-500 bg-amber-950/10' : 'border-transparent text-neutral-600 hover:text-neutral-400'}`}
            >
              The Ledger
            </button>
            <button 
              onClick={() => setActiveTab('OVERSEER')}
              className={`flex-1 py-4 text-[10px] cinzel tracking-widest border-b-2 transition-all ${activeTab === 'OVERSEER' ? 'border-indigo-500 text-indigo-400 bg-indigo-950/10' : 'border-transparent text-neutral-600 hover:text-neutral-400'}`}
            >
              The Overseer
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {activeTab === 'LOG' ? (
              <div className="space-y-6">
                {engineLogs.map(log => (
                  <div key={log.id} className="opacity-0 animate-fade-in" style={{ animationFillMode: 'forwards' }}>
                    {renderToolLog(log)}
                  </div>
                ))}
                {engineLogs.length === 0 && <p className="text-center text-neutral-700 italic text-[10px] mt-20">The engine is silent.</p>}
              </div>
            ) : (
              <div className="space-y-4">
                {metaLogs.map(meta => (
                  <div key={meta.id} className="relative p-4 bg-indigo-950/10 border border-indigo-900/20 rounded-lg opacity-0 animate-fade-in" style={{ animationFillMode: 'forwards' }}>
                    <div className="absolute -left-1 top-4 w-2 h-2 bg-indigo-500 rounded-full blur-[2px]"></div>
                    <p className="text-xs text-indigo-300 italic leading-relaxed font-light">{meta.content}</p>
                    <span className="block text-[8px] text-indigo-900 cinzel mt-2 text-right">METAGAME DIRECTIVE</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </main>

      {/* Editing Modal */}
      {editingCharacter && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[110] backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-700 w-full max-w-md rounded-2xl p-6 space-y-6 shadow-2xl">
            <h2 className="cinzel text-xl text-amber-500 border-b border-neutral-800 pb-2">Alter Soul: {editingCharacter.name}</h2>
            <form onSubmit={(e) => { e.preventDefault(); setCharacters(p => ({...p, [editingCharacter.id]: editingCharacter})); setEditingCharacter(null); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] cinzel text-neutral-500">Class</label>
                  <input className="w-full bg-black border border-neutral-800 p-2 rounded text-sm" value={editingCharacter.class} onChange={e => setEditingCharacter({...editingCharacter, class: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] cinzel text-neutral-500">Race</label>
                  <input className="w-full bg-black border border-neutral-800 p-2 rounded text-sm" value={editingCharacter.race} onChange={e => setEditingCharacter({...editingCharacter, race: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] cinzel text-neutral-500">Directive & Persona</label>
                <textarea className="w-full bg-black border border-neutral-800 p-3 rounded text-xs h-32 leading-relaxed" value={editingCharacter.systemMessage} onChange={e => setEditingCharacter({...editingCharacter, systemMessage: e.target.value})} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditingCharacter(null)} className="flex-1 bg-neutral-800 py-2.5 rounded text-sm cinzel">Banish Changes</button>
                <button type="submit" className="flex-1 bg-amber-600 py-2.5 rounded text-sm cinzel font-bold shadow-lg shadow-amber-900/20">Finalize Form</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Summary Modal */}
      {showSummary && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center p-8 z-[100]">
          <div className="w-full max-w-3xl parchment p-12 rounded shadow-2xl max-h-[85vh] overflow-y-auto relative border-[12px] border-[#2d241e] border-double">
            <button onClick={() => setShowSummary(false)} className="absolute top-6 right-6 text-2xl text-black/40 hover:text-black transition-colors font-bold">✕</button>
            <h2 className="cinzel text-3xl mb-8 text-center border-b-2 border-black/10 pb-6 font-bold uppercase tracking-widest">The Saga of Our Souls</h2>
            <div className="text-lg leading-loose whitespace-pre-wrap font-serif text-black/90 italic drop-shadow-sm">{summaryText}</div>
          </div>
        </div>
      )}

      {isSettingsOpen && (
        <SettingsPanel
          settings={settings}
          onChange={setSettings}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.8s ease-out forwards;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #222;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
};

export default App;
