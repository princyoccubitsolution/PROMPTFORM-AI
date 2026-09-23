import { spellingRecovery } from '../intentEngine';

export interface IntentContext {
  rawPrompt: string;
  normalizedPrompt: string;
  isGreeting: boolean;
  isTranslation: boolean;
  targetLang: string;
  isRtl: boolean;
}

export class IntentDetector {
  static detect(prompt: string): IntentContext {
    const normalized = spellingRecovery(prompt);
    
    const clean = prompt.toLowerCase().replace(/[^\w\s]/g, "").trim();
    const greetingRegex = /^(hi+|he+y+|hel+o+|hy+|hl[ow]+|yo+|sup+|hola+|namaste+|kem\s*cho+|welcome|greetings)$/;
    const isGreeting = greetingRegex.test(clean);
    
    const isTranslation = /\b(translate|translation|tarjuma|anuvad|trans|અનુવાદ|अनुवाद|ഭാഷาંતരം)\b/.test(clean);

    return {
      rawPrompt: prompt,
      normalizedPrompt: normalized,
      isGreeting,
      isTranslation,
      targetLang: "english",
      isRtl: false
    };
  }
}
