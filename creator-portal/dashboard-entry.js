import { requirePortalAccess } from './route-guard.js';

await requirePortalAccess();
await import('./app.js');
await import('./dashboard-navigation.js');
await import('./dashboard-payment-ledger.js');
