define(["lodash", "Views/GenotypeViewer/AbsCanvasArea"],
  function (_, AbsCanvasArea) {
    return function CanvasStack(bounding_box, elements) {
      var that = AbsCanvasArea(bounding_box, elements);
      that.elements = elements;

      that.draw = function(ctx) {
        var draw_args = arguments;
        ctx.save();
        ctx.translate(that.bounding_box.l, that.bounding_box.t);
        var used_height = 0;
        _(that.elements).forEach(function(element) {
          ctx.save();
          ctx.translate(0, used_height);
          used_height += element._draw.apply(that, draw_args);
          ctx.restore();
        });
        ctx.restore();
      };

      //TODO....
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