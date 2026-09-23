export class AnalyticsEngine {
  static configureLeaderboard(domain: string): boolean {
    // Leadboard is active only for educational quizzes
    return domain === 'quiz';
  }
}
