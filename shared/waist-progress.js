/* Waist values are stored in inches, independently of display units and MCP. */
window.MotionCWaistProgress = (() => {
  const valid = value => Number.isFinite(Number(value)) && Number(value) > 0;
  const same = (a, b) => Math.abs(Number(a) - Number(b)) < 1e-8;
  function initialize(profile, recordedAt = new Date().toISOString()) {
    if (!Array.isArray(profile.waistHistory)) profile.waistHistory = [];
    if (!valid(profile.startingWaist) && valid(profile.waist)) {
      profile.startingWaist = Number(profile.waist);
      profile.startingWaistSource = "existing-current";
    }
    if (!profile.waistHistory.length && valid(profile.waist)) {
      // The old profile timestamp is not a reliable measurement date.
      profile.waistHistory.push({ waistInches: Number(profile.waist), date: null, recordedAt, source: "existing-current" });
    }
  }
  function record(profile, value, date, recordedAt = new Date().toISOString()) {
    if (!valid(value)) return;
    initialize(profile, recordedAt);
    if (valid(profile.waist) && same(profile.waist, value)) return;
    if (!valid(profile.startingWaist)) {
      profile.startingWaist = Number(value);
      profile.startingWaistSource = "first-measurement";
    }
    profile.waist = Number(value);
    profile.waistHistory.push({ waistInches: Number(value), date, recordedAt, source: "measurement" });
  }
  function editStarting(profile, value, recordedAt = new Date().toISOString()) {
    if (!valid(value)) return;
    initialize(profile, recordedAt);
    profile.startingWaist = Number(value);
    profile.startingWaistSource = "user-corrected";
    profile.startingWaistUpdatedAt = recordedAt;
  }
  return { initialize, record, editStarting };
})();
