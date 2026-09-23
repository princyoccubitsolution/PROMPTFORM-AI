import { IEnterpriseContext } from './interfaces';
import { getStorageDriver, getDiskBackupDriver } from './memoryCache';
import { SessionStateManager } from './sessionState';
import { ConversationMemory } from './conversationMemory';
import { ContextResolver } from './contextResolver';
import { EditTracker } from './editTracker';

export class EnterpriseContextEngine {
  private static cacheDriver = getStorageDriver();
  private static diskDriver = getDiskBackupDriver();

  static async getContext(formId: string): Promise<IEnterpriseContext> {
    const key = `enterprise_context_${formId}`;
    try {
      const cached = await this.cacheDriver.get(key);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      // ignore
    }

    try {
      const backed = await this.diskDriver.get(key);
      if (backed) {
        const ctx = JSON.parse(backed);
        await this.cacheDriver.set(key, backed, 86400 * 7);
        return ctx;
      }
    } catch (err) {
      // ignore
    }

    const freshContext: IEnterpriseContext = {
      sessionState: SessionStateManager.initialize(formId),
      history: [],
      uploadedFiles: [],
      diffs: []
    };

    return freshContext;
  }

  static async saveContext(formId: string, context: IEnterpriseContext): Promise<void> {
    const key = `enterprise_context_${formId}`;
    const valueStr = JSON.stringify(context);

    try {
      await this.cacheDriver.set(key, valueStr, 86400 * 7);
    } catch (err) {
      // ignore
    }

    try {
      await this.diskDriver.set(key, valueStr);
    } catch (err) {
      // ignore
    }
  }

  static async registerUserMessage(formId: string, text: string): Promise<IEnterpriseContext> {
    const context = await this.getContext(formId);
    
    const resolvedAction = ContextResolver.resolveIntent(text);
    context.sessionState.currentIntent = resolvedAction;
    
    const userMsg = ConversationMemory.createMessage('user', text);
    context.history = ConversationMemory.append(context.history, userMsg);
    
    const diff = EditTracker.createDiff(resolvedAction, undefined, text);
    context.diffs = EditTracker.appendDiff(context.diffs, diff);
    
    await this.saveContext(formId, context);
    return context;
  }

  static async registerAssistantMessage(formId: string, text: string): Promise<IEnterpriseContext> {
    const context = await this.getContext(formId);
    const assistantMsg = ConversationMemory.createMessage('assistant', text);
    context.history = ConversationMemory.append(context.history, assistantMsg);
    await this.saveContext(formId, context);
    return context;
  }

  static async registerFileUpload(formId: string, fileName: string, fileType: string, contentSummary: string): Promise<IEnterpriseContext> {
    const context = await this.getContext(formId);
    context.uploadedFiles.push({
      fileName,
      fileType,
      contentSummary
    });
    await this.saveContext(formId, context);
    return context;
  }
}
