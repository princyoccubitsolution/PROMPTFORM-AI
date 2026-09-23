export interface FieldTemplate {
  type: string;
  label: string;
  required: boolean;
  options: string[];
}

export interface DomainMetadata {
  domain: string;
  bestPracticeRules: string[];
  recommendedTheme: {
    primary_color: string;
    background_color: string;
    font_family: string;
  };
  standardFields: FieldTemplate[];
}

export interface IKnowledgeProvider {
  name: string;
  getDomainMetadata(domain: string): Promise<DomainMetadata | null>;
}

export class LocalStaticKnowledgeProvider implements IKnowledgeProvider {
  name = "local_static";

  private templates: Record<string, FieldTemplate[]> = {
    quiz: [
      { type: "mcq", label: "What is the capital of France?", required: true, options: ["London", "Paris", "Berlin", "Rome"] },
      { type: "checkbox", label: "Which of the following are programming languages? (Select all)", required: true, options: ["HTML", "Python", "TypeScript", "French"] },
      { type: "dropdown", label: "Choose the correct spelling:", required: true, options: ["Receive", "Recieve", "Receve"] },
      { type: "rating", label: "Rate the difficulty of this test:", required: false, options: [] }
    ],
    survey: [
      { type: "rating", label: "Overall Satisfaction", required: true, options: [] },
      { type: "mcq", label: "How often do you use our product?", required: true, options: ["Daily", "Weekly", "Monthly", "Rarely"] },
      { type: "checkbox", label: "What features do you use most? (Select all)", required: false, options: ["AI Form Builder", "Real-time Analytics", "Slack Integrations", "Export Features"] },
      { type: "long_text", label: "What is one thing we could improve?", required: false, options: [] }
    ],
    rsvp: [
      { type: "mcq", label: "Will you be attending?", required: true, options: ["Yes, I will be there", "No, I cannot attend", "Maybe"] },
      { type: "short_text", label: "Dietary Restrictions", required: false, options: [] },
      { type: "mcq", label: "Need parking assistance?", required: false, options: ["Yes", "No"] }
    ],
    job: [
      { type: "short_text", label: "Full Name", required: true, options: [] },
      { type: "short_text", label: "Email Address", required: true, options: [] },
      { type: "short_text", label: "Role Applied For", required: true, options: [] },
      { type: "file_upload", label: "Upload CV / Resume", required: true, options: [] }
    ],
    contact: [
      { type: "short_text", label: "Full Name", required: true, options: [] },
      { type: "short_text", label: "Email Address", required: true, options: [] },
      { type: "short_text", label: "Phone Number", required: false, options: [] },
      { type: "long_text", label: "Message Details", required: false, options: [] }
    ],
    medical: [
      { type: "short_text", label: "Patient Full Name", required: true, options: [] },
      { type: "short_text", label: "Date of Birth", required: true, options: [] },
      { type: "mcq", label: "Blood Group", required: true, options: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] },
      { type: "long_text", label: "Medical History Summary", required: false, options: [] }
    ],
    complaint: [
      { type: "short_text", label: "Resident Name", required: true, options: [] },
      { type: "short_text", label: "Wing & Flat Number", required: true, options: [] },
      { type: "mcq", label: "Complaint Category", required: true, options: ["Maintenance", "Security", "Plumbing", "Electrical", "Other"] },
      { type: "long_text", label: "Description", required: true, options: [] }
    ],
    invoice: [
      { type: "short_text", label: "Company Name", required: true, options: [] },
      { type: "short_text", label: "Item Description", required: true, options: [] },
      { type: "short_text", label: "Unit Price", required: true, options: [] },
      { type: "short_text", label: "Quantity", required: true, options: [] }
    ],
    general: [
      { type: "short_text", label: "Full Name", required: true, options: [] },
      { type: "short_text", label: "Email Address", required: true, options: [] },
      { type: "long_text", label: "Please describe your request", required: false, options: [] }
    ]
  };

  async getDomainMetadata(domain: string): Promise<DomainMetadata | null> {
    const fields = this.templates[domain] || this.templates.general;
    const rules = [
      `Maintain optimal form length for: ${domain}`,
      "Ensure clean labels and accessibility hints."
    ];
    return {
      domain,
      bestPracticeRules: rules,
      recommendedTheme: {
        primary_color: "#6366f1",
        background_color: "#f8fafc",
        font_family: "Inter"
      },
      standardFields: fields
    };
  }
}

export class RagKnowledgeProvider implements IKnowledgeProvider {
  name = "rag_provider";
  async getDomainMetadata(domain: string): Promise<DomainMetadata | null> {
    return null;
  }
}

export class McpKnowledgeProvider implements IKnowledgeProvider {
  name = "mcp_provider";
  async getDomainMetadata(domain: string): Promise<DomainMetadata | null> {
    return null;
  }
}

export class PluginKnowledgeProvider implements IKnowledgeProvider {
  name = "plugin_provider";
  async getDomainMetadata(domain: string): Promise<DomainMetadata | null> {
    return null;
  }
}

export class KnowledgeEngine {
  private providers: IKnowledgeProvider[] = [];

  constructor(initialProviders: IKnowledgeProvider[] = []) {
    this.providers = initialProviders;
    if (this.providers.length === 0) {
      this.providers.push(new LocalStaticKnowledgeProvider());
    }
  }

  registerProvider(provider: IKnowledgeProvider): void {
    this.providers.push(provider);
  }

  async getDomainMetadata(domain: string): Promise<DomainMetadata> {
    const rules: string[] = [];
    let theme = { primary_color: "#6366f1", background_color: "#f8fafc", font_family: "Inter" };
    const fieldsMap = new Map<string, FieldTemplate>();

    for (const provider of this.providers) {
      try {
        const metadata = await provider.getDomainMetadata(domain);
        if (metadata) {
          rules.push(...metadata.bestPracticeRules);
          theme = { ...theme, ...metadata.recommendedTheme };
          for (const f of metadata.standardFields) {
            fieldsMap.set(f.label, f);
          }
        }
      } catch (err) {
        // ignore
      }
    }

    return {
      domain,
      bestPracticeRules: Array.from(new Set(rules)),
      recommendedTheme: theme,
      standardFields: Array.from(fieldsMap.values())
    };
  }

  static getPresetQuestions(domain: string): FieldTemplate[] {
    const defaultProvider = new LocalStaticKnowledgeProvider();
    const templates = (defaultProvider as any).templates;
    return templates[domain] || templates.general;
  }
}
