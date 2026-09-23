export interface IMemoryStorageDriver {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
}

export interface IMessage {
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface ISessionState {
  formId: string;
  currentLanguage: string;
  currentIndustry: string;
  currentDomain: string;
  currentIntent: string;
}

export interface IUploadedFile {
  fileName: string;
  fileType: string;
  contentSummary: string;
}

export interface IFormDiff {
  action: 'create' | 'edit' | 'delete' | 'move' | 'rename' | 'translate' | 'improve_ux' | 'improve_validation' | 'improve_logic' | 'improve_accessibility' | 'improve_mobile_layout' | 'improve_enterprise_quality';
  targetField?: string;
  details?: string;
  timestamp: string;
}

export interface IEnterpriseContext {
  sessionState: ISessionState;
  history: IMessage[];
  uploadedFiles: IUploadedFile[];
  diffs: IFormDiff[];
}
