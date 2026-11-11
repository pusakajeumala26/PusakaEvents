import type { Metadata } from 'next';
import { FeedbackForm } from '@/components/FeedbackForm';
import { PageHeader } from '@/components/AppShell';

export const metadata: Metadata = { title: 'Kirim Masukan' };

export default function FeedbackPage() {
  return (
    <>
      <PageHeader title="Kirim masukan" sub="Bantu kami membuat PusakaEvent lebih baik" mobileSub="Untuk PusakaEvent" />
      <div className="content feedback-content"><FeedbackForm /></div>
    </>
  );
}
