define(["lodash", "clusterfck", "easel", "d3", "tween", "require", "DQX/Utils", "DQX/Model",
  "DQX/SVG", "DQX/SQL", "DQX/DataFetcher/DataFetchers", "DQX/DataFetcher/DataFetcherAnnotation",
  "DQX/FramePanel", "MetaData", "Views/GenotypeViewer/ColumnHeader",
  "Views/GenotypeViewer/RowHeader", "Views/GenotypeViewer/GeneMap", "Views/GenotypeViewer/Genotypes",
  "Views/GenotypeViewer/TouchEvents", "Views/GenotypeViewer/Controls", "Views/GenotypeViewer/Scale",
  "Views/GenotypeViewer/IntervalCache"],
  function (_, cluster, easel, d3, tween, require, DQX, Model,
            SVG, SQL, DataFetcher, DataFetcherAnnotation,
            FramePanel, MetaData, ColumnHeader,
            RowHeader, GeneMap, Genotypes, TouchEvents, Controls, Scale, IntervalCache) {
    return function GenotypeViewer(frame, snp_provider) {
      var that = {};
      that.snp_provider = snp_provider;

      that.rescaleGenomic = function (target) {
        var in_range = that.data.snps.map(function (snp) {
          return (snp.pos >= target.left && snp.pos <= target.right);
        });
        var start = in_range.indexOf(true);
        var stop = in_range.lastIndexOf(true);
        if (start != 1 && stop != -1) {
          that.view.snp_scale.tweenTo({left: start, right: stop + 1});
        }
      };
      that.rescaleSNPic = function (target) {
        target.left = Math.max(Math.floor(target.left), 0);
        target.right = Math.min(Math.ceil(target.right), that.data.snps.length - 1);
        var start = that.data.snps[target.left].pos;
        var stop = that.data.snps[target.right].pos;
        if (start != 1 && stop != -1) {
          that.view.genome_scale.tweenTo({left: start, right: stop});
        }
      };

      that.max_scroll = function () {
        var max_scroll = -((that.view.compress ? that.max_vert_compress : that.max_vert) - (that.height() - that.gene_map_height - that.col_header_height)) - 100;
        if (max_scroll > 0)
          max_scroll = 0;
        return max_scroll;
      };
      that.mouseWheel = function (ev, doubleclick) {
        var pos = ev.touches[0].pos;
        var delta = doubleclick ? 1 : DQX.getMouseWheelDelta(ev);
        if (pos.y < that.gene_map_height && pos.x > that.row_header_width) {
          pos.x -= that.row_header_width;
          that.rescaleGenomic(that.view.genome_scale.zoom(delta, pos.x));
        }
        if (pos.y > that.gene_map_height && pos.x > that.row_header_width) {
          pos.x -= that.row_header_width;
          that.view.snp_scale.zoom(delta, pos.x);
          //that.rescaleSNPic();
        }
      };
      that.dragStart = function (ev) {
        var pos = ev.center;
        if (pos.y < that.gene_map_height && pos.x > that.row_header_width) {
          that.drag = 'genome';
          that.view.genome_scale.startDrag(ev.touches);

        } else if (pos.y > that.gene_map_height && pos.x > that.row_header_width) {
          that.drag = 'snps';
          that.startDragScrollPos = that.view.scroll_pos;
          that.startDragScrollY = ev.center.y;
          that.view.snp_scale.startDrag(ev.touches);
        }
        else {
          that.drag = null;
        }
      };
      that.dragMove = function (ev) {
        if (that.drag == 'genome') {
          that.rescaleGenomic(that.view.genome_scale.dragMove(ev.touches));
        } else if (that.drag == 'snps') {
          that.view.snp_scale.dragMove(ev.touches);
          //that.rescaleSNPic();
          // Y Scroll
          var dist = that.startDragScrollY - ev.center.y;
          that.view.scroll_pos = that.startDragScrollPos - dist;
          if (that.view.scroll_pos > 0)
            that.view.scroll_pos = 0;
          if (that.view.scroll_pos < that.max_scroll())
            that.view.scroll_pos = that.max_scroll();
        }
        that.needUpdate = "dragMove";
      };
      that.click = function (ev) {
        that.components.forEach(function (component) {
          that.view[component].click(ev.touches[0].pos, that.view, that.data);
        });
      };
      that.dragEnd = function (ev) {
        that.drag = null;
        that.needUpdate = "dragEnd";
      };
      that.clickSNP = function (snp_index) {
        that.data.snps[snp_index].selected = that.data.snps[snp_index].selected ? false : true;
        that.sortSamples();
      };
      that.modify_compress = function (compress) {
        var t = new tween.Tween(that.view)
          .to({row_height: compress ? that.compressed_row_height : that.row_height}, 2000)
          .easing(tween.Easing.Sinusoidal.InOut)
          .start();
        that.view.compress = compress;
        //that will set the samples ypos
        that.sortSamples();
      };
      that.modify_cluster = function (cluster) {
        that.cluster = cluster;
        that.sortSamples();
      };

      that.resize = function () {
        var v = that.view;
        v.controls.bounding_box = {t: 0, r: that.row_header_width, b: that.col_header_height + that.gene_map_height, l: 0};
        v.genotypes.bounding_box = {t: that.col_header_height + that.gene_map_height, r: that.width(), b: that.height(), l: that.row_header_width};
        v.column_header.bounding_box = {t: that.gene_map_height, r: that.width(), b: that.col_header_height + that.gene_map_height, l: that.row_header_width};
        v.row_header.bounding_box = {t: that.col_header_height + that.gene_map_height, r: that.row_header_width, b: that.height(), l: 0};
        v.gene_map.bounding_box = {t: 0, r: that.width(), b: that.gene_map_height, l: that.row_header_width};
        that.canvas.attr('width', that.width())
          .attr('height', that.height());
        that.view.genome_scale.range([ 0, v.gene_map.bounding_box.r - v.gene_map.bounding_box.l - 20]);
        that.view.snp_scale.range([ 0, v.genotypes.bounding_box.r - v.genotypes.bounding_box.l - 40]);
        that.needUpdate = "resize";
        that.tick();
      };

      that.width = function () {
        return that.parent_element.width();
      };
      that.height = function () {
        return that.parent_element.height();
      };
      that.setSamples = function (sample_set) {
        that.data.samples = sample_set;
        var provider = function(start, end, callback) {
          that.snp_provider(start, end, sample_set, callback)
        };
        var locator = DQX.attr('pos');
        that.data.snp_cache = IntervalCache(provider, locator, that.newData);
        sample_set.forEach(function (sample) {
          sample.genotypes_canvas = document.createElement('canvas');
          sample.genotypes_canvas.height = 1;
        });
        that.sortSamples();

      };

      that.sortSamples = function () {
        var sample_set = that.data.samples;
        that.data.samples.forEach(function (sample, i) {
          sample.selected_haplotype = '';
          that.data.snps.forEach(function (snp) {
            if (snp.selected)
              sample.selected_haplotype += snp.genotypes[i].gt;
          });
        });
        if (that.cluster) {
//                    var genotypes = [];
//                    that.data.samples.forEach(function(sample){
//                        var g = [];
//                        g.sample = sample;
//                        sample.genotypes.forEach(function(snp, i){
//                            if (that.data.snps[i].selected)
//                                g.push(snp.gt);
//                        });
//                        genotypes.push(g);
//                    });
//                    var c = cluster.hcluster(genotypes, "euclidean", "complete");
//                    var count = 0;
//                    function add(node) {
//                        if (node.value) {
//                            node.value.sample.cluster = count;
//                            count += 1;
//                        }
//                        else {
//                            add(node.left);
//                            add(node.right);
//                        }
//                    }
//                    add(c);
          that.sample_heirachy = [
            {
              key: function (sample) {
                return sample.selected_haplotype;
              },
              comparator: d3.descending,
              display_name: function (key, values) {
                return values.length + " samples";
              }
            },
          ]
          that.sample_leaf_sort = DQX.comp_attr('selected_haplotype', d3.descending);
        } else {
          that.sample_heirachy = [
            {
              key: function (sample) {
                return sample.Classifications.subcont[0].Name;
              },
              comparator: d3.descending,
              display_name: DQX.return_arg(0)
            },
            {
              key: function (sample) {
                return sample.Classifications.region[0].Name;
              },
              comparator: d3.descending,
              display_name: DQX.return_arg(0)
            }
            //Commented out on request of DK
            //                    {
            //                        key: function (sample) {
            //                            return sample.SampleContext.Site.Name;
            //                        },
            //                        comparator: d3.descending
            //                    }

          ];
          that.sample_leaf_sort = DQX.comp_attr('ID', d3.descending);
        }

        var nest = d3.nest();
        that.sample_heirachy.forEach(function (level) {
          nest.key(level.key);
          nest.sortKeys(level.comparator);
        });
        nest.sortValues(that.sample_leaf_sort);
        that.sample_nest = nest.entries(sample_set);
        var vert = 0;
        var set_count = function (nest, depth) {
          if (nest.key == undefined)
            nest.key = nest.ID;
          nest.is_sample = (nest.ID != undefined);
          nest.display_name = nest.is_sample ? nest.ID : depth > 0 ? that.sample_heirachy[depth - 1].display_name(nest.key, nest.values) : 'Samples';
          nest.depth = depth;
          if (!nest.vert)
            nest.vert = vert;
          var t = new tween.Tween(nest, ['vert'])
            .to({vert: vert}, 2000)
            .easing(tween.Easing.Sinusoidal.InOut)
            .start();
          vert += nest.is_sample ? (that.view.compress ? that.compressed_row_height : that.row_height) : that.row_height;
          that.max_vert = vert;
          if (depth < that.sample_heirachy.length + 1) {
            var count = 0;
            nest.values.forEach(function (sub_nest) {
              count += set_count(sub_nest, depth + 1);
            });
            nest.count = count;
            return count;
          }
          return 1;
        };
        that.sample_nest.count = set_count({values: that.sample_nest}, 0);
        var sample_and_label_list = [];
        var add_func = function (nest, depth) {
          sample_and_label_list.push(nest);
          if (depth < that.sample_heirachy.length) {
            nest.values.forEach(function (sub_nest) {
              add_func(sub_nest, depth + 1);
            });
          }
        };
        that.sample_nest.forEach(function (nest) {
          add_func(nest, 0);
        });
        that.data.sample_and_label_list = sample_and_label_list;
        that.needUpdate = "sortSamples";
      };

      that.set_gene = function (gene_info) {
        if (gene_info) {
          that.data.gene_info = gene_info;
          var gene_width = gene_info.stop - gene_info.start;
          that.view.genome_scale.domain([gene_info.start, gene_info.stop]);
          that.annotation_fetcher.setChromoID(gene_info.chromid);
          that.annotation_fetcher._fetchRange(gene_info.start, gene_info.stop,
            function (annotations) {
              that.data.annotations = annotations;
            }
            , DQX.createMessageFailFunction);
          that.data.snps = that.data.snp_cache.get(gene_info.start, gene_info.stop);
        } else {
          that.data.gene_info = null;
          that.data.annotations = [];
          that.view.genome_scale.domain([0, 0]);
          that.data.snps = [];
        }
        that.view.scroll_pos = 0;
      };

      that.newData = function() {
        that.updateSNPs(true);
      };

      //Initialise the viewer
      var framePanel = FramePanel(frame);
      framePanel.onResize = that.resize;

      //Set us up the fetcher
      that.annotation_fetcher = new DataFetcherAnnotation.Fetcher({
        serverURL: serverUrl,
        database: MetaData.database,
        annotTableName: MetaData.tableAnnotation,
        chromnrfield: 'chrom'
      });

      //Where to show it
      that.parent_element = $('#' + frame.getClientDivID());
      that.parent_element
        .append('<canvas id="genotypes-browser">')
        .addClass('genotypes-browser');
      that.canvas = $("#genotypes-browser");

      that.needUpdate = "Init";

      that.updateSNPs = function(force_update) {
        var genome_scale = that.view.genome_scale.domain();
        if (force_update || that.data.snps.length == 0 || !_.isEqual(genome_scale, that.last_genome_scale_domain))
        {
          that.last_genome_scale_domain = genome_scale;
          that.data.snps = that.data.snp_cache.get(genome_scale[0], genome_scale[1]);
          //TODO fix anim and no jump on new data
  //        if (that.snps.length > 0) {
  //          current_range = {start: that.snps[0].pos, end: that.snps[that.snps.length-1].pos};
  //        }
          var snps = that.data.snps;
          var snps_per_pixel = Math.floor(snps.length/that.width());
          if (snps.length % that.width() > 0)
            snps_per_pixel += 1;
          var snps_length = snps.length;
          console.time('Draw');
          that.data.samples.forEach(function(sample, i) {
            //We want a canvas that is the next multiple of the number of snps
            sample.genotypes_canvas.width = Math.ceil(snps_length/snps_per_pixel);
            if (that.data.snps.length > 0) {
              var ctx = sample.genotypes_canvas.getContext("2d");
              var image_data = ctx.createImageData(that.data.snps.length, 1);
              var data = image_data.data;
              var p = 0;
              //Reduce a set up SNPs to a pixel by averaging the color of alts if any, otherwise refs
              for(var j=0; j<snps_length; j+= snps_per_pixel) {
//                var genotype = snps[j].genotypes[i];
//                var pixel = genotype.pixel;
//                data[4*p] = pixel[0];
//                data[4*p+1] = pixel[1];
//                data[4*p+2] = pixel[2];
//                data[4*p+3] = 255;
//                p++;
                var result_pixel_r =0, result_pixel_g=0, result_pixel_b=0;
                var num_snps_in_pixel = 0;
                var found_alts = false;
                for (var k=j; k < j+snps_per_pixel && k < snps_length; k++) {
                  var genotype = snps[k].genotypes[i];
                  var pixel = genotype.pixel;
                  if (genotype.gt == 1)
                    if (found_alts) {
                      result_pixel_r += pixel[0];
                      result_pixel_g += pixel[1];
                      result_pixel_b += pixel[2];
                      num_snps_in_pixel += 1;
                    } else {
                      found_alts = true;
                      result_pixel_r = pixel[0];
                      result_pixel_g = pixel[1];
                      result_pixel_b = pixel[2];
                      num_snps_in_pixel = 1
                    }
                  else
                    if (!found_alts) {
                      result_pixel_r += pixel[0];
                      result_pixel_g += pixel[1];
                      result_pixel_b += pixel[2];
                      num_snps_in_pixel += 1;
                    }
                }
                data[4*p] = result_pixel_r/num_snps_in_pixel;
                data[4*p+1] = result_pixel_g/num_snps_in_pixel;
                data[4*p+2] = result_pixel_b/num_snps_in_pixel;
                data[4*p+3] = 255;
                p++;
              }
              ctx.putImageData(image_data,0,0);
            }
          });
          console.timeEnd('Draw');
          that.view.snp_scale.tweenTo({left:0, right:that.data.snps.length});
          that.needUpdate = 'new snps';
        }
      };
      that.throttledUpdateSNPs = _.throttle(that.updateSNPs, 250);

      var led = false;
      that.tick = function (event) {
        that.throttledUpdateSNPs();
        var ctx;
        var updated = false;
        var tweens = tween.getAll().length;
        tween.update();
        if (tweens || that.needUpdate) {
          //Clear by change of size
          that.canvas.attr('width', that.width());
          ctx = that.canvas.get(0).getContext('2d');
          that.components.forEach(function (component) {
            that.view[component].draw(ctx, that.view, that.data);
          });
          updated = that.needUpdate || "TWEEN";
          that.needUpdate = false;
        }
        led = !led;
        ctx = that.canvas.get(0).getContext('2d');
        ctx.fillStyle = led ? (updated ? "#F00":"#0F0") : "#000";
        ctx.fillRect(0,0,10,10);
        if (updated) ctx.fillText(updated,5,10)
      };

      //Mouse and Touch events
      TouchEvents(that.canvas, {
        click: that.click,
        doubleclick: function (ev) {
          that.mouseWheel(ev, true)
        },
        dragStart: that.dragStart,
        dragMove: that.dragMove,
        dragEnd: that.dragEnd,
        mouseWheel: that.mouseWheel
      });

      //Layout consts
      that.gene_map_height = 100;
      that.row_header_width = 150;
      that.col_header_height = 100;
      that.row_height = 15;
      that.compressed_row_height = 5;
      that.cluster = 0;

      //Bounding boxes set on resize

      //Data to show
      that.data = {
        samples: [],
        sample_and_label_list: [],
        gene_info: null,
        annotations: [],
        snps: []
      };
      //View parameters
      that.view = {
        column_header: ColumnHeader({}, that.clickSNP),
        gene_map: GeneMap({}, that.clickSNP),
        genotypes: Genotypes({}, that.row_header_width),
        row_header: RowHeader({}),
        controls: Controls({}, {
          zoom_in: function () {
            that.rescaleGenomic(that.view.genome_scale.zoom(1));
          },
          zoom_out: function () {
            that.rescaleGenomic(that.view.genome_scale.zoom(-1));
          },
          zoom_all: function () {
            that.view.snp_scale.tweenTo({left: 0, right: that.data.snps.length});
            that.view.genome_scale.tweenTo({left: that.data.gene_info.start, right: that.data.gene_info.stop});
          }
        }),
        genome_scale: Scale(),
        last_genome_scale_domain: [0, 0],
        snp_scale: Scale(),
        compress: false,
        row_height: that.row_height,
        scroll_pos: 0
      };
      that.components = ['genotypes', 'column_header', 'gene_map', 'row_header', 'controls'];
      

      //How to divide the samples
      that.sample_heirachy = [
        {
          key: function (sample) {
            return sample.Classifications.subcont[0].Name;
          },
          comparator: d3.descending
        },
        {
          key: function (sample) {
            return sample.Classifications.region[0].Name;
          },
          comparator: d3.descending
        }
        //Commented out on request of DK
//                    {
//                        key: function (sample) {
//                            return sample.SampleContext.Site.Name;
//                        },
//                        comparator: d3.descending
//                    }

      ];
      that.sample_leaf_sort = DQX.comp_attr('ID', d3.descending);
      that.sample_nest = [];
      that.setSamples([]);

      that.resize();

      easel.Ticker.useRAF = true;
      easel.Ticker.addEventListener("tick", that.tick);
      easel.Ticker.setFPS(60);

      return that;
    };
  }
);