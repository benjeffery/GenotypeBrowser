define(["tween", "DQX/Utils", "Views/GenotypeViewer/CanvasArea"],
    function (tween, DQX, CanvasArea) {
        return function GeneMap(bounding_box, clickSNPCallback) {
            var that = CanvasArea(bounding_box);
            that.clickSNPCallback = clickSNPCallback;

            that.formatSI = function(number) {
                var prefix = d3.formatPrefix(parseFloat(number));
                return prefix.scale(number) + prefix.symbol;
            };

            that._draw = function(ctx, view, data) {
                var scale = view.genome_scale;
                var snp_scale = view.snp_scale;

                ctx.fillStyle = "rgba(255,255,255,0.85)";
                ctx.fillRect(0, 0, that.width(), that.height());

                //Scale ticks
                var ticks = scale.ticks(that.width() / 100);
                ctx.beginPath();
                ticks.forEach(function(tick) {
                    ctx.moveTo(scale(tick),12);
                    ctx.lineTo(scale(tick),25);
                });
                ctx.strokeStyle = '#000';
                ctx.stroke();
                //Scale numbers
                ctx.fillStyle = "#000";
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ticks.forEach(function(tick) {
                    ctx.fillText(that.formatSI(tick), scale(tick),2);
                });
                //Annotation rectangles
                ctx.fillStyle = "rgba(0,153,0,0.50)";
                data.annotations.forEach(function (annot) {
                   DQX.roundedRect(ctx, scale(annot.start), 25, scale(annot.width)-scale(0), 15, 6);
                   ctx.fill();
                });
                //Curves from gene scale to SNP scale
                data.snps.forEach(function(snp, i) {
                    ctx.strokeStyle = snp.col;
                    ctx.lineWidth = snp.selected ? 2 : 1;
                    ctx.beginPath();
                    ctx.moveTo(scale(snp.pos), 50);
                    ctx.bezierCurveTo(scale(snp.pos), 75, snp_scale(i+0.5), 75, snp_scale(i+0.5), 100);
                    ctx.stroke();
                });
                //SNP Triangles and line on genome
                ctx.strokeStyle = "rgba(0,0,0,0.50)";
                ctx.fillStyle = "rgba(0,152,0,0.50)";
                data.snps.forEach(function(snp) {
                    ctx.beginPath();
                    ctx.moveTo(scale(snp.pos), 25);
                    ctx.lineTo(scale(snp.pos), 40);
                    ctx.lineWidth = snp.selected ? 2 : 1;
                    ctx.stroke();
                    DQX.polyStar(ctx, scale(snp.pos), 47, 7, 3, 0, -90);
                    ctx.fill();
                    ctx.stroke();
                });

                ctx.save()
                ctx.strokeStyle = "rgba(0,0,0,0.75)";
                if ( ctx.setLineDash !== undefined )   ctx.setLineDash([10,5]);
                if ( ctx.mozDash !== undefined )       ctx.mozDash = [10,5];
                var view_width = scale.domain()[1] - scale.domain()[0];
                ctx.lineWidth = 2;
                data.snps.forEach(function(snp, i) {
                    if (i > 0) {
                        if (snp.pos - data.snps[i-1].pos > 0.2*view_width) {
                            var pos = (snp.pos + data.snps[i-1].pos) / 2;
                            ctx.beginPath();
                            ctx.moveTo(scale(pos), 25);
                            ctx.lineTo(scale(pos), 40);
                            ctx.bezierCurveTo(scale(pos), 75, snp_scale(i), 75, snp_scale(i), 100);
                            ctx.stroke();
                        }
                    }
                });
                ctx.restore();

                ctx.font = "bold 12px sans-serif";
                ctx.lineWidth = 2;
                ctx.strokeStyle = DQX.getRGB(0,0,0,1);
                ctx.fillStyle = DQX.getRGB(255,255,255,1);
                ctx.textAlign = 'left';
                data.annotations.forEach(function (annot) {
                    ctx.strokeText(annot.name, scale(annot.start), 25, scale(annot.width)-scale(0));
                    ctx.fillText(annot.name, scale(annot.start), 25, scale(annot.width)-scale(0));
                });
            };
            that._click = function(pos, view, data) {
                var canvas = document.createElement('canvas');
                canvas.width = that.width();
                canvas.height = that.height();
                var ctx = canvas.getContext('2d');
                var scale = view.genome_scale;
                data.snps.forEach(function(snp, i) {
                    DQX.polyStar(ctx, scale(snp.pos), 47, 7, 3, 0, -90);
                    var col = DQX.getRGB(i+10%255, Math.floor(((i+10)%(255*255))/255), Math.floor((i+10)/(255*255)));
                    ctx.strokeStyle = col;
                    ctx.fillStyle = col;
                    ctx.fill();
                    ctx.stroke();
                });
                var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                var index = (pos.x + pos.y * imageData.width) * 4;
                var snp_index = imageData.data[index+0]-10;
                snp_index += imageData.data[index+1] * 255;
                snp_index += imageData.data[index+2] * 255 * 255;
                if (snp_index >= 0 && snp_index < data.snps.length)
                    that.clickSNPCallback(snp_index);
            };
            return that;
        };
    }
);



