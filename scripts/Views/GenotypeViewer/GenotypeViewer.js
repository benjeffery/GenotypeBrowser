﻿define(["lodash", "clusterfck", "easel", "d3", "tween", "require", "DQX/Utils", "DQX/Model",
  "DQX/SVG",
  "DQX/FramePanel", "MetaData", "Views/GenotypeViewer/ColumnHeader",
  "Views/GenotypeViewer/RowHeader", "Views/GenotypeViewer/GeneMap", "Views/GenotypeViewer/Genotypes",
  "Views/GenotypeViewer/TouchEvents", "Views/GenotypeViewer/Controls", "Views/GenotypeViewer/Scale",
  "Views/GenotypeViewer/IntervalCache", "Views/GenotypeViewer/SNPCache", "Views/GenotypeViewer/CanvasStack",
  "Views/GenotypeViewer/LDMap"],
  function (_, cluster, easel, d3, tween, require, DQX, Model,
            SVG,
            FramePanel, MetaData, ColumnHeader,
            RowHeader, GeneMap, Genotypes,
            TouchEvents, Controls, Scale, IntervalCache, SNPCache,
            CanvasStack, LDMap) {
    return function GenotypeViewer(frame, providers) {
      var that = {};
      that.providers = providers;
      //Rescale the SNPs based on a genomic range
      that.rescaleGenomic = function (target) {
        var left = that.data.snp_cache.posToIndex(target.left);
        var right = that.data.snp_cache.posToIndex(target.right);
        if (_.isEqual(that.view.snp_scale.domain(), [0,0])) {
          that.view.snp_scale.domain([left, right]);
        } else {
          that.view.snp_scale.tweenTo({left: left, right: right});
        }
      };
      //Rescale the genome based on a range of SNPs
      that.rescaleSNPic = function (target) {
        var left = that.data.snp_cache.indexToPos(target.left);
        var right = that.data.snp_cache.indexToPos(target.right);
        that.view.genome_scale.tweenTo({left: left, right: right});
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
          that.rescaleGenomic(that.view.genome_scale.scale_clamp(that.view.genome_scale.zoom(delta, pos.x), 0, MetaData.chrom_map[that.view.chrom].len*1000000));
          that.last_view_change = 'genome';
        }
        if (pos.y > that.gene_map_height && pos.x > that.row_header_width) {
          pos.x -= that.row_header_width;
          that.last_view_change = 'snps';
          that.rescaleSNPic(that.view.snp_scale.scale_clamp(that.view.snp_scale.zoom(delta, pos.x), 0, that.data.snp_cache.snp_positions.length));
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
          that.rescaleSNPic(that.view.snp_scale.dragMove(ev.touches));
          // Y Scroll
          var dist = that.startDragScrollY - ev.center.y;
          that.view.scroll_pos = that.startDragScrollPos - dist;
          if (that.view.scroll_pos > 0)
            that.view.scroll_pos = 0;
          if (that.view.scroll_pos < that.max_scroll())
            that.view.scroll_pos = that.max_scroll();
        }
        that.needUpdate = "dragMove";
        that.last_view_change = that.drag;
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
        if (_.contains(that.view.selected_snps,snp_index)) {
          that.view.selected_snps = _.filter(that.view.selected_snps, function(index) {return index !== snp_index});
        }
        else
          that.view.selected_snps.push(snp_index);
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
        v.stack.bounding_box = {t: that.col_header_height + that.gene_map_height, r: that.width(), b: that.height(), l: that.row_header_width};
        v.column_header.bounding_box = {t: that.gene_map_height, r: that.width(), b: that.col_header_height + that.gene_map_height, l: that.row_header_width};
        v.row_header.bounding_box = {t: that.col_header_height + that.gene_map_height, r: that.row_header_width, b: that.height(), l: 0};
        v.gene_map.bounding_box = {t: 0, r: that.width(), b: that.gene_map_height, l: that.row_header_width};
        that.canvas.attr('width', that.width())
          .attr('height', that.height());
        that.view.genome_scale.range([ 0, v.gene_map.bounding_box.r - v.gene_map.bounding_box.l - 20]);
        that.view.snp_scale.range([ 0, v.stack.bounding_box.r - v.stack.bounding_box.l - 40]);
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
        sample_set.forEach(function (sample) {
          sample.genotypes_canvas = document.createElement('canvas');
          sample.genotypes_canvas.height = 1;
        });
        that.data.snp_cache.set_samples(sample_set);
        that.sortSamples();
      };

      that.sortSamples = function () {
        var sample_set = that.data.samples;
        var genotypes = that.data.snp_cache.genotypes;
        _(that.data.samples).forEach(function (sample, i) {
          sample.selected_haplotype = '';
          if (genotypes) {
            _(that.view.selected_snps).forEach(function (snp) {
                sample.selected_haplotype += genotypes[i].gt[snp];
            });
          }
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
          that.sample_leaf_sort = function(a,b) {return d3.descending(a.selected_haplotype+ a.ID, b.selected_haplotype+ b.ID);};
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
          var t = new tween.Tween(nest)
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
          that.view.genome_scale.domain([gene_info.start, gene_info.stop]);
          that.view.chrom = gene_info.chromid;
          that.data.snp_cache.set_chrom(gene_info.chromid);
          that.data.snp_cache.set_chrom(gene_info.chromid);
          that.rescaleGenomic({left: gene_info.start, right:gene_info.stop})
        } else {
          that.data.gene_info = null;
          that.view.genome_scale.domain([0, 0]);
        }
        that.view.scroll_pos = 0;
        that.last_view_change = 'genome';
      };

      that.newData = _.throttle(function() {
        that.updateSNPs(true);
      },1000);

      that.newAnnotations = function() {
        var genome_scale = that.view.genome_scale.domain();
        that.data.annotations = that.data.annotation_cache.get_by_pos(that.view.chrom, Math.floor(genome_scale[0]-25000), Math.ceil(genome_scale[1]+25000));
        that.needUpdate = 'Annots';
      };

      //Initialise the viewer
      var framePanel = FramePanel(frame);
      framePanel.onResize = that.resize;

      //Where to show it
      that.parent_element = $('#' + frame.getClientDivID());
      that.parent_element
        .append('<canvas id="genotypes-browser">')
        .addClass('genotypes-browser');
      that.canvas = $("#genotypes-browser");

      that.needUpdate = "Init";

      that.updateSNPs = function(force_update) {
        var view = that.view;
        var genome_scale = view.genome_scale.targetDomain();
        var snp_scale = view.snp_scale.targetDomain();
        that.data.annotations = that.data.annotation_cache.get_by_pos(view.chrom, Math.floor(genome_scale[0]-25000), Math.ceil(genome_scale[1]+25000));
        that.data.snp_cache.retrieve_by_index(view.start_snp, view.end_snp);
        that.data.snps = that.data.snp_cache.snps;
        var snps_per_pixel = Math.max(1, Math.floor((snp_scale[1]-snp_scale[0])/that.width()));
        if (force_update ||
            view.start_snp < view.cache_start_snp ||
            view.end_snp > view.cache_end_snp ||
            snps_per_pixel != view.cache_snps_per_pixel)
        {
          //that.last_snp_range = current_snp_range;
          view.cache_snps_per_pixel = snps_per_pixel;
          var num_snps = view.end_snp - view.start_snp;
          //Over draw by 3x for side scroll
          view.cache_start_snp = Math.max(0, view.start_snp-num_snps);
          view.cache_end_snp = Math.min(that.data.snp_cache.snp_positions.length, view.end_snp+num_snps);
          num_snps = view.cache_end_snp - view.cache_start_snp;
          var width = Math.ceil(num_snps/snps_per_pixel);
          view.cache_pixel_width = width;
          console.time('draw');
          var genotypes = that.data.snp_cache.genotypes;
          that.data.samples.forEach(function(sample, s) {
            //We want a canvas that is the next multiple of the number of snps
            sample.genotypes_canvas.width = width;
            if (num_snps > 0 && genotypes) {
              var ctx = sample.genotypes_canvas.getContext("2d");
              var image_data = ctx.createImageData(width, 1);
              var data = image_data.data;
              var p = 0;
              var r = genotypes[s].r;
              var g = genotypes[s].g;
              var b = genotypes[s].b;
              var gt = genotypes[s].gt;
              //Reduce a set up SNPs to a pixel by averaging the color of alts if any, otherwise refs
              for(var j=view.cache_start_snp, ref = view.cache_end_snp; j < ref; j+= snps_per_pixel) {
                data[4*p] = r[j];
                data[4*p+1] = g[j];
                data[4*p+2] = b[j];
                data[4*p+3] = 255;
                p++;
//                var result_pixel_r =0, result_pixel_g=0, result_pixel_b=0;
//                var num_snps_in_pixel = 0;
//                var found_alts = false;
//                //Loop over the snps in this pixel
//                for (var k = j, ref2 = j+snps_per_pixel, ref3 = view.cache_end_snp; k < ref2 && k < ref3; k++) {
//                  if (gt[k] == 1)
//                    if (found_alts) {
//                      result_pixel_r += r[k];
//                      result_pixel_g += g[k];
//                      result_pixel_b += b[k];
//                      num_snps_in_pixel += 1;
//                    } else {
//                      found_alts = true;
//                      result_pixel_r = r[k];
//                      result_pixel_g = g[k];
//                      result_pixel_b = b[k];
//                      num_snps_in_pixel = 1
//                    }
//                  else
//                    if (!found_alts) {
//                      result_pixel_r += r[k];
//                      result_pixel_g += g[k];
//                      result_pixel_b += b[k];
//                      num_snps_in_pixel += 1;
//                    }
//                }
//                data[4*p] = result_pixel_r/num_snps_in_pixel;
//                data[4*p+1] = result_pixel_g/num_snps_in_pixel;
//                data[4*p+2] = result_pixel_b/num_snps_in_pixel;
//                data[4*p+3] = 255;
//                p++;
              }
              ctx.putImageData(image_data,0,0);
            }
          });
        console.timeEnd('draw');
        that.needUpdate = 'new snps';
        }
      };
      that.throttledUpdateSNPs = _.throttle(that.updateSNPs, 250);

      var led = false;
      that.tick = function (event) {
        var snp_scale = that.view.snp_scale.domain();
        var extra_width = (snp_scale[1] - snp_scale[0]) * 0.2;
        that.view.start_snp =  Math.max(0, Math.floor(snp_scale[0] - extra_width));
        that.view.end_snp = Math.min(that.data.snp_cache.snp_positions.length, Math.ceil(snp_scale[1] + extra_width));
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
      that.compressed_row_height = 2;
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
      var locator = DQX.attr('start');
      that.data.annotation_cache = IntervalCache(that.providers.annotation, locator, null, that.newAnnotations);
      that.data.snp_cache = SNPCache(providers, that.newData, []);

      //View parameters
      that.view = {
        column_header: ColumnHeader({}, that.clickSNP),
        gene_map: GeneMap({}, that.clickSNP),
        stack: CanvasStack({}, [
          Genotypes(),
          LDMap()
        ]),
        row_header: RowHeader({}),
        controls: Controls({}, {
          zoom_in: function () {
            that.rescaleGenomic(that.view.genome_scale.zoom(1));
            that.last_view_change = 'genome';
          },
          zoom_out: function () {
            that.rescaleGenomic(that.view.genome_scale.zoom(-1));
            that.last_view_change = 'genome';
          },
          zoom_all: function () {
            that.view.snp_scale.tweenTo({left: 0, right: that.data.snp_cache.snp_positions.length});
            that.view.genome_scale.tweenTo({left: 0, right: MetaData.chrom_map[that.view.chrom].len*1000000});
            that.last_view_change = 'genome';
          }
        }),
        genome_scale: Scale(),
        last_genome_scale_domain: [0, 0],
        snp_scale: Scale(),
        start_snp: 0,
        end_snp: 0,
        compress: false,
        row_height: that.row_height,
        scroll_pos: 0,
        chrom: 'MAL13',
        selected_snps: []
      };
      that.data.snp_cache.set_chrom('MAL13');
      that.components = ['stack', 'column_header', 'gene_map', 'row_header', 'controls'];
      that.last_view_change = 'genome';
      

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