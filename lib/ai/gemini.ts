import 'server-only';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import type { UserProfile } from '@/types';
import { tailoringPlanSchema, type TailoringPlan } from '@/lib/schemas';
import { HttpError } from '@/lib/http';
import { summarySentences } from './assemble';
import { RESUME_SYSTEM_PROMPT } from './prompt';

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/';
const DEFAULT_MODEL = 'gemini-3.8-flash';

/** The OpenAI SDK is only a transport here: all requests go to Google Gemini. */
export async function generateTailoringPlan(profile: UserProfile, jobDescription: string): Promise<TailoringPlan> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new HttpError(503, 'AI generation is not configured. Add GEMINI_API_KEY to .env.local on the server and restart the app.');

  const client = new OpenAI({
    apiKey,
    baseURL: GEMINI_BASE_URL,
    organization: null,
    project: null,
    timeout: 45000,
    maxRetries: 0,
  });

  try {
    const completion = await client.chat.completions.parse({
      model: process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL,
      reasoning_effort: 'low',
      max_tokens: 12000,
      messages: [
        { role: 'system', content: RESUME_SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify({ masterProfile: profile, summarySentences: summarySentences(profile.summary), jobDescription }) },
      ],
      response_format: zodResponseFormat(tailoringPlanSchema, 'resume_tailoring_plan'),
    });
    const message = completion.choices[0]?.message;
    if (message?.refusal || !message?.parsed) {
      throw new HttpError(422, 'Gemini could not tailor this content. Review your profile and job description, then retry.');
    }
    // Validate again at our boundary before source-grounding and LaTeX assembly.
    return tailoringPlanSchema.parse(message.parsed);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (error instanceof OpenAI.APIConnectionTimeoutError) {
      throw new HttpError(504, 'Gemini took too long to respond. Please try again.');
    }
    if (error instanceof OpenAI.APIError) {
      if (error.status === 429) throw new HttpError(503, 'Gemini is busy or its API quota has been reached. Check your Google AI Studio quota and try again later.');
      if (error.status === 401 || error.status === 403) throw new HttpError(503, 'Gemini access was denied. Check the server-side GEMINI_API_KEY and its API permissions.');
      if (error.status === 404) throw new HttpError(503, 'The configured Gemini model is unavailable. Check GEMINI_MODEL and model access in Google AI Studio.');
    }
    throw new HttpError(502, 'Gemini did not return a complete valid result. Please try again.');
  }
}
