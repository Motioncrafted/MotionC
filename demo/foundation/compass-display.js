/* Validated offline against the versioned production rules. No runtime derivation. */
const DEMO_COMPASS_DISPLAY = demoFreeze({
  "manifest": {
    "schemaVersion": 1,
    "datasetId": "fictional-dave-compass-v1",
    "asOf": "2026-09-20",
    "historyStart": "2026-09-07",
    "historyEnd": "2026-09-20",
    "historyKind": "Curated Demo readings; not member save events",
    "sourceHashes": {
      "demo/foundation/dave.js": "6f63239364125f177c1a82e1150f505c3ac0b40c6cba3ebe538a0ce4f0a9fed5",
      "demo/foundation/provider.js": "f630370111916e74b83e053e45e7dcc23d84ae7495c9cb2abc175a8bd8232c58",
      "compass/engine-v2.js": "d7aa991d1b67d24fcf5a5d9e0034ef9c3711d27f1073a7564d23ed4f56e06f50",
      "compass/mcp-v2.js": "e6d1b5230350f715a3a98244080476e7f02e592a96e09eb3cbf93ccf41417598",
      "compass/language-v2.js": "04e74f7cc14e707c3e6d5bbf3207350d96deb9b67a9a8bd45666553eafc1ea86",
      "compass/direction-view-v2.js": "a3623e2e0cfe406069870259498414fbfe4b13bffaf0405cb19bd2215b9e6fb6"
    }
  },
  "current": {
    "angle": 4.10007527928374,
    "angleText": "4.1°",
    "direction": "North-East",
    "markerTop": 2.2778195996020774,
    "previousAngle": 4.1429997974771595,
    "previousTop": 2.3016665541539774,
    "previousText": "Previous reading: 4.1° · Sep 19, 2026",
    "comparison": "Moved less than 0.1° higher on the scale since your previous reading.",
    "coverage": 1,
    "coverageText": "100% recorded coverage. Coverage describes available evidence, not certainty.",
    "mcpScore": "34.2",
    "mcpZone": "Healthy",
    "accessible": "Current direction 4.1 degrees, North-East. Previous reading 4.1 degrees. Scale from 0 degrees at the top to 180 degrees at the bottom.",
    "story": {
      "headline": "Things are looking pretty good overall, with a few things worth noticing.",
      "facts": [
        {
          "text": "The Lifestyle answers used here look supportive; their saved date is shown below.",
          "strong": "Lifestyle answers used here look supportive"
        },
        {
          "text": "Your sleep has averaged less than 7½ hours.",
          "strong": "less than 7½ hours"
        }
      ]
    },
    "cards": [
      {
        "id": "movementCard",
        "key": "movement",
        "title": "Walking",
        "icon": "🚶",
        "observation": {
          "text": "You've recorded walking on 12 of the last 14 days.",
          "strong": "12 of the last 14 days"
        },
        "evidence": [
          "12 walking days · 646 minutes",
          "3-day streak · Last 14 days"
        ],
        "why": "Walking records show how movement fits into your recent routine. The pattern over time adds context to any single day.",
        "change": {
          "text": "Walking days is about the same. Walking time increased. Your streak increased.",
          "lines": [
            "Walking days: 12 → 12",
            "Walking time: 642 min → 646 min",
            "Your streak: 2 days → 3 days"
          ]
        }
      },
      {
        "id": "recoveryCard",
        "key": "recovery",
        "title": "Sleep & Stress",
        "icon": "🌙",
        "observation": {
          "text": "Your sleep has averaged less than 7½ hours, while your average stress is in the lower half of the scale.",
          "strong": "sleep has averaged less than 7½ hours"
        },
        "evidence": [
          "Sleep: 6:55 average · 14 readings (hours:minutes)",
          "Stress: 2.11 / 5 · 14 readings",
          "Last 14 days"
        ],
        "why": "Sleep and stress can affect how your recent pattern develops. MotionC watches both so changes in either don't get overlooked.",
        "change": {
          "text": "Your sleep average increased. Your stress average is about the same.",
          "lines": [
            "Your sleep average: 6:53 → 6:55",
            "Your stress average: 2.11 / 5 → 2.11 / 5"
          ]
        }
      },
      {
        "id": "supportCard",
        "key": "support",
        "title": "Hydration & Lifestyle",
        "icon": "💧",
        "observation": {
          "text": "Your hydration has averaged 78.2 oz, and the three Lifestyle answers used here look supportive.",
          "strong": "look supportive"
        },
        "evidence": [
          "Hydration: 78.2 oz average · 13 readings",
          "Lifestyle: Sep 20, 2026 check-in",
          "Hydration: last 14 days"
        ],
        "why": "Hydration and your Lifestyle check-in add context that walking records alone cannot show.",
        "change": {
          "text": "Your hydration average decreased. Nutrition answer is about the same. Alcohol answer is about the same. Smoking answer is about the same. The saved Lifestyle check-in date changed.",
          "lines": [
            "Your hydration average: 78.8 oz → 78.2 oz",
            "Nutrition answer: 3 / 3 → 3 / 3",
            "Alcohol answer: 3 / 3 → 3 / 3",
            "Smoking answer: 3 / 3 → 3 / 3",
            "Lifestyle: Sep 13, 2026 → Sep 20, 2026"
          ]
        }
      },
      {
        "id": "bodyCard",
        "key": "bodyTrend",
        "title": "Weight",
        "icon": "⚖️",
        "observation": {
          "text": "Across these readings, your weight moved into your Vibratory Zone.",
          "strong": "into your Vibratory Zone"
        },
        "evidence": [
          "Weight: 208.9 lb → 197.2 lb",
          "VZ: 195 lb–199 lb",
          "35 weight readings · Last 35 days",
          "Waist: 9 dated weeks over 55 days · newest 0 days ago"
        ],
        "why": "Weight change means more when it is read in context. A decrease or increase can mean different things depending on where you are relative to your Vibratory Zone.",
        "context": "Your qualifying waist readings show a decrease.",
        "change": {
          "text": "Your latest recorded weight decreased. Your latest weight is within your Vibratory Zone, with little overall change. The earliest weight in the last 35 days has changed. Over the last 35 days: Across these readings, your weight moved into your Vibratory Zone. The qualifying waist evidence has changed.",
          "lines": [
            "Your latest recorded weight: 197.5 lb → 197.2 lb",
            "First weight in window: 209.3 lb → 208.9 lb"
          ]
        }
      }
    ]
  },
  "history": [
    {
      "date": "2026-09-07",
      "angle": 4.604564948892967,
      "display": "4.6",
      "direction": "North-East",
      "coverage": 1,
      "label": "Sep 7, 2026",
      "angleText": "4.6°",
      "xFraction": 0,
      "y": 23.19761454784234,
      "evidence": "Curated Demo reading · 100% recorded coverage."
    },
    {
      "date": "2026-09-08",
      "angle": 4.604564948892967,
      "display": "4.6",
      "direction": "North-East",
      "coverage": 1,
      "label": "Sep 8, 2026",
      "angleText": "4.6°",
      "xFraction": 0.07692307692307693,
      "y": 23.19761454784234,
      "evidence": "Curated Demo reading · 100% recorded coverage."
    },
    {
      "date": "2026-09-09",
      "angle": 4.707288355825877,
      "display": "4.7",
      "direction": "North-East",
      "coverage": 1,
      "label": "Sep 9, 2026",
      "angleText": "4.7°",
      "xFraction": 0.15384615384615385,
      "y": 23.268950247101305,
      "evidence": "Curated Demo reading · 100% recorded coverage."
    },
    {
      "date": "2026-09-10",
      "angle": 4.454969604844288,
      "display": "4.5",
      "direction": "North-East",
      "coverage": 1,
      "label": "Sep 10, 2026",
      "angleText": "4.5°",
      "xFraction": 0.23076923076923078,
      "y": 23.093728892252976,
      "evidence": "Curated Demo reading · 100% recorded coverage."
    },
    {
      "date": "2026-09-11",
      "angle": 4.314053573076871,
      "display": "4.3",
      "direction": "North-East",
      "coverage": 1,
      "label": "Sep 11, 2026",
      "angleText": "4.3°",
      "xFraction": 0.3076923076923077,
      "y": 22.995870536858938,
      "evidence": "Curated Demo reading · 100% recorded coverage."
    },
    {
      "date": "2026-09-12",
      "angle": 4.286851543464334,
      "display": "4.3",
      "direction": "North-East",
      "coverage": 1,
      "label": "Sep 12, 2026",
      "angleText": "4.3°",
      "xFraction": 0.38461538461538464,
      "y": 22.976980238516898,
      "evidence": "Curated Demo reading · 100% recorded coverage."
    },
    {
      "date": "2026-09-13",
      "angle": 4.286851543464334,
      "display": "4.3",
      "direction": "North-East",
      "coverage": 1,
      "label": "Sep 13, 2026",
      "angleText": "4.3°",
      "xFraction": 0.46153846153846156,
      "y": 22.976980238516898,
      "evidence": "Curated Demo reading · 100% recorded coverage."
    },
    {
      "date": "2026-09-14",
      "angle": 4.286851543464334,
      "display": "4.3",
      "direction": "North-East",
      "coverage": 1,
      "label": "Sep 14, 2026",
      "angleText": "4.3°",
      "xFraction": 0.5384615384615384,
      "y": 22.976980238516898,
      "evidence": "Curated Demo reading · 100% recorded coverage."
    },
    {
      "date": "2026-09-15",
      "angle": 4.259647577571959,
      "display": "4.3",
      "direction": "North-East",
      "coverage": 1,
      "label": "Sep 15, 2026",
      "angleText": "4.3°",
      "xFraction": 0.6153846153846154,
      "y": 22.958088595536083,
      "evidence": "Curated Demo reading · 100% recorded coverage."
    },
    {
      "date": "2026-09-16",
      "angle": 4.130402667970929,
      "display": "4.1",
      "direction": "North-East",
      "coverage": 1,
      "label": "Sep 16, 2026",
      "angleText": "4.1°",
      "xFraction": 0.6923076923076923,
      "y": 22.868335186090924,
      "evidence": "Curated Demo reading · 100% recorded coverage."
    },
    {
      "date": "2026-09-17",
      "angle": 4.104019751849487,
      "display": "4.1",
      "direction": "North-East",
      "coverage": 1,
      "label": "Sep 17, 2026",
      "angleText": "4.1°",
      "xFraction": 0.7692307692307693,
      "y": 22.850013716562145,
      "evidence": "Curated Demo reading · 100% recorded coverage."
    },
    {
      "date": "2026-09-18",
      "angle": 4.2453477710177365,
      "display": "4.2",
      "direction": "North-East",
      "coverage": 1,
      "label": "Sep 18, 2026",
      "angleText": "4.2°",
      "xFraction": 0.8461538461538461,
      "y": 22.94815817431787,
      "evidence": "Curated Demo reading · 100% recorded coverage."
    },
    {
      "date": "2026-09-19",
      "angle": 4.1429997974771595,
      "display": "4.1",
      "direction": "North-East",
      "coverage": 1,
      "label": "Sep 19, 2026",
      "angleText": "4.1°",
      "xFraction": 0.9230769230769231,
      "y": 22.87708319269247,
      "evidence": "Curated Demo reading · 100% recorded coverage."
    },
    {
      "date": "2026-09-20",
      "angle": 4.10007527928374,
      "display": "4.1",
      "direction": "North-East",
      "coverage": 1,
      "label": "Sep 20, 2026",
      "angleText": "4.1°",
      "xFraction": 1,
      "y": 22.847274499502596,
      "evidence": "Curated Demo reading · 100% recorded coverage."
    }
  ]
});
