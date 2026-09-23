import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const formId = '08010ceb-2801-4aed-b181-a500db13d664';

async function main() {
  console.log("Setting conditional skip logic...");

  const questions = await db.question.findMany({
    where: { formId },
    orderBy: { orderIndex: 'asc' }
  });

  const recommendQ = questions.find(q => q.label.includes("Recommend"));
  const feedbackQ = questions.find(q => q.label.includes("Detailed Feedback"));

  if (!recommendQ || !feedbackQ) {
    console.error("Required questions not found!");
    return;
  }

  // Update logic on feedback question
  await db.question.update({
    where: { id: feedbackQ.id },
    data: {
      logic: {
        target_question_id: recommendQ.id,
        action: "show",
        condition: {
          value: "Yes, absolutely"
        }
      }
    }
  });

  console.log("Conditional skip logic configured successfully!");
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
