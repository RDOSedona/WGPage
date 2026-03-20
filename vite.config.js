import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const ADMIN_PANEL_VERSION_BASE = '0.2.8';

function getAdminPanelVersion() {
  try {
    const hash = execSync('git rev-parse --short HEAD', {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();

    return hash ? `${ADMIN_PANEL_VERSION_BASE}+${hash}` : ADMIN_PANEL_VERSION_BASE;
  } catch {
    return ADMIN_PANEL_VERSION_BASE;
  }
}

export default defineConfig({
  base: './',
  plugins: [react()],
  define: {
    'import.meta.env.VITE_ADMIN_PANEL_VERSION': JSON.stringify(getAdminPanelVersion()),
  },
});
