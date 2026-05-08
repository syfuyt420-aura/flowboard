import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate';
import { validateBody } from '../../../middleware/validate';
import { sendSuccess } from '../../../utils/response';
import { AppError } from '../../../utils/AppError';
import { config } from '../../../config';
import { z } from 'zod';
import OpenAI from 'openai';

const router = Router();
router.use(authenticate);

const openai = config.openai.apiKey ? new OpenAI({ apiKey: config.openai.apiKey }) : null;

router.post(
  '/breakdown',
  validateBody(z.object({ goal: z.string().min(5).max(2000) })),
  async (req, res, next) => {
    try {
      if (!openai) throw AppError.badRequest('AI not configured');

      const { goal } = req.body as { goal: string };
      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are a senior engineering project manager. Given a project goal, break it down into 5-10 concrete, actionable tasks.
Return a JSON array of task objects with: title (string), description (string), priority (P0-P4), estimatedHours (number), and dependsOn (array of task indices).
Return ONLY the JSON array, no markdown.`,
          },
          { role: 'user', content: `Goal: ${goal}` },
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) throw AppError.internal('AI returned empty response');

      const parsed = JSON.parse(content) as { tasks: unknown[] };
      sendSuccess(res, { tasks: parsed.tasks ?? parsed });
    } catch (err) { next(err); }
  }
);

router.post(
  '/suggest-priority',
  validateBody(z.object({ title: z.string(), dueDate: z.string().optional(), workloadCount: z.number().optional() })),
  async (req, res, next) => {
    try {
      if (!openai) throw AppError.badRequest('AI not configured');

      const { title, dueDate, workloadCount } = req.body as { title: string; dueDate?: string; workloadCount?: number };
      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a project management assistant. Suggest a task priority (P0=Critical, P1=High, P2=Medium, P3=Low, P4=Minimal) based on the task title and context. Return JSON: {"priority": "P0"|"P1"|"P2"|"P3"|"P4", "reasoning": "brief explanation"}',
          },
          {
            role: 'user',
            content: `Task: "${title}", Due: ${dueDate ?? 'unset'}, Current workload: ${workloadCount ?? 'unknown'} open tasks`,
          },
        ],
        temperature: 0.3,
        max_tokens: 200,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) throw AppError.internal('AI returned empty response');
      sendSuccess(res, JSON.parse(content));
    } catch (err) { next(err); }
  }
);

export default router;
