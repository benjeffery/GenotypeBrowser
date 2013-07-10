define(["require", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/Utils", "DQX/ChannelPlot/ChannelCanvas", "DQX/ChannelPlot/GenomePlotter", "DQX/DataFetcher/DataFetchers"],
    function (require, Framework, Controls, Msg, DQX, ChannelCanvas, GenomePlotter, DataFetchers) {

        var GenomeBrowserSNPChannel = {

            SNPChannel: function (iFetcher, idataLoci) {
                var that = ChannelCanvas.Base("PositionsSNPs");
                that.myFetcher = iFetcher;
                that.setTitle('[@ChannelSNPs]');
                that._height = 20;
                that._pointsX = [];
                that._pointsIndex = [];

                that.draw = function (drawInfo, args) {
                    var PosMin = Math.round((-50 + drawInfo.offsetX) / drawInfo.zoomFactX);
                    var PosMax = Math.round((drawInfo.sizeCenterX + 50 + drawInfo.offsetX) / drawInfo.zoomFactX);

                    this.drawStandardGradientCenter(drawInfo, 1);
                    this.drawStandardGradientLeft(drawInfo, 1);
                    this.drawStandardGradientRight(drawInfo, 1);

                    //Draw SNPs
                    this.myFetcher.IsDataReady(PosMin, PosMax, false);
                    var points = this.myFetcher.getColumnPoints(PosMin, PosMax, "snpid");
                    var xvals = points.xVals;
                    drawInfo.centerContext.fillStyle = DQX.Color(1.0, 0.75, 0.0).toStringCanvas();
                    drawInfo.centerContext.strokeStyle = DQX.Color(0.0, 0.0, 0.0).toString();
                    this._pointsX = [];
                    var pointsX = this._pointsX;
                    this._pointsIndex = [];
                    var pointsIndex = this._pointsIndex;
                    this.startIndex = points.startIndex;

                    var psxLast = null;
                    for (var i = 0; i < xvals.length; i++) {
                        var x = xvals[i];
                        var psx = Math.round(x * drawInfo.zoomFactX - drawInfo.offsetX) + 0.5;
                        if (Math.abs(psx-psxLast)>0.9) {
                            pointsX.push(psx); pointsIndex.push(i + points.startIndex);
                            var psy = 4.5;
                            drawInfo.centerContext.beginPath();
                            drawInfo.centerContext.moveTo(psx, psy);
                            drawInfo.centerContext.lineTo(psx + 4, psy + 8);
                            drawInfo.centerContext.lineTo(psx - 4, psy + 8);
                            drawInfo.centerContext.lineTo(psx, psy);
                            drawInfo.centerContext.fill();
                            drawInfo.centerContext.stroke();
                            psxLast = psx;
                        }
                    }

                    this.drawMark(drawInfo);
                    this.drawXScale(drawInfo);
                    this.drawTitle(drawInfo);
                }


                that.getToolTipInfo = function (px, py) {
                    if ((py >= 0) && (py <= 20)) {
                        var pointsX = this._pointsX;
                        var pointsIndex = this._pointsIndex;
                        var mindst = 12;
                        var bestpt = -1;
                        for (var i = 0; i < pointsX.length; i++)
                            if (Math.abs(px - pointsX[i]) <= mindst) {
                                mindst = Math.abs(px - pointsX[i]);
                                bestpt = i;
                            }
                        if (bestpt >= 0) {
                            var info = { ID: 'SNP' + bestpt };
                            info.tpe = 'SNP';
                            info.px = pointsX[bestpt];
                            info.py = 13;
                            info.snpid = this.myFetcher.getColumnPoint(this.startIndex + bestpt, "snpid");
                            info.content = info.snpid + '<br>' +
                                           this.myFetcher.getColumnPoint(this.startIndex + bestpt, "MutName");
                            info.showPointer = true;
                            return info;
                        }
                    }
                    return null;
                }

                that.handleMouseClicked = function (px, py) {
                    var tooltipInfo = that.getToolTipInfo(px, py);
                    if (tooltipInfo) {
                        if (tooltipInfo.tpe == 'SNP')
                            Msg.send({ type: 'ShowSNPPopup' }, tooltipInfo.snpid);
                    }
                }

                return that;
            },


            LocusChannel: function (iFetcher, idataLoci) {
                var that = ChannelCanvas.Base("PositionsLoci");
                that.myFetcher = iFetcher;
                that.setTitle('[@channelMarkerLoci]');
                that._height = 45;
                that._lociIndicators = [];

                //prepare loci information
                that.loci = [];
                that.metaData2 = idataLoci;
                for (var geneNr = 0; geneNr < that.metaData2.genes.length; geneNr++) {
                    var gene = that.metaData2.genes[geneNr];
                    for (var locusNr = 0; locusNr < gene.loci.length; locusNr++) {
                        var locusInfo = gene.loci[locusNr];
                        locusInfo.chromoid = locusInfo.GenomicRegion.split(':')[0];
                        var regionstr = locusInfo.GenomicRegion.split(':')[1];
                        if (regionstr.indexOf('-') > 0) {
                            locusInfo.start = parseInt(regionstr.split('-')[0]);
                            locusInfo.stop = parseInt(regionstr.split('-')[1]);
                        }
                        else {
                            locusInfo.start = parseInt(regionstr);
                            locusInfo.stop = locusInfo.start;
                        }
                        that.loci.push(locusInfo);
                    }
                }

                that.draw = function (drawInfo, args) {
                    var PosMin = Math.round((-50 + drawInfo.offsetX) / drawInfo.zoomFactX);
                    var PosMax = Math.round((drawInfo.sizeCenterX + 50 + drawInfo.offsetX) / drawInfo.zoomFactX);

                    this.drawStandardGradientCenter(drawInfo, 1);
                    this.drawStandardGradientLeft(drawInfo, 1);
                    this.drawStandardGradientRight(drawInfo, 1);

                    //Draw Loci
                    var H = 8;
                    //                    var backgrad1 = drawInfo.centerContext.createLinearGradient(0, 0, 0, H);
                    //                    backgrad1.addColorStop(0, "rgb(255,0,0)");
                    //                    backgrad1.addColorStop(1, "rgb(255,192,80)");
                    //                    drawInfo.centerContext.fillStyle = backgrad1;
                    drawInfo.centerContext.fillStyle = DQX.Color(1.0, 0.0, 0.0).toString();
                    drawInfo.centerContext.strokeStyle = DQX.Color(0.0, 0.0, 0.0).toString();
                    var chromoid = this.getMyPlotter().getCurrentChromoID();
                    if (!chromoid)
                        return;
                    this._lociIndicators = [];
                    var slots = [];
                    for (var slotnr = 0; slotnr < 10; slotnr++) slots.push(-1e99);
                    for (var i = 0; i < this.loci.length; i++) {
                        var locus = this.loci[i];
                        if (locus.chromoid == chromoid) {
                            var psx1 = Math.round((locus.start - 0.5) * drawInfo.zoomFactX - drawInfo.offsetX);
                            var psx2 = Math.round((locus.stop + 0.5) * drawInfo.zoomFactX - drawInfo.offsetX);
                            if (psx2 - psx1 < 4) {
                                var cnt = (psx1 + psx2) / 2;
                                psx1 = cnt - 2;
                                psx2 = cnt + 2;
                            }
                            for (var slotnr = 0; slotnr < 10; slotnr++)
                                if (slots[slotnr] < psx1)
                                    break;
                            var psy = 3 + (H + 2) * slotnr;
                            drawInfo.centerContext.beginPath();
                            drawInfo.centerContext.rect(Math.round(psx1) + 0.5, Math.round(psy) + 0.5, Math.round(psx2 - psx1), H);
                            drawInfo.centerContext.fill();
                            drawInfo.centerContext.stroke();
                            slots[slotnr] = psx2 + 3;
                            this._lociIndicators.push({
                                psx1: psx1, psy1: psy,
                                psx2: psx2, psy2: psy + H,
                                info: locus
                            });
                        }
                    }

                    this.drawMark(drawInfo);
                    this.drawXScale(drawInfo);
                    this.drawTitle(drawInfo);
                }


                that.getToolTipInfo = function (px, py) {
                    //try as locus
                    for (var i = 0; i < this._lociIndicators.length; i++) {
                        if ((px >= this._lociIndicators[i].psx1) && (py >= this._lociIndicators[i].psy1) && (px <= this._lociIndicators[i].psx2) && (py <= this._lociIndicators[i].psy2)) {
                            var info = this._lociIndicators[i].info;
                            return {
                                tpe: 'Locus',
                                ID: 'Locus' + i,
                                locusID: info.LocusID,
                                content: "{tpe} '{name}' in gene '{gene}'".DQXformat({
                                    tpe: ((info.LocusType == 'HAPLO') ? 'Haplotype' : 'Aminoacid'),
                                    name: info.Name,
                                    gene: info.GeneName
                                }),
                                px: this._lociIndicators[i].psx1,
                                py: this._lociIndicators[i].psy1 + 2,
                                showPointer: true
                            }
                        }
                    }
                    return null;
                }

                that.handleMouseClicked = function (px, py) {
                    var tooltipInfo = that.getToolTipInfo(px, py);
                    if (tooltipInfo) {
                        if (tooltipInfo.tpe == 'Locus') {
                            Msg.send({ type: 'ShowLocus' }, tooltipInfo.locusID);
                        }
                    }
                }
                return that;
            }
        };


        return GenomeBrowserSNPChannel;
    });