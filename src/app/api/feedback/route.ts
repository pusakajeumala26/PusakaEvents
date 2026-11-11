import { after } from 'next/server';
import { createFeedbackHandler } from '@/lib/feedback-endpoint';
import { normalizeAvatar } from '@/lib/feedback-avatar';
import { deliverFeedback, saveFeedback } from '@/lib/feedback-service';

export const runtime = 'nodejs';
export const maxDuration = 30;

export const POST = createFeedbackHandler({
  save: async (fields, avatar) => saveFeedback(fields, await normalizeAvatar(avatar)),
  schedule: (id) => after(async () => {
    try { await deliverFeedback(id); } catch { console.error('[feedback] deliver failed'); }
  }),
});
