
import React from 'react';
import ReactDOM from 'react-dom/client';
import { MotionConfig } from 'framer-motion';
import App from './App';
import { initializeI18n } from './i18n';
import './styles.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
void initializeI18n().then(() => {
  root.render(
    <React.StrictMode>
      <MotionConfig reducedMotion="user">
        <App />
      </MotionConfig>
    </React.StrictMode>
  );
});
