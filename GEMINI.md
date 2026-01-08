# Agentic Kernel - Project Context (GEMINI.md)

## Project Overview
**Agentic Kernel** is a responsive Master Agent orchestration platform. It serves as a "Brain" that accepts natural language commands to spawn and manage a fleet of specialized "Worker Agents". The UI adapts seamlessly between a mobile-first focus view and a high-density desktop control center.

## Architecture
- **Pattern**: Master-Worker Orchestration.
- **Frontend-First**: Logic resides in the client (`useAgentSystem` hook) simulating backend processes.
- **Responsive Strategy**: "Atomic Module" - layout changes significantly between mobile/desktop (Sheet vs Sidebar, List vs Grid).

## Tech Stack
- **Core**: React 19, TypeScript.
- **Styling**: Tailwind CSS (Dark mode, "glass-panel" aesthetics).
- **Icons**: Lucide React.
- **AI Layer**: `@google/genai` (Gemini 1.5/3 series).

## File Structure & Responsibilities
- **`App.tsx`**: Main entry and layout orchestrator. Handles top-level responsive logic (Mobile Nav vs Desktop Sidebar).
- **`hooks/useAgentSystem.ts`**: The "Engine". Manages `WorkerAgent` state, logs, and interfaces with `geminiService`.
- **`services/geminiService.ts`**: API layer. Sends prompts to Gemini to parse user intent into JSON task structures.
- **`components/AgentCard.tsx`**: UI for individual workers. Renders progress, status, and memory usage.
- **`components/Terminal.tsx`**: System log viewer. Adapts as a bottom sheet (mobile) or side panel (desktop).
- **`types.ts`**: Shared TypeScript definitions (`AgentStatus`, `WorkerAgent`, `AgentLog`).

## Development Workflow (Cherny-Style)
1.  **Plan**: Read `GEMINI.md` and `SHARLOG.md` (if exists) to understand state.
2.  **Execute**: Implement features using Tailwind utility classes. Prefer `glass-panel` for containers.
3.  **Verify**: Check `SHARLOG.md` for runtime errors or compilation issues.

## Design System
- **Colors**:
  - Background: `bg-gray-950`
  - Panels: `bg-gray-900/30` with blur.
  - Accents: `primary-500` (Main), `accent-cyan` (Working), `accent-purple` (Thinking/AI), `accent-emerald` (Success), `red-500` (Error/Kill).
- **Typography**: Sans-serif for UI, Monospace for logs/code.
