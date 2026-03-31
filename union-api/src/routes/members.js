/**
 * Member routes
 *
 * POST /api/members/register      — create OASIS avatar + link fingerprintId
 * POST /api/members/link          — link a fingerprintId to an existing avatarId
 * GET  /api/members               — list all linked members (local mapping)
 * GET  /api/members/lookup?q=     — search by name or email (onboarding flow)
 * GET  /api/members/:avatarId     — full OASIS avatar details
 * PATCH /api/members/:avatarId/phone — update phone number
 */

const router = require('express').Router();
const oasis = require('../lib/oasis');
const { linkFingerprint, getMemberByFingerprint, getAllMembers, updateMemberPhone } = require('../lib/localDb');

// Register a new member — creates their OASIS avatar + stores fingerprint link
router.post('/register', async (req, res, next) => {
  try {
    const { fingerprintId, username, email, password, firstName, lastName, phone, chapter = 'PDC' } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email, password required' });
    }

    // 1. Create OASIS avatar
    const avatar = await oasis.registerAvatar({ username, email, password, firstName, lastName });

    // 2. Store local fingerprint → avatarId mapping (if device ID provided)
    if (fingerprintId) {
      await linkFingerprint({
        fingerprintId,
        avatarId: avatar.id ?? avatar.avatarId,
        name: `${firstName ?? ''} ${lastName ?? ''}`.trim() || username,
        phone: phone ?? null,
        chapter
      });
    }

    res.status(201).json({
      message: 'Avatar registered. Ask member to verify their email before first check-in.',
      avatarId: avatar.id ?? avatar.avatarId,
      fingerprintLinked: !!fingerprintId
    });
  } catch (err) { next(err); }
});

// Link a fingerprintId to an existing OASIS avatar
router.post('/link', async (req, res, next) => {
  try {
    const { fingerprintId, avatarId, name, phone, chapter = 'PDC' } = req.body;
    if (!fingerprintId || !avatarId) {
      return res.status(400).json({ error: 'fingerprintId and avatarId required' });
    }
    await linkFingerprint({ fingerprintId, avatarId, name: name ?? avatarId, phone: phone ?? null, chapter });
    res.json({ message: 'Fingerprint linked', fingerprintId, avatarId });
  } catch (err) { next(err); }
});

// Fuzzy lookup by name or email — used by the onboarding flow
// GET /api/members/lookup?q=<name_or_email>
router.get('/lookup', async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ found: false });

    const members = await getAllMembers();
    const needle  = q.toLowerCase().trim();

    // Exact or partial match against name or email
    const match = members.find(m => {
      const name  = (m.name  || '').toLowerCase();
      const email = (m.email || '').toLowerCase();
      return name.includes(needle) || email.includes(needle) || email === needle;
    });

    if (!match) return res.json({ found: false });

    // Fetch full passport data from OASIS
    let sessions = 0, tokens = 0, questsDone = 0, tier = 'recruit', memberSince = '—';
    try {
      const [karmaData, questsData] = await Promise.allSettled([
        oasis.getKarma(match.avatarId),
        oasis.listQuests()
      ]);
      if (karmaData.status === 'fulfilled') {
        tokens = karmaData.value?.karma ?? 0;
        const history = Array.isArray(karmaData.value?.karmaHistory) ? karmaData.value.karmaHistory : [];
        sessions = history.filter(h =>
          h.description?.toLowerCase().includes('session') ||
          h.description?.toLowerCase().includes('training') ||
          h.karmaType === 'BeInspiring'
        ).length || Math.max(0, Math.round(tokens / 10));
        const firstDate = history[0]?.date;
        if (firstDate) {
          const d = new Date(firstDate);
          memberSince = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        }
      }
      if (questsData.status === 'fulfilled') {
        const qs = Array.isArray(questsData.value) ? questsData.value : (questsData.value?.quests || []);
        questsDone = qs.filter(q => q.status === 'Completed' || q.completedOn).length;
      }

      // Tier from session count
      if (sessions >= 500)      tier = 'legend';
      else if (sessions >= 200) tier = 'veteran';
      else if (sessions >= 50)  tier = 'fighter';
    } catch {}

    res.json({
      found: true,
      avatarId: match.avatarId,
      name: match.name,
      chapter: match.chapter || 'PDC',
      sessions,
      tokens,
      questsDone,
      tier,
      memberSince
    });
  } catch (err) { next(err); }
});

// List all locally-known members
router.get('/', async (_req, res, next) => {
  try {
    const members = await getAllMembers();
    res.json(members);
  } catch (err) { next(err); }
});

// Update phone number for a member
router.patch('/:avatarId/phone', async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (phone) await updateMemberPhone(req.params.avatarId, phone);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// Get full OASIS avatar for a member
router.get('/:avatarId', async (req, res, next) => {
  try {
    const avatar = await oasis.getAvatar(req.params.avatarId);
    res.json(avatar);
  } catch (err) { next(err); }
});

module.exports = router;
