// pages/_app.tsx
import type { AppProps } from 'next/app';
import './globals.css'; // O seu caminho para o CSS

function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}

export default MyApp;