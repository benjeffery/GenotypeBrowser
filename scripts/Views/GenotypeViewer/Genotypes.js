define(["tween", "DQX/Utils", "Views/GenotypeViewer/CanvasArea"],
  function (tween, DQX, CanvasArea) {
    return function Genotypes(bounding_box, left_overdraw) {
      var that = CanvasArea(bounding_box);
      that.left_overdraw = left_overdraw;

      that._draw = function (ctx, view, data) {
        var x_scale = view.snp_scale;
        var snp, end, i;
        var snp_width = x_scale(1) - x_scale(0);
        var y_off = view.scroll_pos;
        var row_height = Math.ceil(view.row_height);
        var width = that.bounding_box.r - that.bounding_box.l;
        var snps = data.snps;
        var snps_length = snps.length;
        //Genotype squares
          if (snp_width > 1) {
            data.samples.forEach(function (sample, s) {
              var r = data.snp_cache.genotypes[view.chrom][s].r;
              var g = data.snp_cache.genotypes[view.chrom][s].g;
              var b = data.snp_cache.genotypes[view.chrom][s].b;

              for (i = view.start_snp, end = view.end_snp; i < end; ++i) {
                //if (snp) {
                  ctx.fillStyle = DQX.getRGB(r[i], g[i], b[i]);
                  ctx.fillRect(x_scale(i)-(snp_width*0.001), sample.vert + y_off, snp_width+(snp_width*1.002), row_height);
                  //var height = Math.min(row_height,row_height*((snp.ref+snp.alt)/100))
                  //ctx.fillRect(x_scale(snp.snp_index), sample.vert + y_off + (row_height-height)/2, snp_width, height);
                //}
              }
            });
          }
          else {
            var pixel_width = view.snp_scale(view.end_snp) - view.snp_scale(view.start_snp);
            var x_offset = 0//view.start_snp;
            data.samples.forEach(function (sample, i) {
              ctx.drawImage(sample.genotypes_canvas,x_offset,sample.vert + y_off,pixel_width,row_height);
            });
          }


        //Read count texts
        var alpha = tween.manual(snp_width, 58, 68, tween.Easing.Linear.None, 0, 0.8);
        if (alpha > 0 && row_height > 6) {
          ctx.font = "" + row_height - 2 + "px sans-serif";
          ctx.lineWidth = 2;
          ctx.strokeStyle = DQX.getRGB(0, 0, 0, alpha);
          ctx.fillStyle = DQX.getRGB(255, 255, 255, alpha);
          ctx.textBaseline = 'middle';
          ctx.textAlign = 'right';
          ctx.strokeStyle = DQX.getRGB(0, 0, 128, alpha);
          ctx.fillStyle = DQX.getRGB(255, 255, 255, alpha);
          data.samples.forEach(function (sample, s) {
            for (i = view.start_snp, end = view.end_snp; i < end; ++i) {
              snp = snps[i];
              if (snp) {
                  var genotype = snp.genotypes[s];
                  if (genotype.ref) {
                    var x = x_scale(i) + (snp_width / 2) - 5;
                    var y = sample.vert + y_off + (row_height / 2);
                    ctx.strokeText(genotype.ref, x, y);
                    ctx.fillText(genotype.ref, x, y);
                  }
              }
            }
          });
          ctx.strokeStyle = DQX.getRGB(128, 0, 0, alpha);
          ctx.fillStyle = DQX.getRGB(255, 255, 255, alpha);
          data.samples.forEach(function (sample, s) {
            for (i = view.start_snp, end = view.end_snp; i < end; ++i) {
              snp = snps[i];
              if (snp) {
                  var genotype = snp.genotypes[s];
                  if (genotype.alt) {
                    var x = x_scale(i) + (snp_width / 2) + 25;
                    var y = sample.vert + y_off + (row_height / 2);
                    ctx.strokeText(genotype.alt, x, y);
                    ctx.fillText(genotype.alt, x, y);
                  }
              }
            }
          });
        }
      };
      return that;
    };
  }
)
;

