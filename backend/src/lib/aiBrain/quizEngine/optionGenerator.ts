export class OptionGenerator {
  static shuffle(options: string[]): string[] {
    return [...options].sort(() => Math.random() - 0.5);
  }
}
