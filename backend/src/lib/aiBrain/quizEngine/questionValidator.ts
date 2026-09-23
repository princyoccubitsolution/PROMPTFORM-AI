import { IQuestionMetadata } from './interfaces';

export class QuestionValidator {
  static validateAndRepair(questions: IQuestionMetadata[]): IQuestionMetadata[] {
    // 1. Filter out duplicates
    const labels = new Set<string>();
    let cleanQuestions = questions.filter(q => {
      if (labels.has(q.label)) {
        return false; // Skip duplicate question labels
      }
      labels.add(q.label);
      return true;
    });

    // 2. Ensure each question has explanation fallback if it is a quiz
    cleanQuestions = cleanQuestions.map(q => {
      if (q.correctAnswer && !q.explanation) {
        q.explanation = "Answer key resolved based on course syllabus.";
      }
      return q;
    });

    return cleanQuestions;
  }
}
