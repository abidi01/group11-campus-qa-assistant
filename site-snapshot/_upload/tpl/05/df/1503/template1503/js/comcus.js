$(function () {

        $('.ripple-menu').on('click', function() {
          $(this).find('.ripple-burger').stop(true, true).toggleClass('open');
        });

        $('.ripple-burger').on('mouseenter mouseleave', function(e) {
          var rect = this.getBoundingClientRect();
          var x = e.clientX - rect.left;
          var y = e.clientY - rect.top;
          $(this).find('.ripple-cover').css('transform-origin', x + 'px ' + y + 'px');
        });

	$(".search-submit").click(function (event) {
		$(this).removeAttr("name");
		event.preventDefault();
		var val = $.trim($(".search-title").val());
		if (val !== "") {
			$(".wp-search").find("form").submit();
		} else {
			alert("请输入关键词");
		}
		return false;
	});
$(".opensearch").click(function(){
		$(".search_screen").addClass("active")
		$("body").addClass("showsearch")
		})
		$(".header .close").click(function(){
		$(".search_screen").removeClass("active")
		$("body").removeClass("showsearch")
		})
var str1 = $(".foot-bottom p").text();
	var str2 =  str1.replace("苏ICP备12023610号-1", "<a href='https://beian.miit.gov.cn/' target='_blank'>苏ICP备12023610号-1</a>").replace("苏公网安备32010602011857", "<span class='beian'>苏公网安备32010602011857</span>");
	$(".foot-bottom p").html(str2);
});

 $('.ripple-menu').on('click', function() {
          $(this).find('.ripple-burger').stop(true, true).toggleClass('open');
        });
fontSize();
	$(window).resize(function () {
		fontSize();
	});

	function fontSize() {
		var size;
		var winW = window.innerWidth;
		if (winW <= 3800&& winW > 999) {
			size = Math.round(winW / 19.2);
		} else if (winW <= 999) {
			size = 65;
		} else {
			size = 100;
		}
		$('html').css({
			'font-size': size + 'px'
		})
	}