define(["require", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Popup", "DQX/Wizard", "DQX/DataFetcher/DataFetchers"],
    function (require, Framework, Controls, Msg, SQL, DocEl, Popup, Wizard, DataFetcher) {
        WizardSelectSamples = Wizard.Create("WizardSelectSamples");


        WizardSelectSamples.setTitle("Select samples");

        var searchOptions = [
           // { id: 'byStudy', name: 'Select by study' },
            { id: 'byRegion', name: 'Select by geographic region' }
            ];
        var buttonList = [Controls.Static('Select the method to select samples:').makeComment()];
        for (var i = 0; i < searchOptions.length; i++) {
            var bt = Controls.Button(searchOptions[i].id, { width: 500, content: searchOptions[i].name })
                .setOnChanged(function (id) { WizardSelectSamples.jumpToPage(id); });
            buttonList.push(bt);
        }

        var controlList = [Controls.CompoundVert(buttonList), Controls.CompoundHor([])];

        WizardSelectSamples.addPage({
            id: 'init',
            form: Controls.CompoundVert(controlList),
            hideNext: true,
            getNextPage: function () {
                return WizardSelectSamples.getPage('init').form.findControl('InitialChoice').getValue();
            }
        });

        //////////////////// Studies selection page

        WizardSelectSamples.studiesList = Controls.List('StudiesList', { width: 550, height: 310, checkList: true, allowSelectItem:false });
        WizardSelectSamples.regionsList = Controls.List('RegionsList', { width: 550, height: 310, checkList: true, allowSelectItem:false });

        WizardSelectSamples.addPage({
            id: 'byStudy',
            form: Controls.CompoundVert([
                Controls.Static('Check the [@studies] you want to include').makeComment(),
                WizardSelectSamples.studiesList
            ]),
            reportValidationError: function () {
                if (WizardSelectSamples.studiesList.getCheckedItems().length == 0)
                    return 'There are no [@studies] selected. Please use the check boxes to select at least one [@study].';
            },
            onFinish: function () {
                WizardSelectSamples.searchType = 'byStudy';
                WizardSelectSamples.activeStudies = WizardSelectSamples.studiesList.getCheckedItems();
            }
        });

        WizardSelectSamples.addPage({
            id: 'byRegion',
            form: Controls.CompoundVert([
                Controls.Static('Check the regions you want to include').makeComment(),
                WizardSelectSamples.regionsList
            ]),
            reportValidationError: function () {
                if (WizardSelectSamples.regionsList.getCheckedItems().length == 0)
                    return 'There are no regions selected. Please use the check boxes to select at least one region.';
            },
            onFinish: function () {
                WizardSelectSamples.searchType = 'byRegion';
                WizardSelectSamples.activeRegions = WizardSelectSamples.regionsList.getCheckedItems();
            }
        });

        WizardSelectSamples.execute = function (retFunction) {
            var metaData = globalPage.metaData2;
            var studiesList = metaData.getStudiesList();

            if (!WizardSelectSamples._listItemsCreated) {
                var items = [];
                for (var i = 0; i < studiesList.length; i++) {
                    items.push({ id: studiesList[i], content: '<b>' + studiesList[i] + '</b> ' + metaData.getStudyInfo(studiesList[i]).Title });
                }
                WizardSelectSamples.studiesList.setItems(items, '');
                items = [];
                for (var i = 0; i < metaData.sample_classification_typesMap['region'].SampleClassifications.length; i++) {
                    var region = metaData.sample_classification_typesMap['region'].SampleClassifications[i];
                    items.push({ id: region.ID, content: '<b>' + region.Name + '</b> '});
                }
                WizardSelectSamples.regionsList.setItems(items, '');
                WizardSelectSamples._listItemsCreated = true;
            }
            WizardSelectSamples.run(retFunction);
        }

//        WizardSelectSamples._callbackGetSamples = function (data) {
//            DQX.stopProcessing();
//            WizardSelectSamples.sampleSet = [];
//            for (var i = 0; i < data.sampleid.length; i++)
//                WizardSelectSamples.sampleSet.push({ id: data.sampleid[i], study: data.study[i], country: data.country[i]});
//        }

        //to be called upon completion of the wizard, in order to get the actual set of sample ID's
        WizardSelectSamples.fetchSampleSet = function (retFunction) {
//            if (WizardSelectSamples.searchType == 'byStudy') {
//                //todo:fetch samples correspondong to 'WizardSelectSamples.activeStudies' from server
            //                var fetcher = DataFetcher.RecordsetFetcher(serverUrl, MetaData1.database, 'pf21publicsamples');
//                fetcher.addColumn('sampleid', 'ST');
//                fetcher.addColumn('study', 'ST');
//                fetcher.addColumn('country', 'ST');
//                var wrc = SQL.WhereClause.OR();
//                $.each(WizardSelectSamples.activeStudies, function (idx, study) {
//                    wrc.addComponent(SQL.WhereClause.CompareFixed('study', '=', study));
//                });
//                DQX.setProcessing("Downloading...");
//                fetcher.getData(wrc, "sampleid", function (data) {
//                    WizardSelectSamples._callbackGetSamples(data);
//                    retFunction(WizardSelectSamples.sampleSet);
//                },
//                        DQX.createMessageFailFunction()
//                    );
//
//                return;
//            }
            var metaData = globalPage.metaData2;
            if (WizardSelectSamples.searchType == 'byRegion') {
                var samples = [];
                WizardSelectSamples.activeRegions.forEach(function(region_id)  {
                    metaData.sample_classificationsMap[region_id].getPublicSamples().forEach(function (sample) {
                        if ($.inArray(sample.SampleContext, samples) == -1)
                            samples.push(sample);

                    })
                })
                WizardSelectSamples.sampleSet = samples;
                retFunction(samples);
                return;
            }
            DQX.reportError('Invalid search type');
        }


        return WizardSelectSamples;
    });

