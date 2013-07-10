define(["require", "DQX/Framework", "DQX/SQL", "DQX/Controls", "DQX/DataFetcher/DataFetchers", "MetaData", "DQX/Msg", "DQX/Popup"],
    function (require, Framework, SQL, Controls, DataFetcher, MetaData, Msg, Popup) {

        var PrefetchData = {

            fetch: function (onCompletedHandler) {
                var that = {};

                that.getSiteInfo = function (siteid) {
                    var rs = this.sitesMap[siteid];
                    if (!rs)
                        DQX.reportError("Invalid site identifier");
                    return rs;
                }

                that.getPersonInfo = function (personid) {
                    var rs = this.contact_personsMap[personid];
                    if (!rs)
                        DQX.reportError("Invalid person identifier");
                    return rs;
                }

                //returns a list of study identifiers
                that.getStudiesList = function () {
                    if (!this._dataStudies)
                        DQX.reportError('Data not yet available');
                    return this._studyIDList;
                }

                that.getStudyInfo = function (studyid) {
                    if (!this._dataStudies)
                        DQX.reportError('Data not yet available');
                    var rs = this._studiesMap[studyid];
                    if (!rs)
                        DQX.reportError("Invalid study identifier '" + studyid + "'");
                    return rs;
                }

                that.getPersonList = function () {
                    if (!this._dataContactPersons)
                        DQX.reportError('Data not yet available');
                    return this.contact_persons
                }

                that.getCountryName = function (countryID) {
                    if (!this._dataCountries)
                        DQX.reportError('Data not yet available');
                    if (!this.countriesMap[countryID])
                        DQX.reportError('Invalid country ID ' + countryID);
                    return this.countriesMap[countryID].Name;
                }

                that.getSampleClassificationsForType = function (sampleClassificationType) {
                    if (!that.sample_classification_typesMap[sampleClassificationType])
                        DQX.reportError("Invalid sample classification type " + sampleClassificationType);
                    return that.sample_classification_typesMap[sampleClassificationType].SampleClassifications;
                }


                that.tryBuildMetaDataStructures = function () {
                    //wait until all data has been fetched
                    var fetchCompleted = true;
                    $.each(that.fetchedTables, function (ID) {
                        if (!that[ID])
                            fetchCompleted = false;
                    });
                    if (!fetchCompleted)
                        return;

                    this.countriesMap = {};
                    for (var i = 0; i < this._dataCountries.ID.length; i++) {
                        var Item = {
                            ID: this._dataCountries.ID[i],
                            Name: this._dataCountries.Name[i]
                        };
                        this.countriesMap[Item.ID] = Item;
                    }

                    //create studies info
                    this._studyIDList = [];
                    this.studies = [];
                    this._studiesMap = {};
                    for (var i = 0; i < this._dataStudies.study.length; i++) {
                        this._studyIDList.push(this._dataStudies.study[i]);
                        var study = {
                            ID: this._dataStudies.study[i],
                            Title: '<b>' + this._dataStudies.study_code[i] + '</b> ' + this._dataStudies.title[i],
                            Description: this._dataStudies.description[i],
                            People: this._dataStudies.people[i],
                            FullStudy: !!this._dataStudies.full_study[i],
                            Sample_Contexts: [],
                            Persons_LeadPartners: [],
                            Persons_KeyAssociates: [],
                            Samples: []
                        };
                        study.getControl = $.proxy(function (handlerFunction) {
                            var ctrl = Controls.LinkButton('', { smartLink: true, text: this.Title });
                            ctrl.studyID = this.ID;
                            ctrl.setOnChanged(function (id, theControl) {
                                Popup.closeUnPinnedPopups();
                                if (!handlerFunction)
                                    Msg.send({ type: 'ShowStudy' }, theControl.studyID);
                                else
                                    handlerFunction(theControl.studyID)
                            });
                            return ctrl;
                        }, study);
                        this._studiesMap[this._dataStudies.study[i]] = study;
                        this.studies.push(study);
                    }

                    //Create sites info
                    this.sites = [];
                    this.sitesMap = {};
                    for (var i = 0; i < this._dataSites.location.length; i++) {
                        var site = {
                            ID: this._dataSites.location[i],
                            Name: this._dataSites.name[i],
                            Country: this._dataSites.country[i],
                            longit: this._dataSites.longit[i],
                            lattit: this._dataSites.lattit[i],
                            Sample_Contexts: [],
                            Samples: [],
                            metaData2: that
                        };
                        site.getSampleCount = function () {
                            var cnt = 0;
                            $.each(this.Sample_Contexts, function (idx, sc) {
                                cnt += sc.getSampleCount();
                            });
                            return cnt;
                        }
                        site.getControl = $.proxy(function (handlerFunction) {
                            var ctrl = Controls.LinkButton('', { smartLink: true, text: this.Name + ', ' + this.Country + ' <img  class="DQXSmallFlag" src="Bitmaps/flags/' + this.Country.toLowerCase() + '.png">' });
                            ctrl.siteID = this.ID;
                            ctrl.setOnChanged(function (id, theControl) {
                                Popup.closeUnPinnedPopups();
                                if (!handlerFunction)
                                    Msg.send({ type: 'ShowSite' }, theControl.siteID);
                                else
                                    handlerFunction(theControl.siteID);
                            });
                            return ctrl;
                        }, site);
                        site.getTitle = function () {
                            var content = '<h3>' + this.Name + ' - <i>' + this.CountryName + '</i>';
                            content += '&nbsp;&nbsp;<img class="DQXSmallFlag" src="Bitmaps/flags/' + this.Country.toLowerCase() + '.png">';
                            content += '</h3>';
                            return content;
                        }
                        site.getFullName = function () { return this.Name + ', ' + this.Country; }
                        this.sites.push(site);
                        this.sitesMap[site.ID] = site;
                    }

                    //Create sample_context info
                    this.sample_contexts = [];
                    this.sample_contextsMap = {};
                    for (var i = 0; i < this._dataSampleContexts.sample_context.length; i++) {
                        var sample_context = {
                            ID: this._dataSampleContexts.sample_context[i],
                            Title: this._dataSampleContexts.title[i],
                            Description: this._dataSampleContexts.description[i],
                            Study: this._studiesMap[this._dataSampleContexts.study[i]],
                            Site: this.sitesMap[this._dataSampleContexts.location[i]],
                            SampleCount: this._dataSampleContexts.samplecount[i],
                            Samples: []
                        };
                        sample_context.getSampleCount = function () {
                            return this.SampleCount;
                        }
                        sample_context.getPublicSamples = function () {
                            var lst = [];
                            $.each(this.Samples, function (idx, sample) {
                                //if (sample.Public)//!!!Needed for final implementation
                                lst.push(sample);
                            });
                            return lst;
                        }

                        sample_context.getDescription = function (args) {
                            var sc = this;
                            var content = sc.Description;
                            var mySampleCount = sc.getSampleCount();
                            if (args) {
                                if ('sampleCount' in args)
                                    mySampleCount = args.sampleCount;
                            }
                            if (!content)
                                content = DQX.TextOrig('SamplingContextDefaultDescription');
                            content = content.replace(/\[\@mySampleCount\]/g, mySampleCount);
                            for (; content.indexOf('[@myStudy]') >= 0; )
                                content = content.replace('[@myStudy]', sc.Study.getControl().renderHtml());
                            for (; content.indexOf('[@myLeadPartnerList]') >= 0; ) {
                                var contactList = '';
                                $.each(sc.Study.Persons_LeadPartners, function (idx, person) {
                                    contactList += person.getControl().renderHtml();
                                    if (idx < sc.Study.Persons_LeadPartners.length - 1) {
                                        if (idx < sc.Study.Persons_LeadPartners.length - 2)
                                            contactList += ', ';
                                        else
                                            contactList += ' and ';
                                    }
                                });
                                content = content.replace('[@myLeadPartnerList]', contactList);
                            }
                            for (; content.indexOf('[@myLeadPartnerListOpen]') >= 0; ) {
                                var contactList = '';
                                $.each(sc.Study.Persons_LeadPartners, function (idx, person) {
                                    contactList += person.getControl().renderHtml();
                                    if (idx < sc.Study.Persons_LeadPartners.length - 1) {
                                        if (idx < sc.Study.Persons_LeadPartners.length - 1)
                                            contactList += ', ';
                                    }
                                });
                                content = content.replace('[@myLeadPartnerListOpen]', contactList);
                            }
                            //interpolate explicit references to individual studies
                            var matchList = content.match(/\[\@study:.*?\]/g);
                            if (matchList) {
                                $.each(matchList, function (idx, match) {
                                    var studyID = match.substring(8, match.length - 1);
                                    content = content.replace(match, that.getStudyInfo(studyID).getControl().renderHtml());
                                }
                            )
                            }
                            //interpolate explicit references to individual persons
                            var matchList = content.match(/\[\@person:.*?\]/g);
                            if (matchList) {
                                $.each(matchList, function (idx, match) {
                                    var personID = match.substring(9, match.length - 1);
                                    content = content.replace(match, that.getPersonInfo(personID).getControl().renderHtml());
                                }
                            )
                            }
                            return DQX.interpolate(content);
                        }
                        this._studiesMap[this._dataSampleContexts.study[i]].Sample_Contexts.push(sample_context);
                        this.sitesMap[this._dataSampleContexts.location[i]].Sample_Contexts.push(sample_context);
                        this.sample_contexts.push(sample_context);
                        this.sample_contextsMap[sample_context.ID] = sample_context;
                    }

                    this.sample_classification_types = [];
                    this.sample_classification_typesMap = {};
                    for (var i = 0; i < this._dataSampleClassificationTypes.sample_classification_type.length; i++) {
                        var sample_classification_type = {
                            ID: this._dataSampleClassificationTypes.sample_classification_type[i],
                            Name: this._dataSampleClassificationTypes.name[i],
                            Description: this._dataSampleClassificationTypes.description[i],
                            SampleClassifications: []
                        };
                        this.sample_classification_types.push(sample_classification_type);
                        this.sample_classification_typesMap[sample_classification_type.ID] = sample_classification_type;
                    }

                    this.samples = [];
                    this.samplesMap = {};
                    for (var i = 0; i < this._dataSamples.sample.length; i++) {
                        var classifcations = {};
                        for (var j = 0; j < this.sample_classification_types.length; j++) {
                            var class_type = this.sample_classification_types[j];
                            classifcations[class_type.ID] = []
                        }
                        var sample = {
                            ID: this._dataSamples.sample[i],
                            SampleContext: this._dataSamples.sample_context[i],
                            Public: !!this._dataSamples.is_public[i],
                            Classifications: classifcations
                        };
                        if (sample.SampleContext in this.sample_contextsMap) {
                            this.sample_contextsMap[sample.SampleContext].Samples.push(sample);
                            this.sample_contextsMap[sample.SampleContext].Site.Samples.push(sample);
                            this.sample_contextsMap[sample.SampleContext].Study.Samples.push(sample);
                            sample.SampleContext = this.sample_contextsMap[sample.SampleContext];
                            this.samples.push(sample);
                            this.samplesMap[sample.ID] = sample;
                        }
                    }

                    this.sample_classifications = [];
                    this.sample_classificationsMap = {};
                    for (var i = 0; i < this._dataSampleClassifications.sample_classification.length; i++) {
                        var sample_classification = {
                            ID: this._dataSampleClassifications.sample_classification[i],
                            Name: this._dataSampleClassifications.name[i],
                            longit: this._dataSampleClassifications.longit[i],
                            lattit: this._dataSampleClassifications.lattit[i],
                            Type: this.sample_classification_typesMap[this._dataSampleClassifications.sample_classification_type[i]],
                            sampleContributions: [],
                            Sites: []
                        };
                        sample_classification.getSampleCount = function () {
                            var cnt = 0;
                            $.each(this.sampleContributions, function (idx, contribution) {
                                cnt += contribution.getSampleCount();
                            });
                            return cnt;
                        }
                        sample_classification.getPublicSamples = function () {
                            var lst = [];
                            $.each(this.sampleContributions, function (idx, contrib) {
                                $.each(contrib.sampleContext.getPublicSamples(), function (idx2, sample) {
                                    lst.push(sample);
                                });
                            });
                            return lst;
                        }
                        this.sample_classifications.push(sample_classification);
                        this.sample_classificationsMap[sample_classification.ID] = sample_classification;
                        var classificationType = this._dataSampleClassifications.sample_classification_type[i];
                        if (!(classificationType in this.sample_classification_typesMap))
                            DQX.reportError('Invalid sample classification type ' + classificationType);
                        this.sample_classification_typesMap[classificationType].SampleClassifications.push(sample_classification);
                    }

                    //Fill in the sample contributions for each sample classification
                    for (var i = 0; i < this.dataSampleClassificationContextCount.sample_classification.length; i++) {
                        var sampleClassificationD = this.dataSampleClassificationContextCount.sample_classification[i];
                        var sampleContextID = this.dataSampleClassificationContextCount.sample_context[i];
                        var sampleCount = this.dataSampleClassificationContextCount.count[i];
                        var sampleClassification = this.sample_classificationsMap[sampleClassificationD];
                        if (!sampleClassification)
                            DQX.reportError("Invalid sample classification " + sampleClassificationD);
                        var sampleContext = this.sample_contextsMap[sampleContextID];
                        if (!sampleContext)
                            DQX.reportError("Invalid sample context " + sampleContextID);
                        var contribution = {
                            sampleContext: sampleContext,
                            sampleCount: sampleCount,
                            getSampleCount: function () { return this.sampleCount; },
                            getSiteID: function () { return this.sampleContext.Site.ID; }
                        }
                        contribution.getDescription = function () {
                            return this.sampleContext.getDescription({ sampleCount: this.getSampleCount() });
                        }
                        sampleClassification.sampleContributions.push(contribution);
                        var theSite = this.sitesMap[contribution.getSiteID()];
                        if ($.inArray(theSite, sampleClassification.Sites) == -1)
                            sampleClassification.Sites.push(theSite);
                    }

                    //Push sample classifications to samples
                    $.each(this.sample_classifications, function (idx1, sampleClassification) {
                        $.each(sampleClassification.getPublicSamples(), function (idx2, sample) {
                            sample.Classifications[sampleClassification.Type.ID].push(sampleClassification);
                        });
                    });


                    //Add country names to sites, and sort by country names
                    $.each(this.sites, function (idx, site) {
                        site.CountryName = that.getCountryName(site.Country);
                    });
                    this.sites.sort(DQX.ByProperty('CountryName'));

                    //create the tree with loci
                    this.genes = [];
                    this.genesMap = {};
                    this.lociMap = {};
                    for (var i = 0; i < this._dataGeneInfo.GeneName.length; i++) {
                        var genename = this._dataGeneInfo.GeneName[i];
                        var gene = {
                            Name: genename,
                            Description: this._dataGeneInfo.Description[i],
                            Comments: this._dataGeneInfo.Comments[i],
                            loci: [],
                            snps: []
                        };
                        this.genesMap[genename] = gene;
                        this.genes.push(gene);
                    }

                    for (var i = 0; i < this._dataLoci.GeneName.length; i++) {
                        var genename = this._dataLoci.GeneName[i];
                        var gene = this.genesMap[genename];
                        if (!gene)
                            DQX.reportError('Invalid gene "' + genename + '"')
                        var locus = {
                            LocusID: this._dataLoci.LocusID[i],
                            GenomicRegion: this._dataLoci.GenomicRegion[i],
                            LocusType: this._dataLoci.LocusType[i],
                            GeneName: this._dataLoci.GeneName[i],
                            Name: this._dataLoci.Name[i],
                            Comments: this._dataLoci.Comments[i],
                            Variants: []
                        }
                        gene.loci.push(locus);
                        this.lociMap[locus.LocusID] = locus;
                    }

                    for (var i = 0; i < this._dataLociSnps.GeneName.length; i++) {
                        var genename = this._dataLociSnps.GeneName[i];
                        var gene = this.genesMap[genename];
                        var snp = {
                            GenomicRegion: this._dataLociSnps.GenomicRegion[i],
                            Name: this._dataLociSnps.Name[i]
                        }
                        gene.snps.push(snp);
                    }

                    //Collect variant info for all loci
                    for (var i = 0; i < this._dataLociVariants.LocusID.length; i++) {
                        var variant = {
                            VariantID: this._dataLociVariants.VariantID[i],
                            Mutant: this._dataLociVariants.Mutant[i],
                            Name: this._dataLociVariants.Name[i],
                            ColorStr: this._dataLociVariants.Color[i],
                            Comments: this._dataLociVariants.Comments[i]
                        };
                        if ((variant.Comments == '') && (variant.Mutant == 'N'))
                            variant.Comments = 'Wild type';
                        var locusid = this._dataLociVariants.LocusID[i];
                        if (!(locusid in this.lociMap))
                            DQX.reportError("Invalid locus " + locusid);
                        else
                            this.lociMap[locusid].Variants.push(variant);
                    }

                    //Create colors for variants
                    var mutantColorList = [
                        DQX.Color(1.0, 0.35, 0),
                        DQX.Color(0.5, 0, 0.75),
                        DQX.Color(0.8, 0, 0.25),
                        DQX.Color(0.8, 0.8, 0.3),
                        DQX.Color(0.9, 0.3, 0.9),
                        DQX.Color(0.2, 0.2, 1),
                        DQX.Color(0, 0.7, 0.7),
                        DQX.Color(0.4, 0.6, 0.9),
                        DQX.Color(0.8, 0.4, 0),
                        DQX.Color(0.3, 0.6, 0.3),
                        DQX.Color(0.7, 0.3, 0.3),
                        DQX.Color(0.2, 0.6, 0.6),
                        DQX.Color(0.2, 0.4, 0.1),
                        DQX.Color(0.9, 0.6, 0.7),
                        DQX.Color(0.7, 0.6, 0.9),
                        DQX.Color(0.5, 0.7, 0.7)
                    ];
                    for (var locusid in this.lociMap) {
                        var locus = this.lociMap[locusid];
                        var mutantNr = 0;
                        for (var j = 0; j < locus.Variants.length; j++) {
                            var variant = locus.Variants[j];
                            variant.Color = DQX.Color(0.5, 0.5, 0.5);
                            if (variant.ColorStr == 'Auto') {
                                if (variant.Mutant == 'N')
                                    variant.Color = DQX.Color(0, 1, 0);
                                else {
                                    if (mutantNr < mutantColorList.length)
                                        variant.Color = mutantColorList[mutantNr];
                                    mutantNr++;
                                }
                            }
                            else {
                                var processed = false;
                                if (variant.ColorStr == 'Green') {
                                    variant.Color = DQX.Color(0, 1, 0);
                                    processed = true;
                                }
                                if (!processed) {
                                    var rgbTokens = variant.ColorStr.split(',');
                                    variant.Color = DQX.Color(parseFloat(rgbTokens[0]) / 255.0, parseFloat(rgbTokens[1]) / 255.0, parseFloat(rgbTokens[2]) / 255.0);
                                }
                            }
                        }
                    }

                    if (true) {//Add variants that indicate absent data
                        for (var locusid in this.lociMap) {
                            var locus = this.lociMap[locusid];
                            locus.Variants.push({
                                VariantID: '<Hetero>',
                                Mutant: '',
                                Name: 'Heterozygous',
                                Color: DQX.Color(0.75, 0.75, 0.75),
                                Comments: ''
                            });
                            locus.Variants.push({
                                VariantID: '<Other>',
                                Mutant: '',
                                Name: 'Other',
                                Color: DQX.Color(0.3, 0.3, 0.3),
                                Comments: ''
                            });
                            locus.Variants.push({
                                VariantID: '<Missing>',
                                Mutant: '',
                                Name: 'Absent',
                                Color: DQX.Color(1, 1, 1),
                                Comments: ''
                            });
                        }
                    }

                    onCompletedHandler();
                }

                that.handleFetchError = function (msg) {
                    //DQX.stopProcessing();
                    if (!that.fetchErrorReported) {
                        that.fetchErrorReported = true;
                        alert('ERROR: failed to fetch data from the server: ' + msg);
                    }
                }


                that.fetchLociMetaInfo = function () {

                    that.fetchedTables = {};

                    that.fetchedTables['_dataCountries'] = {
                        tableName: MetaData.tableCountries,
                        columns: [{ name: "ID" }, { name: "Name"}],
                        sortColumn: "Name"
                    };

                    that.fetchedTables['_dataGeneInfo'] = {
                        tableName: MetaData.tableMarkerGeneInfo,
                        columns: [{ name: "GeneName" }, { name: "Description" }, { name: "Comments"}],
                        sortColumn: "ordr"
                    };

                    that.fetchedTables['_dataLoci'] = {
                        tableName: MetaData.tableMarkerLociInfo,
                        columns: [{ name: "LocusID" }, { name: "GenomicRegion" }, { name: "LocusType" }, { name: "GeneName" }, { name: "Name" }, { name: "Comments"}],
                        sortColumn: "ordr"
                    };

                    that.fetchedTables['_dataLociSnps'] = {
                        tableName: MetaData.tableMarkerLociSnpInfo,
                        columns: [{ name: "GeneName" }, { name: "GenomicRegion" }, { name: "Name"}],
                        sortColumn: "GenomicRegion"
                    };


                    that.fetchedTables['_dataLociVariants'] = {
                        tableName: MetaData.tableMarkerLociVariantInfo,
                        columns: [{ name: "LocusID" }, { name: "VariantID" }, { name: "Mutant" }, { name: "Name" }, { name: "Color" }, { name: "Comments"}],
                        sortColumn: "ordr"
                    };

                    that.fetchedTables['_dataSites'] = {
                        tableName: MetaData.tableSiteInfo,
                        columns: [{ name: "location" }, { name: "name" }, { name: "lattit", encoding: "F3" }, { name: "longit", encoding: "F3" }, { name: "country"}],
                        sortColumn: "country"
                    };

                    that.fetchedTables['_dataStudies'] = {
                        tableName: MetaData.tableStudy,
                        columns: [{ name: "study" }, { name: "study_code", encoding: "IN" }, { name: "title" }, { name: "description" }, { name: "people" }, { name: "full_study", encoding: "IN"}],
                        sortColumn: "study_code"
                    };

                    that.fetchedTables['_dataSampleContexts'] = {
                        tableName: MetaData.tableSampleContextInfo,
                        columns: [{ name: "sample_context" }, { name: "title" }, { name: "description" }, { name: "study" }, { name: "location" }, { name: "samplecount", encoding: "IN"}],
                        sortColumn: "title"
                    };

                    that.fetchedTables['_dataSamples'] = {
                        tableName: MetaData.tableSample,
                        columns: [{ name: "sample" }, { name: "sample_context" }, { name: "is_public", encoding: "IN"}],
                        sortColumn: "sample"
                    };

                    that.fetchedTables['_dataSampleClassifications'] = {
                        tableName: MetaData.tableSampleClassification,
                        columns: [{ name: "sample_classification" }, { name: "sample_classification_type" }, { name: "name" }, { name: "lattit", encoding: "F3" }, { name: "longit", encoding: "F3"}],
                        sortColumn: "ordr"
                    };

                    that.fetchedTables['_dataSampleClassificationTypes'] = {
                        tableName: MetaData.tableSampleClassificationType,
                        columns: [{ name: "sample_classification_type" }, { name: "name" }, { name: "name" }, { name: "description"}],
                        sortColumn: "ordr"
                    };

                    that.fetchedTables['dataSampleClassificationContextCount'] = {
                        tableName: MetaData.tableSampleClassificationContextCount,
                        columns: [{ name: "sample_classification" }, { name: "sample_context" }, { name: "count", encoding: "IN"}],
                        sortColumn: "sample_classification"
                    };

                    //Perform all the data fetching
                    $.each(that.fetchedTables, function (ID, tableInfo) {
                        var fetcher = DataFetcher.RecordsetFetcher(serverUrl, MetaData.database, tableInfo.tableName);
                        $.each(tableInfo.columns, function (colidx, columnInfo) {
                            var encoding = columnInfo.encoding;
                            if (!encoding) encoding = 'ST';
                            fetcher.addColumn(columnInfo.name, encoding);
                        });
                        fetcher.getData(SQL.WhereClause.Trivial(), tableInfo.sortColumn, function (data) {
                            that[ID] = data;
                            //DQX.stopProcessing();
                            that.tryBuildMetaDataStructures(data);
                        },
                            function (msg) { that.handleFetchError(msg + ' data: ' + tableInfo.tableName); }
                        );
                        //DQX.setProcessing("Downloading...");
                    });

                }

                that.fetchLociMetaInfo();

                return that;
            }

        };
        return PrefetchData;
    });
