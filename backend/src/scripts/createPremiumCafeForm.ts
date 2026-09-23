import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const formId = '08010ceb-2801-4aed-b181-a500db13d664';

async function main() {
  console.log(`Rebuilding form ${formId} into a premium Cafe Guest Experience Survey...`);

  // 1. Clear existing questions
  await db.question.deleteMany({ where: { formId } });

  // 2. Update form details, styling themes (Curated coffee aesthetic)
  await db.form.update({
    where: { id: formId },
    data: {
      title: "☕ The Specialty Coffee Co. - Guest Experience",
      description: "We craft each cup with precision. Tell us about your visit and join our Coffee Club for a free cookie on your next visit!",
      theme: {
        font_family: "Inter",
        primary_color: "#b45309", // Warm Amber Amber
        background_color: "#fafaf9" // Warm Stone Cream
      }
    }
  });

  // 3. Create premium questions matching topic
  const questionsData = [
    {
      formId,
      type: "name",
      label: "Guest Name",
      required: false,
      orderIndex: 0,
      options: [],
      validations: {
        accessibilityLabel: "Input field for Guest Name",
        placeholder: "e.g. Alex Mercer"
      },
      logic: {}
    },
    {
      formId,
      type: "email",
      label: "Email Address",
      required: true,
      orderIndex: 1,
      options: [],
      validations: {
        required: true,
        message: "Please enter a valid email address.",
        accessibilityLabel: "Input field for Email Address",
        placeholder: "e.g. alex@example.com"
      },
      logic: {}
    },
    {
      formId,
      type: "rating",
      label: "Rate our Coffee Quality (Taste & Temperature)",
      required: true,
      orderIndex: 2,
      options: [],
      validations: {
        required: true,
        message: "Rating is required.",
        accessibilityLabel: "Coffee Quality Rating star scale"
      },
      logic: {}
    },
    {
      formId,
      type: "rating",
      label: "Rate our Cafe Vibe & Atmosphere",
      required: true,
      orderIndex: 3,
      options: [],
      validations: {
        required: true,
        message: "Rating is required.",
        accessibilityLabel: "Cafe Vibe & Atmosphere Rating star scale"
      },
      logic: {}
    },
    {
      formId,
      type: "one_option",
      label: "What is your primary coffee choice?",
      required: true,
      orderIndex: 4,
      options: ["Espresso / Cortado", "Pour Over / AeroPress", "Flat White / Latte", "Cold Brew / Iced Coffee", "Matcha / Tea"],
      validations: {
        required: true,
        message: "Coffee choice is required.",
        accessibilityLabel: "Radio buttons for primary coffee choice"
      },
      logic: {}
    },
    {
      formId,
      type: "photo",
      label: "Upload a photo of your brew or pastry! (Optional)",
      required: false,
      orderIndex: 5,
      options: [],
      validations: {
        max_size: 5, // 5MB limit
        allowed_formats: [".png", ".jpg", ".jpeg"],
        accessibilityLabel: "Photo upload field"
      },
      logic: {}
    },
    {
      formId,
      type: "agreement",
      label: "Join our Coffee Club for a free cookie on your next visit?",
      required: false,
      orderIndex: 6,
      options: ["Yes, sign me up for Coffee Club!"],
      validations: {
        accessibilityLabel: "Checkbox for joining Coffee Club"
      },
      logic: {}
    }
  ];

  await db.question.createMany({
    data: questionsData
  });

  // Query to get the generated IDs
  const questions = await db.question.findMany({
    where: { formId },
    orderBy: { orderIndex: 'asc' }
  });

  const clubQ = questions.find(q => q.label.includes("Coffee Club"));
  
  // Add 8th question: detailed feedback, only visible if they sign up for the Coffee Club
  if (clubQ) {
    await db.question.create({
      data: {
        formId,
        type: "feedback",
        label: "Coffee Club: What are your favorite coffee origins or roasting profiles?",
        required: false,
        orderIndex: 7,
        options: [],
        validations: {
          placeholder: "e.g. Ethiopian fruit-forward pour overs, chocolaty Guatemalan espresso...",
          accessibilityLabel: "Feedback text area for Coffee Club preferences"
        },
        logic: {
          target_question_id: clubQ.id,
          action: "show",
          condition: {
            value: "Yes, sign me up for Coffee Club!"
          }
        }
      }
    });
  }

  console.log("Premium Specialty Coffee Form generated successfully!");
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
