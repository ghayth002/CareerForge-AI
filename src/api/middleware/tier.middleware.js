/**
 * CareerForge AI — Tier Middleware
 * WS3: Provides tier-based access control for Free vs Pro features.
 *
 * requirePro(req, res, next)  — Hard-blocks non-pro users with 403
 * attachTier(req, res, next)  — Soft: sets req.userTier for conditional behavior
 */

/**
 * Reads tier from decoded JWT payload (req.user.tier).
 * Sets req.userTier so downstream controllers can make tier-aware decisions
 * without an extra DB round-trip.
 * Falls back to 'free' for unauthenticated or missing tier.
 */
function attachTier(req, res, next) {
  req.userTier = (req.user && req.user.tier) ? req.user.tier : 'free';
  next();
}

/**
 * Hard gate: returns 403 if the authenticated user is not on the Pro tier.
 * Must be used after authMiddleware (requires req.user to be populated).
 */
function requirePro(req, res, next) {
  const tier = (req.user && req.user.tier) ? req.user.tier : 'free';
  if (tier !== 'pro') {
    return res.status(403).json({
      success: false,
      error: 'This feature requires a Pro tier account.',
      upgrade: true,
      current_tier: tier
    });
  }
  next();
}

module.exports = { attachTier, requirePro };
