const baseUrl = document.getElementById('require').getAttribute('data-src').split('/js/main')[0]

require.config({

  baseUrl: baseUrl.includes('/tpl/') ? baseUrl : '',

  waitSeconds:60,

  paths: {
    'jquery': 'js/lib/jquery.min',
    'migrate': 'js/lib/jquery-migrate.min',
    'easing': 'js/lib/jquery.easing.min',
    'gsap': 'js/gsap/gsap.min',
    'scrolltrigger': 'js/gsap/ScrollTrigger.min',
    'until': 'js/gsap/until',
    'smoothscroll': 'js/gsap/custom_slide',
    'comcus': 'js/comcus',
    'lazyload': 'js/lib/lazyload.min',
    'slick': 'js/slick.min',
 'swiper': 'js/swiper_bundle_min',
    'tab': 'js/lib/jquery.sudyTab.min',
    'pen': 'js/pen',
 'wave': 'js/wave',
'drop': 'js/drop',
'mouse': 'js/mouse',
'swipert': 'js/swiper',
'three': 'js/three.min',
'hover-effect': 'js/hover-effect.umd',
  },
  map: {
    '*': {
      'min': 'js/lib/css.min'
    }
  },

shim: {
    'migrate': ['jquery'],
    'easing': ['jquery'],
    'comcus': ['jquery'],
    'scrolltrigger': ['gsap'],
    'until': ['gsap'],
    'lazyload': ['jquery'],
    'slick': ['jquery'],
    'tab': ['jquery'],
    'pen': ['jquery'],
    'wave': ['jquery'],
    'drop': ['jquery'],
    'mouse': ['jquery'],
 'swiper': ['jquery'],
 'swipert': ['jquery'],
'three': ['jquery'],
 'hover-effect': ['jquery'],
  },


  urlArgs: 'ver=0.0.11',

})

