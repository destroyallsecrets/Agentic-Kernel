import { GoogleGenAI, Type, Chat } from "@google/genai";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// We use the flash preview for the workers for speed and efficiency
const WORKER_MODEL = 'gemini-3-flash-preview';

export const orchestratePlan = async (userPrompt: string): Promise<{ tasks: { role: string; name: string; task: string }[] }> => {
  try {
    const systemInstruction = `
      You are the "Master Agent" (Kernel) of a distributed AI system.
      Your goal is to accept a high-level user request and break it down into atomic tasks for specialized "Worker Agents".
      
      Return a JSON object with a single property "tasks" which is an array of objects.
      Each object must have:
      - "role": The specialty of the agent (e.g., "Frontend Engineer", "Data Scientist", "Security Auditor").
      - "name": A creative codename for the agent (e.g., "Nexus", "Cipher", "Flux").
      - "task": A specific, actionable instruction for that agent.
      
      Keep the number of agents between 2 and 4.
    `;

    const response = await ai.models.generateContent({
      model: WORKER_MODEL,
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  role: { type: Type.STRING },
                  name: { type: Type.STRING },
                  task: { type: Type.STRING }
                },
                required: ["role", "name", "task"]
              }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Master Agent");
    
    return JSON.parse(text);

  } catch (error) {
    console.error("Orchestration failed:", error);
    return {
      tasks: [
        { role: 'Recovery Agent', name: 'Echo-9', task: 'Analyze failure and attempt local processing.' }
      ]
    };
  }
};

/**
 * Creates a new Chat Session for a specific worker agent.
 */
export const createAgentSession = (name: string, role: string, task: string): Chat => {
  const systemInstruction = `
    IDENTITY: You are ${name}, a ${role}.
    CURRENT TASK: ${task}
    
    PROTOCOL:
    1. You are part of a team. You will receive updates from the "Main Bus" (context from other agents).
    2. Think step-by-step. 
    3. Output your thoughts clearly.
    4. If you need to inform the team of something, start your sentence with "BROADCAST:".
    5. When you have finished your specific task, you MUST end your response with the exact token "TASK_COMPLETE".
    6. Keep responses concise (under 50 words) to simulate fast processing.
  `;

  return ai.chats.create({
    model: WORKER_MODEL,
    config: {
      systemInstruction,
    }
  });
};

/**
 * Advances the agent one "turn" by sending it the current state of the world.
 */
export const stepAgent = async (chat: Chat, sharedContext: string, currentTask?: string): Promise<string> => {
  try {
    // We send the shared context as a user message to simulate the environment feeding data to the agent
    const prompt = sharedContext 
      ? `[SYSTEM UPDATE - SHARED BUS]: ${sharedContext}\n\nBased on this and your task, what is your next step?` 
      : `Begin your task: ${currentTask || 'Start working.'}`;

    const response = await chat.sendMessage({ message: prompt });
    return response.text || "Thinking...";
  } catch (err) {
    console.error("Agent Step Error", err);
    return "ERROR: Connection interrupted.";
  }
};