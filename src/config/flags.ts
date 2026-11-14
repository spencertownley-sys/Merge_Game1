// Build-time feature flags.

/** The admin tuning screen (it accepts external image URLs) exists only in dev builds, or in a
 *  build made with VITE_ENABLE_ADMIN=1. Production builds never expose it. */
export const ADMIN_ENABLED = import.meta.env.DEV || import.meta.env.VITE_ENABLE_ADMIN === '1';
