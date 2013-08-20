define(["lodash", "d3", "MetaData", "DQX/SVG"],
  function (_, d3, MetaData, SVG) {
    return function SNPCache(providers, update_callback, samples) {


//      //Set colours for the snps
//      var len = samples.length;
//      snps.forEach(function (snp, i) {
//        snp.col = {r: 0, g: 0, b: 0};
//        snp.genotypes.forEach(function (genotype, i) {
//          var col = SVG.genotype_rgb(genotype.ref, genotype.alt);
//          genotype.pixel = [col.r, col.g, col.b];
//          var col_snp = snp.col;
//          col_snp.r += col.r;
//          col_snp.g += col.g;
//          col_snp.b += col.b;
//        });
//        snp.col.r /= len;
//        snp.col.g /= len;
//        snp.col.b /= len;
//        snp.rgb = snp.col;
//        snp.col = DQX.getRGB(snp.col.r, snp.col.g, snp.col.b, 0.75)
//

      var UNFETCHED = 0;
      var FETCHING = 1;
      var FETCHED_ONE = 2;
      var FETCHED_BOTH = 3;
      var CHUNK_SIZE = 2000;

      var that = {};
      that.snp_provider = providers.snp;
      that.genotype_provider = providers.genotype;
      that.position_provider = providers.position;
      that.update_callback = update_callback;

      that.samples = samples;
      that.snp_positions_by_chrom = {};
      that.snp_positions = [];
      that.snps_by_chrom = {};
      that.snps = [];
      //Genotypes by chrom then sample then call type
      that.genotypes_by_chrom = {};
      that.genotypes = {};
      //Fetch state by chrom
      that.fetch_state_by_chrom = {};
      that.fetch_state = [];

      that.provider_queue = [];
      that.current_provider_requests = 0;
      that.fetching_positions = false;

      that.set_samples = function(samples) {
        //Clear out everything
        that.samples = samples;
        that.genotypes_by_chrom = {};
        that.genotypes = {};
        that.fetch_state_by_chrom = {};
        that.fetch_state = [];
        that.provider_queue = [];
      };

      that.set_chrom = function(chrom) {
        that.chrom = chrom;
        //Insert arrays for this chrom
        that.snp_positions_by_chrom[chrom] || (that.snp_positions_by_chrom[chrom] = []);
        that.snps_by_chrom[chrom] || (that.snps_by_chrom[chrom] = []);
        that.fetch_state_by_chrom[chrom] || (that.fetch_state_by_chrom[chrom] = []);
        //Set the data to be this chrom
        that.snp_positions = that.snp_positions_by_chrom[chrom];
        that.snps = that.snps_by_chrom[chrom];
        that.genotypes = that.genotypes_by_chrom[chrom];
        that.fetch_state = that.fetch_state_by_chrom[chrom];

        if (that.snp_positions.length == 0 && !that.fetching_positions) {
          //Request the snp index
          that.fetching_positions = true;
          that.position_provider(chrom, function(positions) {
            if (positions) {
              that.snp_positions_by_chrom[chrom] = positions;
              that.fetch_state_by_chrom[chrom] = new Uint8Array(Math.ceil(positions.length / CHUNK_SIZE));
              that.fetching_positions = false;
              //Call again to set the data to the chrom again as we changed it and get an update_callback run.
              that.set_chrom(chrom);
              console.log('Positions loaded '+ chrom);
            }
            else {
              console.log('Error in snp position fetch '+ chrom);
              that.fetching_positions = false;
              that.snp_positions_by_chrom[chrom] = [];
            }
          })
        }
        that.update_callback();
      };

      that.retrieve_by_index = function (start, end) {
        if (!that.chrom) return;
        start = Math.max(0, Math.floor(start));
        end = Math.max(0,Math.ceil(end));
        //Convert to nearest chunk boundaries
        start = Math.floor(start / CHUNK_SIZE);
        end = Math.ceil(end / CHUNK_SIZE);
        that.last_request = [start,end];
        var fetch_state = that.fetch_state;
        for (var i = start; i < end; ++i)
          if (!fetch_state[i] && i < fetch_state.length) {
            fetch_state[i] = FETCHING;
            that._add_to_provider_queue(that.chrom, i)
          }
      };

      that.posToIndex = function (pos) {
        return _(that.snp_positions).sortedIndex(pos);
      };

      that.indexToPos = function (index) {
        index = Math.max(0, Math.floor(index));
        if (index < that.snp_positions.length)
          return that.snp_positions[index];
        else
          return _(that.snp_positions).last();
      };

      that._insert_received_data = function (type, chunk, samples, data) {
        if (samples && !_.isEqual(samples, that.samples)) return;
        var chrom = chunk.chrom;
        chunk = chunk.chunk;
        var start_index = chunk * CHUNK_SIZE;
        if (that.fetch_state_by_chrom[chrom][chunk] !== FETCHING && that.fetch_state_by_chrom[chrom][chunk] !== FETCHED_ONE ) {
          console.log("Got data for chunk that was not fetching", chunk);
          return;
        }
        if (data) {
          if (type == 'genotype') {
            that.genotypes_by_chrom[chrom] || (that.genotypes_by_chrom[chrom] = []);
            var genotypes = that.genotypes_by_chrom[chrom];
            that.fetch_state_by_chrom[chrom][chunk] += 1;
            var num_snps = that.snp_positions_by_chrom[chrom].length;
            _(that.samples).forEach(function (sample,i) {
              genotypes[i] || (genotypes[i] = {});
              var sample_gt = genotypes[i];
              sample_gt || (sample_gt = {});
              sample_gt.alt || (sample_gt.alt = new Uint8Array(num_snps));
              sample_gt.ref || (sample_gt.ref = new Uint8Array(num_snps));
              sample_gt.r || (sample_gt.r = new Uint8Array(num_snps));
              sample_gt.g || (sample_gt.g = new Uint8Array(num_snps));
              sample_gt.b || (sample_gt.b = new Uint8Array(num_snps));
              sample_gt.gt || (sample_gt.gt = new Uint8Array(num_snps));
            });
            data = new Uint8Array(data);
           var d = 0;
            _(that.samples).forEach(function (sample,j) {
              var sample_gt = genotypes[j];
//              for (var i = start_index, ref = start_index+CHUNK_SIZE; i < ref; i++, d++)
//                sample_gt.gt[i] = data[d];
              for (i = start_index, ref = start_index+CHUNK_SIZE; i < ref; i++, d++)
                sample_gt.ref[i] = data[d];
              for (i = start_index, ref = start_index+CHUNK_SIZE; i < ref; i++, d++)
                sample_gt.alt[i] = data[d];
              for (i = start_index, ref = start_index+CHUNK_SIZE; i < ref; i++) {
                var col = SVG.genotype_rgb(sample_gt.ref[i], sample_gt.alt[i]);
                sample_gt.r[i] = col.r;
                sample_gt.g[i] = col.g;
                sample_gt.b[i] = col.b;
                sample_gt.gt[i] = sample_gt.alt[i] >= sample_gt.ref[i] ? (sample_gt.alt[i] >= 5 ? 1 : 0) : 0;
              }
            });
          } else {
            //SNP Data
            that.snps_by_chrom[chrom] || (that.snps_by_chrom[chrom] = []);
            _(data).forEach(function (snp, i) {
              var k = i + start_index;
              that.snps_by_chrom[chrom][k] = snp;
            });
          }
        } else {
          console.log("no data on ", type);
          that.fetch_state_by_chrom[chrom][chunk] = UNFETCHED;
        }
        //Set chrom to update the exposed data
        that.set_chrom(that.chrom);
        return that.update_callback();
      };

      that._add_to_provider_queue = function (chrom, chunk) {
        that.provider_queue.push({chrom: chrom, chunk: chunk});
        if (that.provider_queue.length == 1) {
          that._process_provider_queue()
        }
      };

      that._process_provider_queue = function () {
        //TODO Priority - ie things in view get loaded first
        if (that.current_provider_requests < 1 && that.provider_queue.length > 0) {
          var chunk = that.provider_queue.pop();
          var start = chunk.chunk * CHUNK_SIZE;
          var end = Math.min(that.snp_positions_by_chrom[chunk.chrom].length-1, (chunk.chunk + 1) * CHUNK_SIZE);
          console.log('fetch ' + start +':'+ end + ' ' + that.snp_positions_by_chrom[chunk.chrom][start] + ':' + that.snp_positions_by_chrom[chunk.chrom][end]);
          that.genotype_provider(chunk.chrom,
            that.snp_positions_by_chrom[chunk.chrom][start],
            that.snp_positions_by_chrom[chunk.chrom][end],
            that.samples,
            function (data) {
              that.current_provider_requests -= 1;
              //Clone as otherwise these can change
              that._insert_received_data('genotype', _.clone(chunk), _.clone(that.samples), data);
            });
          that.snp_provider(chunk.chrom,
            that.snp_positions_by_chrom[chunk.chrom][start],
            that.snp_positions_by_chrom[chunk.chrom][end],
            function (data) {
              that.current_provider_requests -= 1;
              that._insert_received_data('snp', _.clone(chunk), null, data);
            });

          that.current_provider_requests += 2;
        }
        if (that.provider_queue.length > 0) {
          setTimeout(that._process_provider_queue, 100);
        }
      };

      that.intervals_being_fetched = function() {
        var being_fetched = [];
        _(that.fetch_state).forEach(function (chunk_state, i) {
          if (chunk_state == FETCHING)
            being_fetched.push({start: that.indexToPos(i*CHUNK_SIZE),
                                end: that.indexToPos((i+1)*CHUNK_SIZE)})
        });
        return being_fetched;
      };
      return that;
    }
  }
);
