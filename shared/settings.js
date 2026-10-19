/* Small localStorage adapter for per-game preferences; not for player data.
   Each game owns its key, defaults, schema validation and version upgrades. */
(function (root) {
  "use strict";

  function object(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }
  function copy(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function create(options) {
    if (!options || typeof options.key !== "string" ||
        !Number.isInteger(options.version) || options.version < 1 ||
        !object(options.defaults) || typeof options.normalize !== "function") {
      throw new Error("ArcadeSettings: invalid game settings definition");
    }

    var key = options.key;
    var version = options.version;

    function defaults() { return copy(options.defaults); }

    function normalize(candidate) {
      if (!object(candidate)) return defaults();
      try {
        var result = options.normalize(candidate, defaults());
        return object(result) ? copy(result) : defaults();
      } catch (_) {
        return defaults();
      }
    }

    function save(value) {
      try {
        var record = { version: version, settings: normalize(value) };
        root.localStorage.setItem(key, JSON.stringify(record));
        return true;
      } catch (_) {
        return false; // unavailable, blocked or full localStorage
      }
    }

    function load() {
      var storage, raw;
      try {
        storage = root.localStorage;
        raw = storage.getItem(key);
      } catch (_) {
        return defaults();
      }

      if (raw !== null) {
        try {
          var record = JSON.parse(raw);
          if (!object(record) || !object(record.settings)) return defaults();
          if (record.version === version) return normalize(record.settings);
          // Each game explicitly owns migrations for incompatible versions.
          if (typeof options.upgrade !== "function") return defaults();
          var upgraded = options.upgrade(record.version, copy(record.settings));
          if (!object(upgraded)) return defaults();
          var updated = normalize(upgraded);
          save(updated);
          return updated;
        } catch (_) {
          return defaults(); // corrupt JSON, unexpected shapes, failed migration
        }
      }

      // Only import legacy keys on the very first read; leave them in place.
      if (typeof options.migrateLegacy === "function") {
        try {
          var legacy = options.migrateLegacy(storage);
          if (object(legacy)) {
            var migrated = normalize(legacy);
            save(migrated);
            return migrated;
          }
        } catch (_) { /* legacy data is optional */ }
      }
      return defaults();
    }

    return Object.freeze({ load: load, save: save });
  }

  root.ArcadeSettings = Object.freeze({ create: create });
})(window);
