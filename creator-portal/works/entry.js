import { requirePortalAccess } from '../route-guard.js';

await requirePortalAccess();
await import('./works.js?v=1o-tus-sign-20260820');
await import('./rights.js');
