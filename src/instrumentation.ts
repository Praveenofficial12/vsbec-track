// Next.js instrumentation file — runs once when the server starts.
// We use this to verify the database is intact and create default
// records (PlacementRule, AdminUser) if they're missing.
// This prevents data loss from schema migrations or db:push.

export async function register() {
  // Only run on the server (not during build)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { verifyDatabaseHealth } = await import('@/lib/db-health-check')
    await verifyDatabaseHealth()
  }
}
