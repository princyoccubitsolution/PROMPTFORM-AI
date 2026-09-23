export class RatingEngine {
  static getScaleEmoji(satisfactionLevel: number): string {
    if (satisfactionLevel >= 8) return "😀 Highly Satisfied";
    if (satisfactionLevel >= 5) return "😐 Neutral";
    return "😞 Dissatisfied";
  }
}
