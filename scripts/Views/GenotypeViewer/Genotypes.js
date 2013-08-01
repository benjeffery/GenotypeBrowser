define(["tween", "DQX/Utils", "Views/GenotypeViewer/CanvasArea"],
  function (tween, DQX, CanvasArea) {
    return function Genotypes(bounding_box, left_overdraw) {
      var that = CanvasArea(bounding_box);
      that.left_overdraw = left_overdraw;

      that._draw = function (ctx, view, data) {
        var x_scale = view.snp_scale;
        var snp_width = x_scale(1) - x_scale(0);
        var y_off = view.scroll_pos;
        var row_height = Math.ceil(view.row_height);
        var width = that.bounding_box.r - that.bounding_box.l;

        //Genotype squares
        if (data.snps.length > 0)
          if (snp_width > 1) {
            var first_snp = Math.floor(Math.max(0, x_scale.invert(-left_overdraw)-1));
            var last_snp = Math.ceil(Math.min(data.snps.length, x_scale.invert(width)+1));
            data.samples.forEach(function (sample, i) {
              for(var j = first_snp; j < last_snp; j++) {
                var snp = data.snps[j];
                ctx.fillStyle = DQX.getRGB(snp.genotypes[i].pixel);
                ctx.fillRect(x_scale(j)-(snp_width*0.001), sample.vert + y_off, snp_width+(snp_width*1.002), row_height);
                //var height = Math.min(row_height,row_height*((snp.ref+snp.alt)/100))
                //ctx.fillRect(x_scale(snp.snp_index), sample.vert + y_off + (row_height-height)/2, snp_width, height);
              };
            });
          }
          else {
            var pixel_width = view.snp_scale(data.snps.length) - view.snp_scale(0);
            var x_offset = view.snp_scale(0);
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
          var min_snp = x_scale.invert(-300);
          var max_snp = x_scale.invert(that.width() + 200);
          data.samples.forEach(function (sample, i) {
            data.snps.forEach(function (snp, j) {
              if (j > min_snp && j < max_snp) {
                var genotype = snp.genotypes[i];
                if (genotype.ref) {
                  var x = x_scale(j) + (snp_width / 2) - 5;
                  var y = sample.vert + y_off + (row_height / 2);
                  ctx.strokeText(genotype.ref, x, y);
                  ctx.fillText(genotype.ref, x, y);
                }
              }
            });
          });
          ctx.strokeStyle = DQX.getRGB(128, 0, 0, alpha);
          ctx.fillStyle = DQX.getRGB(255, 255, 255, alpha);
          data.samples.forEach(function (sample, i) {
              data.snps.forEach(function (snp, j) {
                if (j > min_snp && j < max_snp) {
                  var genotype = snp.genotypes[i];
                  if (genotype.alt) {
                    var x = x_scale(j) + (snp_width / 2) + 25;
                    var y = sample.vert + y_off + (row_height / 2);
                    ctx.strokeText(genotype.alt, x, y);
                    ctx.fillText(genotype.alt, x, y);
                  }
                }
              });
          });
        }
      };
      return that;
    };
  }
)
;

