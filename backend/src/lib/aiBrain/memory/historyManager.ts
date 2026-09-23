import { IMessage } from './interfaces';

export class HistoryManager {
  static formatForPrompt(history: IMessage[]): string {
    return history
      .map(msg => `${msg.role.toUpperCase()}: ${msg.text}`)
      .join('\n');
  }
}
