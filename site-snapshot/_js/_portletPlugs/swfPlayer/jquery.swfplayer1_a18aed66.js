/* 
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
var context = "";
var localeChain = "zh_CN";
var pdfDocs = null;
var pageNums = null;
var cuur_scale = 1;
var url = '';
$("script[sudy-wp-context]").each(function (i) {
    context = $(this).attr("sudy-wp-context");
    if (context) {
        context = "/" + context;
    }else{
    	context="";
    }
});
var fls = flashChecker();
if (/Android|Windows Phone|webOS|iPhone|iPod|iPad|BlackBerry/i.test(navigator.userAgent)) {
    fls.f = 0;
//    localeChain = "en_US";
}
if (fls.f === 0) {
    document.write('<script type="text/javascript" src="' + context + '/_js/_portletPlugs/swfPlayer/flexpaper2/flexpaper.js"></script>');
}
$().ready(function () {
    $("script[sudy-wp-context]").each(function (i) {
        context = $(this).attr("sudy-wp-context");
        if (context) {
            context = "/" + context;
        }else{
            context="";
        }
    });
//        document.write("您安装了flash,当前flash版本为: " + fls.v + ".x");
    $("a[sudy-wp-player]").each(function (i) {
        var _href = $(this).attr("href");
        var _sudyvideoplayersrc = $(this).attr("sudy-wp-player");
        _href = _href.substring(0, _href.lastIndexOf("/") + 1) + _sudyvideoplayersrc;
        if (swfPlayer(_href) !== null) {
            var prev = $($(this)).prev("img[src*=icon]");
            $($(this)).replaceWith("<div id=\"" + Math.random() + "\" swsrc=\"" + _href + "\" pdfsrc=\"" + $(this).attr("href") + "\" class=\"wp_pdf_player\" sudyplayer=\"wp_pdf_player\"></div>");
            if (prev) {
                prev.remove();
            }
        } else if (!jsPlayer(_href)) {
            $(this).attr("href", _href);
        }
    });

    $(".wp_pdf_player,div[sudyplayer='wp_pdf_player'],img[sudyplayer='wp_pdf_player']").each(function (i) {

        if (!$(this).attr("class")) {
            $(this).css("width", "100%");
            $(this).css("height", "700px");
        }
        if (!$(this).attr("class")) {
            $(this).attr("class", $(this).attr("sudyplayer"));
        }
        var id = $(this).attr("id");
        var swfsrc = $(this).attr("swsrc");
        var pdfsrc = $(this).attr("pdfsrc");
        var flexpaper = (context?context:"") + "/_js/_portletPlugs/swfPlayer/flexpaper/FlexPaper_flash/FlexPaperViewer";
        var uuid = Math.random().toString();
        /**
         * 如果本地安装了flash则用原来的方式播放,如果没有安装flash则使用新的方式播放
         */
        $(this).html('<canvas id="sudy-pdf-canvas'+id+'"></canvas>');
         if (!document.getElementById("sudy-pdf-canvas"+id) || !document.getElementById("sudy-pdf-canvas"+id).getContext) {
            $(this).html("");
            if (true) {
                new FlexPaperViewer(flexpaper, id, {config: {
                        SwfFile: escape(swfsrc + "?src=" + pdfsrc + "&t=" + uuid),
                        Scale: 1.0,
                        ZoomTransition: "easeOut",
                        ZoomTime: 0.5,
                        ZoomInterval: 0.2,
                        FitPageOnLoad: false,
                        FitWidthOnLoad: false,
                        FullScreenAsMaxWindow: false,
                        ProgressiveLoading: false,
                        MinZoomSize: 0.2,
                        MaxZoomSize: 5,
                        SearchMatchAll: false,
                        InitViewMode: "Portrait",
                        PrintPaperAsBitmap: false,
                        ViewModeToolsVisible: true,
                        ZoomToolsVisible: true,
                        NavToolsVisible: true,
                        CursorToolsVisible: false,
                        SearchToolsVisible: false,
                        localeChain: localeChain
                    }});
            }
            return;
        }
        if(true){
            if(pdfsrc?.endsWith('.ofd')){
                $(this).replaceWith('<iframe class="wp_pdf_player" src="'+context+'/_js/_portletPlugs/swfPlayer/ofd/ofdview.html?file='+pdfsrc+'"/>');
                return;
            }
        	var userAgent = navigator.userAgent; //取得浏览器的userAgent字符串  
            var isIE = userAgent.indexOf("compatible") > -1 && userAgent.indexOf("MSIE") > -1; //判断是否IE<11浏览器  
            if(isIE){
            	$(this).replaceWith('<iframe class="wp_pdf_player" src="'+context+'/_js/_portletPlugs/swfPlayer/pdfjs/viewer.html?file='+pdfsrc+'"/>');
        		return;
            }
			$(this).replaceWith('<iframe class="wp_pdf_player" src="'+context+'/_js/_portletPlugs/swfPlayer/pdfjs22228/web/viewer.html?file='+pdfsrc+'"/>');
        	return;
        }
        if(pdfDocs == null){
        	pdfDocs = new Map();
			pageNums = new Map();
        }
        $(this).html('<div data-data="" class="pictureswitch" data-pictureswitch="">' +
                '<div class="section">' +
                '<div class="p-head border-1px">' +
                '<div class=" barset">' +
                '<a  id="zoomOut'+id+'"><img style="margin-top:0px;" src="' + context + '/_js/_portletPlugs/swfPlayer/img/amplify.png" title="放大" /></a>' +
                '<a  id="zoomIn'+id+'"><img style="margin-top:0px;" src="' + context + '/_js/_portletPlugs/swfPlayer/img/reduce.png" title="缩小" /></a>' +
                '<a class="p-prev iconfont icon-Left" onclick="onPrevPage(\''+id+'\')"></a>' +
                '<span class="p-active  p-active'+id+'">1</span>' +
                '<span>/</span>' +
                '<span class="p-pages p-pages'+id+'">2</span>' +
                '<a class="p-next iconfont icon-right" onclick="onNextPage(\''+id+'\')"></a>' +
                '<select class="p-go p-go'+id+'"><option value="1">第1页</option><option value="2">第2页</option></select>' +
                '</div>' +
                ' </div>' +
                '<div class="p-cont">' +
                '<div id="wrap'+id+'" class="p-wrap">' +
                '<canvas id="sudy-pdf-canvas'+id+'"></canvas>' +
                '</div>' +
                '</div>' +
                '</div>' +
                '</div>');
        url = $(this).attr("pdfsrc");
        PDFJS.getDocument(url).then(function (pdfDoc_) {
        	pdfDocs.set(id,pdfDoc_); 
            var pdfDoc = pdfDoc_;
            var pageNum = pageNums.get(id);
			if(!pageNum){
				pageNum=1;
			}
            queueRenderPage(pageNum, -1,id);
            var selectTemplate = '';
            for (var i = 0; i < pdfDoc.numPages; i++) {
                selectTemplate += '<option value="' + (i + 1) + '">第' + (i + 1) + '页</option>'
            }
            $(".p-go"+id).html(selectTemplate);
            $(".p-pages"+id).html(pdfDoc.numPages);
        });
        $(".p-go"+id).on('change', function () {
            var pageNum = parseInt($(".p-go"+id).val());
            var pdfDoc = pdfDocs.get(id); 
            if (pageNum) {
                if (pageNum < 0) {
                    pageNum = 1;
                } else if (pageNum > pdfDoc.numPages) {
                    pageNum = pdfDoc.numPages;
                }
                pageNums.set(id,pageNum); 
                queueRenderPage(pageNum, -1,id);
                
            }
        });
        var zoomIn = document.getElementById('zoomIn'+id);
        var zoomOut = document.getElementById('zoomOut'+id);
        zoomIn.addEventListener('click', function () {
        	var pageNum = pageNums.get(id);
			if(!pageNum){
				pageNum=1;
			}
            var _cuur_scale = cuur_scale - 0.1;
            if (_cuur_scale <= 0) {
                _cuur_scale = cuur_scale;
            }
            queueRenderPage(pageNum, cuur_scale - 0.1,id);
        });
        zoomOut.addEventListener('click', function () {
        	var pageNum = pageNums.get(id);
			if(!pageNum){
				pageNum=1;
			}
            queueRenderPage(pageNum, cuur_scale + 0.1,id);

        });
    });
});
function onPrevPage(id) {
	var pdfDoc = pdfDocs.get(id);
	var pageNum = pageNums.get(id);
	if(!pageNum){
		pageNum=1;
	}
    pageNum--;
    if (pageNum <= 1) {
        pageNum=1;
    }
    pageNums.set(id,pageNum);
    queueRenderPage(pageNum, -1,id);
}
/**
 * Displays next page.
 */
