define(["tween", "DQX/Utils", "Views/GenotypeViewer/CanvasArea"],
  function (tween, DQX, CanvasArea) {
    return function Genotypes(bounding_box) {
      var that = CanvasArea(bounding_box);

      that._draw = function (ctx, view, data) {
        var x_scale = view.snp_scale;
        //var snp_width = Math.ceil(x_scale(1)-x_scale(0));
        var snp_width = x_scale(1) - x_scale(0);
        var y_off = view.scroll_pos;
        var row_height = Math.ceil(view.row_height);

        //Genotype squares
        data.samples.forEach(function (sample, i) {
          data.snps.forEach(function (snp, j) {
            ctx.fillStyle = snp.genotypes[i].col;
            ctx.fillRect(x_scale(j), sample.vert + y_off, snp_width, row_height)
            //var height = Math.min(row_height,row_height*((snp.ref+snp.alt)/100))
            //ctx.fillRect(x_scale(snp.snp_index), sample.vert + y_off + (row_height-height)/2, snp_width, height);
          });
        });

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

