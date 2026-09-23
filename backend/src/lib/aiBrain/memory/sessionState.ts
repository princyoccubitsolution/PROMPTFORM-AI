import { ISessionState } from './interfaces';

export class SessionStateManager {
  static initialize(formId: string): ISessionState {
    return {
      formId,
      currentLanguage: 'english',
      currentIndustry: 'General',
      currentDomain: 'general',
      currentIntent: 'create'
    };
  }

  static update(state: ISessionState, updates: Partial<ISessionState>): ISessionState {
    return {
      ...state,
      ...updates
    };
  }
}
