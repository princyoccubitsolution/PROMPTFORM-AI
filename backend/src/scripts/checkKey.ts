import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
dotenv.config({ path: path.join(__dirname, '../../.env') });

const apiKey = process.env.GEMINI_API_KEY;

async function testKey() {
  if (!apiKey) {
    console.error('No Gemini API Key found!');
    process.exit(1);
  }
  const pdfPath = path.join(__dirname, '../../public/uploads/1783580654215-407892306-Assignment_15999_Content_Document_20260205030155PM_0155953.pdf');
  let pdfBuffer: Buffer | null = null;
  if (fs.existsSync(pdfPath)) {
    pdfBuffer = fs.readFileSync(pdfPath);
    console.log(`Loaded test PDF: ${pdfPath} (${pdfBuffer.length} bytes)`);
  } else {
    console.log('Test PDF not found, using text prompt.');
  }

  const prompt = "Generate an interactive MCQ quiz for this topic: Cloud Computing & AWS Shared Responsibility Model. 3 questions with options A, B, C, D, correct answers, and explanations.";
  const systemInstruction = "You are an expert quiz generator. Return valid JSON only.";
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: { responseMimeType: "application/json" }
      })
    });
    console.log('gemini-2.5-flash-lite Status:', res.status);
    const data = await res.json() as any;
    if (res.status === 200) {
      console.log('SUCCESS with 2.5-flash-lite!');
      console.log(data.candidates[0].content.parts[0].text.substring(0, 400) + '...');
    } else {
      console.log('Error:', JSON.stringify(data));
    }
  } catch (e: any) {
    console.error('Exception:', e.message);
  }
}

testKey();
