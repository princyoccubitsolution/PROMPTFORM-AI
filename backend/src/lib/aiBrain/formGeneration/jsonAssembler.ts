import { IFieldPlan } from '../fieldIntelligence/interfaces';
import { IFormLayout } from './interfaces';

export class JsonAssembler {
  static assemble(plan: IFieldPlan, layout: IFormLayout, flatQuestions: any[]): any {
    const text = plan.normalizedPrompt?.toLowerCase() || "";
    const isMedical = plan.domain === 'medical' || text.includes("hospital") || text.includes("medical");
    const isEducation = plan.industry === 'Education' || text.includes("school") || text.includes("college") || text.includes("admission");
    const isTech = text.includes("tech") || text.includes("science") || text.includes("antigravity") || text.includes("aerospace");
    const isReview = plan.domain === 'survey' || text.includes("review") || text.includes("feedback") || text.includes("restaurant");

    // Extract clean topic name
    let topicName = "";
    if (plan.normalizedPrompt) {
      let topicClean = plan.normalizedPrompt
        .replace(/\b(\d+[\s\-]question|\d+|\d+\-question|create|make|generate|build|form|survey|quiz|test|exam|created|built|please|for|a|an|the|around|questions|form type|feedback|intake|application|rsvp|medical)\b/gi, "")
        .replace(/\([^)]*\)/g, "")
        .replace(/[\-\_\.]+/g, " ")
        .trim();
      if (topicClean.length > 1) {
        topicName = topicClean.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
    }

    if (!topicName || topicName === "General Subject") {
      topicName = text.includes("javascript") || text.includes("js") ? "JavaScript" :
                  text.includes("python") ? "Python" :
                  text.includes("react") ? "React" :
                  text.includes("node") ? "Node.js" :
                  text.includes("coffee") ? "Coffee Shop" :
                  text.includes("dentist") || text.includes("dental") ? "Dentistry" :
                  text.includes("food") || text.includes("restaurant") ? "Food & Dining" : "Topic";
    }

    let formTitle = topicName.includes("Form") ? topicName : `${topicName} Form`;
    if (plan.domain === 'quiz') {
      formTitle = topicName.includes("Quiz") ? topicName : `${topicName} Quiz & Skill Assessment`;
    } else if (plan.domain === 'survey') {
      formTitle = topicName.includes("Survey") ? topicName : `${topicName} Feedback Survey`;
    } else if (plan.domain === 'job') {
      formTitle = topicName.includes("Application") ? topicName : `${topicName} Application Form`;
    } else if (plan.domain === 'rsvp') {
      formTitle = topicName.includes("RSVP") || topicName.includes("Invitation") ? topicName : `${topicName} Event RSVP Invitation`;
    } else if (plan.domain === 'medical') {
      formTitle = topicName.includes("Intake") || topicName.includes("Medical") ? topicName : `${topicName} Medical Intake Form`;
    } else if (plan.domain === 'contact') {
      formTitle = topicName.includes("Contact") ? topicName : `${topicName} Contact Form`;
    }

    // Determine Topic-Specific Niche Theme (Matching HSL / Brand niche rules)
    let themeName = "royal-blue-education";
    let layoutType = "compact-grid";
    let primaryColor = "#2563eb"; // Royal Blue default
    let backgroundColor = "#eff6ff";

    if (isMedical || text.includes("dental") || text.includes("dentistry") || text.includes("health")) {
      themeName = "emerald-medical";
      layoutType = "wizard-steps";
      primaryColor = "#059669"; // Emerald Green
      backgroundColor = "#ecfdf5";
    } else if (isReview || text.includes("coffee") || text.includes("cafe") || text.includes("food") || text.includes("restaurant") || text.includes("bakery")) {
      themeName = "amber-warm";
      layoutType = "single-question";
      primaryColor = "#d97706"; // Warm Amber
      backgroundColor = "#fffbe6";
    } else if (isTech || text.includes("coding") || text.includes("software") || text.includes("javascript") || text.includes("python") || text.includes("react") || text.includes("node")) {
      themeName = "violet-tech";
      layoutType = "floating-grid";
      primaryColor = "#7c3aed"; // Dark Slate & Violet
      backgroundColor = "#faf5ff";
    } else if (plan.domain === 'job' || text.includes("corporate") || text.includes("finance") || text.includes("career")) {
      themeName = "indigo-corporate";
      layoutType = "compact-grid";
      primaryColor = "#3730a3"; // Deep Indigo
      backgroundColor = "#f5f3ff";
    } else if (plan.domain === 'rsvp' || text.includes("wedding") || text.includes("party") || text.includes("event")) {
      themeName = "rose-event";
      layoutType = "single-question";
      primaryColor = "#e11d48"; // Rose Pink
      backgroundColor = "#fff1f2";
    } else if (text.includes("property") || text.includes("estate") || text.includes("travel") || text.includes("car")) {
      themeName = "cyan-realestate";
      layoutType = "compact-grid";
      primaryColor = "#0284c7"; // Ocean Cyan
      backgroundColor = "#f0f9ff";
    }

    return {
      title: formTitle,
      description: `Structured ${topicName} ${plan.domain} form generated automatically by PromptForm AI.`,
      questions: flatQuestions,
      theme: {
        primary_color: primaryColor,
        background_color: backgroundColor,
        font_family: "Inter",
        rtl: false,
        theme_name: themeName,
        layoutType: layoutType
      },
      settings: {
        collect_emails: !isReview, // Minimize friction for reviews / feedback
        limit_responses: false,
        password: null,
        allow_editing: true,
        shuffle_questions: plan.domain === 'quiz',
        timer_limit: plan.domain === 'quiz' ? 600 : 0,
        anti_cheat_detection: plan.domain === 'quiz'
      },
      layoutConfig: {
        type: layout.type,
        columns: layout.columns
      }
    };
  }
}
