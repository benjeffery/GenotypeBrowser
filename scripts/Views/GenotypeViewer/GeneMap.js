define(["tween", "DQX/Utils", "Views/GenotypeViewer/CanvasArea"],
  function (tween, DQX, CanvasArea) {
    return function GeneMap(bounding_box, clickSNPCallback) {
      var that = CanvasArea(bounding_box);
      that.clickSNPCallback = clickSNPCallback;
      that.colours = [0x800000, 0xFF0000, 0xFFFF00, 0x808000, 0x00FF00,	0x008000,	0x00FFFF,
      0x008080,	0x0000FF,	0x000080,	0xFF00FF, 0x800080];

      that.formatSI = function (number) {
        var prefix = d3.formatPrefix(parseFloat(number));
        return prefix.scale(number) + prefix.symbol;
      };

      that._draw = function (ctx, view, data) {
        var scale = view.genome_scale;
        var snp_scale = view.snp_scale;
        var snps = data.snps;
        var snp, i, end;
        var snps_length = view.end_snp - view.start_snp;
        var snp_width = that.width() / snps_length;

        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.fillRect(0, 0, that.width(), that.height());

        //Scale ticks
        var ticks = scale.ticks(that.width() / 100);
        ctx.beginPath();
        ticks.forEach(function (tick) {
          ctx.moveTo(scale(tick), 12);
          ctx.lineTo(scale(tick), 25);
        });
        ctx.strokeStyle = '#000';
        ctx.stroke();
        //Scale numbers
        ctx.fillStyle = "#000";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ticks.forEach(function (tick) {
          ctx.fillText(that.formatSI(tick), scale(tick), 2);
        });
        //Annotation rectangles
        ctx.fillStyle = "rgba(0,153,0,0.50)";
        ctx.strokeStyle = "rgba(0,153,0,0.05)";
        data.annotations.forEach(function (annot) {
          var width = scale(annot.width) - scale(0);
          if (width > 2) {
            ctx.beginPath();
            DQX.roundedRect(ctx, scale(annot.start), 25, width, 15, Math.min(6, width/2));
            ctx.fill();
          }
          else {
            ctx.beginPath();
            ctx.moveTo(scale(annot.start), 25);
            ctx.lineTo(scale(annot.start), 40);
            ctx.stroke();
          }
        });
        //Loading indicator
        ctx.save();
        ctx.strokeStyle = "rgba(255,0,0,0.50)";
        ctx.beginPath();
        data.snp_cache.intervals_being_fetched(view.chrom).forEach(function(interval) {
          ctx.moveTo(scale(interval.start), 25);
          ctx.lineTo(scale(interval.start), 35);
          ctx.moveTo(scale(interval.start), 30);
          ctx.lineTo(scale(interval.end), 30);
          ctx.moveTo(scale(interval.end), 25);
          ctx.lineTo(scale(interval.end), 35);
        });
        ctx.stroke();
        ctx.restore();
        //Curves from gene scale to SNP scale
        var alpha = tween.manual(snp_width, 2, 5);
        if (alpha > 0) {
          for (i = view.start_snp, end = view.end_snp; i < end; ++i) {
            snp = snps[i];
            if (snp) {
              ctx.strokeStyle = DQX.getRGB(snp.rgb.r, snp.rgb.g, snp.rgb.b, alpha);
              ctx.lineWidth = snp.selected ? 2 : 1;
              ctx.beginPath();
              ctx.moveTo(scale(snp.pos), 50);
              ctx.bezierCurveTo(scale(snp.pos), 75, snp_scale(i + 0.5), 75, snp_scale(i + 0.5), 100);
              ctx.stroke();
            }
          }
          //SNP Triangles and line on genome
          ctx.strokeStyle = "rgba(0,0,0,0.50)";
          ctx.fillStyle = "rgba(0,152,0,0.50)";
          for (i = view.start_snp, end = view.end_snp; i < end; ++i) {
            snp = snps[i];
            if (snp) {
              ctx.beginPath();
              ctx.moveTo(scale(snp.pos), 25);
              ctx.lineTo(scale(snp.pos), 40);
              ctx.lineWidth = snp.selected ? 2 : 1;
              ctx.stroke();
              DQX.polyStar(ctx, scale(snp.pos), 47, 7, 3, 0, -90);
              ctx.fill();
              ctx.stroke();
            }
          }
        }

        //If we aren't doing lines then do grouped linking
        var fixed_width;
        alpha = tween.manual(snp_width, 5, 2);
        if (alpha > 0) {
          var regions = [];
          var positions = data.snp_cache.snp_positions[view.chrom];
          //Decide if we want to group or just use fixed width hilight
          if (snps_length > 5000) {
            //Use fixed width
            fixed_width = true;
            var jump = 1000;
            for (i = Math.floor(view.start_snp/jump)*jump; i+jump < positions.length; i += jump) {
              regions.push([i, i+jump]);
            }
            regions.push([i, Math.min(i+jump, positions.length-1)]);
          } else {
            //Find some groupings based on large jumps - regions are pairs of snp indexes
            fixed_width = false;
            var gaps = [];
            for (i = view.start_snp+1, end = view.end_snp; i < end; ++i) {
              gaps.push([i-1, positions[i] - positions[i-1]])
            }
            gaps.sort(function(a,b) {return b[1]-a[1]});
            gaps = gaps.slice(0, Math.min(Math.ceil(gaps.length/20),20));
            gaps.sort(function(a,b) {return a[0]-b[0]});
            if (gaps.length > 0) {
              regions.push([view.start_snp, gaps[0][0]]);
              for (i = 0; i < gaps.length-1; i += 1) {
                regions.push([gaps[i][0]+1, gaps[i+1][0]]);
              }
              regions.push([gaps[gaps.length-1][0]+1, view.end_snp-1]);
            }
          }
          ctx.save();
          ctx.strokeStyle = DQX.getRGB(0,0,0,alpha);
          ctx.lineWidth = 2;
          for (i = 0; i < regions.length; i += 1) {
            var i1 = regions[i][0];
            var i2 = regions[i][1];
            var pos = positions[i1];
            var pos2 = positions[i2];
            //ctx.fillStyle = i % 2 ? DQX.getRGB(0,0,255,alpha/2) : DQX.getRGB(0,128,255,alpha/2);
            ctx.fillStyle = DQX.getRGB(that.colours[(fixed_width ? i1/jump : i1) % that.colours.length], alpha/2);
            ctx.beginPath();
            ctx.moveTo(scale(pos), 50);
            ctx.bezierCurveTo(scale(pos), 75, snp_scale(i1+0.5), 75, snp_scale(i1+0.5), 100);
            ctx.lineTo(snp_scale(i2+1), 100);
            ctx.bezierCurveTo(snp_scale(i2+1.5), 75, scale(pos2), 75,  scale(pos2), 50);
            ctx.closePath();
            ctx.fill();
          }
          ctx.restore();
        }

        ctx.font = "bold 12px sans-serif";
        ctx.lineWidth = 2;
        ctx.strokeStyle = DQX.getRGB(0, 0, 0, 1);
        ctx.fillStyle = DQX.getRGB(255, 255, 255, 1);
        ctx.textAlign = 'left';
        data.annotations.forEach(function (annot) {
          var width = scale(annot.width) - scale(0);
          if (width > 5 && annot.name != "-") {
            ctx.strokeText(annot.name, scale(annot.start), 25, scale(annot.width) - scale(0));
            ctx.fillText(annot.name, scale(annot.start), 25, scale(annot.width) - scale(0));
          }
        });
      };

      that._click = function (pos, view, data) {
        var snps = data.snps;
        var canvas = document.createElement('canvas');
        canvas.width = that.width();
        canvas.height = that.height();
        var ctx = canvas.getContext('2d');
        var scale = view.genome_scale;
        var divisions = Math.ceil(Math.pow(snps.length + 1, 1 / 3));
        var multiplier = 255 / (divisions + 1);
        snps.forEach(function (snp, i) {
          DQX.polyStar(ctx, scale(snp.pos), 47, 7, 3, 0, -90);
          var col = DQX.getRGB(multiplier * ((i + 10) % divisions),
            multiplier * Math.floor(((i + 10) % (divisions * divisions)) / divisions),
            multiplier * Math.floor(((i + 10)) / (divisions * divisions)));
          ctx.strokeStyle = col;
          ctx.fillStyle = col;
          ctx.fill();
          ctx.stroke();
        });
        var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        var index = (pos.x + pos.y * imageData.width) * 4;
        var snp_index = (imageData.data[index + 0] / multiplier) - 10;
        snp_index += (imageData.data[index + 1] / multiplier) * divisions;
        snp_index += (imageData.data[index + 2] / multiplier) * divisions * divisions;
        if (snp_index >= 0 && snp_index < snps.length && snp_index == Math.round(snp_index))
          that.clickSNPCallback(snp_index);
      };
      return that;
    };
  }
);



