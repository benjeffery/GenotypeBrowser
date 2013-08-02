define(["d3"],
  function (d3) {
    return function IntervalCache(provider, locator, updated) {

      var that = {};
      that.provider = provider;
      that.locator = locator;
      that.updated = updated;
      that.intervals = {};
      that._intervals_being_fetched = {};
      that.provider_queue = [];
      that.current_provider_requests = 0;

      that.merge = function (array, other) {
        return Array.prototype.push.apply(array, other);
      };
      //TODO Chuuck requests to a multiple of 10 boundary or something to prevent small intervals
      that.get = function (chrom, start, end, retrieve_missing) {
        var bisect, i, interval, last_match, matched_elements, matching_intervals, missing_intervals, ref;
        that.intervals[chrom] = that.intervals[chrom] || [];
        if (retrieve_missing == null) retrieve_missing = true;
        if (start < 0) start = 0;
        if (end < 0) end = 0;
        if (start == end) return [];
        matching_intervals = that.intervals[chrom].filter(function (interval) {
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
        //Request small regions at a time to give a sense of progress...
        var resized_missing_intervals = [];
        var threshold = 50000;
        for (i = 0, ref = missing_intervals.length; i < ref; i++) {
          interval = missing_intervals[i];
          if (interval.end - interval.start < threshold)
            resized_missing_intervals.push(interval);
          else {
            var i_start = interval.start;
            while (i_start + threshold < interval.end) {
              resized_missing_intervals.push({start: i_start, end: i_start+threshold});
              i_start += threshold;
            }
            resized_missing_intervals.push({start: i_start, end: interval.end});
          }
        }
        missing_intervals = resized_missing_intervals;

        for (i = 0, ref = missing_intervals.length; i < ref; i++) {
          interval = missing_intervals[i];
          that._intervals_being_fetched[chrom] = that._intervals_being_fetched[chrom] || [];
          that._intervals_being_fetched[chrom].push(interval);
          that.intervals[chrom].splice(bisect(that.intervals[chrom], interval.start), 0, interval);
          interval.elements = [];
          that._add_to_provider_queue(chrom, interval);
        }
        return matched_elements;
      };

      that._add_to_provider_queue = function(chrom, interval) {
        that.provider_queue.push({chrom:chrom, interval:interval});
        if (that.provider_queue.length == 1) {
          that._process_provider_queue()
        }
      };

      that._process_provider_queue = function() {
        if (that.current_provider_requests < 2 && that.provider_queue.length > 0) {
          var interval = that.provider_queue.pop();
          that.provider(interval.chrom, interval.interval.start, interval.interval.end, that._insert_received_data);
          that.current_provider_requests += 1;
        }
        if (that.provider_queue.length > 0) {
          setTimeout(that._process_provider_queue, 100);
        }
      };

      that._insert_received_data = function (chrom, start, end, data) {
        that.current_provider_requests -= 1;
        var match;
        match = that.intervals[chrom].filter(function (i) {
          return i.start === start && i.end === end;
        });
        that._intervals_being_fetched[chrom] = that._intervals_being_fetched[chrom].filter(function (i) {
          return i.start != match[0].start;
        });
        if (match.length !== 1) {
          console.log("Got data for non-existant interval or multiples", start, end);
          return;
        }
        if (data) {
          match[0].elements = data;
        } else {
          match[0].elements = null;
          that.intervals[chrom] = that.intervals[chrom].filter(function (i) {
            return i.elements !== null;
          });
        }
        return that.updated();
      };

      that.intervals_being_fetched = function(chrom) {
        return that._intervals_being_fetched[chrom] || [];
      }
      return that;
    }
  }
);
