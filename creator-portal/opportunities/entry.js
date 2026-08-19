import { requirePortalAccess } from '../route-guard.js';

await requirePortalAccess();
await import('./opportunities.js');
