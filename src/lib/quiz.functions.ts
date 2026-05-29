import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { callOpenRouter } from "./llm.functions";
import { knowledgeBase, type Domain } from "./knowledge";

const DomainSchema = z.enum(["dsa", "springboot", "system_design", "lld"]);

// Generate MCQ quiz from knowledge
const GenInput = z.object({
  domain: DomainSchema,
  count: z.number().int().min(1).max(10).default(5),
  userOpenRouterKey: z.string().optional(),
  // Ollama pass-through
  useOllama: z.boolean().optional(),
  ollamaUrl: z.string().optional(),
  ollamaModel: z.string().optional(),
});

export type QuizQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

import { QUIZ_BANK } from "../knowledge/quizzes";

export const generateQuiz = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => GenInput.parse(d))
  .handler(async ({ data }) => {
    try {
      const allQs = QUIZ_BANK[data.domain as Domain];
      if (!allQs || allQs.length === 0) return { ok: false as const, error: "No questions available for this domain" };
      
      // Shuffle array using Fisher-Yates
      const shuffled = [...allQs];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      
      const clean = shuffled.slice(0, data.count);
      return { ok: true as const, questions: clean };
    } catch {
      return { ok: false as const, error: "Failed to load quiz" };
    }
  });

// Judge a free-form answer
const JudgeInput = z.object({
  domain: DomainSchema,
  question: z.string(),
  userAnswer: z.string().min(1),
  referenceExplanation: z.string().optional(),
  userOpenRouterKey: z.string().optional(),
  // Ollama pass-through
  useOllama: z.boolean().optional(),
  ollamaUrl: z.string().optional(),
  ollamaModel: z.string().optional(),
});

export const judgeFreeAnswer = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => JudgeInput.parse(d))
  .handler(async ({ data }) => {
    const kb = knowledgeBase[data.domain as Domain].slice(0, 6000);
    const prompt = `You are a strict but fair technical interviewer judging a candidate's free-form answer.

Question: ${data.question}
Candidate Answer: ${data.userAnswer}
${data.referenceExplanation ? `Reference: ${data.referenceExplanation}` : ""}

Knowledge base (for context):
${kb}

Return STRICT JSON:
{"score": 0-10, "verdict": "correct" | "partial" | "incorrect", "feedback": "1-3 sentence explanation of what was right/wrong"}`;

    const res = await callOpenRouter({
      data: {
        messages: [
          { role: "system", content: "You output strict JSON only." },
          { role: "user", content: prompt },
        ],
        jsonMode: true,
        temperature: 0.3,
        userOpenRouterKey: data.userOpenRouterKey,
        useOllama: data.useOllama,
        ollamaUrl: data.ollamaUrl,
        ollamaModel: data.ollamaModel,
      },
    });

    if (!res.ok) return { ok: false as const, error: res.message };

    try {
      const raw = res.text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
      const j = JSON.parse(raw);
      return {
        ok: true as const,
        score: Math.max(0, Math.min(10, Number(j.score) || 0)),
        verdict: (j.verdict || "partial") as "correct" | "partial" | "incorrect",
        feedback: String(j.feedback || ""),
      };
    } catch {
      return { ok: false as const, error: "Failed to parse judgment" };
    }
  });
