import { IFormSection } from '../fieldIntelligence/interfaces';

export class SectionGenerator {
  static generate(sections: IFormSection[]): IFormSection[] {
    return sections.map(section => ({
      title: section.title,
      description: section.description || `Fields relating to ${section.title}`,
      fields: section.fields
    }));
  }
}
