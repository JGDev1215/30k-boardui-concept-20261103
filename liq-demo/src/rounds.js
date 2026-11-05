// Entirely invented prices and levels. Public static demo; not historical market data.
export const rounds = [
  {
    "id": "2026-01-01",
    "label": "Sample 1",
    "snapshot": {
      "fixture_notice": "SYNTHETIC TEST VALUES ONLY; NOT HISTORICAL MARKET DATA",
      "schema_version": 1,
      "round_id": "liq-synthetic-a",
      "instrument": "SYNTHETIC-UNIT-TEST",
      "series": "SYNTHETIC-1M",
      "source": "SYNTHETIC-TEST-ONLY",
      "read_at": "2026-01-01T00:03:00Z",
      "end_at": "2026-01-01T00:08:00Z",
      "inventory_complete": true,
      "bars": [
        {
          "time": "2026-01-01T00:00:00Z",
          "open": 100,
          "high": 100.5,
          "low": 99.5,
          "close": 100
        },
        {
          "time": "2026-01-01T00:01:00Z",
          "open": 100,
          "high": 100.25,
          "low": 99.75,
          "close": 100
        },
        {
          "time": "2026-01-01T00:02:00Z",
          "open": 100,
          "high": 100.5,
          "low": 99.5,
          "close": 100
        }
      ],
      "levels": [
        {
          "id": "PDH",
          "label": "Yesterday's high",
          "kind": "POOL",
          "side": "BUY",
          "trigger": 102,
          "formed_at": "2025-12-31T23:00:00Z",
          "known_at": "2025-12-31T23:00:00Z",
          "prior_touch": "NONE"
        },
        {
          "id": "BUY_OTHER",
          "label": "Near high",
          "kind": "POOL",
          "side": "BUY",
          "trigger": 101,
          "formed_at": "2025-12-31T23:00:00Z",
          "known_at": "2025-12-31T23:00:00Z",
          "prior_touch": "NONE"
        },
        {
          "id": "ASIA_LOW",
          "label": "Asia low",
          "kind": "POOL",
          "side": "SELL",
          "trigger": 98,
          "formed_at": "2025-12-31T23:00:00Z",
          "known_at": "2025-12-31T23:00:00Z",
          "prior_touch": "NONE"
        },
        {
          "id": "NWOG",
          "label": "Gap edge",
          "kind": "GAP",
          "side": "SELL",
          "trigger": 97,
          "near_edge": 97,
          "far_edge": 96,
          "live_as_of": true,
          "formed_at": "2025-12-31T23:00:00Z",
          "known_at": "2025-12-31T23:00:00Z",
          "prior_touch": "NONE"
        },
        {
          "id": "MIDNIGHT_OPEN",
          "label": "Opening price",
          "kind": "REFERENCE",
          "side": "BUY",
          "trigger": 101.5,
          "formed_at": "2026-01-01T00:00:00Z",
          "known_at": "2026-01-01T00:00:00Z",
          "prior_touch": "NONE"
        }
      ]
    },
    "continuation": {
      "fixture_notice": "SYNTHETIC TEST VALUES ONLY; NOT HISTORICAL MARKET DATA",
      "schema_version": 1,
      "round_id": "liq-synthetic-a",
      "instrument": "SYNTHETIC-UNIT-TEST",
      "series": "SYNTHETIC-1M",
      "source": "SYNTHETIC-TEST-ONLY",
      "bars": [
        {
          "time": "2026-01-01T00:03:00Z",
          "open": 100,
          "high": 101.25,
          "low": 99.25,
          "close": 101
        },
        {
          "time": "2026-01-01T00:04:00Z",
          "open": 101,
          "high": 102,
          "low": 100.5,
          "close": 101.75
        },
        {
          "time": "2026-01-01T00:05:00Z",
          "open": 101.75,
          "high": 101.75,
          "low": 98,
          "close": 99
        },
        {
          "time": "2026-01-01T00:06:00Z",
          "open": 99,
          "high": 100,
          "low": 98.75,
          "close": 99.5
        },
        {
          "time": "2026-01-01T00:07:00Z",
          "open": 99.5,
          "high": 100.25,
          "low": 99,
          "close": 100
        }
      ]
    }
  },
  {
    "id": "2026-01-02",
    "label": "Sample 2",
    "snapshot": {
      "fixture_notice": "SYNTHETIC TEST VALUES ONLY; NOT HISTORICAL MARKET DATA",
      "schema_version": 1,
      "round_id": "liq-synthetic-b",
      "instrument": "SYNTHETIC-UNIT-TEST",
      "series": "SYNTHETIC-1M",
      "source": "SYNTHETIC-TEST-ONLY",
      "read_at": "2026-01-02T00:03:00Z",
      "end_at": "2026-01-02T00:08:00Z",
      "inventory_complete": true,
      "bars": [
        {
          "time": "2026-01-02T00:00:00Z",
          "open": 100,
          "high": 100.5,
          "low": 99.5,
          "close": 100
        },
        {
          "time": "2026-01-02T00:01:00Z",
          "open": 100,
          "high": 100.25,
          "low": 99.75,
          "close": 100
        },
        {
          "time": "2026-01-02T00:02:00Z",
          "open": 100,
          "high": 100.5,
          "low": 99.5,
          "close": 100
        }
      ],
      "levels": [
        {
          "id": "PDH",
          "label": "Yesterday's high",
          "kind": "POOL",
          "side": "BUY",
          "trigger": 102,
          "formed_at": "2026-01-01T23:00:00Z",
          "known_at": "2026-01-01T23:00:00Z",
          "prior_touch": "NONE"
        },
        {
          "id": "BUY_OTHER",
          "label": "Near high",
          "kind": "POOL",
          "side": "BUY",
          "trigger": 101,
          "formed_at": "2026-01-01T23:00:00Z",
          "known_at": "2026-01-01T23:00:00Z",
          "prior_touch": "NONE"
        },
        {
          "id": "ASIA_LOW",
          "label": "Asia low",
          "kind": "POOL",
          "side": "SELL",
          "trigger": 98,
          "formed_at": "2026-01-01T23:00:00Z",
          "known_at": "2026-01-01T23:00:00Z",
          "prior_touch": "NONE"
        },
        {
          "id": "NWOG",
          "label": "Gap edge",
          "kind": "GAP",
          "side": "SELL",
          "trigger": 97,
          "near_edge": 97,
          "far_edge": 96,
          "live_as_of": true,
          "formed_at": "2026-01-01T23:00:00Z",
          "known_at": "2026-01-01T23:00:00Z",
          "prior_touch": "NONE"
        },
        {
          "id": "MIDNIGHT_OPEN",
          "label": "Opening price",
          "kind": "REFERENCE",
          "side": "BUY",
          "trigger": 101.5,
          "formed_at": "2026-01-02T00:00:00Z",
          "known_at": "2026-01-02T00:00:00Z",
          "prior_touch": "NONE"
        }
      ]
    },
    "continuation": {
      "fixture_notice": "SYNTHETIC TEST VALUES ONLY; NOT HISTORICAL MARKET DATA",
      "schema_version": 1,
      "round_id": "liq-synthetic-b",
      "instrument": "SYNTHETIC-UNIT-TEST",
      "series": "SYNTHETIC-1M",
      "source": "SYNTHETIC-TEST-ONLY",
      "bars": [
        {
          "time": "2026-01-02T00:03:00Z",
          "open": 100,
          "high": 100.25,
          "low": 97.75,
          "close": 98.5
        },
        {
          "time": "2026-01-02T00:04:00Z",
          "open": 98.5,
          "high": 99.25,
          "low": 98.0,
          "close": 99
        },
        {
          "time": "2026-01-02T00:05:00Z",
          "open": 99,
          "high": 102,
          "low": 98.75,
          "close": 101.5
        },
        {
          "time": "2026-01-02T00:06:00Z",
          "open": 101.5,
          "high": 101.75,
          "low": 100.5,
          "close": 101
        },
        {
          "time": "2026-01-02T00:07:00Z",
          "open": 101,
          "high": 101.25,
          "low": 100.25,
          "close": 100.75
        }
      ]
    }
  }
];
