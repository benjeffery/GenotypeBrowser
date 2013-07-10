define(["tween", "DQX/Utils", "Views/GenotypeViewer/CanvasArea"],
    function (tween, DQX, CanvasArea) {
        return function RowHeader(bounding_box) {
            var that = CanvasArea(bounding_box);

            that._draw = function(ctx, view, data) {
                var row_height = Math.ceil(view.row_height);
                var g = ctx.createLinearGradient(0, 0, that.width(), 0);
                g.addColorStop(0, "rgba(255,255,255,0.85)");
                g.addColorStop(0.85, "rgba(255,255,255,0.85)");
                g.addColorStop(1, "rgba(255,255,255,0)");
                ctx.fillStyle = g;
                ctx.fillRect(0, 0, that.width(), that.height());

                ctx.textBaseline = 'middle';
                ctx.fillStyle = DQX.getRGB(0,0,0);
                var y_off = view.scroll_pos;
                data.sample_and_label_list.forEach(function(label) {
                    if (label.is_sample)
                        ctx.font = "" + row_height-2 + "px sans-serif";
                    else
                        ctx.font = "12px sans-serif";
                    if (row_height > 6 || !label.is_sample)
                        ctx.fillText(label.display_name, label.depth*5, label.vert + y_off + (row_height/2));
                });
            };
            return that;
        };
    }
);