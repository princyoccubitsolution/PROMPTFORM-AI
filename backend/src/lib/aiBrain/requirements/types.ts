/**
 * Typed requirement specification shared by the AI generation pipeline.
 *
 * Flow: user message -> RequirementSpec (what was asked, explicitly vs assumed)
 *       -> generation plan -> AI output -> CanonicalForm -> verification report.
 */

export type ConversationOperation = 'create' | 'modify' | 'converse' | 'clarify';

/** A plain data-collection form vs. a graded assessment (quiz / exam / test). */
export type ArtifactKind = 'form' | 'assessment';

export type AssessmentQuestionKind =
  | 'mcq_single'
  | 'mcq_multiple'
  | 'fill_blank'
  | 'true_false'
  | 'match_following'
  | 'one_word'
  | 'short_answer'
  | 'long_answer'
  | 'coding'
  | 'predict_output'
  | 'debugging'
  | 'sql'
  | 'numerical'
  | 'assertion_reasoning'
  | 'case_study'
  | 'ordering'
  | 'diagram';

export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'advanced';

export type RequirementSource = 'explicit' | 'inferred' | 'default' | 'context';

export interface CountConstraint {
  mode: 'exact' | 'min' | 'max';
  value: number;
}

export interface LanguageSpec {
  /** Lower-case English language name used in prompts, e.g. "gujarati". */
  name: string;
  script: 'latin' | 'gujarati' | 'devanagari' | 'arabic' | 'other';
  isRtl: boolean;
  source: RequirementSource | 'prompt-script';
}

export interface DifficultySpec {
  /** Single level requested for the whole paper ("a difficult Python test"). */
  level?: DifficultyLevel;
  /** Exact per-level question counts, computed from counts or percentages. */
  distribution?: Partial<Record<DifficultyLevel, number>>;
  /** Raw percentages when the user gave them, kept for the report. */
  percentages?: Partial<Record<DifficultyLevel, number>>;
  /** "Make most questions hard". */
  mostly?: DifficultyLevel;
}

export interface EditIntent {
  /** "Add five more questions/fields". */
  addCount?: number;
  addKind?: AssessmentQuestionKind;
  /** Semantic field keys to remove ("remove only the address field"). */
  removeFieldKeys: string[];
  /** Semantic field keys to add ("add a phone number field"). */
  addFieldKeys: string[];
  /** Question kinds to remove ("remove true/false questions"). */
  removeKinds: AssessmentQuestionKind[];
  /** 1-based question numbers explicitly targeted ("make question 4 harder"). */
  targetQuestionNumbers: number[];
  /** 1-based question numbers to delete ("remove question 3"). */
  removeQuestionNumbers: number[];
  /** "Keep everything else", "change nothing else", "without changing the remaining questions". */
  strictPreserve: boolean;
  /** "Keep the same marks". */
  keepMarks: boolean;
  /** "Keep the same difficulty". */
  keepDifficulty: boolean;
  /** "Make email mandatory" / "make phone optional". */
  makeRequired: string[];
  makeOptional: string[];
  /** "Translate the form into Gujarati". */
  translateTo?: string;
  /** "Change Python to C++". */
  changeProgrammingLanguage?: { from?: string; to: string };
  /** Difficulty change for targeted questions. */
  difficultyChange?: 'harder' | 'easier' | DifficultyLevel;
}

export interface RequirementSpec {
  rawPrompt: string;
  /** Prompt with Indic digits converted, whitespace collapsed, lower-cased. */
  normalizedPrompt: string;

  operation: ConversationOperation;
  operationReason: string;
  /** Raw lexical signals behind the operation decision. */
  signals: { createVerb: boolean; artifactNoun: boolean; editVerb: boolean; questionKinds: boolean };

  artifactKind: ArtifactKind;
  artifactKindSource: RequirementSource;
  /** Document uploads without instructions: the kind follows what the AI finds in the document. */
  artifactKindDeferred?: boolean;

