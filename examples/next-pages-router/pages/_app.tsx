import type { AppProps } from 'next/app';
import { UiInspectScript } from '@ui-inspect/next';
import './styles.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <UiInspectScript />
    </>
  );
}
