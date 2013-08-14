define(["tween", "DQX/Utils", "Views/GenotypeViewer/CanvasArea"],
  function (tween, DQX, CanvasArea) {
    return function ColumnHeader(bounding_box, clickSNPCallback) {
      var that = CanvasArea(bounding_box);
      that.clickSNPCallback = clickSNPCallback;

      that._draw = function (ctx, view, data) {
        var scale = view.snp_scale;
        var snp_width = scale(1) - scale(0);
        //Background
        var g = ctx.createLinearGradient(0, 0, 0, that.height());
        g.addColorStop(0, "rgba(255,255,255,0.85)");
        g.addColorStop(0.75, "rgba(255,255,255,0.85)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, that.width(), that.height());

        var alpha = tween.manual(snp_width, 5, 10);
        //Little hat and area fill
        if (alpha > 0) {
          ctx.strokeStyle = DQX.getRGB(0, 0, 0, 0.5 * alpha);
          for (var i = view.start_snp, end = view.end_snp; i < end; ++i) {
            var snp = data.snps[i];
            if (!snp) continue;
            ctx.beginPath();
            ctx.moveTo(scale(i), 20);
            ctx.bezierCurveTo(scale(i), 10, scale(i + 0.5), 10, scale(i + 0.5), 0);
            ctx.bezierCurveTo(scale(i + 0.5), 10, scale(i + 1), 10, scale(i + 1), 20);
            ctx.closePath();
            ctx.fillStyle = DQX.getRGB(snp.rgb.r, snp.rgb.g, snp.rgb.b, alpha);
            ctx.lineWidth = snp.selected ? 2 : 1;
            ctx.fill();
            ctx.stroke();
            if (snp.selected) {
              ctx.beginPath();
              ctx.moveTo(scale(i), 20);
              ctx.lineTo(scale(i + 1), 20);
              ctx.lineTo(scale(i + 1), that.height());
              ctx.lineTo(scale(i), that.height());
              ctx.closePath();
              ctx.fillStyle = snp.col;
              ctx.fill();
            }
          }
        }     else
        //Text
        alpha = tween.manual(snp_width, 7, 10);
        if (alpha > 0) {
          var offset = 0;
          if (snp_width > 36)
            offset = -6;
          if (snp_width > 48)
            offset = -12;
          var e = tween.Easing.Linear.None;
          var font_size = tween.manual(snp_width, 7, 15, e, 5, 12);
          var angle = tween.manual(snp_width, 58, 68, e, -90, 0);
          var y = tween.manual(snp_width, 58, 68, e, 0, -24);
          var x = tween.manual(snp_width, 58, 68, e, 0, -24);
          ctx.font = "" + font_size + "px sans-serif";
          ctx.lineWidth = 2;
          ctx.strokeStyle = DQX.getRGB(0, 0, 0, alpha);
          ctx.textBaseline = 'middle';
          for (i = view.start_snp, end = view.end_snp; i < end; ++i) {
            snp = data.snps[i];
            if (!snp) continue;
            ctx.save();
            ctx.translate(scale(i + 0.5), 70);
            ctx.rotate((angle / 360) * (2 * Math.PI));
            if (snp.selected) {
              ctx.font = "bold " + font_size + "px sans-serif";
              ctx.fillStyle = DQX.getRGB(255, 255, 255, alpha);
            }
            else {
              ctx.font = "" + font_size + "px sans-serif";
              ctx.fillStyle = DQX.getRGB(0, 0, 0, alpha);
            }
            if (snp.selected) ctx.strokeText(snp.mutation, x, y + offset);
            ctx.fillText(snp.mutation, x, y + offset);
            if (offset <= -6) {
              if (snp.selected) ctx.strokeText(snp.ref + '→' + snp.nonref, x, y + offset + 15);
              ctx.fillText(snp.ref + '→' + snp.nonref, x, y + offset + 15);
            }
            if (offset <= -12) {
              if (snp.selected) ctx.strokeText(snp.pos, x, y + offset + 30);
              ctx.fillText(snp.pos, x, y + offset + 30);
            }
            ctx.restore()
          }
        }

        ctx.lineWidth = 1;
        alpha = tween.manual(snp_width, 10, 20, e, 0, 0.50);
        if (alpha > 0) {
          ctx.strokeStyle = DQX.getRGB(0, 0, 0, alpha);
          for (i = view.start_snp, end = view.end_snp; i < end; ++i) {
            snp = data.snps[i];
            if (!snp) continue;
            ctx.moveTo(scale(i), that.height() + (view.genotypes.bounding_box.b - view.genotypes.bounding_box.t));
            ctx.lineTo(scale(i), 20);
          }
          ctx.moveTo(scale(data.snps.length), that.height() + (view.genotypes.bounding_box.b - view.genotypes.bounding_box.t));
          ctx.lineTo(scale(data.snps.length), 20);
          ctx.stroke();
        }
      };

      that._click = function (pos, view, data) {
        var snp = Math.floor(view.snp_scale.invert(pos.x));
        that.clickSNPCallback(snp);
      };
      return that;
    };
  }
);