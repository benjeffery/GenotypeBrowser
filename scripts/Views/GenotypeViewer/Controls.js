define(["DQX/Utils", "Views/GenotypeViewer/CanvasArea"],
    function (DQX, CanvasArea) {
        return function Controls(bounding_box, callbacks) {
            var that = CanvasArea(bounding_box);
            that.callbacks = callbacks;

            that.images = {};
            var images = ["MagGlassIn", "MagGlassOut", "MagGlassAll"];
            images.forEach(function(name) {
                var img = new Image();
                img.src = "Bitmaps/Icons/Canvas/"+ name +".png"
                that.images[name] = img;
            });

            that.buttons = {
                zoom_in: {img:'MagGlassIn', l:0, t:22},
                zoom_out: {img: 'MagGlassOut', l:30, t:22},
                zoom_all: {img: 'MagGlassAll', l:60, t:22}
            };

            that._draw = function(ctx, view, data) {
                var w = that.width();
                var h = that.height();
                var g = ctx.createRadialGradient(w, h, w, w, h, 0);
                g.addColorStop(0.85, "rgba(255,255,255,0.85)");
                g.addColorStop(1, "rgba(255,255,255,0)");
                ctx.fillStyle = g;
                ctx.fillRect(0, 0, w, h);
                ctx.textBaseline = 'top';
                ctx.font = "bold " + 14 + "px sans-serif";
                ctx.strokeStyle = DQX.getRGB(255,255,255);
                ctx.fillStyle = DQX.getRGB(0,0,0);
                var text = (view.end_snp - view.start_snp) + DQX.pluralise('snp', (view.end_snp - view.start_snp));
                ctx.strokeText(text, 5, 5);
                ctx.fillText(text, 5, 5);
                for (var key in that.buttons) {
                    var button = that.buttons[key];
                    ctx.drawImage(that.images[button.img], button.l, button.t, 30, 30);
                }
            };

            that._click = function(pos, view, data) {
                if (pos.x < 30)
                    that.callbacks.zoom_in();
                else if (pos.x < 60)
                    that.callbacks.zoom_out();
                else
                    that.callbacks.zoom_all();
            };

            return that;
        }
    }
);
