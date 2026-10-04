/* The existing Daily Milestones calculation, shared with Phone Summary.
   Pure presentation data: no storage, synchronization or record mutations. */
window.MotionCDailyWalkAverage = (entries, displayDistance, unit) => {
  const ordered = entries.slice().sort((a, b) => a.date.localeCompare(b.date));
  const walkingDays = ordered.filter(entry => Number(entry.distance || 0) > 0);
  const timedWalkingDays = walkingDays.filter(entry => Number(entry.minutes || 0) > 0);
  const averageDailyDistance = walkingDays.length
    ? displayDistance(walkingDays.reduce((sum, entry) => sum + Number(entry.distance || 0), 0) / walkingDays.length)
    : 0;
  const averageDailyMinutes = timedWalkingDays.length
    ? timedWalkingDays.reduce((sum, entry) => sum + Number(entry.minutes || 0), 0) / timedWalkingDays.length
    : 0;
  return {
    walkingDayCount: walkingDays.length,
    distance: walkingDays.length ? `${averageDailyDistance.toFixed(2)} ${unit}` : '—',
    detail: walkingDays.length
      ? averageDailyMinutes ? `${Math.round(averageDailyMinutes)} min per walking day` : 'Per walking day'
      : 'Record a walk to begin'
  };
};
