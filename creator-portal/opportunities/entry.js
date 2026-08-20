import { requirePortalAccess } from '../route-guard.js';

await requirePortalAccess();
await import('./opportunities.js?v=1o-submission-handler-20260820');