require(['jquery', 'migrate', 'smoothscroll', 'lazyload', 'easing', 'slick', 'swiper','tab', 'pen', 'comcus', 'scrolltrigger', 'until','wave','drop','mouse','swipert','three','hover-effect'], function (...args) {
  console.log(''.concat('%c------  Module Loading Completed  ------'), 'color: #ffffff font-size: 14px background: #1677ff padding: 8px 12px margin: 10px 0')
  const hoverEffect = args[args.length - 1];
const imagesEle = document.querySelectorAll('.mbanner .news_list .news img');
const imageTotal = imagesData.length;
const isReverse = new Array(imageTotal).fill(false);

const imageLoadPromises = Array.from(imagesEle).map(function(img) {
  return new Promise(function(resolve) {
    if (img.complete && img.naturalWidth !== undefined) {
      resolve();
      return;
    }
    img.onload = resolve;
    img.onerror = resolve;
  });
});

Promise.all(imageLoadPromises).then(function() {
  imagesData.forEach((item, index) => {
    const imgIndex = index + 1;
    const currentDom = document.querySelector(`.mbanner .news_list .news:nth-of-type(${imgIndex})`);
    const isVideo = Boolean(item.video);
    const source = isVideo ? item.video : item.img;
    const ratio = isVideo ? 1080 / 1920 : currentDom.querySelector('img').naturalHeight / currentDom.querySelector('img').naturalWidth;

    window[`effect_${imgIndex}`] = new hoverEffect({
      parent: currentDom.querySelector('a'),
      intensity: 0,
      video: isVideo,
      speedIn: 2,
      hover: false,
      image1: source,
      image2: source,
      imagesRatio: ratio,
      displacementImage: `${baseUrl}/images/displace.jpg`
    });
  });

  $('.mbanner .news_list').slick({
    dots: true,
    speed: 400,
    draggable: false,
    autoplay: true,
    autoplaySpeed: 6000
  });
});

$('.mbanner .news_list').on('afterChange', function(_, __, currentIndex){
  const effectIndex = currentIndex + 1;

  if (!isReverse[currentIndex]) {
    window[`effect_${effectIndex}`].next();
  } else {
    window[`effect_${effectIndex}`].previous();
  }
  
  isReverse[currentIndex] = !isReverse[currentIndex];
});
  $(".post-13 .news_list li").each(function () {
      if ($(this).attr("img-src") == "") {
        $(this).addClass("noimg");
      }
    });
$(".bb").click(function() {
    var vh = window.innerHeight;
    window.scrollTo({
        top: vh * 100 / 100, // 滚动到视窗高度的100%
        behavior: 'smooth' // 平滑滚动
    });
});
$(".post-22 .news").each(function(){
    var txt=$(this).find(".news_title").text().split("【")[1].split("】")[0]
    if(txt=="新华社"){
      $(this).find(".news_ico").addClass("xinhuashe")
    }else if(txt=="中国社会科学网"){
      $(this).find(".news_ico").addClass("zgshkxw")
    }else if(txt=="光明日报"){
      $(this).find(".news_ico").addClass("gmrb")
    }else if(txt=="教育部一线采风"){
      $(this).find(".news_ico").addClass("jybyxcf")
    }else if(txt=="环球网"){
      $(this).find(".news_ico").addClass("hqw")
    }else if(txt=="人民日报"){
      $(this).find(".news_ico").addClass("rmrb")
    }else if(txt=="人民网"){
      $(this).find(".news_ico").addClass("rmw")
    }else if(txt=="人民论坛网"){
      $(this).find(".news_ico").addClass("rmltw")
    }else if(txt=="央广网"){
      $(this).find(".news_ico").addClass("ygw")
    }else if(txt=="央视新闻"){
      $(this).find(".news_ico").addClass("ysxw")
    }else if(txt=="中国教育报"){
      $(this).find(".news_ico").addClass("zgjyb")
    }else if(txt=="教育部网站"){
      $(this).find(".news_ico").addClass("jybwz")
    }else if(txt=="交汇点"){
      $(this).find(".news_ico").addClass("jhd")
    }else if(txt=="学习强国"){
      $(this).find(".news_ico").addClass("xxqg")
    }else if(txt=="现代快报"){
      $(this).find(".news_ico").addClass("xdkb")
    }else if(txt=="中国日报网"){
      $(this).find(".news_ico").addClass("zgrbw")
    }else if(txt=="光明网"){
      $(this).find(".news_ico").addClass("gmw")
    }else if(txt=="中国青年网"){
      $(this).find(".news_ico").addClass("zgqnw")
    }else if(txt=="新华网"){
      $(this).find(".news_ico").addClass("xhw")
    }else if(txt=="荔枝新闻"){
      $(this).find(".news_ico").addClass("lzxw")
    }else if(txt=="新华日报"){
      $(this).find(".news_ico").addClass("xhrb")
    }else if(txt=="南京日报"){
      $(this).find(".news_ico").addClass("njrb")
    }else if(txt=="科技日报"){
      $(this).find(".news_ico").addClass("kjrb")
    }else if(txt=="中国青年报"){
      $(this).find(".news_ico").addClass("zgqnb")
    }else if(txt=="国际在线"){
      $(this).find(".news_ico").addClass("gjzx")
    }else if(txt=="中国新闻网"){
      $(this).find(".news_ico").addClass("zgxww")
    }else if(txt=="南京新闻"){
      $(this).find(".news_ico").addClass("njxw")
    }else if(txt=="澎湃新闻"){
      $(this).find(".news_ico").addClass("ppxw")
    }else if(txt=="江苏共青团"){
      $(this).find(".news_ico").addClass("jsgqt")
    }else if(txt=="南京发布"){
      $(this).find(".news_ico").addClass("njfb")
    }else if(txt=="中国江苏网"){
      $(this).find(".news_ico").addClass("zgjsw")
    }else if(txt=="江苏新时空"){
      $(this).find(".news_ico").addClass("jsxsk")
    }else if(txt=="中国水利报"){
      $(this).find(".news_ico").addClass("zgslb")
    }else if(txt=="江苏科技报"){
      $(this).find(".news_ico").addClass("jskjb")
    }else if(txt=="江南时报"){
      $(this).find(".news_ico").addClass("jnsb")
    }else if(txt=="人民政协报"){
      $(this).find(".news_ico").addClass("rmzxb")
    }else if(txt=="人民周刊"){
      $(this).find(".news_ico").addClass("rmzk")
    }else if(txt=="金陵晚报"){
      $(this).find(".news_ico").addClass("jlwb")
    }else if(txt=="农民日报"){
      $(this).find(".news_ico").addClass("nmrb")
    }else if(txt=="中国科技网"){
      $(this).find(".news_ico").addClass("zgkjw")
    }else if(txt=="紫金山新闻"){
      $(this).find(".news_ico").addClass("zjsxw")
    }else if(txt=="上海证券报"){
      $(this).find(".news_ico").addClass("shzjb")
    }else if(txt=="东方时空"){
      $(this).find(".news_ico").addClass("cctv")
    }else if(txt=="中国教育新闻网"){
      $(this).find(".news_ico").addClass("zgjyxww")
    }else if(txt=="中国气象报"){
      $(this).find(".news_ico").addClass("zgqxb")
    }else if(txt=="江苏教育报"){
      $(this).find(".news_ico").addClass("jsjyb")
    }else if(txt=="中国水利"){
      $(this).find(".news_ico").addClass("zgsl")
    }else if(txt=="CCTV"){
      $(this).find(".news_ico").addClass("cctv")
    }


  })
$('.main7 .post li.news .news_titled').each(function(){
var key=$(this).text();
if(key=='微博'){
$(this).parent().addClass("wb")
}
if(key=='微信'){
$(this).parent().addClass("wx")
}
if(key=='抖音'){
$(this).parent().addClass("dy")
}
if(key=='bilibili'){
$(this).parent().addClass("bz")
}
if(key=='视频号'){
$(this).parent().addClass("sph")
}
})
wave({
      canvasId: 'wave2',
      waveCount: 6,
      period: 6000,
      offset: -5,
      color: '#eaf3ff',
      opacity: 0.5
    });
    wave({
      canvasId: 'wave1',
      waveCount: 6,
      period: 11000,
      offset: 0,
      color: '#e9f3ff',
      opacity: 1
    });
    wave({
      canvasId: 'wave3',
      waveCount: 1,
      period: 30000,
      offset: 3.5,
      color: '#004098',
      opacity: 0.5
    });
    wave({
      canvasId: 'wave4',
      waveCount: 1,
      period: 60000,
      offset: 3,
      color: '#004098',
      opacity: 1
    });
    wave({
      canvasId: 'wave5',
      waveCount: 2,
      period: 15000,
      offset: 3.5,
      color: '#004098',
      opacity: 0.5
    });
    wave({
      canvasId: 'wave6',
      waveCount: 2,
      period: 30000,
      offset: 3,
      color: '#004098',
      opacity: 1
    });
    wave({
      canvasId: 'wave8',
      waveCount: 1,
      period: 30000,
      offset: -5,
      color: '#ffffff',
      opacity: 1
    });
    wave({
      canvasId: 'wave7',
      waveCount: 1,
      period: 60000,
      offset: 0,
      color: '#BED9FF',
      opacity: 0.32
    });
    wave({
      canvasId: 'wave9',
      waveCount: 1,
      period: 30000,
      offset: -5,
      color: '#e7edf9',
      opacity: 1
    });
    wave({
      canvasId: 'wave10',
      waveCount: 1,
      period: 60000,
      offset: 0,
      color: '#f1f7ff',
      opacity: 1
    });
wave({
      canvasId: 'wave11',
      waveCount: 2,
      period: 15000,
      offset: -5,
      color: '#ecf3fb',
      opacity: 1
    });
    wave({
      canvasId: 'wave12',
      waveCount: 2,
      period: 30000,
      offset: 0,
      color: '#f2f7fd',
      opacity: 1
    });
 function getRandomColor() {
          let letters = '0123456789ABCDEF';
          let color = '#';
          for (let i = 0; i < 6; i++) {
              color += letters[Math.floor(Math.random() * 16)];
          }
          return color;
        }

   $('.post-81 .news_list').slick({
    slide: 'li', //滑动元素查询
    dots: false,
    infinite: true,
    speed: 500,
    autoplay: false,
    autoplaySpeed: 5000,
    fade: false,
    centerMode: true, 
    slidesToShow: 3,
    slidesToScroll: 1,
    useCSS: false, //使用 CSS3 过度
    arrows: true, //左右箭头
    responsive: [
      {
        breakpoint: 999,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 1,
        }
      },
      {
        breakpoint: 479,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1
        }
      }
    ]
  });
