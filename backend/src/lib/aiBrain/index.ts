import { IntentDetector, IntentContext } from './intentDetector';
import { LanguageDetector } from './languageDetector';
import { DomainDetector } from './domainDetector';
import { IndustryDetector } from './industryDetector';
import { RequirementAnalyzer } from './requirementAnalyzer';
import { DeepReasoner } from './deepReasoner';
import { KnowledgeEngine } from './knowledgeEngine';
import { FormPlanner } from './formPlanner';
import { ValidationPlanner } from './validationPlanner';
import { LogicPlanner } from './logicPlanner';
import { SelfReviewer } from './selfReviewer';
import { JsonGenerator } from './jsonGenerator';
import { ContextEngine, SessionContext } from './contextEngine';
import { EnterpriseContextEngine } from './memory';
import { SmartFieldIntelligenceEngine } from './fieldIntelligence';
import { EnterpriseFormGenerator } from './formGeneration';
import { EnterpriseQuizEngine } from './quizEngine';
import { EnterpriseDocumentIntelligenceEngine } from './documentIntelligence';
import { EnterpriseFormEditor } from './formEditor';
import { EnterpriseQualityReviewer } from './qualityEngine';

export { IntentContext, ContextEngine, SessionContext, EnterpriseContextEngine, SmartFieldIntelligenceEngine, EnterpriseFormGenerator, EnterpriseQuizEngine, EnterpriseDocumentIntelligenceEngine, EnterpriseFormEditor, EnterpriseQualityReviewer, DomainDetector };

export class AIFormBrain {
  static process(prompt: string, documentContext?: string): { intentContext: IntentContext; formConfig: any } {
    let context = IntentDetector.detect(prompt);
    context = LanguageDetector.detect(context);
    
    const domain = DomainDetector.detect(context);
    const industry = IndustryDetector.detect(domain, context.normalizedPrompt);
    const requirements = RequirementAnalyzer.analyze(context, domain);
    const reasoning = DeepReasoner.reason(domain, requirements);
    const intelligencePlan = SmartFieldIntelligenceEngine.resolve(domain, industry, context.normalizedPrompt, documentContext);
    const formConfig = EnterpriseFormGenerator.generate(intelligencePlan);

    if (domain === 'quiz' || domain === 'survey' || domain === 'medical') {
      const assessmentPlan = EnterpriseQuizEngine.resolve(domain, context.normalizedPrompt, formConfig.questions);
      
      formConfig.questions = formConfig.questions.map((q: any) => {
        const matchingQ = assessmentPlan.questions.find((aq: any) => aq.label === q.label);
        if (matchingQ) {
          return {
            ...q,
            correctAnswer: matchingQ.correctAnswer,
            explanation: matchingQ.explanation,
            difficulty: matchingQ.difficulty,
            category: matchingQ.category,
            tags: matchingQ.tags,
            points: matchingQ.points,
            negativePoints: matchingQ.negativePoints,
            bloomsTaxonomy: matchingQ.bloomsTaxonomy
          };
        }
        return q;
      });

      formConfig.settings = {
        ...formConfig.settings,
        leaderboardReady: assessmentPlan.leaderboardReady,
        certificateConfig: assessmentPlan.certificateConfig,
        shuffle_questions: true,
        anti_cheat_detection: true,
        timer_limit: 600,
        limit_responses: true
      };
    }

    formConfig.settings = {
      ...formConfig.settings,
      ...reasoning.recommendedSettings
    };

    formConfig.theme.rtl = context.isRtl;

    const improvedForm = EnterpriseQualityReviewer.reviewAndImprove(formConfig);

    return {
      intentContext: context,
      formConfig: improvedForm
    };
  }

  static processFollowUp(
    prompt: string, 
    existingForm: any, 
    context: IntentContext
  ): { intentContext: IntentContext; formConfig: any } {
    const refinedContext = LanguageDetector.detect(context);
    
    const { formConfig } = EnterpriseFormEditor.applyEdit(existingForm, prompt);
    formConfig.theme.rtl = refinedContext.isRtl;

    const improvedForm = EnterpriseQualityReviewer.reviewAndImprove(formConfig);

    return {
      intentContext: refinedContext,
      formConfig: improvedForm
    };
  }
}
