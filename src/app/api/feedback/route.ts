import { createFeedbackHandler } from '@/lib/feedback-endpoint';
import { submitPortfolioFeedback } from '@/lib/portfolio-feedback';

export const runtime = 'nodejs';

export const POST = createFeedbackHandler({ submit: submitPortfolioFeedback });
