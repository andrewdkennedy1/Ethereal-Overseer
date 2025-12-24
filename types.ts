
export interface MemoryEntry {
  id: string;
  content: string;
  timestamp: number;
  tags: string[];
  isShared: boolean;
  sourceId?: string; // ID of character who created it
}

export interface Character {
  id: string;
  name: string;
  class: string;
  race: string;
  age: number;
  persona: string;
  systemMessage: string;
  image?: string;
  visualDescription: string;
  // Mechanical Stats
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  ac: number;
  level: number;
  xp: number;
  spells: string[];
  abilities: string[];
  memories: MemoryEntry[]; // Structured memory database
  initiative?: number;
}

export interface GameMessage {
  id: string;
  sender: string;
  senderName: string;
  content: string;
  timestamp: number;
  type: 'narrative' | 'dialogue' | 'meta' | 'system' | 'roll' | 'encounter' | 'mechanic';
  imageUrl?: string;
  metadata?: {
    toolName?: string;
    args?: any;
    result?: any;
  };
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  description: string;
}

export interface WorldImpact {
  event: string;
  consequence: string;
  reputationShift: string;
  timestamp: number;
}

export interface CombatState {
  isActive: boolean;
  round: number;
  turnIndex: number;
  order: string[]; // List of character/NPC IDs
}

export interface GameState {
  currentScene: string;
  setting: string;
  history: GameMessage[];
  inventory: InventoryItem[];
  gold: number;
  worldAlmanac: WorldImpact[];
  sharedMemories: MemoryEntry[];
  combat: CombatState;
}

export enum AgentType {
  DM = 'DungeonMaster',
  META = 'MetaGameManager',
  SUMMARIZER = 'Summarizer',
  CONSENSUS = 'PartyConsensus',
  PLAYER_ARIN = 'Arin_Elf_Ranger',
  PLAYER_BORIN = 'Borin_Dwarf_Warrior',
  PLAYER_CELESTE = 'Celeste_Human_Mage',
  PLAYER_DARA = 'Dara_Halfling_Rogue',
}