  language: LanguageSpec;

  /** Domain / industry slug, e.g. "food_order", "hotel_booking", "assessment". */
  domain: string;
  /** Human-readable purpose, e.g. "Restaurant food ordering". */
  purpose: string;
  /** Subject / topic for assessments ("Python", "Science"). */
  topic?: string;
  /** Target audience / grade ("Class 6", "2nd year B.Tech"). */
  audience?: string;

  explicitTitle?: string;

  /** Number of fields (forms) or questions (assessments). */
  itemCount?: CountConstraint;
  /** Exact per-kind question counts ("10 MCQs, 5 fill in the blanks"). */
  typeCounts: Partial<Record<AssessmentQuestionKind, number>>;
  /** Per-kind marks ("10 MCQs of 1 mark each"). */
  kindMarks: Partial<Record<AssessmentQuestionKind, number>>;
  /** "Only MCQs". */
  onlyKinds?: AssessmentQuestionKind[];
  /** "No true/false questions". */
  excludedKinds: AssessmentQuestionKind[];
  /** Kinds mentioned without a count ("include coding questions"). */
  mentionedKinds: AssessmentQuestionKind[];

  /** Semantic field keys the user excluded ("no email field"). */
  excludedFields: string[];
  /** Semantic field keys the user explicitly asked for. */
  requestedFields: string[];
  /** Fields the user explicitly marked mandatory / optional. */
  mandatoryFields: string[];
  optionalFields: string[];
  allRequired?: boolean;
  allOptional?: boolean;

  difficulty?: DifficultySpec;
  totalMarks?: number;
  marksPerQuestion?: number;
  timeLimitMinutes?: number;
  negativeMarking?: number;
  passingScore?: { value: number; unit: 'percent' | 'marks' };
  /** Assessments only: collect student name / enrollment number / email from respondents. */
  studentIdentity?: { value: boolean; explicit: boolean };
  programmingLanguage?: string;
  includeAnswerKey: boolean;
  includeExplanations: boolean;
  includeSolutionsAtEnd: boolean;

  edit?: EditIntent;

  /** Reasonable defaults the system chose (shown to the user). */
  assumptions: string[];
  /** Explicit, conflicting or impossible constraints. */
  conflicts: string[];
  /** Requested features the platform cannot deliver. */
  unsupported: string[];
  /** Set when operation === 'clarify'. */
  clarificationQuestion?: string;
  clarificationSuggestions?: string[];
}

/** One question/field in the single canonical representation used everywhere. */
export interface CanonicalQuestion {
  id?: string;
  /** Semantic key, e.g. "email", "delivery_address" (never shown to users). */
  key?: string;
  type: string;
  label: string;
  description?: string;
  placeholder?: string;
  required: boolean;
  options: string[];
  validations: Record<string, any>;
  logic: Record<string, any>;
}

export interface CanonicalForm {
  title: string;
  description: string;
  questions: CanonicalQuestion[];
  theme: Record<string, any>;
  settings: Record<string, any>;
  isAssessment: boolean;
}

export type IssueSeverity = 'error' | 'warning';

export interface VerificationIssue {
  code: string;
  severity: IssueSeverity;
  message: string;
  /** Whether a model round trip could plausibly fix it. */
  modelRepairable: boolean;
  questionIndex?: number;
}

export interface RequirementCheck {
  requirement: string;
  status: 'met' | 'repaired' | 'unmet';
  detail?: string;
}

export interface RequirementReport {
  operation: ConversationOperation;
  artifactKind: ArtifactKind;
  language: string;
  domain: string;
  purpose: string;
  understood: string[];
  assumptions: string[];
  checks: RequirementCheck[];
  repairsApplied: string[];
  unmet: string[];
  warnings: string[];
  unsupported: string[];
  complete: boolean;
  modelAttempts: number;
  engine: 'ai' | 'local-fallback';
}
