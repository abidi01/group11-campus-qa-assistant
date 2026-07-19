$(function(){
	$(".search-submit").click(function(event){
		$(this).removeAttr("name");
		event.preventDefault();
		var val = $.trim($(".search-title").val());
		if(val!==""){
			$(".wp-search").find("form").submit();
		}else{
			alert("请输入关键词");
		}
		return false;
	});
	$(".mbanner .focus").sudyfocus({      
		p:2,
		zWidth:1920,
		zHeight:900,
		title:{
			isAutoWidth: false,
			active:false
		},
		
		response: true,
		autoplay: false,  //自动播放
		speed:0, 
		pagination: false,
		navigation:false,
		isNavHover: false,
		href:true,
		effect: 'fade'
	});
	/*导航*/
	$.fn.sudyNav = function(){};
	$(".wp-menu li").hover(function() {
		$(this).siblings().find('.sub-menu').stop(true,true).slideUp(150)
		$(this).children('.sub-menu').stop(true,true).slideDown(200);
		$(this).addClass('hover');
	}, function() {
		$(this).children('.sub-menu').stop(true,true).slideUp(150);
		$(this).removeClass('hover');
    });
	
	$(".wp-menu li").each(function(){
		$(this).children(".menu-switch-arrow").appendTo($(this).children(".menu-link"));
	});
	

//以1920为基准比例，计算当前显示器分辨率和1920的缩放比例

var prec = $(window).width()/1920; 

if($(window).width() > 1920){    //判断缩放生效的显示器分辨率临界值

 $('.inner').css('zoom',prec)    //在对应的类名添加缩放样式

 }



	
});