function onNextPage(id) {
	var pdfDoc = pdfDocs.get(id);
	var pageNum = pageNums.get(id);
	if(!pageNum){
		pageNum=1;
	}
    if (pageNum >= pdfDoc.numPages) {
        return;
    }
    pageNum++;
    pageNums.set(id,pageNum);
    queueRenderPage(pageNum, -1,id);
}
function queueRenderPage(num, _scale,id) {
	var pdfDoc = pdfDocs.get(id);
	var num = pageNums.get(id);
	if(!num){
		num=1;
	}
    pdfDoc.getPage(num).then(function getPage(page) {
        var viewport = null;
        var scale = 1;
        if (_scale > 0) {
            scale = _scale;
            viewport = page.getViewport(scale);
        } else {
            viewport = page.getViewport(scale);
            var wrapw = parseInt($("#wrap"+id).css("width"));
            if (wrapw < viewport.width) {
                scale = wrapw / viewport.width;
                viewport = page.getViewport(scale)
            }
        }
        var canvas = document.getElementById('sudy-pdf-canvas'+id);
        context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        var renderContext = {
            canvasContext: context,
            viewport: viewport
        };
        cuur_scale = scale;
        page.render(renderContext);
        if (canvas.width > parseInt($(".wp_pdf_player").css("width"))) {
            if (_scale > 0) {
                //$(".wp_pdf_player").css("width", (canvas.width + 5) + "px");
            }
        } else {
            //$(".wp_pdf_player").css("width", (parseInt($(window).width()) - 16) + "px");
        }


    });
    $(".p-active"+id).html(num);
}
function swfPlayer(url) {
    var r, re;
    re = /.(swf)$/i;
    r = url.match(re);
    return r;
}
function jsPlayer(url) {
    var r, re;
    re = /.(js)$/i;
    r = url.match(re);
    return r;
}
function flashChecker() {
    var hasFlash = 0; //是否安装了flash 
    var flashVersion = 0; //flash版本 
    try{
	    if (document.all) {
	        var swf = new ActiveXObject('ShockwaveFlash.ShockwaveFlash');
	        if (swf) {
	            hasFlash = 1;
	            VSwf = swf.GetVariable("$version");
	            flashVersion = parseInt(VSwf.split(" ")[1].split(",")[0]);
	        }
	    } else {
	        if (navigator.plugins && navigator.plugins.length > 0) {
	            var swf = navigator.plugins["Shockwave Flash"];
	            if (swf) {
	                hasFlash = 1;
	                var words = swf.description.split(" ");
	                for (var i = 0; i < words.length; ++i) {
	                    if (isNaN(parseInt(words[i])))
	                        continue;
	                    flashVersion = parseInt(words[i]);
	                }
	            }
	        }
	    }
	}catch(e){}
    return {
        f: hasFlash,
        v: flashVersion
    };
}


