import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const formId = '08010ceb-2801-4aed-b181-a500db13d664';

async function main() {
  console.log(`Fixing questions for form ID: ${formId}...`);

  const form = await db.form.findUnique({
    where: { id: formId },
    include: { questions: true }
  });

  if (!form) {
    console.error("Form not found!");
    return;
  }

  // 1. Delete existing questions for this form
  await db.question.deleteMany({
    where: { formId }
  });

  // 2. Insert corrected, premium questions matching UX rules
  const updatedQuestions = [
    {
      formId,
      type: "rating",
      label: "Food Quality and Taste Rating",
      required: true,
      orderIndex: 0,
      options: [],
      validations: {
        required: true,
        message: "Food Quality and Taste Rating is required.",
        accessibilityLabel: "Input field for entering Food Quality and Taste Rating"
      },
      logic: {}
    },
    {
      formId,
      type: "rating",
      label: "Service Speed & Waiter Attentiveness",
      required: true,
      orderIndex: 1,
      options: [],
      validations: {
        required: true,
        message: "Service Speed & Waiter Attentiveness is required.",
        accessibilityLabel: "Input field for entering Service Speed & Waiter Attentiveness"
      },
      logic: {}
    },
    {
      formId,
      type: "rating",
      label: "Ambiance & Cleanliness Rating",
      required: true,
      orderIndex: 2,
      options: [],
      validations: {
        required: true,
        message: "Ambiance & Cleanliness Rating is required.",
        accessibilityLabel: "Input field for entering Ambiance & Cleanliness Rating"
      },
      logic: {}
    },
    {
      formId,
      type: "one_option",
      label: "Dining Frequency",
      required: true,
      orderIndex: 3,
      options: ["First Time", "Weekly", "Monthly", "Occasionally"],
      validations: {
        required: true,
        message: "Dining Frequency is required.",
        accessibilityLabel: "Input field for entering Dining Frequency"
      },
      logic: {}
    },
    {
      formId,
      type: "agreement",
      label: "Recommend to friends & family?",
      required: true,
      orderIndex: 4,
      options: ["Yes, absolutely"],
      validations: {
        required: true,
        message: "Recommendation preference is required.",
        accessibilityLabel: "Input field for entering Recommend to friends & family?"
      },
      logic: {}
    },
    {
      formId,
      type: "feedback",
      label: "Detailed Feedback & Experience Details",
      required: false,
      orderIndex: 5,
      options: [],
      validations: {
        placeholder: "Tell us more about your dining experience...",
        accessibilityLabel: "Input field for entering Detailed Feedback & Experience Details"
      },
      logic: {}
    }
  ];

  await db.question.createMany({
    data: updatedQuestions
  });

  // Also update the form layout to standard grid/list
  await db.form.update({
    where: { id: formId },
    data: {
      theme: {
        ...(form.theme as any),
        layoutType: "compact-grid"
      }
    }
  });

  console.log("Form questions and layout updated and fixed successfully!");
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
