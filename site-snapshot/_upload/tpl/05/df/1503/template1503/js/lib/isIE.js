function sToolBrowserVersion() {
    var ua = navigator.userAgent;
    var isIE = false;
    var version = null;
    var isOpera = ua.indexOf('Opera') > -1 || ua.indexOf('OPR/') > -1;

    if (ua.indexOf('Trident/') > -1 && ua.indexOf('rv:') > -1) {
        var rvMatch = /rv:(\d+\.\d+)/.exec(ua);
        if (rvMatch) {
            isIE = true;
            version = parseFloat(rvMatch[1]);
            return { isIE: isIE, version: version };
        }
    }

    if (ua.indexOf('MSIE ') > -1 && !isOpera) {
        var msieMatch = /MSIE\s(\d+\.\d+)/.exec(ua);
        if (msieMatch) {
            isIE = true;
            version = parseFloat(msieMatch[1]);
            return { isIE: isIE, version: version };
        }
    }

    return { isIE: isIE, version: version };
}
const o = sToolBrowserVersion();

if (o.isIE && o.version <= 11) {
    const html = '<div id="browser-modal"> <div class="browser-modal-cover"> </div>' +
        ' <div class="browser-content"> <div class="browser-text">' +
        ' <h3 class="browser-text-title">请升级浏览器版本</h3>' +
        ' <p class="browser-text-desc"> 你正在使用旧版本浏览器。请升级浏览器以获得更好的体验。 </p> ' +
        '</div> ' +
        '<div class="browser-list">' +
        ' <div class="browser-item"> <a href="https://www.google.cn/intl/zh-CN/chrome/" target="_blank">' +
        ' <div class="iconfont iconchrome"> </div> ' +
        '<h4>Chrome</h4> </a> </div> ' +
        '<div class="browser-item"> <a href="http://www.firefox.com.cn/" target="_blank">' +
        ' <div class="iconfont iconfirefox"> </div> ' +
        '<h4>Firefox</h4> </a> </div> ' +
        '<div class="browser-item"> <a href="https://www.apple.com.cn/safari/" target="_blank"> ' +
        '<div class="iconfont iconsafari"> </div>' +
        ' <h4>Safari</h4> </a> </div>' +
        ' <div class="browser-item"> <a href="https://www.microsoft.com/zh-cn/edge" target="_blank"> ' +
        '<div class="iconfont iconEdge"> </div> ' +
        '<h4>Edge</h4> </a> </div>' +
        ' </div> </div></div>'
    document.write(html)
} 