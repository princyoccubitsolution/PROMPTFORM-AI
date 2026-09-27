import { IQuestionMetadata } from './interfaces';

export class DifficultyEngine {
  static score(questions: IQuestionMetadata[]): IQuestionMetadata[] {
    return questions.map((q, idx) => {
      // Rotate difficulty only when not already set
      const diffs: IQuestionMetadata['difficulty'][] = ['easy', 'medium', 'hard'];
      const difficulty = q.difficulty ?? diffs[idx % diffs.length];

      let points: number;
      let negativePoints: number;

      if (q.points != null) {
        points = q.points;
      } else if (difficulty === 'easy') {
        points = 1;
      } else if (difficulty === 'medium') {
        points = 2;
      } else {
        points = 3;
      }

      if (q.negativePoints != null) {
        negativePoints = q.negativePoints;
      } else {
        negativePoints = difficulty === 'hard' ? 1 : 0;
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
