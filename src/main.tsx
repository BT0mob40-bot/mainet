import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { Web3ConfigProvider } from './Web3Config.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Web3ConfigProvider>
      <App />
    </Web3ConfigProvider>
  </StrictMode>,
);
