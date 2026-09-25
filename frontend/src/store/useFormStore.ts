import { create } from 'zustand';

export interface Question {
  id: string;
  type: string;
  label: string;
  required: boolean;
  options: string[];
  option_layout?: 'vertical' | 'horizontal';
  validations: any;
  logic: any;
}

export interface FormSettings {
  collect_emails: boolean;
  limit_responses: boolean;
  password: string | null;
  allow_editing: boolean;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  timer_limit: number;
  anti_cheat_detection: boolean;
  team_members_only: boolean;
  invited_only: boolean;
  invited_emails: string[];
  display_mode: 'full' | 'wizard' | 'chat';
}

export interface FormTheme {
  primary_color: string;
  background_color: string;
  font_family: string;
  border_radius?: string;
  logo_url: string | null;
  banner_url?: string | null;
  rtl?: boolean;
}

export interface FormState {
  id: string | null;
  title: string;
  description: string;
  status: string;
  uniqueShareId: string | null;
  publicUrl: string | null;
  isPublic: boolean;
  responseLimit: number | null;
  settings: FormSettings;
  theme: FormTheme;
  questions: Question[];
  isSaving: boolean;

  setForm: (form: any) => void;
  updateFormFields: (fields: Partial<Omit<FormState, 'questions' | 'settings' | 'theme'>>) => void;
  updateSettings: (settings: Partial<FormSettings>) => void;
  updateTheme: (theme: Partial<FormTheme>) => void;
  
  addQuestion: (type: string) => void;
  updateQuestion: (id: string, updates: Partial<Question>) => void;
  deleteQuestion: (id: string) => void;
  reorderQuestions: (startIndex: number, endIndex: number) => void;
  setSaving: (saving: boolean) => void;
}

const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const useFormStore = create<FormState>((set) => ({
  id: null,
  title: 'Untitled Form',
  description: '',
  status: 'DRAFT',
  uniqueShareId: null,
  publicUrl: null,
  isPublic: true,
  responseLimit: null,
  settings: {
    collect_emails: false,
    limit_responses: false,
    password: null,
    allow_editing: false,
    shuffle_questions: false,
    shuffle_options: false,
    timer_limit: 0,
    anti_cheat_detection: false,
    team_members_only: false,
    invited_only: false,
    invited_emails: [],
    display_mode: 'full'
  },
  theme: {
    primary_color: '#8B6B55',
    background_color: '#FAF6EF',
    font_family: 'Inter',
    border_radius: '24px',
    logo_url: null,
    banner_url: null,
    rtl: false
  },
  questions: [],
  isSaving: false,

  setForm: (form) => set({
    id: form.id,
    title: form.title,
    description: form.description || '',
    status: form.status,
    uniqueShareId: form.uniqueShareId || null,
    publicUrl: form.publicUrl || null,
    isPublic: form.isPublic !== undefined ? form.isPublic : true,
    responseLimit: form.responseLimit || null,
    settings: {
      collect_emails: false,
      limit_responses: false,
      password: null,
      allow_editing: false,
      shuffle_questions: false,
      timer_limit: 0,
      anti_cheat_detection: false,
      team_members_only: false,
      invited_only: false,
      invited_emails: [],
      ...form.settings
    },
    theme: {
      primary_color: '#8B6B55',
      background_color: '#FAF6EF',
      font_family: 'Inter',
      border_radius: '24px',
      logo_url: null,
      banner_url: null,
      ...form.theme
    },
    questions: form.questions || []
  }),

  updateFormFields: (fields) => set((state) => ({ ...state, ...fields })),

  updateSettings: (settings) => set((state) => ({
    settings: { ...state.settings, ...settings }
  })),

  updateTheme: (theme) => set((state) => ({
    theme: { ...state.theme, ...theme }
  })),

  addQuestion: (type) => set((state) => {
    let label = `Question ${state.questions.length + 1}`;
    let options: string[] = [];

    switch (type) {
      case 'name':
        label = "Full Name";
        break;
      case 'email':
        label = "Email Address";
        break;
      case 'phone':
        label = "Phone Number";
        break;
      case 'address':
        label = "Address";
        break;
      case 'country':
        label = "Country";
        options = ['United States', 'United Kingdom', 'Canada', 'Australia', 'India', 'Germany', 'France', 'Japan', 'Other'];
        break;
      case 'date':
        label = "Select Date";
        break;
      case 'time':
        label = "Select Time";
        break;
      case 'rating':
        label = "Rate your experience";
        break;
      case 'feedback':
        label = "Feedback / Suggestions";
        break;
      case 'gender':
        label = "Gender";
        options = ['Male', 'Female', 'Other', 'Prefer not to say'];
        break;
      case 'multiple_options':
        label = "Select Multiple Options";
        options = ['Option 1', 'Option 2', 'Option 3'];
        break;
      case 'one_option':
        label = "Select One Option";
        options = ['Option 1', 'Option 2', 'Option 3'];
        break;
      case 'agreement':
        label = "Terms Agreement";
        options = ['I agree to the terms and conditions'];
        break;
      case 'signature':
        label = "Signature";
        break;
      case 'resume':
        label = "Upload Resume";
        break;
      case 'photo':
        label = "Upload Photo";
        break;
      case 'amount':
        label = "Amount";
        break;
      case 'price':
        label = "Price";
        break;
      case 'website':
        label = "Website URL";
        break;
      case 'password':
        label = "Password";
        break;
      case 'color':
        label = "Select Color";
        break;
      case 'location':
        label = "Location / Address";
        break;
      case 'otp':
        label = "OTP Verification Code";
        break;
      case 'mcq':
        options = ['Option 1', 'Option 2'];
        break;
      case 'checkbox':
        options = ['Option 1', 'Option 2'];
        break;
      case 'dropdown':
        options = ['Option 1', 'Option 2'];
        break;
    }

    const newQuestion: Question = {
      id: generateUUID(),
      type,
      label,
      required: false,
      options,
      validations: {},
      logic: {}
    };
    return { questions: [...state.questions, newQuestion] };
  }),

  updateQuestion: (id, updates) => set((state) => ({
    questions: state.questions.map((q) => (q.id === id ? { ...q, ...updates } : q))
  })),

  deleteQuestion: (id) => set((state) => ({
    questions: state.questions.filter((q) => q.id !== id)
  })),

  reorderQuestions: (startIndex, endIndex) => set((state) => {
    const result = Array.from(state.questions);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return { questions: result };
  }),

  setSaving: (saving) => set({ isSaving: saving })
}));
