define(["lodash", "d3", "MetaData"],
  function (_, d3, MetaData) {
    return function IntervalCache(provider, update_callback, samples) {

      var UNFETCHED = 0;
      var FETCHING = 1;
      var FETCHED = 2;
      var CHUNK_SIZE = 2000;

      var that = {};
      that.provider = provider;
      that.update_callback = update_callback;
      that.samples = samples;

      that.snp_positions = {};
      that.snps = {};
      //Genotypes by chrom then sample then call type
      that.genotypes = {};
      //Fetch state by chrom
      that.fetch_state = {};
      //TODO Should come from server
      that.snp_positions['MAL13'] = new Uint32Array(MetaData.ch13pos);
      that.fetch_state['MAL13'] = new Uint8Array(Math.ceil(that.snp_positions['MAL13'].length / CHUNK_SIZE));
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
          if (!fetch_state[i] && i < fetch_state.length) {
            fetch_state[i] = FETCHING;
            that._add_to_provider_queue(chrom, i)
          }
      };

      that.posToIndex = function (chrom, pos) {
        return _(that.snp_positions[chrom]).sortedIndex(pos);
      };

      that.indexToPos = function (chrom, index) {
        index = Math.max(0, Math.floor(index));
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
          that.genotypes[chrom] || (that.genotypes[chrom] = []);
          var genotypes = that.genotypes[chrom];
          that.fetch_state[chrom][chunk] = FETCHED;
          _(that.samples).forEach(function (sample,i) {
            genotypes[i] || (genotypes[i] = {});
            genotypes[i].alt || (genotypes[i].alt = new Uint8Array(that.snp_positions[chrom].length));
            genotypes[i].ref || (genotypes[i].ref = new Uint8Array(that.snp_positions[chrom].length));
            genotypes[i].r || (genotypes[i].r = new Uint8Array(that.snp_positions[chrom].length));
            genotypes[i].g || (genotypes[i].g = new Uint8Array(that.snp_positions[chrom].length));
            genotypes[i].b || (genotypes[i].b = new Uint8Array(that.snp_positions[chrom].length));
            genotypes[i].gt || (genotypes[i].gt = new Uint8Array(that.snp_positions[chrom].length));
          });
          _(data).forEach(function (snp, i) {
            var k = i + start_index;
            that.snps[chrom][k] = snp;
            _(that.samples).forEach(function (sample,j) {
              genotypes[j].alt[k] = Math.min(255,snp.genotypes[j].alt);
              genotypes[j].ref[k] = Math.min(255,snp.genotypes[j].ref);
              genotypes[j].gt[k] = Math.min(255,snp.genotypes[j].gt);
              genotypes[j].r[k] = snp.genotypes[j].pixel[0];
              genotypes[j].g[k] = snp.genotypes[j].pixel[1];
              genotypes[j].b[k] = snp.genotypes[j].pixel[2];
            });
            snp.genotypes = undefined;
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
          var end = Math.min(that.snp_positions[chunk.chrom].length-1, (chunk.chunk + 1) * CHUNK_SIZE);
          console.log('fetch ' + start +':'+ end);
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
