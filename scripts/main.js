if (typeof versionString == 'undefined')
    alert('Fatal error: versionString is missing');
require.config({
    baseUrl: "scripts",
    paths: {
        jquery: "DQX/Externals/jquery",
        d3: "DQX/Externals/d3",
        handlebars: "DQX/Externals/handlebars",
        markdown: "DQX/Externals/markdown",
        DQX: "DQX",
        easel: "createjs-2013.05.14.min",
        tween: "Tween",
        clusterfck: "clusterfck",
        'lodash': "lodash"
    },
    shim: {
        d3: {
            exports: 'd3'
        },
        handlebars: {
            exports: 'Handlebars'
        },
        easel: {
            exports: 'createjs'
        },
        tween: {
            exports: 'TWEEN'
        },
        clusterfck: {
            exports: 'clusterfck'
        }
},
    waitSeconds: 15,
    urlArgs: "version="+versionString
});

require(["jquery", "DQX/Application", "DQX/Framework", "DQX/Msg", "DQX/HistoryManager", "DQX/Utils", "PrefetchData", "Views/Intro", "Views/SampleBrowser"],
    function ($, Application, Framework, Msg, HistoryManager, DQX, PrefetchData, Intro, SampleBrowser) {
        $(function () {
            Intro.init();
            SampleBrowser.init();
            Application.setHeader('Application Header');
            //Provide a hook to fetch some data upfront from the server. Upon completion, 'proceedFunction' should be called;
            Application.customInitFunction = function(proceedFunction) {
                Application.prefetched = PrefetchData.fetch(proceedFunction);
            };
            //Initialise the application
            Application.init('Genome Browser');
        });
    });
