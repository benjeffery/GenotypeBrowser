define(["lodash", "d3", "MetaData"],
  function (_, d3, MetaData) {
    return function IntervalCache(provider, update_callback) {

      var UNFETCHED = 0;
      var FETCHING = 1;
      var FETCHED = 2;
      var CHUNK_SIZE = 1000;

      var that = {};
      that.provider = provider;
      that.update_callback = update_callback;

      that.snp_positions = {};
      that.snps = {};
      //Genotypes by chrom then sample then call type
      that.genotypes = {};
      //Fetch state by chrom
      that.fetch_state = {};
      //TODO Should come from server
      that.snp_positions['MAL13'] = new Uint32Array(MetaData.ch13pos);
      that.fetch_state['MAL13'] = new Uint8Array(Math.floor(that.snp_positions['MAL13'].length / CHUNK_SIZE));
      that.snps['MAL13'] = [];

      that.provider_queue = [];
      that.current_provider_requests = 0;

      that.retrieve_by_index = function (chrom, start, end) {
        start = Math.max(0, Math.floor(start));
        end = Math.max(0,Math.ceil(end));
        //Convert to nearest chunk boundaries
        start = Math.floor(start / CHUNK_SIZE);
        end = Math.ceil(end / CHUNK_SIZE);
        var fetch_state = that.fetch_state[chrom];
        for (var i = start; i < end; ++i)
          if (!fetch_state[i]) {
            fetch_state[i] = FETCHING;
            that._add_to_provider_queue(chrom, i)
          }
      };

      that.posToIndex = function (chrom, pos) {
        return _(that.snp_positions[chrom]).sortedIndex(pos);
      };

      that.indexToPos = function (chrom, index) {
        index = Math.max(0, index);
        if (index < that.snp_positions[chrom].length)
          return that.snp_positions[chrom][index];
        else
          return _(that.snp_positions[chrom]).last();
      };

      that._insert_received_data = function (chrom, start, end, data) {
        that.current_provider_requests -= 1;
        var start_index = _(that.snp_positions[chrom]).indexOf(start);
        var chunk = start_index / CHUNK_SIZE;
        if (that.fetch_state[chrom][chunk] !== FETCHING) {
          console.log("Got data for chunk that was not fetching", start, end);
          return;
        }
        if (data) {
          that.snps[chrom] || (that.snps[chrom] = []);
          that.fetch_state[chrom][chunk] = FETCHED;
          _(data).forEach(function (snp, i) {
            that.snps[chrom][i + start_index] = data[i];
          });
        } else {
          that.fetch_state[chrom][chunk] = UNFETCHED;
        }
        return that.update_callback();
      };

      that._add_to_provider_queue = function (chrom, chunk) {
        that.provider_queue.push({chrom: chrom, chunk: chunk});
        if (that.provider_queue.length == 1) {
          that._process_provider_queue()
        }
      };

      that._process_provider_queue = function () {
        if (that.current_provider_requests < 2 && that.provider_queue.length > 0) {
          var chunk = that.provider_queue.pop();
          var start = chunk.chunk * CHUNK_SIZE;
          var end = Math.min(that.snp_positions[chunk.chrom].length, (chunk.chunk + 1) * CHUNK_SIZE);
          that.provider(chunk.chrom,
                        that.snp_positions[chunk.chrom][start],
                        that.snp_positions[chunk.chrom][end],
                        that._insert_received_data);
          that.current_provider_requests += 1;
        }
        if (that.provider_queue.length > 0) {
          setTimeout(that._process_provider_queue, 100);
        }
      };

      that.intervals_being_fetched = function(chrom) {
        var being_fetched = [];
        _(that.fetch_state[chrom]).forEach(function (chunk_state, i) {
          if (chunk_state == FETCHING)
            being_fetched.push({start: that.indexToPos(chrom, i*CHUNK_SIZE),
                                end: that.indexToPos(chrom, (i+1)*CHUNK_SIZE)})
        });
        return being_fetched;
      };


      return that;
    }
  }
);
