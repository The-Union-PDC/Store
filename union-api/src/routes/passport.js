/**
 * Passport route
 *
 * GET /api/passport/:avatarId
 *
 * Returns a Fighter Passport shaped to match the fighter-passport.html HUD.
 * Pulls live data from OASIS: avatar, karma, quests, holons.
 */

const router = require('express').Router();
const oasis  = require('../lib/oasis');

// Derive tier from session count
function getTier(sessions) {
  if (sessions >= 500) return 'legend';
  if (sessions >= 200) return 'veteran';
  if (sessions >= 50)  return 'fighter';
  return 'recruit';
}

// Format a Date or ISO string as "Today, HH:MM" / "Yesterday" / "Mon" / "12 Mar"
function formatTs(dateStr) {
  if (!dateStr) return '—';
  try {
    const d     = new Date(dateStr);
    const now   = new Date();
    const today = now.toDateString();
    const yest  = new Date(now - 86400000).toDateString();
    if (d.toDateString() === today)
      return `Today, ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    if (d.toDateString() === yest) return 'Yesterday';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  } catch { return '—'; }
}

// Derive month-year from an ISO string (e.g. "2025-11")
function memberSinceStr(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  } catch { return '—'; }
}

router.get('/:avatarId', async (req, res, next) => {
  try {
    const { avatarId } = req.params;

    // Fetch all three in parallel; failures are non-fatal
    const [avatarRes, karmaRes, questsRes, holonsRes] = await Promise.allSettled([
      oasis.getAvatar(avatarId),
      oasis.getKarma(avatarId),
      oasis.listQuests(),
      oasis.searchHolons({ avatarId }).catch(() => [])
    ]);

    const avatarData  = avatarRes.status  === 'fulfilled' ? avatarRes.value  : null;
    const karmaData   = karmaRes.status   === 'fulfilled' ? karmaRes.value   : null;
    const questsData  = questsRes.status  === 'fulfilled' ? questsRes.value  : [];
    const holonsData  = holonsRes.status  === 'fulfilled' ? holonsRes.value  : [];

    // ── Tokens ────────────────────────────────────────────────────────────
    const tokens      = karmaData?.karma ?? 0;
    const history     = Array.isArray(karmaData?.karmaHistory) ? karmaData.karmaHistory : [];

    // Total ever earned = sum of all positive karma events
    const tokensTotal = history.reduce((sum, h) => sum + Math.max(0, h.karmaEarned ?? h.karma ?? 0), 0) || tokens;
    const tokensSpent = Math.max(0, tokensTotal - tokens);

    // ── Sessions ──────────────────────────────────────────────────────────
    // Count check-in holons as the authoritative session count
    const checkinHolons = Array.isArray(holonsData)
      ? holonsData.filter(h => h?.metaData?.type === 'CheckIn' || h?.name?.startsWith('CheckIn:'))
      : [];
    // Fallback: count karma events that look like sessions
    const sessionEvents = history.filter(h =>
      h.description?.toLowerCase().includes('training') ||
      h.description?.toLowerCase().includes('session') ||
      h.karmaType === 'BeInspiring'
    );
    const sessions = checkinHolons.length || sessionEvents.length || Math.max(0, Math.round(tokens / 10));

    // ── Quests ────────────────────────────────────────────────────────────
    const quests      = Array.isArray(questsData?.quests) ? questsData.quests : (Array.isArray(questsData) ? questsData : []);
    const questsDone  = quests.filter(q => q.status === 'Completed' || q.completedOn).length;

    // ── Tier & chapter stamps ─────────────────────────────────────────────
    const tier        = getTier(sessions);
    // Derive chapter stamps from checkin holons (unique chapters visited)
    const stamps      = checkinHolons.length > 0
      ? [...new Set(checkinHolons.map(h => h?.metaData?.chapter || 'PDC'))]
      : ['PDC'];

    // ── Dates ─────────────────────────────────────────────────────────────
    const lastCheckinDate = checkinHolons.length > 0
      ? checkinHolons.sort((a, b) => new Date(b?.metaData?.checkinAt || 0) - new Date(a?.metaData?.checkinAt || 0))[0]?.metaData?.checkinAt
      : history[history.length - 1]?.date ?? null;

    const lastCheckin  = formatTs(lastCheckinDate);
    const memberSince  = memberSinceStr(avatarData?.createdDate ?? avatarData?.created ?? history[0]?.date);

    // ── Activity feed (last 10 events, newest first) ──────────────────────
    const activity = history
      .slice()
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .slice(0, 10)
      .map(h => ({
        ts:  formatTs(h.date),
        msg: h.description || `Session logged at The Union`,
        pts: `+${h.karmaEarned ?? h.karma ?? 1} 🪙`
      }));

    res.json({
      // ── Identity
      avatarId,
      name:        avatarData?.username ?? avatarData?.firstName ?? 'Fighter',
      chapter:     'PDC',
      memberSince,
      lastCheckin,
      // ── Tier
      tier,
      // ── Training
      sessions,
      // ── Tokens
      tokens,
      tokensTotal,
      tokensSpent,
      // ── Quests
      questsDone,
      // ── Chapter stamps
      stamps,
      // ── Feed
      activity,
      // ── Raw (debug)
      _karma:  karmaData,
      _avatar: avatarData,
    });
  } catch (err) { next(err); }
});

module.exports = router;
