import { IQuestionMetadata } from './interfaces';

export class DifficultyEngine {
  static score(questions: IQuestionMetadata[]): IQuestionMetadata[] {
    return questions.map((q, idx) => {
      // Rotate difficulty
      const diffs: IQuestionMetadata['difficulty'][] = ['easy', 'medium', 'hard'];
      const difficulty = diffs[idx % diffs.length];

      let points = 1;
      let negativePoints = 0;

      if (difficulty === 'medium') {
        points = 2;
      } else if (difficulty === 'hard') {
        points = 3;
        negativePoints = 1; // negative mark for difficult questions
      }

      return {
        ...q,
        difficulty,
        points,
        negativePoints
      };
    });
  }
}
