(function ($, window, document, undefined) {
  "use strict";
  var GsapAnimate = (function () {
    var defaults = {
      mainDomAnime: true,
      scrollTopAnime: false,
      slideNavAnime: false,
      fixHeader: false,
      isFixbanner: false,
      navMaxSreen: null, //导航咱开,
      duration: 0.4, //动画执行
      delay: 0, //动画延迟时间
      callback: null
    },
      options = {};

    return {
      init: function (opts) {
        options = $.extend(defaults, opts);
        const a = GsapAnimate;
        if (options.mainDomAnime) {
          const dom = gsap.utils.toArray(".gsapdom");
          //模块动画
          dom.forEach((item) => {
            const position = item.getAttribute("gsap-position");
            const direction = item.getAttribute("gsap-direction").toUpperCase() || options.direction;
            const delay = item.getAttribute("delay") || options.delay;
            const fix = item.getAttribute("fix") || "100";
            const ifMian1 = item.closest('.wrapper').classList.contains("main1")
            gsap.from(item, {
              duration: 0.6, //动画执行时间
              delay, //动画延迟时间
              opacity: "0",
              transform: direction == "X" || direction == "Y" ? `translate${direction}(${position}px)` : `${direction}(${position})`,
              scrollTrigger: {
                trigger: options.isFixbanner && ifMian1 ? item.closest('.wrapper') : item, //监视区域
                start: options.isFixbanner && ifMian1 ? "top bottom" : `top ${fix}%`,
                end: options.isFixbanner && ifMian1 ? "top top" : (direction == "Y" && position > 0 ? `top bottom+=${position * 2}px` : "top bottom"),
                toggleActions: "play none reverse none", //重置
              },
              onLeave: (self) => { },
              onUpdate: (self) => {
                if (ScrollTrigger.isInViewport(item)) {
                  //element是否在视野内
                  if (!item.classList.contains("showdiv")) {
                    item.classList.add("showdiv");
                    if (options.callback) {
                      options.callback(item)
                    }
                  }
                } else {
                  item.classList.remove("showdiv");
                }
              },
            });
          });
        }

        if (options.scrollTopAnime && document.querySelector(options.scrollTopAnime)) {
          //top按钮
          gsap.from(options.scrollTopAnime, {
            duration: 0.4, //动画执行时间
            opacity: "0",
            y: 200,
            scrollTrigger: {
              trigger: ".main1", //监视区域
              start: options.isFixbanner ? "top bottom" : "top center",
              end: options.isFixbanner ? "top top" : "top bottom",
              toggleActions: "play none reverse none", //重置
            },
          });
          if (options.isFixbanner) {
            document.querySelector(options.scrollTopAnime).addEventListener("click", function () {
              document.querySelector(".fix-top").classList.remove('fixed');
              document.querySelector("body").classList.remove('fixedok');
              window.scrollTo({ top: 0, behavior: "smooth" });
              setTimeout(function () {
                a.fixheader(-1)
                ScrollTrigger.refresh()
                window.scrollTo({ top: 0, behavior: "smooth" });
              }, 700);

            });
          } else {
            document.querySelector(options.scrollTopAnime).addEventListener("click", function () {
              window.scrollTo({ top: 0, behavior: "smooth" });
            });
          }
        }
        if (options.slideNavAnime) {
          //侧导航
          gsap.from(options.slideNavAnime, {
            duration: 0.4, //动画执行时间
            opacity: "0",
            x: 200,
            scrollTrigger: {
              trigger: ".main1", //监视区域
              start: options.isFixbanner ? "top bottom" : "top center",
              end: options.isFixbanner ? "top top" : "top bottom",
              toggleActions: "play none reverse none", //重置
            },
          });
        }
        if (options.fixHeader && !options.isFixbanner) {
          //滚动导航固定在顶部(放公共样式)
          document.addEventListener("scroll", function () {
            if (window.scrollY >= 500) {
              a.fixheader(1)
            } else if (window.scrollY < 500 && window.scrollY >= 250) {
              a.fixheader(0)
            } else {
              a.fixheader(-1)
            }
          });
        }
        if (options.navMaxSreen != null) {
          const c = options.navMaxSreen;
          //大屏导航，根据属性data-fixnav-num排序(放公共样式)
          const mobileNavEle = document.querySelectorAll("[data-fixnav-num]");
          var _menu = [];
          mobileNavEle.forEach(function (item) {
            const num = item.getAttribute("data-fixnav-num");
            _menu[num] = item.cloneNode(true);
          });
          _menu.forEach((el) => {
            document.querySelector(c.box).appendChild(el);
          });
          document.querySelector(c.control).addEventListener("click", function () {
            if (this.classList.contains("arrow")) {
              a.fixboxClose(c.box, undefined, c.hideDom);
              this.classList.remove("arrow");
            } else {
              this.classList.add("arrow");
              a.fixboxAlert(c.box, undefined, c.hideDom);
            }
$(".opensearch").click(function(){
		$(".search_screen").addClass("active")
		$("body").addClass("showsearch")
		})
		$(".header .close").click(function(){
		$(".search_screen").removeClass("active")
		$("body").removeClass("showsearch")
		})
          });
          //手机端点击，二级导航下拉(放公共样式)

          document.querySelectorAll(".menu-switch-arrow").forEach((item) => {
            item.addEventListener("click", function () {
              if (item.classList.contains("open")) {
                gsap.to(item.nextElementSibling, {
                  height: "0",
                  opacity: 0,
                });
                item.classList.remove("open");
              } else {
                item.classList.add("open");
                gsap.fromTo(
                  item.nextElementSibling,
                  {
                    height: "0",
                    opacity: 0,
                  },
                  {
                    height: "auto",
                    opacity: 1,
                  }
                );
              }
            });
          });
        }
        if (options.isFixbanner) {
          banner.classList.add("fixBanner")
          const fixTopElement = document.createElement("div")
          fixTopElement.classList.add("fix-top")
          banner.after(fixTopElement)
          const bodyElement = document.body;
          window.addEventListener('wheel', function (event) {
            var deltaY = event.deltaY;
            var scrollTop = window.scrollY;
            if (scrollTop === 0 && fixTopElement.classList.contains('fixed') && deltaY <= 0) {
              fixTopElement.classList.remove('fixed');
              bodyElement.classList.remove('fixedok');
              a.fixheader(0)
              setTimeout(function () {
                a.fixheader(-1)
                ScrollTrigger.refresh()
              }, 300);
            }
            if (!fixTopElement.classList.contains('fixed') && deltaY > 0) {
              ScrollTrigger.refresh()
              fixTopElement.classList.add('fixed');
              a.fixheader(0)
              setTimeout(function () {
                a.fixheader(1)
              }, 500);
              setTimeout(function () {
                bodyElement.classList.add('fixedok');
                ScrollTrigger.refresh()
              }, 700);
            }
          }, { passive: false });
          banner.addEventListener('wheel', function (event) {
            event.preventDefault()
          }, { passive: false });

        }
      },
      fixheader: function (code) {
        const headerEle = document.querySelector(".header");
        switch (code) {
          case 1:
            headerEle.style.position = "fixed";
            headerEle.style.transform = "translateY(0%)";
            headerEle.classList.add("fix");
            break;
          case 0:
            headerEle.style.transform = "translateY(-250%)";
            break;
          case -1:
            headerEle.style.position = "absolute";
            headerEle.style.transform = "translateY(0%)";
            headerEle.classList.remove("fix");
            break;
        }
      },
      fixboxAlert: function (alertEle, duration = 0.5, fixhid = []) {
        var tl = gsap.timeline();
        const alertElement = document.querySelector(alertEle);
        const isMobile = window.innerWidth > 999 ? false : true;
        //隐藏元素
        if (fixhid.length != 0) {
          fixhid.forEach((item) => {
            tl.to(
              item,
              {
                duration: 0.2, //动画执行时间
                autoAlpha: "0",
              },
              "-=0.3"
            );
          });
        }
        tl.to(alertElement, {
          clipPath: `circle(${isMobile ? 2000 : window.innerWidth * 1.1 + 250}px at 100% 55px)`,
          autoAlpha: 1,
        });
        alertElement.childNodes.forEach((item) => {
          if (item.nodeType === 1)
            tl.fromTo(
              item,
              {
                y: 200,
                opacity: 0,
              },
              {
                y: 0,
                opacity: 1,
                duration,
              },
              "-=0.3"
            );
        });
        document.documentElement.style.overflow = "hidden";
        document.querySelector(".header").classList.add("opennav");
        $("body").addClass("showNav")
      },
      fixboxClose: function (closeEle, duration = 0.5, fixhid = []) {
        var t2 = gsap.timeline();
        const closeElement = document.querySelector(closeEle);
        Array.from(closeElement.childNodes)
          .reverse()
          .forEach((item) => {
            t2.fromTo(
              item,
              {
                y: 0,
                opacity: 1,
              },
              {
                y: 200,
                opacity: 0,
              },
              "-=0.3"
            );
          });
        t2.to(
          closeElement,
          {
            clipPath: "circle(35px at 110% 0px)",
            autoAlpha: 0,
            duration,
          },
          "-=0.3"
        );
        //需要显示元素
        if (fixhid.length != 0) {
          fixhid.forEach((item) => {
            t2.to(
              item,
              {
                duration: 0, //动画执行时间
                autoAlpha: "1",
              },
              "<"
            );
          });
        }
        document.documentElement.style.overflow = "revert-layer";
        document.querySelector(".header").classList.remove("opennav");
         $("body").removeClass("showNav")
      },
    };
  })();
  window.GsapAnimate = GsapAnimate;
})(jQuery, window, document);
