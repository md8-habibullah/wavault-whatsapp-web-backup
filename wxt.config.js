import { defineConfig } from 'wxt';

// One codebase → Chrome / Edge / Brave / Opera (MV3), Firefox (MV2 by default) and Safari.
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  // The sources zip (for Firefox Add-ons review) must hold only what is needed to build: never local test output.
  zip: {
    excludeSources: ['e2e-output/**', '.e2e-profile/**', '.site/**', '*.log', 'docs/images/**', 'site/**', '.github/**'],
  },
  manifest: ({ browser }) => ({
    name: 'WAVault: Backup & Export for WhatsApp Web',
    short_name: 'WAVault',
    description: 'Back up your WhatsApp Web contacts, groups, chats and statuses to CSV, Excel, vCard, Google, Outlook, HTML, PDF and more.',
    permissions: ['storage'],
    host_permissions: ['https://web.whatsapp.com/*'],
    web_accessible_resources: [
      { resources: ['wa-bridge.js', 'fonts/*'], matches: ['https://web.whatsapp.com/*'] },
    ],
    homepage_url: 'https://github.com/md8-habibullah/wavault-whatsapp-web-backup',
    action: { default_title: 'WAVault' },
    ...(browser === 'firefox'
      ? {
          browser_specific_settings: {
            gecko: {
              id: 'wavault@habibullah.dev',
              strict_min_version: '140.0',
              data_collection_permissions: { required: ['none'] },
            },
            gecko_android: { strict_min_version: '142.0' },
          },
        }
      : {}),
  }),
});
