define(["require", "DQX/Msg", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Popup", "DQX/Controls", "DQX/Wizard", "MetaData"],
    function (require, Framework, Msg, SQL, DocEl, Popup, Controls, Wizard, MetaData) {


        var Common = {}

        //A utility function that parses a string of the format chromosome:start-stop
        Common.decodeGenomicRegionString = function (region) {
            var chromoid = region.split(':')[0];
            var regionstr = region.split(':')[1];
            if (!regionstr) {
                alert('Invalid region');
                return;
            }
            if (regionstr.indexOf('-') > 0) {//an actual region
                var pos1 = parseInt(regionstr.split('-')[0]);
                var pos2 = parseInt(regionstr.split('-')[1]);
            }
            else {//a single position
                var pos1 = parseInt(regionstr);
                var pos2 = pos1;
            }
            return { chromoID: chromoid, start: pos1, end: pos2 };
        }

        Common._toolsSNP = [];
        Common._toolsSNPMap = {};

        Common.addToolSNP = function (id, name, bitmap, handler) {
            Common._toolsSNP.push({ id: id, name: name, bitmap: bitmap, handler: handler });
            Common._toolsSNPMap[id] = handler;
        }

        Common._handleToolSNP = function (snpid, toolid) {
            Common._toolsSNPMap[toolid](snpid);
        }

        Common._toolsGene = [];
        Common._toolsGeneMap = {};

        Common.addToolGene = function (id, name, bitmap, handler) {
            Common._toolsGene.push({ id: id, name: name, bitmap: bitmap, handler: handler });
            Common._toolsGeneMap[id] = handler;
        }

        Common._handleToolGene = function (geneid, toolid) {
            Common._toolsGeneMap[toolid](geneid);
        }

        //NOTE: when a button is pressed, the handlerEnvelope function is called, with the actual tool handler as an argument.
        //This allows the creator of this button to provide the correct argument for the tool handler, and perform other stuff if necessary
        Common._generateToolButton = function (tool, handlerEnvelope) {
            if (DQX.checkIsFunction(handlerEnvelope))
                DQX.reportError('Invalid handler');
            var args = { buttonClass: 'DQXToolButton2', content: tool.name, width: 150, height: 51 }
            if (tool.bitmap)
                args.bitmap = "Bitmaps/{bmp}".DQXformat({ bmp: tool.bitmap });
            var bt = Controls.Button(null, args);
            bt.setOnChanged(function () {
                handlerEnvelope(tool.handler);
            });
            return bt;
        }

        Common.generateToolButtonsGene = function (excludeToolID, handlerEnvelope) {
            var dv = DocEl.Div();
            for (var i = 0; i < Common._toolsGene.length; i++) {
                var tool = Common._toolsGene[i];
                if (tool.id != excludeToolID)
                    dv.addElem(Common._generateToolButton(tool, handlerEnvelope).renderHtml());
            }
            return dv.toString();
        }



        //Create handlers for various tool buttons
        Common.addToolHandlers = function () {
            //Show a snp on the genome browser
            Common.addToolSNP("SNPOnGenome", "Show position on genome", "Icons/Medium/GenomeAccessibility.png", function (args) {
                require('Page').GenomeBrowserView.jumpSNP(args.snpid);
            });
            //Show a snp on the map
            Common.addToolSNP("SNPOnMap", "Show frequencies on map", "Icons/Medium/VariantFrequency.png", function (args) {
                require('Page').MapSNPFrequenciesView.jumpSNP(args.snpid);
            });
            //Tool handler that opens the gene popup card for a SNP
            Common.addToolSNP("SNP2Gene", "Show gene containing this [@snp]", "Icons/Medium/Gene.png", function (args) {
                Common.showGenePopup(args.geneid);
            });
            //Tool handler that opens a gene in PlasmoDb
            Common.addToolGene("Gene2PlasmoDb", "Show in PlasmoDb", "plasmodb_bw.png", function (args) {
                var url = require("MetaData").externalGeneLink.DQXformat({ id: args.geneid });
                window.open(url, '_blank');
            });

        }


        Common.SnpData2InfoTable = function (data) {
            var tokens = {};
            //tokens["Chromosome"] = data['chrom'];
            //tokens["Position"] = data['pos'];
            for (var fieldnr = 0; fieldnr < MetaData.fieldList.length; fieldnr++) {
                var field = MetaData.fieldList[fieldnr];
                var dataType = MetaData.MGDataType(field.dataTypeID);
                if ((field.dataTypeID != "AlleleFrequency") && (field.id != "GeneDescription") && (field.id != "FST") && (field.id != "pvtAllele") && (field.id != "pvtPop")) {
                    tokens[field.name] = dataType.getTextConvertFunction()(data[field.id]);
                }
            }
            if (data['pvtPop'] != '-') {
                tokens['Private Allele'] = data['pvtAllele'] + ' (' + data['pvtPop'] + ')';
            }
            return DQX.CreateKeyValueTable(tokens);
        }


        Common.SnpData2AlleleFrequenciesTable = function (data, element) {
            var content = '';
            content += '<table class="DQXStyledTable" style="background-color:white"><tr><th>Population</th>';
            for (var i = 0; i < MetaData.frequencyTypeList.length; i++) {
                content += '<th>' + MetaData.frequencyTypeList[i].id + '</th>';
            }
            content += "</tr>";
            for (var areaNr = 0; areaNr < MetaData.populationList.length; areaNr++) {
                content += '<tr>';
                content += '<td>';
                content += MetaData.populationList[areaNr].getControl().renderHtml();
                content += '</td>';
                for (var i = 0; i < MetaData.frequencyTypeList.length; i++) {
                    var fieldID = MetaData.frequencyTypeList[i].id + "_" + MetaData.populationList[areaNr].id;
                    var field = MetaData.fieldMap[fieldID];
                    var dataType = MetaData.MGDataType(field.dataTypeID);
                    vl = data[field.id];
                    content += '<td style="background-color:{cl}">'.DQXformat({ cl: dataType.getBackColorFunction()(vl).toString() });
                    content += dataType.getTextConvertFunction()(vl);
                    content += '</td>';
                }
                content += '</tr>';
            }
            content += '</tr>';
            content += '</table>';
            element.html(content);
            Controls.ExecPostCreateHtml();
        }

        function handleShowSNPPopup(data) {
            var snpid = data['snpid'];
            var geneid = data['GeneId'];
            var content = '';
            content = '<div style="display:inline-block;vertical-align:top;margin:5px">' + Common.SnpData2InfoTable(data) + "</div>";
            var freqDiv = DQX.getNextUniqueID();
            content += '<div id="' + freqDiv + '" style="display:inline-block;vertical-align:top;margin:5px"></div>';
            content += "<br/>";

            var snpData = { snpid: snpid, geneid: geneid };
            for (var i = 0; i < Common._toolsSNP.length; i++) {
                content += Common._generateToolButton(Common._toolsSNP[i], function (handler) {
                    handler(snpData);
                    Popup.closeIfNeeded(popupID);
                }).renderHtml();
            }
            var popupID = Popup.create("[@Snp] " + snpid, content);

            Common.SnpData2AlleleFrequenciesTable(data, $("#" + freqDiv));
        }

        //Call this function to fetch snp data in an async way
        Common.fetchSnpData = function (snpid, handleFunction) {
            var dataFetcher = require("Page").dataFetcherSNPs;
            dataFetcher.fetchFullRecordInfo(
                SQL.WhereClause.CompareFixed('snpid', '=', snpid),
                function (data) {
                    DQX.stopProcessing();
                    handleFunction(data);
                },
                function (msg) {
                    DQX.stopProcessing();
                    alert(DQX.Text("InvalidSNPID").DQXformat({ id: snpid }));
                }
                );
            DQX.setProcessing("Downloading...");
        }

        //Returns html with info about a gene
        Common.GeneData2InfoTable = function (data) {
            tokens = {};
            tokens["Names:"] = data.fnames;
            tokens["Description:"] = data.descr;
            tokens["Position:"] = data.chromid + ':' + data.fstart + '-' + data.fstop;
            return DQX.CreateKeyValueTable(tokens);
        }

        function handleShowGenePopup(data) {
            var geneid = data.fid;
            var geneData = { geneid: geneid, chromid: data.chromid, start: parseInt(data.fstart), stop: parseInt(data.fstop) };
            content = '<div>' + Common.GeneData2InfoTable(data) + "</div>";
            for (var i = 0; i < Common._toolsGene.length; i++) {
                content += Common._generateToolButton(Common._toolsGene[i], function (handler) {
                    handler(geneData);
                    Popup.closeIfNeeded(popupID);
                }).renderHtml();
            }
            var popupID = Popup.create("Gene " + geneid, content);
        }

        Common.showGenePopup = function (id) {
            require("Wizards/WizardFindGene").addGeneHit(id);
            Common.fetchGeneData(id, handleShowGenePopup);
        }


        //Call this function to fetch gene data in an async way
        Common.fetchGeneData = function (id, handleFunction) {
            var myurl = DQX.Url(serverUrl);
            myurl.addUrlQueryItem("datatype", 'recordinfo');
            myurl.addUrlQueryItem("qry", SQL.WhereClause.encode(SQL.WhereClause.CompareFixed('fid', '=', id)));
            myurl.addUrlQueryItem("database", MetaData.database);
            myurl.addUrlQueryItem("tbname", MetaData.tableAnnotation);
            $.ajax({
                url: myurl.toString(),
                success: function (resp) {
                    DQX.stopProcessing();
                    var keylist = DQX.parseResponse(resp);
                    if ("Error" in keylist) {
                        alert(keylist.Error);
                        return;
                    }
                    handleFunction(keylist.Data);
                },
                error: DQX.createMessageFailFunction()
            });
            DQX.setProcessing("Downloading...");
        }


        //Create event listener for actions to open a SNP popup window
        Msg.listen('', { type: 'ShowSNPPopup' }, function (context, snpid) {
            require("Wizards/WizardFindSNP").addSNPHit(snpid);
            Common.fetchSnpData(snpid, handleShowSNPPopup);
        });

        //Create event listener for actions to open a gene popup window
        Msg.listen('', { type: 'ShowGenePopup' }, function (context, geneid) {
            require("Wizards/WizardFindGene").addGeneHit(geneid);
            Common.showGenePopup(geneid);
        });


        return Common;
    });