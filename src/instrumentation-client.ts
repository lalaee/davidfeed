// Runs in the browser before the app hydrates (Next 15.3+): the analytics
// start here so the first pageview is not missed. See lib/analytics.ts.
import { startAnalytics } from "@/lib/analytics";

startAnalytics();
