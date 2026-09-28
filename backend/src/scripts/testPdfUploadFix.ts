import { AIFormBrain } from '../lib/aiBrain';
import { FieldDiscovery } from '../lib/aiBrain/fieldIntelligence/fieldDiscovery';

const mockPdfSyllabusText = `
COURSE SYLLABUS: ADVANCED OPERATING SYSTEMS & CONCURRENCY
Course Code: CS-402 | Total Units: 5 | Credits: 4

Unit 1: Process Synchronization & Race Conditions
- Critical Section Problem, Peterson's Solution, Mutex Locks, Semaphores.
- Readers-Writers Problem, Dining Philosophers Problem.

Unit 2: Virtual Memory Management & Page Replacement
- Demand Paging, Page Fault Handling, Page Replacement Algorithms (FIFO, LRU, Optimal).
- Thrashing, Working Set Model, Memory Segmentation.

Unit 3: File System Implementation & I/O Systems
- Directory Structures, Allocation Methods (Contiguous, Linked, Indexed).
- Disk Scheduling Algorithms (FCFS, SSTF, SCAN, C-SCAN).

Unit 4: Distributed Systems & Consensus
- Lamport Logical Clocks, Vector Clocks, Byzantine Fault Tolerance.
- Raft & Paxos Consensus Protocols.
`;

const prompt = "Avoid repeated questions. Finally, provide an **Answer Key with a short explanation for all 10 questions**.";

console.log("=== TESTING FIELD DISCOVERY WITH PDF SYLLABUS ===");
const fields = FieldDiscovery.discover("quiz", prompt.toLowerCase(), mockPdfSyllabusText);
console.log("EXTRACTED FIELDS COUNT:", fields.length);
console.log("FIELD LABELS:", fields.map((f, i) => `${i + 1}. ${f.label}`));

console.log("\n=== TESTING FULL AI FORM BRAIN PROCESS ===");
const { formConfig } = AIFormBrain.process(prompt, mockPdfSyllabusText);
console.log("FORM TITLE:", formConfig.title);
console.log("QUESTIONS COUNT:", formConfig.questions.length);
console.log("QUESTION LABELS:", formConfig.questions.map((q: any, i: number) => `${i + 1}. ${q.label}`));
