
import { GoogleGenAI, Type, FunctionDeclaration, GenerateContentResponse } from "@google/genai";

const dndToolDefinitions: FunctionDeclaration[] = [
  {
    name: 'update_health',
    description: 'Modify the HP of a character or NPC.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        characterId: { type: Type.STRING, description: 'ID of the character' },
        amount: { type: Type.NUMBER, description: 'Positive for heal, negative for damage' },
        reason: { type: Type.STRING, description: 'Narrative reason' }
      },
      required: ['characterId', 'amount', 'reason']
    }
  },
  {
    name: 'update_mana',
    description: 'Modify the MP (Mana/Essence) of a character.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        characterId: { type: Type.STRING },
        amount: { type: Type.NUMBER },
        reason: { type: Type.STRING }
      },
      required: ['characterId', 'amount', 'reason']
    }
  },
  {
    name: 'record_memory',
    description: 'Save a permanent memory. Can be personal or shared knowledge.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        content: { type: Type.STRING, description: 'The fact or event to remember.' },
        isShared: { type: Type.BOOLEAN, description: 'If true, everyone in the party will know this.' },
        tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Keywords like "npc", "quest", "location".' }
      },
      required: ['content', 'isShared']
    }
  },
  {
    name: 'query_memories',
    description: 'Search the memory database for relevant past events, NPCs, or facts. Always use this if you feel you have forgotten a detail.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: 'Keywords or phrases to search for.' }
      },
      required: ['query']
    }
  },
  {
    name: 'modify_inventory',
    description: 'Add or remove items from the party inventory.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        itemName: { type: Type.STRING },
        quantity: { type: Type.NUMBER },
        action: { type: Type.STRING, enum: ['ADD', 'REMOVE'] },
        description: { type: Type.STRING }
      },
      required: ['itemName', 'quantity', 'action']
    }
  },
  {
    name: 'update_gold',
    description: 'Modify the party gold amount.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        amount: { type: Type.NUMBER },
        action: { type: Type.STRING, enum: ['ADD', 'REMOVE'] }
      },
      required: ['amount', 'action']
    }
  },
  {
    name: 'log_world_event',
    description: 'Record a major plot point in the World Almanac.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        event: { type: Type.STRING },
        consequence: { type: Type.STRING },
        reputationShift: { type: Type.STRING }
      },
      required: ['event', 'consequence', 'reputationShift']
    }
  },
  {
    name: 'set_combat_state',
    description: 'Enable or disable combat mode and set turn order.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        active: { type: Type.BOOLEAN },
        initiativeOrder: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING }
        }
      },
      required: ['active']
    }
  }
];

export const getGeminiResponse = async (
  modelName: string,
  systemInstruction: string,
  prompt: string,
  history: any[] = []
): Promise<{ text: string, functionCalls?: any[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        ...history,
        { role: 'user', parts: [{ text: prompt }] }
      ],
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: dndToolDefinitions }],
        temperature: 0.85,
      },
    });

    const candidate = response.candidates[0];
    const parts = candidate.content.parts;
    
    let text = "";
    const functionCalls = [];

    for (const part of parts) {
      if (part.text) text += part.text;
      if (part.functionCall) functionCalls.push(part.functionCall);
    }

    return { text, functionCalls: functionCalls.length > 0 ? functionCalls : undefined };
  } catch (error) {
    console.error("Gemini Error:", error);
    return { text: "The tapestry of fate is tangled. (API Error)" };
  }
};

export const generateImage = async (prompt: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
    });
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    return null;
  } catch { return `https://picsum.photos/seed/${Math.random()}/512/512`; }
};

export const summarizeStory = async (dialogue: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Summarize the following chronicle into a cohesive legend: \n\n ${dialogue}`,
  });
  return response.text || "";
};
