import { AIFormBrain } from '../lib/aiBrain';
import { FieldDiscovery } from '../lib/aiBrain/fieldIntelligence/fieldDiscovery';

const userPrompt = "ANALYSIS THIS PDF AND GIVE ME 10 QUESTION QUIZ FOR DATA STURCTURE WITH EACH QUESTION 2 MARKS";
const pdfSyllabusText = `
DATA STRUCTURES & ALGORITHMS SYLLABUS
Course Code: CS-201 | Marks: 100

Unit 1: Linear Data Structures - Arrays & Linked Lists
Singly Linked Lists, Doubly Linked Lists, Circular Linked Lists.
Operations: Insertion, Deletion, Traversal.

Unit 2: Stacks & Queues
LIFO & FIFO concepts, Expression conversion (Infix to Postfix).
Deque, Priority Queues, Circular Queues.

Unit 3: Trees & Binary Search Trees
Binary Tree Traversals (Inorder, Preorder, Postorder).
BST operations, AVL Trees, Heap Trees.

Unit 4: Sorting & Searching Algorithms
Bubble Sort, Quick Sort, Merge Sort, Heap Sort.
Linear Search, Binary Search, Time Complexity O(n log n).
`;

console.log("=== TESTING USER DATA STRUCTURES PROMPT WITH FALLBACK ENGINE ===");
const fields = FieldDiscovery.discover("quiz", userPrompt.toLowerCase(), pdfSyllabusText);
console.log("FIELDS COUNT:", fields.length);
console.log("FIELD LABELS:", fields.map((f, i) => `${i + 1}. [${f.points || 2} Marks] ${f.label}`));

const { formConfig } = AIFormBrain.process(userPrompt, pdfSyllabusText);
console.log("\n=== FULL FORM CONFIG OUTPUT ===");
console.log("FORM TITLE:", formConfig.title);
console.log("QUESTIONS COUNT:", formConfig.questions.length);
console.log("QUESTIONS LIST:");
formConfig.questions.forEach((q: any, i: number) => {
  console.log(`Q${i + 1}: ${q.label} (${q.points || 2} Marks)`);
  console.log(`   Options:`, q.options);
  console.log(`   Correct Answer:`, q.correctAnswer);
});