// 头部动态加类
var header = $('.hhu-anchor'),
initScrh = $(window).scrollTop();

function changeHeader(scrH) {

	if (scrH > 300) {
		header.addClass('slide');
	} else {
		header.removeClass('slide');
	}
}
changeHeader(initScrh);
$(window).on('scroll', function () {
var _scrH = $(window).scrollTop();
changeHeader(_scrH);
});
$(".post-31 .list-r .news").each(function () {
    var today = new Date($(this).find(".news_meta").attr("date"));
    var day = today.getDay();
    var weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    var todayWeekday = weekdays[day];
    $(this).find(".news_week").text(todayWeekday)
  })
    $(".post-31").sudyTab({
    handle: ".list-r li",
    content: ".list-l li",
    trigger: "mouseenter",
    start: 1,
    autoPlay: {
      active: false
    }
  });
$('.swiper-scrollbar').html('');
  
	var Swiper5 = new Swiper(".swiper5", {
		visibilityFullFit: true,
speed: 300,
		onlyExternal: true,
                loop:true,
		slidesPerView: 1,
		breakpoints: { 
			999: { 
			  slidesPerView: 4,
		  
			},
			//当宽度小于等于640
			768: {
			  slidesPerView: 3,
		  
			}
		  },
		autoplay:false,
    navigation: {
            nextEl: ".post-51 .swiper-button-next",
            prevEl: ".post-51 .swiper-button-prev",
        },
	  scrollbar: {
		el: '.swiper-scrollbar',
		draggable: true,
	  },
	});  
  $(".main4 .sudy-tab").sudyTab({
    handle: ".tab-menu li",
    content: ".tab-con .post",
    trigger: "mouseenter",
    start: 1,
    autoPlay: {
      active: false
    }
  });
