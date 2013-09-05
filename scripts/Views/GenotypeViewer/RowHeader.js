define(["tween", "DQX/Utils", "Views/GenotypeViewer/AbsCanvasArea", "Views/GenotypeViewer/ColourAllocator"],
  function (tween, DQX, CanvasArea, ColourAllocator) {
    return function RowHeader(bounding_box) {
      var that = CanvasArea(bounding_box);
      that.colours = ColourAllocator()
      that._draw = function (ctx, view, data) {
        var row_height = Math.ceil(view.row_height);
        var g = ctx.createLinearGradient(0, 0, that.width(), 0);
        g.addColorStop(0, "rgba(255,255,255,0.85)");
        g.addColorStop(0.85, "rgba(255,255,255,0.85)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, that.width(), that.height());

        ctx.textBaseline = 'middle';
        ctx.fillStyle = DQX.getRGB(0, 0, 0);
        var y_off = view.scroll_pos;

        data.samples.forEach(function(sample) {
          ctx.fillStyle = DQX.getRGB(that.colours.get(sample.SampleContext.Site.Name), 0.75);
          ctx.fillRect(sample.depth * 5, sample.vert + y_off, 5, row_height);
        });

        ctx.fillStyle = '#000';
        data.sample_and_label_list.forEach(function (label) {
          if (label.is_sample) {
            ctx.font = "" + row_height - 2 + "px sans-serif";
          }
          else
            ctx.font = "12px sans-serif";
          if (row_height > 6 || !label.is_sample)
            ctx.fillText(label.display_name, label.depth * 5, label.vert + y_off + (row_height / 2));
        });
      };
      return that;
    };
  }
);