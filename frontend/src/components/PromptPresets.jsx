import React from 'react';
import { Sparkles, Terminal, ShieldAlert, Cpu, Wrench, RefreshCw } from 'lucide-react';

export const CODING_PRESETS = [
  {
    id: 'fullstack',
    title: 'Full-Stack Architect',
    icon: Cpu,
    prompt: 'You are an elite Senior Full-Stack Engineer and Architect. Provide production-ready, clean, scalable code with complete error handling, TypeScript/C# type safety, and best practices. Explain design patterns and edge cases concisely.',
    category: 'Architecture'
  },
  {
    id: 'bugfix',
    title: 'Deep Bug Finder & Fixer',
    icon: ShieldAlert,
    prompt: 'You are an expert debugger and security analyst. Audit the provided code line-by-line, detect root causes, race conditions, memory leaks, security vulnerabilities (OWASP), and provide the fixed code with diff explanation.',
    category: 'Debugging'
  },
  {
    id: 'refactor',
    title: 'Clean Code Refactor',
    icon: RefreshCw,
    prompt: 'You are a clean code specialist following SOLID principles, DRY, and modern idiomatic conventions. Refactor the code for optimal readability, performance, modularity, and testability.',
    category: 'Refactoring'
  },
  {
    id: 'api-gen',
    title: 'API & Microservice Design',
    icon: Terminal,
    prompt: 'You are a backend API architect specializing in REST, gRPC, and GraphQL APIs. Design robust API contracts, validation, database models, and resilient HTTP status handling.',
    category: 'Backend'
  },
  {
    id: 'explain',
    title: 'Code Explainer & Walkthrough',
    icon: Sparkles,
    prompt: 'Explain the following code step-by-step with clear logic flow, time & space complexity (Big-O), and architectural context so any developer can understand and maintain it.',
    category: 'Learning'
  }
];

export default function PromptPresets({ activePreset, onSelectPreset }) {
  return (
    <div className="presets-container">
      <div className="presets-label">
        <Sparkles size={13} className="text-amber-400" />
        <span>Developer Persona & Mode:</span>
      </div>
      <div className="presets-grid">
        {CODING_PRESETS.map((preset) => {
          const Icon = preset.icon;
          const isActive = activePreset === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectPreset(isActive ? null : preset)}
              className={`preset-pill ${isActive ? 'active' : ''}`}
            >
              <Icon size={13} />
              <span>{preset.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
