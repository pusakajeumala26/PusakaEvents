'use client';

import type { PortfolioStatus } from '@/lib/feedback-types';
import { PageHeader } from './AppShell';
import { PortfolioConnectionCard } from './PortfolioConnectionCard';

export function McpServerView({ portfolio }: { portfolio: PortfolioStatus }) {
  return (
    <>
      <PageHeader title="MCP Server" sub="Koneksi portfolio untuk pengiriman feedback" mobileSub="Koneksi portfolio" />
      <div className="content">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 720 }}>
          <PortfolioConnectionCard initial={portfolio} />
        </div>
      </div>
    </>
  );
}
