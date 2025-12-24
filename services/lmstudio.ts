import { AppSettings } from '../types';

type ToolCall = { name: string; args: any };

type LlmResult = { text: string; functionCalls?: ToolCall[] };

type OpenAiTool = {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
    };
  };
};

const toolDefinitions: OpenAiTool[] = [
  {
    type: 'function',
    function: {
      name: 'update_health',
      description: 'Modify the HP of a character or NPC.',
      parameters: {
        type: 'object',
        properties: {
          characterId: { type: 'string', description: 'ID of the character' },
          amount: { type: 'number', description: 'Positive for heal, negative for damage' },
          reason: { type: 'string', description: 'Narrative reason' }
        },
        required: ['characterId', 'amount', 'reason']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_mana',
      description: 'Modify the MP (Mana/Essence) of a character.',
      parameters: {
        type: 'object',
        properties: {
          characterId: { type: 'string' },
          amount: { type: 'number' },
          reason: { type: 'string' }
        },
        required: ['characterId', 'amount', 'reason']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'record_memory',
      description: 'Save a permanent memory. Can be personal or shared knowledge.',
      parameters: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'The fact or event to remember.' },
          isShared: { type: 'boolean', description: 'If true, everyone in the party will know this.' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Keywords like "npc", "quest", "location".' }
        },
        required: ['content', 'isShared']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'query_memories',
      description: 'Search the memory database for relevant past events, NPCs, or facts. Always use this if you feel you have forgotten a detail.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Keywords or phrases to search for.' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'modify_inventory',
      description: 'Add or remove items from the party inventory.',
      parameters: {
        type: 'object',
        properties: {
          itemName: { type: 'string' },
          quantity: { type: 'number' },
          action: { type: 'string', enum: ['ADD', 'REMOVE'] },
          description: { type: 'string' }
        },
        required: ['itemName', 'quantity', 'action']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_gold',
      description: 'Modify the party gold amount.',
      parameters: {
        type: 'object',
        properties: {
          amount: { type: 'number' },
          action: { type: 'string', enum: ['ADD', 'REMOVE'] }
        },
        required: ['amount', 'action']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'log_world_event',
      description: 'Record a major plot point in the World Almanac.',
      parameters: {
        type: 'object',
        properties: {
          event: { type: 'string' },
          consequence: { type: 'string' },
          reputationShift: { type: 'string' }
        },
        required: ['event', 'consequence', 'reputationShift']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'set_combat_state',
      description: 'Enable or disable combat mode and set turn order.',
      parameters: {
        type: 'object',
        properties: {
          active: { type: 'boolean' },
          initiativeOrder: { type: 'array', items: { type: 'string' } }
        },
        required: ['active']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'address_character',
      description: 'Prompt a specific party member to respond next.',
      parameters: {
        type: 'object',
        properties: {
          targetId: { type: 'string', description: 'Character ID to respond next.' },
          message: { type: 'string', description: 'Short in-character prompt or question.' }
        },
        required: ['targetId']
      }
    }
  }
];

const toolNames = new Set<string>(toolDefinitions.map(tool => tool.function.name));

const extractResponseText = (content: string) => {
  const responseMatch = content.match(/RESPONSE:\s*([\s\S]*)/i);
  if (responseMatch) {
    return responseMatch[1].trim();
  }
  return content.replace(/THOUGHT:\s*[\s\S]*?(?=RESPONSE:|$)/i, '').trim();
};

const extractInlineToolCalls = (content: string) => {
  const calls: ToolCall[] = [];
  const tagRegex = /<([a-z_]+)>\s*([\s\S]*?)\s*<\/\1>/gi;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(content)) !== null) {
    const name = match[1];
    if (!toolNames.has(name)) continue;
    const rawArgs = match[2].trim();
    try {
      const args = rawArgs ? JSON.parse(rawArgs) : {};
      calls.push({ name, args });
    } catch {
      calls.push({ name, args: {} });
    }
  }

  return calls;
};

const extractFunctionCallBlocks = (content: string) => {
  const calls: ToolCall[] = [];
  const blockRegex = /<(function-call|tool_call)>\s*([\s\S]*?)\s*<\/(function-call|tool_call)>/gi;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(content)) !== null) {
    const raw = match[2].trim();
    try {
      const parsed = JSON.parse(raw);
      const name = parsed.name;
      if (!name || !toolNames.has(name)) continue;
      const argsRaw = parsed.arguments;
      const args = typeof argsRaw === 'string' ? JSON.parse(argsRaw) : (argsRaw || {});
      calls.push({ name, args });
    } catch {
      continue;
    }
  }

  return calls;
};

const stripInlineToolBlocks = (content: string) =>
  content
    .replace(/<(function-call|tool_call)>\s*[\s\S]*?\s*<\/(function-call|tool_call)>/gi, '')
    .replace(/<([a-z_]+)>\s*[\s\S]*?\s*<\/\1>/gi, '')
    .trim();

const stripThinkBlocks = (content: string) =>
  content.replace(/<think>\s*[\s\S]*?\s*<\/think>/gi, '').trim();

const normalizeBaseUrl = (baseUrl: string) => baseUrl.replace(/\/+$/, '');

export const getLmStudioResponse = async (
  settings: AppSettings,
  systemInstruction: string,
  prompt: string
): Promise<LlmResult> => {
  try {
    const response = await fetch(`${normalizeBaseUrl(settings.lmStudioBaseUrl)}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: settings.llmModel,
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: prompt }
        ],
        temperature: 0.85,
        tools: toolDefinitions,
        tool_choice: 'auto'
      })
    });

    if (!response.ok) {
      throw new Error(`LM Studio error: ${response.status}`);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message || {};
    const rawContent = message.content || '';
    const inlineCalls = [
      ...extractInlineToolCalls(rawContent),
      ...extractFunctionCallBlocks(rawContent)
    ];
    const visibleText = stripThinkBlocks(stripInlineToolBlocks(extractResponseText(rawContent)));

    const toolCalls = (message.tool_calls || []).map((call: any) => ({
      name: call.function?.name,
      args: call.function?.arguments ? JSON.parse(call.function.arguments) : {}
    })).filter((call: any) => call.name);

    const mergedCalls = [...toolCalls, ...inlineCalls];
    const finalText = visibleText || (mergedCalls.length > 0 ? 'The weave shifts.' : '');

    return { text: finalText, functionCalls: mergedCalls.length > 0 ? mergedCalls : undefined };
  } catch (error) {
    console.error('LM Studio Error:', error);
    return { text: 'The weave falters. (LM Studio Error)' };
  }
};

export const summarizeWithLmStudio = async (settings: AppSettings, dialogue: string) => {
  try {
    const response = await fetch(`${normalizeBaseUrl(settings.lmStudioBaseUrl)}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: settings.llmModel,
        messages: [
          { role: 'system', content: 'Summarize the following chronicle into a cohesive legend.' },
          { role: 'user', content: dialogue }
        ],
        temperature: 0.5
      })
    });

    if (!response.ok) {
      throw new Error(`LM Studio error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (error) {
    console.error('LM Studio Summarize Error:', error);
    return '';
  }
};
