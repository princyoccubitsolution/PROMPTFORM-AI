export interface IFormEditAction {
  type: 'add_field' | 'remove_field' | 'rename_field' | 'convert_field' | 'toggle_required' | 'translate_form' | 'unknown';
  targetLabel?: string;
  payload?: any;
}

export interface IVersionCheckpoint {
  id: string;
  timestamp: number;
  description: string;
  formSnapshot: any;
}

export interface IEditSuggestion {
  text: string;
  fieldSuggestion?: any;
}
