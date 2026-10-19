// Demo page: the real dashboard in a shadow root (like the extension) fed by the mock bridge.
import './browser-stub.js';
import './mock-bridge.js';
import { createRoot } from 'react-dom/client';
import App from '../src/ui/App.jsx';
import css from '../entrypoints/wavault.content/style.css?inline';

const host = document.createElement('wavault-ui');
document.body.appendChild(host);
const shadow = host.attachShadow({ mode: 'open' });
const style = document.createElement('style');
style.textContent = css;
shadow.appendChild(style);
const mount = document.createElement('div');
shadow.appendChild(mount);
if (!location.hash) location.hash = '#wavault=contacts';
createRoot(mount).render(<App />);
