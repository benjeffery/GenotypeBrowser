define(["tween", "DQX/Utils", "Views/GenotypeViewer/AbsCanvasArea"],
  function (tween, DQX, AbsCanvasArea) {
    return function ColumnHeader(bounding_box, clickSNPCallback) {
      var that = AbsCanvasArea(bounding_box);
      that.clickSNPCallback = clickSNPCallback;

      that._draw = function (ctx, view, data) {
        var scale = view.snp_scale;
        var snp_width = scale(1) - scale(0);
        var snps = data.snp_cache.snps;
        var pos = data.snp_cache.snp_positions;
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
            ctx.beginPath();
            ctx.moveTo(scale(i), 20);
            ctx.bezierCurveTo(scale(i), 10, scale(i + 0.5), 10, scale(i + 0.5), 0);
            ctx.bezierCurveTo(scale(i + 0.5), 10, scale(i + 1), 10, scale(i + 1), 20);
            ctx.closePath();
            ctx.fillStyle = "#000"//TODODQX.getRGB(snp.rgb.r, snp.rgb.g, snp.rgb.b, alpha);
            ctx.lineWidth = snp.selected ? 2 : 1;
            ctx.fill();
            ctx.stroke();
            if (_.contains(view.selected_snps, i)) {
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
          var asc = String.fromCharCode;
          for (i = view.start_snp, end = view.end_snp; i < end; ++i) {
            //TODO Don't need to do this - just iterate over selected
            var snp_selected = _.contains(view.selected_snps, i);
            ctx.save();
            ctx.translate(scale(i + 0.5), 70);
            ctx.rotate((angle / 360) * (2 * Math.PI));
            if (snp_selected) {
              ctx.font = "bold " + font_size + "px sans-serif";
              ctx.fillStyle = DQX.getRGB(255, 255, 255, alpha);
            }
            else {
              ctx.font = "" + font_size + "px sans-serif";
              ctx.fillStyle = DQX.getRGB(0, 0, 0, alpha);
            }
            //NO MUTATION NAMES FROM VCF
//            if (snp_selected) ctx.strokeText(snp.mutation, x, y + offset);
//            ctx.fillText(snp.mutation, x, y + offset);
            if (offset <= -6) {
              if (snp_selected) ctx.strokeText(asc(snps.ref[i]) + '→' + asc(snps.alt[i]), x, y + offset + 15);
              ctx.fillText(asc(snps.ref[i]) + '→' + asc(snps.alt[i]), x, y + offset + 15);
            }
            if (offset <= -12) {
              if (snp_selected) ctx.strokeText(snp[i], x, y + offset + 30);
              ctx.fillText(pos[i], x, y + offset + 30);
            }
            ctx.restore()
          }
        }

        //Full length lines
        ctx.lineWidth = 1;
        alpha = tween.manual(snp_width, 10, 20, e, 0, 0.50);
        if (alpha > 0) {
          ctx.strokeStyle = DQX.getRGB(0, 0, 0, alpha);
          for (i = view.start_snp, end = view.end_snp; i < end; ++i) {
            ctx.moveTo(scale(i), that.height() + (view.stack.bounding_box.b - view.stack.bounding_box.t));
            ctx.lineTo(scale(i), 20);
          }
          ctx.moveTo(scale(snps.length), that.height() + (view.stack.bounding_box.b - view.stack.bounding_box.t));
          ctx.lineTo(scale(snps.length), 20);
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