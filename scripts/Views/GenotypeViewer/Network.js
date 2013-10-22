define(["d3", "DQX/Utils"],
  function (d3, DQX) {
    return function Network(data,view) {
      var that = {};
      that.data = data;
      that.view = view;
      that.last_clip = {l:0, t:0, r:0, b:0};
      that.last_selection = [];
      that.last_samples = '';
      that.svg = null;

      that.nodes = [];
      that.links = [];

      that.tick = function () {
        that.svg.selectAll(".link").attr("x1", function(d) { return d.source.x; })
          .attr("y1", function(d) { return d.source.y; })
          .attr("x2", function(d) { return d.target.x; })
          .attr("y2", function(d) { return d.target.y; })
          .style("stroke", function(d) {return d.distance > 0 ? 'rgba(255,0,0,0.75)' : 'rgba(0,0,255,0.5)'});

        that.svg.selectAll(".node").attr("cx", function(d) { return d.x; })
          .attr("cy", function(d) { return d.y; });
      };

      that.snp_distance = function(selected, a, b) {
        var count = 0;
        for (var i = 0; i < selected.length; i++) {
          if (a[selected[i]] != b[selected[i]])
            count++;
        }
        return count;
      };

      that.draw = function (ctx, clip) {
        var view = that.view;
        var data = that.data;
        var genotypes = data.snp_cache.genotypes;
        var samples = data.samples;
        var x_scale = view.snp_scale;
        var start_snp = Math.floor(x_scale.domain()[0]);
        var end_snp = Math.ceil(x_scale.domain()[1]);

        var samp_list = _(samples).sortBy().reduce(function(sum, num) { return sum + num;});
        var selected_list = _(view.selected_snps).sortBy().reduce(function(sum, num) { return '' + sum + num;});
        if (samp_list != that.last_samples || selected_list != that.last_selection) {
          that.nodes = data.samples;
          that.links = [];
          var to_process = [0];
          var ignore = [];
          while (to_process.length > 0) {
            var i = to_process.shift();
            if (_(ignore).contains(i))
              continue;
            for (var j = i + 1; j < samples.length; j++) {
              if (_(ignore).contains(j))
                continue;
              var distance = that.snp_distance(view.selected_snps,  genotypes[i].gt, genotypes[j].gt)*75;
              if (distance == 0) {
                //Identical sample, ignore in future and remove all existing links
                ignore.push(j);
                that.links = _(that.links).reject({source:j}).reject({target:j}).value();
              }
              that.links.push({
                source: i,
                target: j,
                distance: distance});
              if (distance > 0 && !_(to_process).contains(j))
                to_process.push(j);
            }
          }
          //Translate to actual objects from indices
          for (i = 0; i < that.links.length; i++) {
            that.links[i].source = samples[that.links[i].source];
            that.links[i].target = samples[that.links[i].target];
          }


          var canvas = ctx.canvas;
          if (!that.svg) {
            that.svg = d3.select(ctx.canvas.parentNode).append("svg")
              .style("position","absolute");

            that.force = d3.layout.force()
              .on("tick", that.tick)
              .linkDistance(function (link) {return link.distance + 0;})
              .charge(-150);
          }
          that.svg.attr("width", canvas.width)
            .attr("height", canvas.height)
            .style("left", -clip.l)
            .style("top", -clip.t);

          var link = that.svg.selectAll(".link"),
            node = that.svg.selectAll(".node");

          // Update the links…
          link = link.data(that.links, function(d) { return d.source.ID + d.target.ID; });
          // Exit any old links.
          link.exit().remove();
          // Enter any new links.
          link.enter().insert("line", ".node")
            .attr("class", "link")
            .attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });

          // Update the nodes…
          node = node.data(that.nodes, function(d) { return d.ID; })//.style("fill", color);
          // Exit any old nodes.
          node.exit().remove();
          // Enter any new nodes.
          node.enter().append("circle")
            .attr("class", "node")
            .attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; })
            .attr("r", "10")//function(d) { return Math.sqrt(d.size) / 10 || 4.5; })
            .style("fill", function(d) { return DQX.getRGB(view.colours.get(d.SampleContext.Site.Name), 0.75)})
            //.on("click", click)
            .call(that.force.drag);

          that.force
            .size([canvas.width, canvas.height])
            .nodes(that.nodes)
            .links(that.links)
            .start();
        }

        that.last_samples = samp_list;
        that.last_selection = selected_list;
      };
      that.event = function(){};
      return that;
    };
  }
);

