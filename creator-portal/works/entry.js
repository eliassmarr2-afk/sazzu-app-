import { requirePortalAccess } from '../route-guard.js';

await requirePortalAccess();
await import('./works.js');
await import('./rights.js');
