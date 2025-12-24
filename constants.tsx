
import { Character, AgentType, MemoryEntry } from './types';

const createInitialMemory = (content: string): MemoryEntry => ({
  id: Math.random().toString(36).substr(2, 9),
  content,
  timestamp: Date.now(),
  tags: ['background'],
  isShared: false
});

export const INITIAL_CHARACTERS: Record<string, Character> = {
  [AgentType.PLAYER_ARIN]: {
    id: AgentType.PLAYER_ARIN,
    name: "Arin",
    race: "Elf",
    class: "Ranger",
    age: 112,
    hp: 24,
    maxHp: 24,
    mp: 12,
    maxMp: 12,
    ac: 15,
    level: 3,
    xp: 900,
    spells: ["Hunter's Mark", "Cure Wounds"],
    abilities: ["Natural Explorer", "Archery Fighting Style"],
    memories: [
      createInitialMemory("Born in the Whispering Woods"),
      createInitialMemory("Owns a silver locket from a lost companion")
    ],
    persona: "Vigilant and resourceful Elf Ranger of the Greenwood.",
    systemMessage: "I am Arin, an Elf Ranger. You have a long-term memory database. Use query_memories to recall facts about NPCs, locations, and past events. Use record_memory to etch new events into your soul.",
    visualDescription: "Elf ranger with emerald eyes, hawk-feather braids, dragonscale leather armor, glowing ethereal recurve bow, misty forest background."
  },
  [AgentType.PLAYER_BORIN]: {
    id: AgentType.PLAYER_BORIN,
    name: "Borin Stonebeard",
    race: "Dwarf",
    class: "Warrior",
    age: 187,
    hp: 34,
    maxHp: 34,
    mp: 5,
    maxMp: 5,
    ac: 18,
    level: 3,
    xp: 900,
    spells: [],
    abilities: ["Second Wind", "Action Surge", "Dwarven Resilience"],
    memories: [
      createInitialMemory("Veteran of the Battle of Deep Crag"),
      createInitialMemory("Loves spicy cave-fungus stew")
    ],
    persona: "Unyielding and battle-hardened Dwarf Warrior.",
    systemMessage: "GROND! I am Borin Stonebeard. You have a long-term memory database. Use query_memories if you need to remember someone or something. Use record_memory to remember new battles or allies.",
    visualDescription: "Dwarf warrior, massive auburn beard with gold rings, rune-etched plate armor, monolithic stone warhammer, forge embers."
  },
  [AgentType.PLAYER_CELESTE]: {
    id: AgentType.PLAYER_CELESTE,
    name: "Celeste Lumina",
    race: "Human",
    class: "Mage",
    age: 28,
    hp: 18,
    maxHp: 18,
    mp: 30,
    maxMp: 30,
    ac: 12,
    level: 3,
    xp: 900,
    spells: ["Magic Missile", "Shield", "Misty Step"],
    abilities: ["Arcane Recovery", "Sculpt Spells"],
    memories: [
      createInitialMemory("Once touched the fringe of the Void"),
      createInitialMemory("Seeking the missing pages of the Codex Aethel")
    ],
    persona: "Human Mage and seeker of arcane wisdom.",
    systemMessage: "I am Celeste Lumina. You have a long-term memory database. If a fact escapes your immediate attention, use query_memories. Use record_memory to store arcane discoveries.",
    visualDescription: "Human mage, glowing sapphire eyes, translucent blue robes, floating crystalline staff, celestial library background."
  },
  [AgentType.PLAYER_DARA]: {
    id: AgentType.PLAYER_DARA,
    name: "Dara Swiftfoot",
    race: "Halfling",
    class: "Rogue",
    age: 25,
    hp: 21,
    maxHp: 21,
    mp: 10,
    maxMp: 10,
    ac: 16,
    level: 3,
    xp: 900,
    spells: [],
    abilities: ["Sneak Attack", "Cunning Action", "Halfling Luck"],
    memories: [
      createInitialMemory("Still owes gold to Big Sal"),
      createInitialMemory("Master of the Three-Finger lock-pick technique")
    ],
    persona: "Cunning and agile Halfling Rogue.",
    systemMessage: "I'm Dara Swiftfoot. You have a long-term memory database. Use query_memories to keep your stories straight. Use record_memory to remember who owes you money.",
    visualDescription: "Halfling rogue, shadow-silk leather armor, obsidian daggers, rain-slicked rooftop at midnight."
  }
};

export const SYSTEM_PROMPTS = {
  [AgentType.DM]: "You are the Dungeon Master. You manage the game state and World Almanac. You have access to a shared and personal memory database. Use query_memories to maintain continuity and record_memory to save lore.",
  [AgentType.META]: "You are the Overseer. Observe and comment.",
  [AgentType.SUMMARIZER]: "Condense the chronicle into a summary.",
  [AgentType.CONSENSUS]: "Help the party decide their path."
};

export const SETTING_SUGGESTIONS = [
  "The Sunken Citadel of Oakhaven",
  "The Whispering Woods of the Banshee",
  "A Midnight Heist at the Duke's Gala",
  "The Frozen Tundra of the Frost Giants",
  "The Eldritch Library of Floating Isles"
];

export const DEFAULT_SETTINGS = {
  llmProvider: 'gemini',
  llmModel: 'gemini-3-flash-preview',
  lmStudioBaseUrl: 'http://localhost:1234/v1',
  enableImageGeneration: true
} as const;
