/* Dave is fictional. Explicit authored observations, not random samples.
   Null means unrecorded. An empty walks array is an explicitly recorded rest day.
   No account identifiers, credentials, persistence, or live calendar inputs. */
function demoFreeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(demoFreeze);
    Object.freeze(value);
  }
  return value;
}
const DEMO_DAVE = demoFreeze({
  manifest: {
    schemaVersion: 1,
    datasetId: 'fictional-dave-v1',
    fictional: true,
    today: '2026-09-20',
    historyStart: '2026-07-27',
    historyEnd: '2026-09-20',
    calendar: 'ISO calendar days; fixed demonstration clock',
    units: {weight:'lb',waist:'in',height:'in',distance:'mi',duration:'min',heartRate:'bpm',hydration:'oz',sleep:'hours'},
    narrative: 'Dave is finding a repeatable routine. Early scale changes give way to a slower decline, then small fluctuations inside his intended goal range. Weekend outings, family meals and busy days explain the variation. He remains smoke-free throughout.',
    missingEvidence: 'A few readings were not recorded. Rest days are explicitly recorded. No missing measurement is a zero.',
    source: 'Self-contained authored fiction. No real account or member export used.'
  },
  profile: {name:'Dave',sex:'male',age:62,heightInches:71,startWeight:217,startingWaist:41.5,realGoal:195,motivationalGoal:190},
  // Each row: date, weight, walks [miles, minutes, steps, average HR], sleep, water, stress, R/A/J promises, resting HR, note.
  // R/A/J: no restaurant, no alcohol, no junk food. Smoke-free is invariant true.
  observations: [
    ['2026-07-27',217.0,[[1.60,34,3360,109]],6.25,64,3,'111',70,'First week: establishing a comfortable loop.'],
    ['2026-07-28',216.4,[[1.85,39,3885,110]],6.5,72,2.5,'111',null,''],
    ['2026-07-29',216.7,[[1.50,32,3160,112]],5.75,56,3.5,'110',null,'Late evening; shorter walk.'],
    ['2026-07-30',215.8,[],6.75,72,2,'111',null,'Recorded rest day; errands.'],
    ['2026-07-31',215.5,[[2.10,44,4400,110]],7,80,2,'111',69,''],
    ['2026-08-01',215.9,[[2.65,56,5540,113]],7.25,80,1.5,'001',null,'Longer park walk and dinner out.'],
    ['2026-08-02',214.8,[[1.75,37,3650,109]],6.5,72,2,'111',null,''],
    ['2026-08-03',214.3,[[2.00,41,4160,108]],6.75,80,2,'111',69,'Routine settling in.'],
    ['2026-08-04',214.6,[[2.20,45,4590,110]],6.25,64,2.5,'111',null,''],
    ['2026-08-05',213.7,[[1.60,33,3340,111]],6,64,3,'111',null,'Busy day; kept a shorter walk.'],
    ['2026-08-06',213.2,[],7,80,2,'111',null,'Recorded rest day.'],
    ['2026-08-07',212.9,[[2.40,49,4980,110]],7.25,88,1.5,'111',68,''],
    ['2026-08-08',213.3,[[3.10,64,6460,114]],7.5,88,1.5,'011',null,'Trail outing; lunch at a café.'],
    ['2026-08-09',212.1,[[1.50,31,3130,107]],6.5,72,2,'111',null,'Easy recovery walk.'],
    ['2026-08-10',211.7,[[2.40,48,4980,108]],6.75,80,2,'111',68,''],
    ['2026-08-11',211.9,[[2.55,51,5310,110]],6.25,72,2.5,'111',null,''],
    ['2026-08-12',211.1,[[1.30,26,2700,108],[1.00,21,2080,106]],6.5,80,2.5,'111',null,'Split the walk around appointments.'],
    ['2026-08-13',210.5,[],7,72,2,'111',null,'Recorded rest day.'],
    ['2026-08-14',210.7,[[2.75,55,5680,111]],5.75,64,3.5,'110',69,'Poor sleep after a late family call.'],
    ['2026-08-15',209.8,[[3.40,69,7050,112]],7.25,88,1.5,'011',null,'Long Saturday walk; restaurant lunch.'],
    ['2026-08-16',209.3,[[1.80,37,3750,107]],7,80,2,'111',null,''],
    ['2026-08-17',208.9,[[2.65,53,5500,108]],6.75,80,2,'111',67,''],
    ['2026-08-18',209.1,[[2.35,47,4880,109]],6.5,72,2.5,'111',null,''],
    ['2026-08-19',208.2,[],5.5,56,4,'101',null,'Busy day and a drink with dinner; recorded rest.'],
    ['2026-08-20',207.8,[[2.10,43,4400,112]],6.25,72,3,'111',null,'Gentle return after a tiring day.'],
    ['2026-08-21',207.3,[[2.80,56,5800,109]],7,80,2,'111',67,''],
    ['2026-08-22',207.6,[[3.55,72,7380,112]],7.5,96,1.5,'001',null,'Weekend outing and dinner with friends.'],
    ['2026-08-23',206.7,[[1.65,34,3440,106]],7.25,80,1.5,'111',null,'Short easy walk.'],
    ['2026-08-24',206.1,[[2.75,54,5680,108]],6.75,80,2,'111',67,''],
    ['2026-08-25',206.4,[[2.55,51,5300,109]],6.5,72,2.5,'111',null,''],
    ['2026-08-26',205.6,[[1.20,24,2500,107],[1.15,23,2380,109]],6.25,72,2.5,'111',null,'Two short walks between chores.'],
    ['2026-08-27',205.1,[],null,64,3,'111',null,'Recorded rest; forgot the sleep reading.'],
    ['2026-08-28',204.8,[[2.90,57,5980,109]],7,80,2,'111',66,''],
    ['2026-08-29',205.0,[[3.30,66,6870,111]],7.25,88,1.5,'011',null,'Saturday park loop and café lunch.'],
    ['2026-08-30',204.1,[[1.85,38,3860,106]],7,80,2,'111',null,''],
    ['2026-08-31',203.6,[[2.80,55,5810,108]],6.75,80,2,'111',66,''],
    ['2026-09-01',203.8,[[2.45,49,5080,109]],6.25,72,2.5,'111',null,''],
    ['2026-09-02',203.0,[[1.60,33,3350,111]],5.75,64,3.5,'110',null,'Late night; shorter walk.'],
    ['2026-09-03',202.7,[],7,80,2,'111',null,'Recorded rest day.'],
    ['2026-09-04',202.2,[[3.00,59,6210,108]],7.25,88,1.5,'111',66,''],
    ['2026-09-05',202.5,[[3.40,68,7070,111]],7.5,88,2,'001',null,'Family meal after the weekend walk.'],
    ['2026-09-06',201.4,[[2.00,40,4150,107]],6.75,80,2,'111',null,''],
    ['2026-09-07',200.9,[[2.80,56,5810,108]],7,80,2,'111',66,'Pace steady; beginning to think about maintenance.'],
    ['2026-09-08',200.6,[[2.50,50,5200,109]],6.5,72,2.5,'111',null,''],
    ['2026-09-09',200.8,[[1.20,24,2490,107],[1.25,25,2590,109]],6.25,72,3,'111',null,'Walks before and after an appointment.'],
    ['2026-09-10',200.0,[],7,80,2,'111',null,'Recorded rest day.'],
    ['2026-09-11',199.6,[[2.95,59,6110,108]],7.25,88,1.5,'111',65,''],
    ['2026-09-12',199.2,[[3.30,67,6860,111]],7.5,88,1.5,'011',null,'Park and café with a friend.'],
    ['2026-09-13',198.7,[[1.85,38,3850,106]],7,80,2,'111',null,'Into the intended goal range.'],
    ['2026-09-14',198.2,[[2.80,56,5820,108]],6.75,80,2,'111',65,'Maintaining the routine without chasing extra distance.'],
    ['2026-09-15',197.8,[[2.55,51,5280,109]],6.5,72,2.5,'111',null,''],
    ['2026-09-16',197.6,[[1.50,30,3120,108],[1.10,23,2280,107]],6,64,3,'110',null,'Short sleep; split walks and an evening treat.'],
    ['2026-09-17',197.7,[],7.25,null,2,'111',null,'Recorded rest day; water total not recorded.'],
    ['2026-09-18',197.4,[[2.90,58,6020,108]],7,80,2,'111',65,''],
    ['2026-09-19',197.5,[[3.20,65,6650,110]],7.5,88,1.5,'011',null,'Weekend walk and lunch out.'],
    ['2026-09-20',197.2,[[2.15,44,4460,107]],7.25,72,2,'111',null,'Comfortable shorter walk; weight is beginning to settle.']
  ],
  waistHistory: [
    ['2026-07-27',41.5],['2026-08-02',41.3],['2026-08-09',41.0],
    ['2026-08-16',40.7],['2026-08-23',40.4],['2026-08-30',40.1],
    ['2026-09-06',39.8],['2026-09-13',39.6],['2026-09-20',39.5]
  ],
  // Weekly self-reports: sleep, hydration, nutrition, movement, stress, alcohol, smoking, activity.
  // Checklist promises are distinct Daily evidence; they do not replace these weekly responses.
  weeklyResponses: [
    ['2026-07-27',[2,2,2,2,2,3,3,2]],
    ['2026-08-02',[2,2,3,2,2,3,3,3]],
    ['2026-08-09',[2,3,3,2,2,3,3,3]],
    ['2026-08-16',[2,3,3,2,2,3,3,3]],
    ['2026-08-23',[2,2,2,2,2,3,3,3]],
    ['2026-08-30',[2,3,3,2,2,3,3,3]],
    ['2026-09-06',[2,3,3,2,2,3,3,3]],
    ['2026-09-13',[3,3,3,2,3,3,3,3]],
    ['2026-09-20',[2,3,3,2,2,3,3,3]]
  ]
});
