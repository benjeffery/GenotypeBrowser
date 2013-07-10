define(["require", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Popup", "DQX/Wizard", "DQX/DataFetcher/DataFetchers", "Wizards/FindGeneControl", "MetaData1"],
    function (require, Framework, Controls, Msg, SQL, DocEl, Popup, Wizard, DataFetcher, FindGeneControl, MetaData1) {

        /////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Implements the "Find Gene" wizard
        /////////////////////////////////////////////////////////////////////////////////////////////////////////

        WizardFindGene = Wizard.Create("WizardFindGene");

        WizardFindGene._currentSearchNr = 0;

        WizardFindGene._recentList = [];

        //Adds a new gene to the list of recently found genes
        WizardFindGene.addGeneHit = function (id) {
            var isPresent = false;
            for (var i = 0; i < WizardFindGene._recentList.length; i++)
                if (WizardFindGene._recentList[i] == id)
                    isPresent = true;
            if (!isPresent)
                WizardFindGene._recentList.unshift(id);
        }

        //Thif function sets the resulting gene after the wizard was run
        WizardFindGene.setResult = function (id) {
            WizardFindGene.addGeneHit(id);
            WizardFindGene.resultGeneID = id;
        }

        WizardFindGene.setTitle("Find Gene");

        /////// First page: buttons with the search options /////////////////////////////////

        var searchOptions = [
            { id: 'choice1', name: 'Name or description' },
            { id: 'choice3', name: 'Genomic region' }
            ];
        var buttonList = [Controls.Static('Search for a gene by:').makeComment()];
        for (var i = 0; i < searchOptions.length; i++) {
            var bt = Controls.Button(searchOptions[i].id, { width: 500, content: searchOptions[i].name, fastTouch: true })
                .setOnChanged(function (id) { WizardFindGene.jumpToPage(id); });
            buttonList.push(bt);
        }

        WizardFindGene.addPage({
            id: 'init',
            helpUrl: 'Doc/WizardFindGene/Help.htm',
            form: Controls.CompoundVert([Controls.CompoundVert(buttonList), Controls.CompoundHor([])]),
            hideNext: true
        });

        /////// Page: find keyword /////////////////////////////////

        WizardFindGene.controlFindByKeyword = FindGeneControl.Instance('FindByKeyword', {
            database: MetaData1.database,
            annotationTableName: MetaData1.tableAnnotation,
            notifyEnter: function () {
                if (WizardFindGene.controlFindByKeyword.getHasValidGeneList())
                    WizardFindGene._onNext();
            }
        });
        WizardFindGene.controlFindByKeyword.setHasDefaultFocus();
        WizardFindGene.addPage({
            id: 'choice1',
            form: Controls.CompoundVert([WizardFindGene.controlFindByKeyword]),
            helpUrl: 'Doc/WizardFindGene/Help.htm',
            reportValidationError: function () {
                var id = WizardFindGene.controlFindByKeyword.getValue();
                if (!id) return "There is no gene selected";
            },
            onFinish: function () {
                WizardFindGene.setResult(WizardFindGene.controlFindByKeyword.getValue());
            }
        });

        /////// Page: search by position /////////////////////////////////

        WizardFindGene.searchChromosome = Controls.Combo('SearchRegionChromosome', { label: 'Chromosome:', value: 'NRAF', states: MetaData1.chromosomes }).setHasDefaultFocus();
        WizardFindGene.searchStart = Controls.Edit('SearchRegionStart', { size: 10 });
        WizardFindGene.searchEnd = Controls.Edit('SearchRegionEnd', { size: 10 });
        var handleModifiedStart = function () { WizardFindGene.handleModifiedStart(); };
        var handleFindRegion = function () { WizardFindGene.findGenesInRegion(); };
        WizardFindGene.searchChromosome.setOnChanged(handleFindRegion);
        WizardFindGene.searchStart.setOnChanged(handleModifiedStart);
        WizardFindGene.searchEnd.setOnChanged(handleFindRegion);
        WizardFindGene.resultList_Region = Controls.List('SearchResultListRegion', { width: -1, height: 250 });
        WizardFindGene.searchRegionStatus = Controls.Html('SearchRegionStatus', '');
        WizardFindGene.addPage({
            id: 'choice3',
            helpUrl: 'Doc/WizardFindGene/Help.htm',
            form: Controls.CompoundVert([
                Controls.Static('Select a genomic region:').makeComment(),
                Controls.CompoundHor([
                    WizardFindGene.searchChromosome,
                    Controls.Static('&nbsp;&nbsp;&nbsp; Start:&nbsp;'),
                    WizardFindGene.searchStart,
                    Controls.Static('&nbsp;bp'),
                    Controls.Static('&nbsp;&nbsp;&nbsp; End:&nbsp;'),
                    WizardFindGene.searchEnd,
                    Controls.Static('&nbsp;bp')
                ]),
                Controls.Static('<br>Select a gene from the list of matches:').makeComment(),
                WizardFindGene.resultList_Region,
                WizardFindGene.searchRegionStatus
            ]),
            reportValidationError: function () {
                var id = WizardFindGene.getPage('choice3').form.findControl('SearchResultListRegion').getValue();
                if (!id) return "There is no gene selected";
            },
            onFinish: function () {
                WizardFindGene.setResult(WizardFindGene.findRegionIDMap[WizardFindGene.getPage('choice3').form.findControl('SearchResultListRegion').getValue()]);
            }
        });


        //Executes the wizard, providing a function that will be called upon successful completion
        WizardFindGene.execute = function (retFunction) {
            var recentList = WizardFindGene.getPage('init').form._controls[1];
            recentList.clear();
            if (WizardFindGene._recentList.length == 0)
                recentList.addControl(Controls.Static(""));
            else
                recentList.addControl(Controls.Static("<br/><br/>Recent hits:&nbsp;"));
            for (var i = 0; i < Math.min(10, WizardFindGene._recentList.length); i++) {
                if (i > 0)
                    recentList.addControl(Controls.Static('&nbsp;&nbsp;&nbsp;'));
                var link = Controls.Hyperlink('RecentHit_' + i, { content: WizardFindGene._recentList[i] });
                link.geneid = WizardFindGene._recentList[i];
                link.setOnChanged(function () {
                    WizardFindGene.setResult(this.geneid);
                    WizardFindGene.performFinish();
                });
                recentList.addControl(link);
            }

            WizardFindGene.run(retFunction);
        }



        //Sets a message on the find in region page
        WizardFindGene.setSearchResultMessage_Region = function (msg) {
            WizardFindGene.resultList_Region.getJQElement('').html('<i> ' + msg + '</i>');
        }

        //Internal: Callback that is executed when the search in region option returns data from the server
        WizardFindGene._respond_findGenesInRegion = function (data) {
            var chromid = WizardFindGene.searchChromosome.getValue();
            var descrs = data.descr;
            var startlist = data.fstart;
            var endlist = data.fstop;
            var ids = data.fid;
            var items = [];
            WizardFindGene.findRegionIDMap = {};
            for (var i = 0; i < descrs.length; i++) {
                var descr = '<b>{chrom}:{p1}-{p2}</b><br>{id}; {descr}'.DQXformat({ id: ids[i], chrom: chromid, p1: startlist[i], p2: endlist[i], descr: descrs[i] });
                items.push({ id: 'id' + i, content: descr });
                WizardFindGene.findRegionIDMap['id' + i] = ids[i];
            }
            WizardFindGene.resultList_Region.setItems(items, 'id0');
            if (descrs.length > 200)
                WizardFindGene.searchRegionStatus.modifyValue('<i>Result set limited to the first 100 hits</i>');
            else
                WizardFindGene.searchRegionStatus.modifyValue('');
        }

        //Internal: called when the start position of the region search was modified
        WizardFindGene.handleModifiedStart = function () {
            var str_start = WizardFindGene.searchStart.getValue();
            var str_stop = WizardFindGene.searchEnd.getValue();
            if (str_start) {
                var val_start = parseInt(str_start);
                if (val_start > 0) {
                    var val_stop = parseInt(str_stop);
                    if ((!val_stop) || (val_stop < val_start))
                        WizardFindGene.searchEnd.modifyValue(str_start);
                    else
                        WizardFindGene.findGenesInRegion();
                }
            }
        }

        //Internal: executes the find in region action
        WizardFindGene.findGenesInRegion = function () {
            WizardFindGene._currentSearchNr++;
            var thisSearchNr = WizardFindGene._currentSearchNr;
            WizardFindGene.resultList_Region.setItems([], '');
            var chromid = WizardFindGene.searchChromosome.getValue();
            var str_start = WizardFindGene.searchStart.getValue();
            var str_stop = WizardFindGene.searchEnd.getValue();
            if (str_start && str_stop) {
                var val_start = parseInt(str_start);
                var val_stop = parseInt(str_stop);
                WizardFindGene.setSearchResultMessage_Region('Fetching search hits...');
                var whc = SQL.WhereClause.AND([
                    SQL.WhereClause.CompareFixed('chromid', '=', chromid),
                    SQL.WhereClause.CompareFixed('fstop', '>=', str_start),
                    SQL.WhereClause.CompareFixed('fstart', '<=', str_stop),
                    SQL.WhereClause.CompareFixed('ftype', '=', 'gene'),
                ]);
                var fetcher = DataFetcher.RecordsetFetcher(serverUrl, MetaData1.database, MetaData1.tableAnnotation);
                fetcher.setMaxResultCount(201);
                fetcher.addColumn('fid', 'ST');
                fetcher.addColumn('fname', 'ST');
                fetcher.addColumn('descr', 'ST');
                fetcher.addColumn('fstart', 'IN');
                fetcher.addColumn('fstop', 'IN');
                fetcher.getData(whc, "fstart",
                    function (data) { if (thisSearchNr == WizardFindGene._currentSearchNr) WizardFindGene._respond_findGenesInRegion(data) },
                    DQX.createMessageFailFunction()
                );
            }
        }


        return WizardFindGene;
    });

    //Global function that can be called to execute the find gene wizard
    function executeWizardFindGene() {
    WizardFindGene.execute(function () {
        require("Common").showGenePopup(WizardFindGene.resultGeneID);
    });
}

