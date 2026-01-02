import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GOOGLE_API_KEY;

if (!apiKey) {
  console.error("No GOOGLE_API_KEY found in process.env");
  process.exit(1);
}

async function listModels() {
  const genAI = new GoogleGenerativeAI(apiKey);
  try {
    console.log("Testing gemini-1.5-flash...");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Hello");
    console.log("Success with gemini-1.5-flash:", result.response.text());
  } catch (error) {
    console.error("Error with gemini-1.5-flash:", error.message);
  }

  try {
    console.log("Testing gemini-1.5-flash-001...");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-001" });
    const result = await model.generateContent("Hello");
    console.log("Success with gemini-1.5-flash-001:", result.response.text());
  } catch (error) {
    console.error("Error with gemini-1.5-flash-001:", error.message);
  }
}

listModels();
