$(function(){
	/*主大图切换*/
	
	/*新闻图片切换*/
	
	$('.post-14 .con').slick({
			dots: false,  //指示点
			infinite: true,  //循环播放
			autoplay: true,  //自动播放
			autoplaySpeed: 5000, //自动播放间隔
			arrows: false,  //左右箭头
			useCSS: true,  //使用 CSS3 过度
			speed: 600,  //滑动时间
			slide: '.slk',  //滑动元素查询
			slidesToShow: 1,  //幻灯片每屏显示个数
			slidesToScroll: 1,  //幻灯片每次滑动个数
			responsive: [   //断点触发设置
				
			]
	});
	


});
