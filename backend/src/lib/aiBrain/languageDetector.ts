import { detectLanguage } from '../intentEngine';
import { IntentContext } from './intentDetector';

export class LanguageDetector {
  static detect(context: IntentContext): IntentContext {
    const langInfo = detectLanguage(context.rawPrompt);
    context.targetLang = langInfo.lang;
    context.isRtl = langInfo.isRtl;
    return context;
  }
}
