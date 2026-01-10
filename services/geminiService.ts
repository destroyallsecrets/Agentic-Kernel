import { GoogleGenAI, Type, Chat } from "@google/genai";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Using Flash for speed, but instructing it heavily on structure.
const WORKER_MODEL = 'gemini-3-flash-preview'; 

export const orchestratePlan = async (userPrompt: string): Promise<{ tasks: { role: string; name: string; task: string; dependencies: string[] }[] }> => {
  try {
    const systemInstruction = `
      You are the "Master Agent" (Kernel) of a distributed AI system.
      Your goal is to accept a high-level user request and break it down into atomic tasks for specialized "Worker Agents".
      
      Return a JSON object with a single property "tasks" which is an array of objects.
      Each object must have:
      - "role": The specialty of the agent (e.g., "Frontend Engineer", "Data Scientist", "Security Auditor").
      - "name": A creative codename for the agent (e.g., "Nexus", "Cipher", "Flux").
      - "task": A specific, actionable instruction for that agent.
      - "dependencies": An array of strings containing the "name" of other agents that this agent must wait for or communicate with. If no dependencies, return an empty array.
      
      Consider the workflow. If the Frontend Agent needs the API schema from the Backend Agent, list the Backend Agent's name in the Frontend Agent's dependencies.
      
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
                  task: { type: Type.STRING },
                  dependencies: { 
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  }
                },
                required: ["role", "name", "task", "dependencies"]
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
        { role: 'Recovery Agent', name: 'Echo-9', task: 'Analyze failure and attempt local processing.', dependencies: [] }
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
    1. TEAM CONTEXT: You will receive updates from the "Main Bus".
    2. OUTPUT: Think step-by-step. Keep responses concise (under 50 words) unless generating content.
    3. BROADCAST: If sharing info, start with "BROADCAST:".
    4. ARTIFACT GENERATION: If you are writing code, data, or documentation, you MUST wrap it in XML-style tags like this:
       <file path="directory/filename.ext">
       ... content ...
       </file>
       You can generate multiple files in one turn.
    5. COMPLETION: When finished, end with "TASK_COMPLETE".
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
export const stepAgent = async (chat: Chat, sharedContext: string, currentTask?: string, existingFiles?: string[]): Promise<string> => {
  try {
    const fileContext = existingFiles && existingFiles.length > 0 
      ? `\n[EXISTING FILES]: ${existingFiles.join(', ')}` 
      : '';

    // We send the shared context as a user message to simulate the environment feeding data to the agent
    const prompt = sharedContext 
      ? `[SYSTEM UPDATE - SHARED BUS]: ${sharedContext}${fileContext}\n\nBased on this and your task, what is your next step?` 
      : `Begin your task: ${currentTask || 'Start working.'}`;

    const response = await chat.sendMessage({ message: prompt });
    return response.text || "Thinking...";
  } catch (err) {
    console.error("Agent Step Error", err);
    return "ERROR: Connection interrupted.";
  }
};
