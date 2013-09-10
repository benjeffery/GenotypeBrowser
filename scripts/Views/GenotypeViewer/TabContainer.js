define(["lodash", "DQX/Utils"],
  function (_, DQX) {
    return function TabContainer(contents) {
      var that = {};
      that.contents = contents;
      that.contents.forEach(function (element) {
        element.t || (element.t = 0);
        element.l || (element.l = 0);
      });
      that.active_element = that.contents[0];
      that.contents = DQX.attrMap(that.contents, 'name');

      that.draw = function(ctx, clip) {
        var element = that.active_element;
        ctx.save();
        ctx.translate(element.l, element.t);
        element.content.draw(ctx, {
          t: clip.t - element.t,
          l:clip.l - element.l,
          b:clip.b - element.t,
          r:clip.r - element.l
        });
        ctx.restore();
      };

      that.event = function(type, ev, offset) {
        return that.active_element.content.event(
          type,
          ev,
          {x:that.active_element.l+offset.x, y:that.active_element.t+offset.y});
      };

      return that;
    };
  }
);
