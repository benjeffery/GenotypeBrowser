define(["require", "DQX/Application", "DQX/Framework", "DQX/Msg", "DQX/Utils", "DQX/DocEl", "DQX/Controls",
  "DQX/SQL", "DQX/SVG", "DQX/FramePanel", "DQX/FrameTree", "DQX/FrameList", "DQX/DataFetcher/DataFetchers", "DQX/DataFetcher/DataFetcherSnpAsync", "DQX/DataFetcher/DataFetcherAnnotation",
  "Wizards/WizardSelectSamples", "Views/GenotypeViewer/GenotypeViewer", "Common", "MetaData"],
  function (require, Application, Framework, Msg, DQX, DocEl, Controls, SQL, SVG, FramePanel, FrameTree, FrameList, DataFetcher, DataFetcherSnp, DataFetcherAnnotation, WizardSelectSamples, GenotypeViewer, Common, MetaData) {
    var SampleBrowserModule = {

      init: function () {
        var that = Application.View(
          'browser',
          'Genotype Browser'
        );
        that.fetcher = new DataFetcherSnp.Fetcher(serverUrl, MetaData.genotypeDataSource);
        that.annotation_fetcher = new DataFetcherAnnotation.Fetcher({
          serverURL: serverUrl,
          database: MetaData.database,
          annotTableName: MetaData.tableAnnotation,
          chromnrfield: 'chrom'
        });

        that.createFrames = function (rootFrame) {
          rootFrame.makeGroupHor();
          rootFrame.setSeparatorSize(6);

          var frameListsLeft = this.getFrame().addMemberFrame(Framework.FrameGroupVert('', 0.3));

          this.frameSelectSamples = frameListsLeft.addMemberFrame(Framework.FrameFinal('GenotypesSelectSamples', 0.5))
            .setMargins(5).setAllowSmoothScrollY();

//                    this.frameSelectSamples.InsertIntroBox('Icons/Medium/GenotypeBrowser.png', DQX.Text('IntroGenotypesView'), 'Doc/Genotypes/Help.htm');

          this.frameBrowser = this.getFrame().addMemberFrame(Framework.FrameFinal('GenotypesBrowser', 0.7))
            .setMargins(0).setAllowScrollBars(false, false);

//                    require("Common").addToolGene("GeneBrowseGenoTypes", "Show public genotypes", "Icons/Medium/GenotypeBrowser.png", function (args) {
//                        that.jumpGene(args);
//                    });

        };

        that.annotationProvider = function (chrom, start, end, callback) {
          that.annotation_fetcher.setChromoID(chrom);
          that.annotation_fetcher._fetchRange(start, end,
            function (annotations) {
              callback(chrom, start, end, annotations);
            },
            function () {
              callback(chrom, start, end, null);
            }
          );
        };

        that.getGenotypes = function (chrom, start, end, snps, samples, callback) {
          if (samples.length > 0 && snps.length > 0) {
            //DQX.setProcessing('Fetching...');
            var sample_ids = samples.map(DQX.attr('ID'));
            that.fetcher.fetch(chrom, start, end, sample_ids, function (data) {
                if (data) {
                  //console.time("Insert SNPs");
                  snps.forEach(function (snp, i) {
                    snp.genotypes = [];
                  });
                  sample_ids.forEach(function (sample_id) {
                    var sample_data = data.sample_data[sample_id];
                    snps.forEach(function (snp, i) {
                      snp.genotypes.push({
                        alt: sample_data.CovA[i],
                        ref: sample_data.CovD[i],
                        gt: sample_data.CovA[i] >= sample_data.CovD[i] ? (sample_data.CovA[i] >= 5 ? 1 : 0) : 0
                      });
                    });
                  });
                  //Set colours for the snps
                  var len = samples.length;
                  snps.forEach(function (snp, i) {
                    snp.col = {r: 0, g: 0, b: 0};
                    snp.genotypes.forEach(function (genotype, i) {
                      var col = SVG.genotype_rgb(genotype.ref, genotype.alt);
                      genotype.pixel = [col.r, col.g, col.b];
                      var col_snp = snp.col;
                      col_snp.r += col.r;
                      col_snp.g += col.g;
                      col_snp.b += col.b;
                    });
                    snp.col.r /= len;
                    snp.col.g /= len;
                    snp.col.b /= len;
                    snp.rgb = snp.col;
                    snp.col = DQX.getRGB(snp.col.r, snp.col.g, snp.col.b, 0.75)
                  });
                  callback(chrom, start, end, snps);
                  //console.timeEnd("Insert SNPs");
                } else {
                  //We had a error getting the genotypes, returning null will mean this gets retried next time.
                  callback(chrom, start, end, null);
                }
              //  DQX.stopProcessing();
              });
          } else {
            callback(chrom, start, end, []);
          }
        };
        that.snpProvider = function (chrom, start, end, samples, callback) {
          var fetcher = DataFetcher.RecordsetFetcher(serverUrl, MetaData.database, MetaData.tableSNPInfo);
          //fetcher.setMaxResultCount(1001);
          fetcher.addColumn('num', 'IN');
          fetcher.addColumn('snpid', 'ST');
          fetcher.addColumn('MutName', 'ST');
          fetcher.addColumn('pos', 'IN');
          fetcher.addColumn('ref', 'ST');
          fetcher.addColumn('nonrref', 'ST');
          fetcher.addColumn('ancestral', 'ST');
      //    DQX.setProcessing("Downloading...");
          var q = SQL.WhereClause.AND();
          q.addComponent(SQL.WhereClause.CompareFixed('chrom', '=', MetaData.chrom_map[chrom].idx));
          q.addComponent(SQL.WhereClause.CompareFixed('pos', '>=', start));
          q.addComponent(SQL.WhereClause.CompareFixed('pos', '<', end));
          fetcher.getData(q, "pos",
            function (data) {
              var snps = [];
              for (var i = 0; i < data.snpid.length; i++) {
                snps.push(
                  {
                    chrom: chrom,
                    num: data.num[i],
                    id: data.snpid[i],
                    mutation: data.MutName[i],
                    pos: data.pos[i],
                    ref: data.ref[i],
                    nonref: data.nonrref[i],
                    ancestral: data.ancestral[i]
                  }
                )
              }
         //     DQX.stopProcessing();
              that.getGenotypes(chrom, start, end, snps, samples, callback);
            },
            DQX.createMessageFailFunction()
          );
        };


        that.createPanels = function () {
          this.ctrls = {};
          this.controlPanel = Framework.Form(this.frameSelectSamples);
          this.ctrls.textSamples = Controls.Html('SampleBrowserActiveSamples', '<i><b>No samples</b></i>');
          this.controlPanel.addControl(this.ctrls.textSamples);
          var table = Controls.CompoundGrid();
//                    table.setItem(0,0,Controls.Button("SampleBrowserSelectSamples", {
//                            buttonClass: 'DQXToolButton1',
//                            width: 80,
//                            height: 28,
//                            content: '<img class="DQXFLeft" height=28px src="Bitmaps/study2.png"><div class="DQXFLeft">Select<br>samples</div>' }))
//                        .setOnChanged($.proxy(this.promptSamples, this));
//                    table.setItem(0,1,this.ctrls.textSamples);
          table.setItem(0, 0, Controls.Button("SampleBrowserSelectGene", {
              width: 80,
              height: 31,
              buttonClass: 'DQXToolButton1',
              bitmap: "Bitmaps/dna3.png",
              content: 'Select gene' }))
            .setOnChanged($.proxy(this.promptGene, this));
          this.ctrls.textGene = Controls.Html('SampleBrowserActiveGene', '<i><b>No gene</b></i>');
          table.setItem(0, 1, this.ctrls.textGene);
          this.controlPanel.addControl(table);
          this.ctrls.activeGene = Controls.Html('SampleBrowserQueryGeneActiveGene', '');
          this.controlPanel.addControl(this.ctrls.activeGene);

          var compress = Controls.Check('Compress', {label: 'Compress', value: false});
          this.controlPanel.addControl(compress);
          var cluster = Controls.Check('Cluster', {label: 'Cluster', value: false});
          this.controlPanel.addControl(cluster);

          this.controlPanel.render();

          var gv = this.genotypeViewer = GenotypeViewer(this.frameBrowser, that.snpProvider, that.annotationProvider);
          compress.setOnChanged(function () {
            gv.modify_compress(compress.getValue())
          });
          cluster.setOnChanged(function () {
            gv.modify_cluster(cluster.getValue())
          });

          //TODO This shouldn't be a hardcode
          //var samp_names = ['PF0004-C','PF0007-C','PF0009-C','PF0010-C','PF0011-C','PF0016-C','PF0021-C','PF0022-C','PF0024-C','PF0025-C','PF0026-C','PF0028-C','PF0029-C','PF0035-C','PF0036-C','PF0038-C','PF0039-C','PF0040-C','PF0042-C','PF0043-C','PF0191-C','PF0192-C','PF0193-C','PF0195-C','PF0196-C','PF0199-C','PF0202-C','PF0398-C','PF0399-C','PF0400-C','PF0401-C','PF0404-C','PF0405-C','PF0406-C','PF0407-C','PF0409-C','PF0410-CW','PF0411-C','PF0412-C','PF0298-C','PF0299-C','PF0301-C','PF0304-C','PF0305-C','PF0308-C','PF0309-C','PF0310-C','PF0311-C','PF0318-C','PF0321-C','PF0325-C','PF0326-C','PF0327-C','PF0388-C','PF0389-C','PF0393-CW','PF0260-C','PF0261-C','PF0262-C','PF0263-C','PF0264-C','PF0267-C','PF0269-C','PF0270-C','PF0272-C','PF0274-C','PF0276-C','PF0278-C','PF0279-C','PF0280-C','PF0281-C','PF0282-C','PA0007-C','PA0008-C','PA0011-C','PA0012-C','PA0015-C','PA0016-C','PA0017-C','PA0018-C','PA0020-C','PA0021-C','PA0022-C','PA0026-C','PA0027-C','PA0029-C','PA0030-C','PA0032-C','PA0034-C','PA0035-C','PA0036-C','PA0037-C','PA0038-C','PA0039-C','PA0040-C','PA0041-C','PA0042-C','PA0044-C','PA0045-C','PA0046-C','PA0047-C','PA0049-C','PA0050-C','PA0051-C','PA0052-C','PA0053-C','PA0054-C','PA0056-C','PA0057-C','PA0064-C','PA0065-C','PA0066-C','PA0067-C','PA0068-C','PA0069-C','PA0071-C','PA0073-C','PA0074-C','PA0075-C','PA0078-C','PA0081-C','PA0084-C','PA0085-C','PA0091-C','PA0092-C','PA0093-C','PA0094-C','PA0097-C','PA0098-C','PA0099-C','PA0100-C','PA0101-C','PA0102-C','PA0104-C','PA0134-C','PA0137-C','PA0138-C','PA0140-C','PA0142-C','PA0144-C','PA0145-C','PA0146-C','PA0147-C','PA0148-C','PA0149-C','PA0150-C','PA0151-C','PA0152-C','PA0153-C','PA0154-C','PA0155-C','PA0156-C','PA0157-C','PA0158-C','PA0159-C','PA0160-C','PA0161-C','PA0163-C','PA0164-C','PA0165-C','PA0176-C','PA0177-C','PA0178-C','PA0179-C','PA0180-C','PA0181-C','PA0182-C','PA0183-C','PA0184-C','PA0185-C','PA0186-C','PA0187-C','PA0188-C','PA0189-C','PA0190-C','PA0191-C','PA0192-C','PA0193-C','PD0488-C','PD0489-C','PD0490-C','PD0491-C','PD0492-C','PD0493-C','PD0494-C','PD0495-C','PD0496-C','PD0497-C','PD0498-C','PD0499-C','PD0500-C','PD0501-C','PD0502-C','PD0503-C','PD0504-C','PD0505-C','PD0506-C','PD0507-C','PD0508-C','PD0510-C','PD0460-C','PD0461-C','PD0462-C','PD0464-C','PD0466-C','PD0467-C','PD0469-C','PD0470-C','PD0471-C','PD0472-C','PD0473-C','PD0474-C','PD0475-C','PD0476-C','PD0477-C','PD0478-C','PH0714-C','PH0716-C','PH0717-C','PH0718-C','PH0722-C','PH0723-C','PH0725-C','PH0731-C','PH0732-C','PH0733-C','PH0734-C','PH0735-C','PH0736-C','PH0738-C','PH0739-C','PH0742-C','PH0743-C','PH0745-C','PH0800-C','PH0801-C','PH0802-C','PH0805-C','PH0807-C','PH0810-C','PH0811-C','PH0813-C','PH0815-C','PH0817-C','PH0818-C','PH0819-C','PH0820-C','PH0821-C','PH0822-C','PH0823-C','PH0824-C','PH0825-C','PH0826-C','PH0828-C'];
          //this.sampleSet = samp_names.map(function(name) {
          //    return metaData2.samplesMap[name];
          //});
          //For now make samples all samples (limit 500)
          this.sampleSet = Application.prefetched.samples.filter(function (sample, i) {
            return (i < 500);
          });
          var content = "<i><b>{cnt} example samples are displayed</b></i>".DQXformat({ cnt: this.sampleSet.length }) + '<br>';
          this.ctrls.textSamples.modifyValue(content);
          this.genotypeViewer.setSamples(this.sampleSet);
          if (!this.geneID)
            this.jumpGene({geneid: "PF13_0248"});
        };
        that.promptSamples = function () {
          WizardSelectSamples.execute(function () {
            WizardSelectSamples.fetchSampleSet($.proxy(that.changeSampleSet, that));
          });
        };

        that.changeSampleSet = function (sampleSet) {
          this.sampleSet = sampleSet;
          var content = "<i><b>{cnt} samples are selected</b></i>".DQXformat({ cnt: this.sampleSet.length }) + '<br>';
          this.ctrls.textSamples.modifyValue(content);
          this.genotypeViewer.set_samples(this.sampleSet);
        }

        that.promptGene = function () {
          require("Wizards/WizardFindGene").execute(function () {
            that.geneID = WizardFindGene.resultGeneID;
            that.updateActiveGene();
          });
        };

        that.updateActiveGene = function () {
          if (this.geneID) {
            Common.fetchGeneData(this.geneID, $.proxy(this.handleShowGeneInfo, this));
          }
        };

        that.handleShowGeneInfo = function (data) {
          var content = "<b><i>" + data.fid + "</i></b>";
          content += "<br>" + data.chromid + ":" + data.fstart + "-" + data.fstop;
          this.geneinfo = {
            geneid: data.fid,
            chromid: data.chromid,
            start: parseInt(data.fstart),
            stop: parseInt(data.fstop)
          }
          //content += Common.GeneData2InfoTable(data);
          //content += Common.generateToolButtonsGene('GeneBrowseGenoTypes', function (handler) { handler(that.geneinfo); });
          this.ctrls.textGene.modifyValue(content);
          content = Common.GeneData2InfoTable(data);
          content += Common.generateToolButtonsGene('GeneBrowseGenoTypes', function (handler) {
            handler(that.geneinfo);
          });
          this.ctrls.activeGene.modifyValue(content);

          this.genotypeViewer.set_gene(this.geneinfo);
        };

        that.activateState = function (stateKeys) {
          var tabswitched = that.getFrame().makeVisible();
        }

        //Call this function to make the browser jump to a gene
        that.jumpGene = function (args) {
          DQX.requireMember(args, 'geneid');
          that.geneID = args.geneid;
          that.activateState();
          Common.fetchGeneData(args.geneid, $.proxy(this.handleShowGeneInfo, this));
        };

        return that;
      }
    };
    return SampleBrowserModule;
  })
;