var $sliderp12 = $('.post-12 .list1').slick({
    slide: 'li', //滑动元素查询
    dots: false,
    infinite: true,
    speed: 500,
    autoplay: true,
    fade: false,
    slidesToShow: 1,
    slidesToScroll: 1,
    useCSS: false, //使用 CSS3 过度
    arrows: false, //左右箭头
  });
  var totalSlides = $sliderp12.slick('getSlick').slideCount;
$(".post-12 .total").append(totalSlides)
  $('.post-12 .list2').slick({
    slide: 'li', //滑动元素查询
    dots: false,
    infinite: true,
    speed: 500,
    autoplay: true,
    fade: true,
    slidesToShow: 1,
    slidesToScroll: 1,
    useCSS: false, //使用 CSS3 过度
    arrows: true, //左右箭头
    asNavFor:'.post-12 .list1'
  });
  $('.post-23 .news_list').slick({
    slide: 'li', //滑动元素查询
    dots: false,
    infinite: true,
    speed: 500,
    autoplay: false,
    autoplaySpeed: 5000,
    fade: true,
    slidesToShow: 1,
    slidesToScroll: 1,
    useCSS: false, //使用 CSS3 过度
    arrows: true, //左右箭头
  });
$('.post-41 .news_list').slick({
    slide: 'li', //滑动元素查询
    dots: false,
    infinite: true,
    speed: 500,
    autoplay: false,
    autoplaySpeed: 10000,
    fade: false,
    slidesToShow: 4,
    slidesToScroll: 1,
    useCSS: false, //使用 CSS3 过度
    arrows: true, //左右箭头
    responsive: [
      {
        breakpoint: 767,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
        }
      },
      {
        breakpoint: 479,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1
        }
      }
    ]
  });
  
 /* $('.post-61 .news_list').slick({
    slide: 'li', //滑动元素查询
    dots: false,
    infinite: true,
    speed: 500,
    autoplay: true,
    autoplaySpeed: 10000,
    fade: false,
    slidesToShow: 8,
    slidesToScroll: 1,
    useCSS: false, //使用 CSS3 过度
    arrows: true, //左右箭头
    responsive: [
      {
        breakpoint: 999,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 1,
        }
      },
      {
        breakpoint: 479,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1
        }
      }
    ]
  }); */
 /*  pen({
    trigger: ["#container-1", "#container-2", "#container-3", "#container-4", "#container-5"], //锚点导航模块
    triggerName: ["学校新闻", "通知公告", "新闻动态", "公示公告", "专题网站"], //锚点导航名称
    callback: function (target, index) {
      //回调函数 target:当前滚动到的元素，index:当前滚动的下标
    },
  }); */
  /* addFirstDom({
		element: document.querySelectorAll(".foot-right .foot-top .news_list .news_icon"),
		filepath: Path() + "images/footsvg",
		callback: false,
	}); */
  //图片懒加载
  $('.lazy').lazyload({
    threshold: 100,
    data_attribute: 'src',
    effect: 'fadeIn'
  })
  //首屏加载动画
  setTimeout(() => {
    $('.pre-loader').fadeOut()
  }, 2000);
  $(document).ready(function () {
    new GsapAnimate.init({
      scrollTopAnime: ".Scroll-to-top", //置顶图标动画
      slideNavAnime: ".Quick-navigation", //锚点导航动画
      fixHeader: false, //头部固定
      isFixbanner: false,//大图全屏
      navMaxSreen: {
        control: ".menu-btn", //控制元素
        box: ".navbox", //元素
        hideDom: [".head-right .left", ".head-right .nav", ".header .searchbox"], //隐藏元素
      }, //导航咱开(不写是null)
      callback: function (target) {
        //回调函数 target:当前动画元素的元素
      },
    });
  })

 var $anchor = $('.hhu-anchor');
  var $main8 = $('.main8');
  var isHidden = false;
  var lastScroll = 0;

  $(window).scroll(function() {
    var currentScroll = $(this).scrollTop();
    var windowHeight = $(this).height();
    var elementTop = $main8.offset().top;
    var elementHeight = $main8.outerHeight();
    
    // 计算元素中间点位置
    var elementMiddle = elementTop + (elementHeight / 2);
    
    // 当前视口中间位置
    var scrollMiddle = currentScroll + (windowHeight / 2);

    // 判断滚动方向
    var scrollingUp = currentScroll < lastScroll;
    lastScroll = currentScroll;

    // 当视口中间位置超过元素中间位置时
    if (scrollMiddle > elementMiddle) {
      if (!isHidden) {
        $anchor.fadeOut(300);
        isHidden = true;
      }
    } else {
      // 只有向上滚动时才显示
      if (isHidden && scrollingUp) {
        $anchor.fadeIn(300);
        isHidden = false;
      }
    }
  });



})