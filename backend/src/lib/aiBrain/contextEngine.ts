import { cache } from '../cache';
import * as fs from 'fs';
import * as path from 'path';

export interface SessionContext {
  formId: string;
  currentLanguage: string;
  currentIndustry: string;
  currentDomain: string;
  history: Array<{
    role: 'user' | 'assistant';
    text: string;
    timestamp: string;
  }>;
  uploadedFiles: Array<{
    fileName: string;
    fileType: string;
    contentSummary: string;
  }>;
}

const SESSION_DIR = path.join(__dirname, '..', '..', '..', 'storage', 'sessions');

function ensureSessionDirExists() {
  if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
  }
}

export class ContextEngine {
  static async loadContext(formId: string): Promise<SessionContext> {
    const cacheKey = `form_session_context_${formId}`;
    try {
      const cached = await cache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      // Ignore cache load errors
    }

    try {
      ensureSessionDirExists();
      const filePath = path.join(SESSION_DIR, `context_${formId}.json`);
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const context = JSON.parse(fileContent);
        await cache.set(cacheKey, JSON.stringify(context), 86400 * 7); // 7 days expiry
        return context;
      }
    } catch (err) {
      // Ignore file load errors
    }

    return {
      formId,
      currentLanguage: "english",
      currentIndustry: "General",
      currentDomain: "general",
      history: [],
      uploadedFiles: []
    };
  }

  static async saveContext(formId: string, context: SessionContext): Promise<void> {
    const cacheKey = `form_session_context_${formId}`;
    const contextStr = JSON.stringify(context);

    try {
      await cache.set(cacheKey, contextStr, 86400 * 7); // 7 days expiry
    } catch (err) {
      // Ignore cache save errors
    }

    try {
      ensureSessionDirExists();
      const filePath = path.join(SESSION_DIR, `context_${formId}.json`);
      fs.writeFileSync(filePath, contextStr, 'utf-8');
    } catch (err) {
      // Ignore file save errors
    }
  }

  static async appendMessage(formId: string, role: 'user' | 'assistant', text: string): Promise<SessionContext> {
    const context = await this.loadContext(formId);
    context.history.push({
      role,
      text,
      timestamp: new Date().toISOString()
    });
    if (context.history.length > 30) {
      context.history.shift();
    }
    await this.saveContext(formId, context);
    return context;
  }
}
