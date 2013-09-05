define(["require", "DQX/Application", "DQX/Framework", "DQX/Msg", "DQX/Utils", "DQX/DocEl", "DQX/Controls",
  "DQX/SQL", "DQX/SVG", "DQX/FramePanel", "DQX/FrameTree", "DQX/FrameList", "DQX/DataFetcher/DataFetchers", "DQX/DataFetcher/DataFetcherSnpAsync", "DQX/DataFetcher/DataFetcherAnnotation",
  "Wizards/WizardSelectSamples", "Wizards/WizardFindGene", "Views/GenotypeViewer/GenotypeViewer", "Common", "MetaData"],
  function (require, Application, Framework, Msg, DQX, DocEl, Controls,
            SQL, SVG, FramePanel, FrameTree, FrameList, DataFetcher, DataFetcherSnp, DataFetcherAnnotation,
            WizardSelectSamples, WizardFindGene, GenotypeViewer, Common, MetaData) {
    var SampleBrowserModule = {
      init: function () {
        var that = Application.View(
          'start',
          'Genotype Browser'
        );
        that.annotation_fetcher = new DataFetcherAnnotation.Fetcher({
          serverURL: serverUrl,
          database: MetaData.database,
          annotTableName: MetaData.tableAnnotation,
          chromnrfield: 'chrom'
        });

        that.createFrames = function (rootFrame) {
          rootFrame.makeGroupHor();
          rootFrame.setSeparatorSize(6);

          var frameListsLeft = this.getFrame().addMemberFrame(Framework.FrameGroupVert('', 0.2));

          this.frameControls = frameListsLeft.addMemberFrame(Framework.FrameFinal('GenotypesSelectSamples', 0.5))
            .setMargins(5).setAllowSmoothScrollY().setMinSize(Framework.dimX, 250);
//                    this.frameControls.InsertIntroBox('Icons/Medium/GenotypeBrowser.png', DQX.Text('IntroGenotypesView'), 'Doc/Genotypes/Help.htm');
          this.frameBrowser = this.getFrame().addMemberFrame(Framework.FrameFinal('GenotypesBrowser', 0.8))
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

        that.snpIndexProvider = function (chrom, callback) {
          var xhr = new XMLHttpRequest();
          xhr.open('GET', serverUrl + "?datatype=custom&respmodule=vcf_server&respid=chromosome_index&chrom="+chrom, true);
          xhr.responseType = 'arraybuffer';
          xhr.onreadystatechange = function handler() {
            if(this.readyState == this.DONE) {
              if(this.status == 200 && this.response != null) {
                var positions = new Uint32Array(this.response);
                callback(positions);
                return;
              }
              //error
              callback(null);
            }
          };
          xhr.send();
        };

        that.genotypeProvider = function (chrom, start, end, sample_ids, callback) {
          var xhr = new XMLHttpRequest();
          var seqids = '';
          for (var i = 0; i < sample_ids.length-1; i++) {
            seqids += sample_ids[i];
            seqids += '~';
          }
          if (sample_ids.length > 1)
            seqids += sample_ids[sample_ids.length-1];
          xhr.open('GET', serverUrl + "?datatype=custom&respmodule=vcf_server&respid=genotypes&chrom="+chrom+"&start="+start+"&end="+end+"&samples="+seqids, true);
          xhr.responseType = 'arraybuffer';
          xhr.onreadystatechange = function handler() {
            if(this.readyState == this.DONE) {
              if(this.status == 200 && this.response != null) {
                callback(this.response);
                return;
              }
              //error
              callback(null);
            }
          };
          xhr.send();
        };

        that.createPanels = function () {
          this.ctrls = {};
          this.controlPanel = Framework.Form(this.frameControls);
          this.ctrls.textSamples = Controls.Html('SampleBrowserActiveSamples', '<i><b>No samples</b></i>');
          this.controlPanel.addControl(this.ctrls.textSamples);
          var table = Controls.CompoundGrid();
          table.setItem(0,0,Controls.Button("SampleBrowserSelectSamples", {
                  buttonClass: 'DQXToolButton1',
                  width: 80,
                  height: 28,
                  content: '<img class="DQXFLeft" height=28px src="Bitmaps/study2.png"><div class="DQXFLeft">Select<br>samples</div>' }))
              .setOnChanged($.proxy(this.promptSamples, this));
          table.setItem(0, 1, Controls.Button("SampleBrowserSelectGene", {
              width: 80,
              height: 31,
              buttonClass: 'DQXToolButton1',
              bitmap: "Bitmaps/dna3.png",
              content: 'Go to gene' }))
            .setOnChanged($.proxy(this.promptGene, this));
          this.controlPanel.addControl(table);

          var compress = Controls.Check('Compress', {label: 'Compress', value: false});
          this.controlPanel.addControl(compress);
          var cluster = Controls.Check('Cluster', {label: 'Cluster', value: false});
          this.controlPanel.addControl(cluster);

          this.controlPanel.render();

          var gv = this.genotypeViewer = GenotypeViewer(this.frameBrowser, {
            genotype:that.genotypeProvider,
            position:that.snpIndexProvider,
            annotation:that.annotationProvider});
          compress.setOnChanged(function () {
            gv.modify_compress(compress.getValue())
          });
          cluster.setOnChanged(function () {
            gv.modify_cluster(cluster.getValue())
          });

          //TODO This shouldn't be a hardcode
          this.sampleSet = [];
          var content = "<i><b>{cnt} samples are selected</b></i>".DQXformat({ cnt: this.sampleSet.length }) + '<br>';
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
          this.genotypeViewer.setSamples(this.sampleSet);
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
          this.geneinfo = {
            geneid: data.fid,
            chromid: data.chromid,
            start: parseInt(data.fstart),
            stop: parseInt(data.fstop)
          };
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