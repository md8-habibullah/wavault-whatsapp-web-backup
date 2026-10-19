// Injected into the WhatsApp Web page (main world) so it can read WhatsApp's own data modules.
import { startServer } from '../src/bridge/server.js';

export default defineUnlistedScript(() => {
  startServer();
});
