/* Offline-validated September 20 display. No runtime walking derivation. */
const DEMO_WALKING_DISPLAY = demoFreeze({
  "manifest": {
    "schemaVersion": 1,
    "datasetId": "fictional-dave-jasper-v1",
    "asOf": "2026-09-20",
    "sourceHashes": {
      "demo/foundation/dave.js": "6f63239364125f177c1a82e1150f505c3ac0b40c6cba3ebe538a0ce4f0a9fed5",
      "demo/foundation/provider.js": "f630370111916e74b83e053e45e7dcc23d84ae7495c9cb2abc175a8bd8232c58",
      "walking/index.html": "d687d88a0f3de251cf00b266d891571cf4f67144cb5708cd2cde6fd83de8b294",
      "images/walking-page-balanced.png": "cdcc6eff0c465eb8a1f9a8cec3bcdbfb135f3c5994f9a6ee45af71a5e711e83f",
      "images/walking-marker-motionc.png": "a57f5d74990f9be0283663df738debc91fef810fc6eb8de5ff2552cc04f4fb97"
    }
  },
  "current": {
    "journeyMiles": "117.55",
    "lifetimeMiles": "117.55",
    "station": "Castle Junction",
    "marker": {
      "x": 26.7,
      "y": 37.8
    },
    "progressLabel": "To Lake Louise",
    "progressText": "41%",
    "progressFill": 40.7142857142857,
    "progressDetail": "8.55 of 21.00 mi",
    "segmentMiles": "8.55",
    "segmentLength": "21.00"
  },
  "upcoming": [
    {
      "name": "Lake Louise",
      "away": "12.45",
      "milestone": "130.00"
    },
    {
      "name": "Bow Lake",
      "away": "37.45",
      "milestone": "155.00"
    },
    {
      "name": "Saskatchewan River Crossing",
      "away": "59.45",
      "milestone": "177.00"
    }
  ],
  "stations": [
    {
      "name": "Calgary City Limits",
      "miles": 0,
      "x": 14,
      "y": 74.3,
      "state": "past"
    },
    {
      "name": "CP Tower",
      "miles": 8,
      "x": 17.55,
      "y": 68.9,
      "state": "past"
    },
    {
      "name": "Canada Olympic Park",
      "miles": 18,
      "x": 19.65,
      "y": 60.6,
      "state": "past"
    },
    {
      "name": "Cochrane",
      "miles": 29,
      "x": 21.8,
      "y": 56.35,
      "state": "past"
    },
    {
      "name": "Morley",
      "miles": 43,
      "x": 23.25,
      "y": 51.45,
      "state": "past"
    },
    {
      "name": "Dead Man’s Flats",
      "miles": 79,
      "x": 25.25,
      "y": 47.1,
      "state": "past"
    },
    {
      "name": "Banff Townsite",
      "miles": 93,
      "x": 23.25,
      "y": 42.6,
      "state": "past"
    },
    {
      "name": "Castle Junction",
      "miles": 109,
      "x": 26.7,
      "y": 37.8,
      "state": "current"
    },
    {
      "name": "Lake Louise",
      "miles": 130,
      "x": 24.3,
      "y": 31.95,
      "state": "future"
    },
    {
      "name": "Bow Lake",
      "miles": 155,
      "x": 27.15,
      "y": 26.75,
      "state": "future"
    },
    {
      "name": "Saskatchewan River Crossing",
      "miles": 177,
      "x": 30,
      "y": 21.4,
      "state": "future"
    },
    {
      "name": "Sunwapta Falls",
      "miles": 210,
      "x": 32.75,
      "y": 15.15,
      "state": "future"
    },
    {
      "name": "Jasper Townsite",
      "miles": 244,
      "x": 38.15,
      "y": 10.65,
      "state": "future"
    }
  ]
});
