define(["d3"],
  function (d3) {
    return function IntervalCache(provider, locator, updated) {


      var that = {};
      that.provider = provider;
      that.locator = locator;
      that.updated = updated;
      that.intervals = [];

      that.merge = function (array, other) {
        return Array.prototype.push.apply(array, other);
      };

      that.get = function (start, end, retrieve_missing) {
        var bisect, i, interval, last_match, matched_elements, matching_intervals, missing_intervals, ref;

        if (retrieve_missing == null) retrieve_missing = true;
        if (start < 0) start = 0;
        if (end < 0) end = 0;
        matching_intervals = that.intervals.filter(function (interval) {
          return interval.start <= end && start <= interval.end;
        });
        matched_elements = [];
        if (matching_intervals.length > 0) {
          that.merge(matched_elements, matching_intervals[0].elements.filter(function (element) {
            var l = that.locator(element);
            return l >= start && l < end;
          }));
        }
        if (matching_intervals.length > 2) {
          for (i = 1, ref = matching_intervals.length - 2; i <= ref; i++) {
            that.merge(matched_elements, matching_intervals[i].elements);
          }
        }
        if (matching_intervals.length > 1) {
          that.merge(matched_elements, matching_intervals[matching_intervals.length - 1].elements.filter(function (element) {
            var l = that.locator(element);
            return l >= start && l < end;
          }));
        }
        if (!retrieve_missing) return matched_elements;
        missing_intervals = [];
        if (matching_intervals.length === 0) {
          missing_intervals.push({
            'start': start,
            'end': end
          });
        }
        if (matching_intervals.length > 0) {
          if (start < matching_intervals[0].start) {
            missing_intervals.push({
              'start': start,
              'end': matching_intervals[0].start
            });
          }
        }
        if (matching_intervals.length > 1) {
          for (i = 1, ref = matching_intervals.length - 1; i <= ref; i++) {
            if (matching_intervals[i - 1].end !== matching_intervals[i].start) {
              missing_intervals.push({
                'start': matching_intervals[i - 1].end,
                'end': matching_intervals[i].start
              });
            }
          }
        }
        if (matching_intervals.length > 0) {
          last_match = matching_intervals[matching_intervals.length - 1];
          if (end > last_match.end) {
            missing_intervals.push({
              'start': last_match.end,
              'end': end
            });
          }
        }
        bisect = d3.bisector(function (interval) {
          return interval.start;
        }).left;
        for (i = 0, ref = missing_intervals.length; i < ref; i++) {
          interval = missing_intervals[i];
          that.intervals.splice(bisect(that.intervals, interval.start), 0, interval);
          interval.elements = [];
          that.provider(interval.start, interval.end, that._insert_received_data);
        }
        return matched_elements;
      };

      that._insert_received_data = function (start, end, data) {
        var match;
        match = that.intervals.filter(function (i) {
          return i.start === start && i.end === end;
        });
        if (match.length !== 1) {
          console.log("Got data for non-existant interval or multiples", start, end);
          return;
        }
        if (data) {
          match[0].elements = data;
        } else {
          match[0].elements = null;
          that.intervals = that.intervals.filter(function (i) {
            return i.elements !== null;
          });
        }
        return that.updated();
      };

      return that;
    }
  }
);
