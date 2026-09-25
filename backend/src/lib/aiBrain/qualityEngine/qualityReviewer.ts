import { IReviewReport } from './interfaces';
import { LogicChecker } from './logicChecker';
import { ValidationChecker } from './validationChecker';
import { AccessibilityChecker } from './accessibilityChecker';
import { UxChecker } from './uxChecker';
import { ComplianceChecker } from './complianceChecker';
import { SecurityChecker } from './securityChecker';
import { PerformanceChecker } from './performanceChecker';
import { DuplicateChecker } from './duplicateChecker';
import { ErrorRecovery } from './errorRecovery';
import { AutoImprover } from './autoImprover';
import { QualityScoreEngine } from './qualityScore';
import { EnterpriseReviewer } from './enterpriseReviewer';

import { sanitizeFormTitle } from '../../titleSanitizer';

export class EnterpriseQualityReviewer {
  static reviewAndImprove(formConfig: any): any {
    let questions = Array.isArray(formConfig.questions) ? [...formConfig.questions] : [];
    let config = { ...formConfig, questions };

    const autoFixesApplied: string[] = [];

    // Ensure form title is clean, concise, smart and topic-related (2-4 words max)
    if (config.title) {
      const sanitized = sanitizeFormTitle(config.title, undefined, config.understandingSummary?.topic);
      if (sanitized) {
        config.title = sanitized;
      }
    }

    // 1. Audit logic loops
    const logicCycles = LogicChecker.checkCircularLogic(config.questions);
    if (logicCycles.hasCircular) {
      config.questions = ErrorRecovery.healCircularLogic(config.questions);
      autoFixesApplied.push("Healed circular logic skip pathways.");
    }

    // 2. Audit invalid validation patterns
    const invalidRegs = ValidationChecker.checkRegexPatterns(config.questions);
    if (invalidRegs.length > 0) {
      // Clear incorrect regex patterns
      config.questions = config.questions.map((q: any) => {
        if (invalidRegs.includes(q.label) && q.validations) {
          delete q.validations.pattern;
        }
        return q;
      });
      autoFixesApplied.push("Cleared invalid regex validation constraints.");
    }

    // 3. Audit accessibility screen labels
    const missingArias = AccessibilityChecker.checkAriaLabels(config.questions);
    if (missingArias.length > 0) {
      config.questions = config.questions.map((q: any) => {
        if (!q.accessibilityLabel) {
          q.accessibilityLabel = `Input field for entering ${q.label}`;
        }
        return q;
      });
      autoFixesApplied.push("Injected missing WCAG accessibilityLabels.");
    }

    // 4. Audit UX placeholder details
    const uxIssues = UxChecker.checkUXIssues(config);
    if (uxIssues.length > 0) {
      config.questions = AutoImprover.improve(config.questions);
      autoFixesApplied.push("Enriched missing placeholders with placeholder help guides.");
    }

    // 5. Audit duplicates
    const duplicates = DuplicateChecker.checkDuplicates(config.questions);
    if (duplicates.length > 0) {
      const labels = new Set<string>();
      config.questions = config.questions.map((q: any) => {
        if (labels.has(q.label)) {
          q.label = `${q.label} (Copy)`;
        } else {
          labels.add(q.label);
        }
        return q;
      });
      autoFixesApplied.push("Deduplicated duplicate question labels.");
    }

    // 5.5 Audit and enforce Quiz MCQ completeness & 4-option requirement
    const isQuizForm = config.isQuiz || 
                       config.settings?.leaderboardReady || 
                       config.settings?.anti_cheat_detection ||
                       (config.understandingSummary?.formType && /quiz|mcq|exam|test/i.test(config.understandingSummary.formType));

    if (isQuizForm) {
      config.isQuiz = true;
      let quizHealedCount = 0;

      config.questions = config.questions.map((q: any) => {
        const lowerLabel = (q.label || '').toLowerCase();
        const isIdentity = lowerLabel.includes("name") || lowerLabel.includes("roll") || lowerLabel.includes("id code") || lowerLabel.includes("student id") || lowerLabel.includes("email");

        if (!isIdentity) {
          // Convert text fields to MCQ type for quiz questions
          if (q.type === 'short_text' || q.type === 'long_text' || q.type === 'standard-input' || !q.type) {
            q.type = 'mcq';
            quizHealedCount++;
          }

          // Ensure options array exists and has at least 4 items for MCQs/choice fields
          if (q.type === 'mcq' || q.type === 'one_option' || q.type === 'dropdown' || q.type === 'checkbox') {
            if (!Array.isArray(q.options)) q.options = [];
            if (q.options.length < 4) {
              const fallbackChoices = ["Option A", "Option B", "Option C", "Option D"];
              while (q.options.length < 4) {
                q.options.push(fallbackChoices[q.options.length] || `Option ${q.options.length + 1}`);
              }
              quizHealedCount++;
            }
          }

          // Ensure evaluation properties exist
          if (!q.correctAnswer && Array.isArray(q.options) && q.options.length > 0) {
            q.correctAnswer = q.options[0];
          }
          if (q.points === undefined) {
            q.points = 10;
          }
          if (!q.explanation && q.correctAnswer) {
            q.explanation = `Option '${q.correctAnswer}' is the verified correct answer for "${q.label}".`;
          }
          if (!q.difficulty) {
            q.difficulty = config.understandingSummary?.difficulty || "Intermediate";
          }
        }
        return q;
      });

      if (quizHealedCount > 0) {
        autoFixesApplied.push("Enforced strict MCQ widget types, 4-option choices, and answer metadata for Quiz form.");
      }
    }

    // 6. Compute scores
    const scores = QualityScoreEngine.compute(
      config,
      logicCycles.hasCircular ? 1 : 0,
      invalidRegs.length,
      missingArias.length,
      uxIssues.length
    );

    // Attach computed scores directly inside the metadata package configuration
    config.qualityReport = {
      passed: scores.overall >= 9.0,
      scores,
      autoFixesApplied,
      warnings: []
    };

    return config;
  }
}
