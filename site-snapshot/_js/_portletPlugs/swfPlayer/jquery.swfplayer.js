/* 
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
//document.write('<script type="text/javascript" src="' + '' + '/_test/flexpaper2/flexpaper.css"></script>');
//document.write('<script type="text/javascript" src="' + '' + '/_test/flexpaper2/jquery.extensions.min.js"></script>');
//document.write('<script type="text/javascript" src="' + '' + '/_test/flexpaper2/flexpaper_handlers.js"></script>');
(function () {
    var context = "";
    $("script[sudy-wp-context]").each(function (i) {
        context = $(this).attr("sudy-wp-context");
        if (context) {
            context = "/" + context;
        }else{
            context="";
        }
    });
    if (!context) {
        context = "";
    }

    var userAgent = navigator.userAgent;
    var isIE = userAgent.indexOf("compatible") > -1 && userAgent.indexOf("MSIE") > -1; //判断是否IE<11浏览器
    if (isIE) {
        document.write('<script type="text/javascript" src="'+context+'/_js/_portletPlugs/swfPlayer/map.js"></script>');
    }
    document.write('<link type="text/css" href="' + context + '/_js/_portletPlugs/swfPlayer/pdfjs/view.css" rel="stylesheet" />');
    document.write('<link rel="resource" type="application/l10n" href="' + context + '/_js/_portletPlugs/swfPlayer/pdfjs/locale/locale.properties" />');
    // document.write('<script type="text/javascript" src="/_js/_portletPlugs/swfPlayer/pdfjs/build/pdf.js"></script> ');
    document.write('<script type="text/javascript" src="' + context + '/_js/_portletPlugs/swfPlayer/jquery.swfplayer1.js?t=' + new Date().getTime() + '"></script>');

})();