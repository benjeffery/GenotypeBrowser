define(["tween", "DQX/Utils", "Views/GenotypeViewer/CanvasArea"],
  function (tween, DQX, CanvasArea) {
    return function Genotypes(bounding_box, left_overdraw) {
      var that = CanvasArea(bounding_box);
      that.left_overdraw = left_overdraw;

      that._draw = function (ctx, view, data) {
        var x_scale = view.snp_scale;
        var end, i;
        var snp_width = x_scale(1) - x_scale(0);
        var y_off = view.scroll_pos;
        var row_height = Math.ceil(view.row_height);
        var genotypes = data.snp_cache.genotypes;
        if (!genotypes) return that;
        //Genotype squares
          if (snp_width > 3) {
            data.samples.forEach(function (sample, s) {
              var r = genotypes[s].r;
              var g = genotypes[s].g;
              var b = genotypes[s].b;
              for (i = view.start_snp, end = view.end_snp; i < end; ++i) {
                  ctx.fillStyle = DQX.getRGB(r[i], g[i], b[i]);
                  ctx.fillRect(x_scale(i)-(snp_width*0.001), sample.vert + y_off, snp_width+(snp_width*1.002), row_height);
                  //var height = Math.min(row_height,row_height*((snp.ref+snp.alt)/100))
                  //ctx.fillRect(x_scale(snp.snp_index), sample.vert + y_off + (row_height-height)/2, snp_width, height);
              }
            });
          }
          else {
            var width = x_scale(view.cache_end_snp) - x_scale(view.cache_start_snp);
            var x_offset =  x_scale(view.cache_start_snp);
            data.samples.forEach(function (sample, i) {
              ctx.drawImage(sample.genotypes_canvas,x_offset,sample.vert + y_off, width, row_height);
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
            var ref = genotypes[s].ref;
            for (i = view.start_snp, end = view.end_snp; i < end; ++i) {
              if (ref[i]) {
                  var x = x_scale(i) + (snp_width / 2) - 5;
                  var y = sample.vert + y_off + (row_height / 2);
                  ctx.strokeText(ref[i], x, y);
                ctx.fillText(ref[i], x, y);
              }
            }
          });
          ctx.strokeStyle = DQX.getRGB(128, 0, 0, alpha);
          ctx.fillStyle = DQX.getRGB(255, 255, 255, alpha);
          data.samples.forEach(function (sample, s) {
            var alt = genotypes[s].alt;
            for (i = view.start_snp, end = view.end_snp; i < end; ++i) {
              if (alt[i]) {
                var x = x_scale(i) + (snp_width / 2) + 25;
                var y = sample.vert + y_off + (row_height / 2);
                ctx.strokeText(alt[i], x, y);
                ctx.fillText(alt[i], x, y);
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

