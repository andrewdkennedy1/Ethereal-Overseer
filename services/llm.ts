import { AppSettings } from '../types';
import { getGeminiResponse, generateImage as generateGeminiImage, summarizeStory } from './gemini';
import { getLmStudioResponse, summarizeWithLmStudio } from './lmstudio';

type ToolCall = { name: string; args: any };

type LlmResult = { text: string; functionCalls?: ToolCall[] };

export const getLLMResponse = async (
  settings: AppSettings,
  systemInstruction: string,
  prompt: string
): Promise<LlmResult> => {
  if (settings.llmProvider === 'lmstudio') {
    return getLmStudioResponse(settings, systemInstruction, prompt);
  }

  return getGeminiResponse(settings.llmModel, systemInstruction, prompt);
};

export const generateImage = async (settings: AppSettings, prompt: string) => {
  if (!settings.enableImageGeneration || settings.llmProvider !== 'gemini') {
    return null;
  }
  return generateGeminiImage(prompt);
};

export const summarizeChronicle = async (settings: AppSettings, dialogue: string) => {
  if (settings.llmProvider === 'lmstudio') {
    return summarizeWithLmStudio(settings, dialogue);
  }

  return summarizeStory(dialogue);
};
