import type { Metadata } from 'next';
import { UiInspectScript } from '@ui-inspect/next';
import './styles.css';

export const metadata: Metadata = {
  title: 'ui-inspect Next App Router',
  description: 'App Router example for ui-inspect Next.js integration',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <UiInspectScript />
      </body>
    </html>
  );
}
