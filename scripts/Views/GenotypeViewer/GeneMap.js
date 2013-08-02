define(["tween", "DQX/Utils", "Views/GenotypeViewer/CanvasArea"],
  function (tween, DQX, CanvasArea) {
    return function GeneMap(bounding_box, clickSNPCallback) {
      var that = CanvasArea(bounding_box);
      that.clickSNPCallback = clickSNPCallback;

      that.formatSI = function (number) {
        var prefix = d3.formatPrefix(parseFloat(number));
        return prefix.scale(number) + prefix.symbol;
      };

      that._draw = function (ctx, view, data) {
        var scale = view.genome_scale;
        var snp_scale = view.snp_scale;
        var snps = data.snps;
        var snps_length = snps.length;
        var snp_width = (scale.range()[1] - scale.range()[0]) / snps_length;

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
        data.annotations.forEach(function (annot) {
          DQX.roundedRect(ctx, scale(annot.start), 25, scale(annot.width) - scale(0), 15, 6);
          ctx.fill();
        });
        //Loading indicator
        ctx.save();
        ctx.strokeStyle = '#F00';
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
          snps.forEach(function (snp, i) {
            ctx.strokeStyle = DQX.getRGB(snp.rgb.r, snp.rgb.g, snp.rgb.b, alpha);
            ctx.lineWidth = snp.selected ? 2 : 1;
            ctx.beginPath();
            ctx.moveTo(scale(snp.pos), 50);
            ctx.bezierCurveTo(scale(snp.pos), 75, snp_scale(i + 0.5), 75, snp_scale(i + 0.5), 100);
            ctx.stroke();
          });
          //SNP Triangles and line on genome
          ctx.strokeStyle = "rgba(0,0,0,0.50)";
          ctx.fillStyle = "rgba(0,152,0,0.50)";
          snps.forEach(function (snp) {
            ctx.beginPath();
            ctx.moveTo(scale(snp.pos), 25);
            ctx.lineTo(scale(snp.pos), 40);
            ctx.lineWidth = snp.selected ? 2 : 1;
            ctx.stroke();
            DQX.polyStar(ctx, scale(snp.pos), 47, 7, 3, 0, -90);
            ctx.fill();
            ctx.stroke();
          });
        }

        //If we aren't doing lines then do grouped linking
        alpha = tween.manual(snp_width, 5, 2);
        if (alpha > 0) {
          var regions = [];
          //Decide if we want to group or just use fixed width hilight
          if (snps_length > 5000) {
            //Use fixed width
            var jump = Math.ceil(snps_length/10);
            for (i = 0; i+jump < snps_length; i += jump) {
              regions.push([i, i+jump]);
            }
            regions.push([i, snps_length-1]);
          } else {
            //Find some groupings based on large jumps
            var gaps = [];
            for(i = 1; i < snps_length; i+=1) {
              gaps.push([i-1, snps[i].pos - snps[i-1].pos])
            }
            gaps.sort(function(a,b) {return b[1]-a[1]});
            gaps = gaps.slice(0, Math.min(Math.ceil(gaps.length/20),20));
            gaps.sort(function(a,b) {return a[0]-b[0]});
            if (gaps.length > 0) {
              regions.push([0, gaps[0][0]]);
              for (i = 0; i < gaps.length-1; i += 1) {
                regions.push([gaps[i][0]+1, gaps[i+1][0]]);
              }
              regions.push([gaps[gaps.length-1][0]+1, snps_length-1]);
            }
          }
          ctx.save();
          ctx.strokeStyle = DQX.getRGB(0,0,0,alpha);
          ctx.lineWidth = 2;
          for (var i = 0; i < regions.length; i += 1) {
            var i1 = regions[i][0];
            var i2 = regions[i][1];
            var pos = snps[i1].pos;
            var pos2 = snps[i2].pos;
//            ctx.beginPath();
//            ctx.moveTo(scale(pos), 25);
//            ctx.lineTo(scale(pos), 40);
//            ctx.bezierCurveTo(scale(pos), 75, snp_scale(i1), 75, snp_scale(i1), 100);
//            ctx.stroke();
            ctx.fillStyle = i % 2 ? DQX.getRGB(0,0,255,alpha/2) : DQX.getRGB(0,128,255,alpha/2);
            ctx.beginPath();
            ctx.moveTo(scale(pos), 40);
            ctx.bezierCurveTo(scale(pos), 75, snp_scale(i1), 75, snp_scale(i1), 100);
            ctx.lineTo(snp_scale(i2), 100);
            ctx.bezierCurveTo(snp_scale(i2), 75, scale(pos2), 75,  scale(pos2), 40);
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
          ctx.strokeText(annot.name, scale(annot.start), 25, scale(annot.width) - scale(0));
          ctx.fillText(annot.name, scale(annot.start), 25, scale(annot.width) - scale(0));
        });
      };

      that._click = function (pos, view, data) {
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



