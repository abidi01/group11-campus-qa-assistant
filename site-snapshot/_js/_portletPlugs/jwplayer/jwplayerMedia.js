/* 
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */

//var browser = navigator.appName;
//var isLessThanIE8 = false;
//var b_version = navigator.appVersion;
//var version = b_version.split(";");
//var trim_Version = version[1].replace(/[ ]/g, "");
//if (browser === "Microsoft Internet Explorer") {
//    if (trim_Version === "MSIE6.0" || trim_Version === "MSIE7.0" || trim_Version === "MSIE8.0") {
//        isLessThanIE8 = true;
//    }
//}
var jwplayerIE8_playurl = "/_js/_portletPlugs/jwplayer/player.swf";
var jwplayer_playurl = "/_js/_portletPlugs/jwplayer/jwplayer.flash.swf";
var playImg = "/_images/mediaType/video.jpg";
var playThumbnail = "/_js/_portletPlugs/jwplayer/img/images/preview.jpg";
var context = "";
var player;
var fls = flashChecker();
if (/Android|Windows Phone|webOS|iPhone|iPod|iPad|BlackBerry/i.test(navigator.userAgent)) {
    fls.f = 0;
//    localeChain = "en_US";
}

$().ready(function() {
    $("script[sudy-wp-context]").each(function(i) {
        context = $(this).attr("sudy-wp-context");
        if (context) {
            context = "/" + context;
        }
    });
    changeVideoHtml();
    $(".wp_audio_player,div[sudyplayer='wp_audio_player'],img[sudyplayer='wp_audio_player']").each(function(i) {
        var id = $(this).attr("id");
        var _src = $(this).attr("sudy-wp-player");
        if (!_src) {
            _src = $(this).attr("sudy-wp-src");
        }
        if (!_src) {
            _src = $(this).attr("src");
        }
        if (!window.applicationCache && typeof(Worker) == "undefined") {
            player = jwplayerIE8(id).setup({
                flashplayer: context + jwplayerIE8_playurl,
                file: _src,
                width: 500,
                height: 23,
                autostart: $(this).attr("autostart"),
                repeat: $(this).attr("repeat") === "true" ? "always" : $(this).attr("repeat"),
                controlbar: 'bottom'
            });
             player.onReady(function() {//准备就绪设置浮动方式
                if (floatt)
                    $("#" + id + "_wrapper").css("float", floatt);
                if (margin){
					$("#" + id + "_wrapper").css("margin", "0 auto");
                    $("#" + id + "_wrapper").css("display", "block");
                    $("#" + id).css("margin", "0 auto");
                    $("#" + id).css("display", "block");
				}
            });
        } else {
        	var jwId = $(this).attr("id");
            jwId = "id" + jwId;
            jwId = jwId.replace(/\./gi, "0");
            var autoplay = $(this).attr("autostart");
            $(this).attr("id", jwId);
            var con = '<audio controls="controls" ';
			if ($(this).attr("repeat") === "true") {
				con += ' loop="' + ($(this).attr("repeat") === "true" ? "always" : $(this).attr("repeat"))+'" ';
			}
			con += ' src="'+_src+'" preload controls="controls" width="500" height="23" ><p>Your user agent does not support the HTML5 Video element.</p></audio>';
			if (autoplay === "true") {
            	con = '<audio controls="controls" autoplay muted ';
				if ($(this).attr("repeat") === "true") {
					con += ' loop="' + ($(this).attr("repeat") === "true" ? "always" : $(this).attr("repeat")) + '" ';
				}
				con += ' src="'+_src+'" preload controls="controls" width="500" height="23" ><p>Your user agent does not support the HTML5 Video element.</p></audio>';
        	}
        	$(this).html(con);
        }
    });
//     $("img[sudyplayer='wp_video_player']").each(function(i) {
//        var id = $(this).attr("id");
//        var _class = $(this).attr("class");
//        var _style = $(this).attr("style");
//        var sudy_wp_player = $(this).attr("sudy-wp-player");
//        var sudy_wp_src = $(this).attr("sudy-wp-src");
//        var _src = $(this).attr("src");
//        var sudy_wp_thumb = $(this).attr("sudy-wp-thumb");
//        var _autostart = $(this).attr("autostart");
//        var _repeat = $(this).attr("repeat");
//        $($(this).parent()).append("<div id=\""+id+"\" class=\""+_class+"\" style=\""+_style+"\" sudy-wp-player=\""+sudy_wp_player+"\" sudy-wp-src=\""+sudy_wp_src+"\" src=\""+_src+"\" sudy-wp-thumb=\""+sudy_wp_thumb+"\" autostart=\""+_autostart+"\" repeat=\""+_repeat+"\"></div>");
//        $(this).remove();
//    });
    $(".wp_video_player,div[sudyplayer='wp_video_player'],img[sudyplayer='wp_video_player']").each(function(i) {
        if (!$(this).attr("style")) {
            $(this).css("width", "600px");
            $(this).css("height", "400px");
        }
        try {
            if (/Android|Windows Phone|webOS|iPhone|iPod|iPad|BlackBerry/i.test(navigator.userAgent)) {
                var width1 = parseInt($(this).css("width"));
                var height1 = parseInt($(this).css("height"));
                if (width1 > document.body.clientWidth) {
                    $(this).css("width", "100%");
                    $(this).css("height", Math.floor(height1 * (document.body.clientWidth / width1)) + "px");
                }
            }
        } catch (e) {
        }
        var id = $(this).attr("id");
        var _src = $(this).attr("sudy-wp-player");
        if (!_src) {
            _src = $(this).attr("sudy-wp-src");
        }
        if (!_src) {
            _src = $(this).attr("src");
        }
        if ((!window.applicationCache && typeof(Worker) == "undefined") || !isMp4(_src)) {
            var floatt = $("#" + id).css("float");
            //var margin = $("#"+id).css("margin");
            var margin = document.getElementById(id).style.margin;
            player = jwplayerIE8(id).setup({
                flashplayer: context + jwplayerIE8_playurl,
                file: _src,
                image: $(this).attr("sudy-wp-thumb") ? $(this).attr("sudy-wp-thumb") : context + playThumbnail,
                width: $(this).css("width").replace(/px/gi, ""),
                height: $(this).css("height").replace(/px/gi, ""),
                autostart: $(this).attr("autostart"),
                repeat: $(this).attr("repeat") === "true" ? "always" : $(this).attr("repeat"),
                controlbar: 'bottom'
            });
            player.onReady(function() {//准备就绪设置浮动方式
                if (floatt)
                    $("#" + id + "_wrapper").css("float", floatt);
                if (margin){
					$("#" + id + "_wrapper").css("margin", "0 auto");
                    $("#" + id + "_wrapper").css("display", "block");
                    $("#" + id).css("margin", "0 auto");
                    $("#" + id).css("display", "block");
				}
            });
        } else {
            var allowfullscreen = $(this).attr("allowfullscreen");
            var jwId = $(this).attr("id");
            jwId = "id" + jwId;
            jwId = jwId.replace(/\./gi, "0");
            var autoplay = $(this).attr("autostart"); 
            $(this).attr("id", jwId);
            var con = '<video  controls="controls" ';
            if(allowfullscreen === 'false'){
                con += '    controlsList="nofullscreen" ';
            }
			if ($(this).attr("repeat") === "true") {
				con += ' loop="' + ($(this).attr("repeat") === "true" ? "always" : $(this).attr("repeat")) + '" ';
			}
			con += ' src="'+_src+'" poster="'+($(this).attr("sudy-wp-thumb") ? $(this).attr("sudy-wp-thumb") : "")+'" preload="true" controls="controls" width="'+$(this).css("width").replace(/px/gi, "")+'" height="'+$(this).css("height").replace(/px/gi, "")+'" ><p>Your user agent does not support the HTML5 Video element.</p></video>';
			if(autoplay === "true"){
            	con = '<video  controls="controls" autoplay muted ';
				if ($(this).attr("repeat") === "true") {
					con += ' loop="' + ($(this).attr("repeat") === "true" ? "always" : $(this).attr("repeat")) + '" ';
				}
				con += ' src="'+_src+'" poster="'+($(this).attr("sudy-wp-thumb") ? $(this).attr("sudy-wp-thumb") : "")+'" preload="true" controls="controls" width="'+$(this).css("width").replace(/px/gi, "")+'" height="'+$(this).css("height").replace(/px/gi, "")+'" ><p>Your user agent does not support the HTML5 Video element.</p></video>';
        	}
        	$(this).html(con);
    //     	if(autoplay === "true"){
				// setTimeout(function (){
	 		// 		var _video = $("#"+jwId+'video');
	 		// 		_video[0].muted = "false";
				// 	_video[0].play();
    //     		},3000);
    //     	}
        	
            // player = jwplayer(jwId).setup({
            //     flashplayer: context + jwplayer_playurl,
            //     file: _src,
            //     image: $(this).attr("sudy-wp-thumb") ? $(this).attr("sudy-wp-thumb") : context + playThumbnail,
            //     width: $(this).css("width").replace(/px/gi, ""),
            //     height: $(this).css("height").replace(/px/gi, ""),
            //     autostart: $(this).attr("autostart"),
            //     repeat: $(this).attr("repeat") === "true" ? "always" : $(this).attr("repeat"),
            //     controlbar: 'bottom'
            // });
            // var floatt = $(this).css("float");
            // var margin = $(this).css("margin");
            // player.onReady(function() {//准备就绪设置浮动方式
            //     if (floatt) {
            //         $("#" + jwId).css("float", floatt);
            //         $("#" + jwId + "_wrapper").css("float", floatt);
            //     }
            //     if (margin) {
            //         $("#" + jwId).css("margin", margin);
            //         $("#" + jwId + "_wrapper").css("margin", margin);
            //     }
            // });
        }
    });
});
function changeVideoHtml() {
    var isIe = isIE();
    $(".wp_video_player,div[sudyplayer='wp_video_player'],img[sudyplayer='wp_video_player']").each(function(i) {
        var _src = $(this).attr("src");
        var _sudyvideosrc = $(this).attr("sudyurl");
        var _sudyvideoplayersrc = $(this).attr("targeturl");
        if (!_sudyvideosrc) {
            _sudyvideosrc = _src;
        }
        if (!_sudyvideosrc) {
            _sudyvideosrc = $(this).attr("sudy-wp-src");
        }
        if (!_sudyvideosrc) {
            _sudyvideosrc = $(this).attr("src");
        }
        if (_sudyvideosrc) {
            var width = $(this).css("width");
            var height = $(this).css("height");
            var style = $(this).attr("style");
            if(!isIe && !fls.f && !isMp4(_sudyvideosrc)){
                var content = (style ? '<div style="' + style + '">' : '') + '<embed type="application/x-shockwave-flash" pluginspage="http://www.macromedia.com/go/getflashplayer" width="' + width + '" height="' + height + '">' + (style ? '</div>' : '');
                $($(this)).replaceWith(content);
            }
        }
    });
    $("embed").each(function(i) {
        var content = "";
        var sudyvideosrc = $(this).attr("sudy-wp-player");
        if (!sudyvideosrc) {
            sudyvideosrc = $(this).attr("src");
        }
        //排除模板上的flash
        if (sudyvideosrc.indexOf("/_upload/tpl/") != -1) {
            var width = $(this).attr("width");
            var height = $(this).attr("height");
            var play = $(this).attr("autostart");
            var loop = $(this).attr("repeat");
            var allowfullscreen = $(this).attr("allowfullscreen");
            if (JWPlayer(sudyvideosrc)) {
                content = convAnaly(isIe, sudyvideosrc, null, width, height, play, loop, allowfullscreen);
                $($(this)).replaceWith(content);
            } else if (!isIe) {
                content = convAnaly(isIe, sudyvideosrc, null, width, height, play, loop, allowfullscreen);
                $($(this)).replaceWith(content);
            }
        }
    });
    $(".wp_video_player,div[sudyplayer='wp_video_player'],img[sudyplayer='wp_video_player']").each(function(i) {
        var sudyvideosrc = $(this).attr("sudy-wp-player");
        if (!sudyvideosrc) {
            sudyvideosrc = $(this).attr("sudy-wp-src");
        }
        if (!sudyvideosrc) {
            sudyvideosrc = $(this).attr("src");
        }
        var content = "";
        var width = $(this).css("width");
        var height = $(this).css("height");
        var sudyattr = $(this).attr("sudy-wp-thumb");
        var play = $(this).attr("autostart");
        var loop = $(this).attr("repeat");
        var allowfullscreen = $(this).attr("allowfullscreen");
        var style = $(this).attr("style");
        if (sudyvideosrc && !JWPlayer(sudyvideosrc)) {
            content = convAnaly(isIe, sudyvideosrc, sudyattr, width, height, play, loop, allowfullscreen, style);
            $($(this)).replaceWith(content);
        }
    });
}
function convAnaly(isIe, sudyvideosrc, sudyattr, width, height, play, loop, allowfullscreen, style) {
    var content = "";
    if (JWPlayer(sudyvideosrc)) {
        content = '<div style="width:' + width + 'px;height:' + height + 'px;' + '" id="' + Math.random() + '" class="wp_video_player" sudyplayer="wp_video_player" sudyvideo-src="' + sudyvideosrc + '" autostart="' + play + '" repeat="' + loop + '" allowfullscreen="' + allowfullscreen + '"></div>';
    } else if (!isIe && (!FlashPlayer(sudyvideosrc) || (FlashPlayer(sudyvideosrc) && !fls.f))) {
        content = (style ? '<div style="' + style + '">' : '') + '<a href="' + sudyvideosrc + '"><img class="sudy-image-140" src="' + (sudyattr ? sudyattr : playImg) + '" style="width:' + width + ';height: ' + height + '"></a>' + (style ? '</div>' : '');
    } if (QuickTime(sudyvideosrc) !== null) {
        content = '<video src="' + sudyvideosrc + '" width="' + width + '" height="' + height + '" autoplay="' + play + '" muted ';
		if (loop === "true") {
			content += ' loop="' + loop + '" ';
		}
		content += ' controls="controls"></video>';
   } else {
        var uploadSrcType = "";
        if (WinPlayer(sudyvideosrc) !== null) {
            uploadSrcType = 'application/x-mplayer2';
        } else if (RealPlayer(sudyvideosrc) !== null) {
            uploadSrcType = 'audio/x-pn-realaudio-plugin';
//        } else if (QuickTime(sudyvideosrc) !== null) {
//            uploadSrcType = 'video/quicktime';
        } else if (FlashPlayer(sudyvideosrc) !== null) {
            uploadSrcType = 'application/x-shockwave-flash';
        } else if (AudioPlayer(sudyvideosrc) !== null) {
            uploadSrcType = 'audio/mpeg';
		}else{
        	 return '<div style="' + style + '"><iframe style="border:0px;" src="' + sudyvideosrc + '" width="' + width + '" height="' + height + '"></iframe></div>';
        }
        content = (style ? '<div style="' + style + '">' : '') + '<embed type="' + uploadSrcType + '" class="edui-faked-video" pluginspage="http://www.macromedia.com/go/getflashplayer"' +
                ' src="' + sudyvideosrc + '" width="' + width + '" height="' + height + '"' +
                ' wmode="opaque" play="' + play + '" ';
		if (loop === "true") {
			content += ' loop="' + loop + '" ';
		}
		content += ' menu="false" allownetworking="none" allowscriptaccess="never" allowfullscreen="' + allowfullscreen + '" >' + (style ? '</div>' : '');
    }
    return content;
}
function JWPlayer(url) {
    var r, re;
    re = /.(mp4|flv|f4v|3gp|mid|mpg|mp3|wav|ogg)$/i;
    r = url.match(re);
    return r;
}
function WinPlayer(url) {
    var r, re;
    re = /.(avi|wmv|asf|mid|mpg)$/i;
    r = url.match(re);
    return r;
}
function RealPlayer(url) {
    var r, re;
    re = /.(rm|ra|rmvb|ram)$/i;
    r = url.match(re);
    return r;
}
function QuickTime(url) {
    var r, re;
    re = /.(mov|qt|quicktime)$/i;
    r = url.match(re);
    return r;
}
function FlashPlayer(url) {
    var r, re;
    re = /.swf$/i;
    r = url.match(re);
    return r;
}
function AudioPlayer(url) {
    var r, re;
    re = /.(mp3|wav|ogg|mpg)$/i;
    r = url.match(re);
    return r;
}
function VideoPlayer(url) {
    var r, re;
    re = /.(mp4|flv|f4v)$/i;
    r = url.match(re);
    return r;
}
function FlvPlayer(url) {
    var r, re;
    re = /.(flv.x|flv|FLVPlayer_Progressive.swf)$/i;
    r = url.match(re);
    return r;
}
function isIE() { //ie?  
    if (!!window.ActiveXObject || "ActiveXObject" in window)
        return true;
    else
        return false;
}
function isMp4(url) {
    var r, re;
    re = /.(mp4)$/i;
    r = url.match(re);
    return r;
}
function flashChecker() {
    var hasFlash = 0; //是否安装了flash 
    var flashVersion = 0; //flash版本 
    if (document.all) {
        try {
            var swf = new ActiveXObject('ShockwaveFlash.ShockwaveFlash');
            if (swf) {
                hasFlash = 1;
                VSwf = swf.GetVariable("$version");
                flashVersion = parseInt(VSwf.split(" ")[1].split(",")[0]);
            }
        } catch (e) {
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
    return {
        f: hasFlash,
        v: flashVersion
    };
}