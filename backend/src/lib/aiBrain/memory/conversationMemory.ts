import { IMessage } from './interfaces';

export class ConversationMemory {
  static createMessage(role: 'user' | 'assistant', text: string): IMessage {
    return {
      role,
      text,
      timestamp: new Date().toISOString()
    };
  }

  static append(history: IMessage[], message: IMessage, limit = 30): IMessage[] {
    const newHistory = [...history, message];
    if (newHistory.length > limit) {
      newHistory.shift();
    }
    return newHistory;
  }
}
