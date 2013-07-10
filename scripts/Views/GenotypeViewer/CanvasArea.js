define([],
    function () {
        return function CanvasArea(bounding_box) {
            var that = {};
            that.bounding_box = bounding_box;
            that.contains = function(point) {
                var bb = that.bounding_box;
                return (point.x < bb.r) && (point.x >= bb.l) && (point.y < bb.b) && (point.y >= bb.t);
            };
            that.width = function() {
                return that.bounding_box.r - that.bounding_box.l;
            };
            that.height = function() {
                return that.bounding_box.b - that.bounding_box.t;
            };
            that.draw = function(ctx) {
                ctx.save();
                ctx.translate(that.bounding_box.l, that.bounding_box.t);
                that._draw.apply(that, arguments);
                ctx.restore();
            };
            that.click = function(pos) {
                if (that.contains(pos)) {
                    arguments[0] = {x: pos.x - that.bounding_box.l, y: pos.y - that.bounding_box.t};
                    if (that._click)
                        that._click.apply(that, arguments);
                }
            };

            return that;
        };
    }
);
