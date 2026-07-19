(function () {
  //////////////////////
  // Utils
  //////////////////////
  function throttle(fn, delay, scope) {
    // Default delay
    delay = delay || 250;
    var last, defer;
    return function () {
      var context = scope || this,
        now = +new Date(),
        args = arguments;
      if (last && now < last + delay) {
        clearTimeout(defer);
        defer = setTimeout(function () {
          last = now;
          fn.apply(context, args);
        }, delay);
      } else {
        last = now;
        fn.apply(context, args);
      }
    };
  }

  function extend(destination, source) {
    for (var k in source) {
      if (source.hasOwnProperty(k)) {
        destination[k] = source[k];
      }
    }
    return destination;
  }
  var ScrollManager = (function () {
    var defaults = {
        steps: null,
        navigationContainer: null,
        links: null,
        scrollToTopBtn: null,
        windowPercent: 0.7, //element出现在页面70%的地方切换
        navigationElementClass: ".Quick-navigation",
        currentStepClass: "current",
        smoothScrollEnabled: true,
        stepsCheckEnabled: true,
        onScroll: null,
        callback: null,
        onStepChange: function (step, index) {
          var self = this;
          var relativeLink = [].filter.call(options.links, function (link) {
            link.classList.remove(self.currentStepClass);
            return link.hash === "#" + step.id;
          });
          relativeLink[0] != null && relativeLink[0].classList.add(self.currentStepClass);
        },
        // Provide a default scroll animation
        smoothScrollAnimation: function (target) {
          $("html, body").animate(
            {
              scrollTop: target,
            },
            "slow"
          );
        },
      },
      options = {};

    // Privates
    var _animation = null,
      currentStep = null,
      throttledGetScrollPosition = null;

    return {
      scrollPosition: 0,
      init: function (opts) {
        options = extend(defaults, opts);
        if (options.steps === null) {
          console.warn("Smooth scrolling require some sections or steps to scroll to :)");
          return false;
        }
        // Allow to customize the animation engine ( jQuery / GSAP / velocity / ... )
        _animation = function (target) {
          target = typeof target === "number" ? target : $(target).offset().top;
          return options.smoothScrollAnimation(target);
        };

        // Activate smooth scrolling
        if (options.smoothScrollEnabled) this.smoothScroll();

        // Throttle for performances gain
        throttledGetScrollPosition = throttle(this.getScrollPosition).bind(this);
        window.addEventListener("scroll", throttledGetScrollPosition);
        window.addEventListener("resize", throttledGetScrollPosition);

        this.getScrollPosition();
      },

      getScrollPosition: function () {
        this.scrollPosition = window.pageYOffset || window.scrollY;
        if (options.stepsCheckEnabled) this.checkActiveStep();
        if (typeof options.onScroll === "function") options.onScroll(this.scrollPosition);
      },

      scrollPercentage: function () {
        var body = document.body,
          html = document.documentElement,
          documentHeight = Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight);

        var percentage = Math.round((this.scrollPosition / (documentHeight - window.innerHeight)) * 100);
        if (percentage < 0) percentage = 0;
        if (percentage > 100) percentage = 100;
        return percentage;
      },

      doSmoothScroll: function (e) {
        if (e.target.nodeName === "A") {
          e.preventDefault();
          if (location.pathname.replace(/^\//, "") === e.target.pathname.replace(/^\//, "") && location.hostname === e.target.hostname) {
            var targetStep = document.querySelector(e.target.hash);
            targetStep ? _animation(targetStep) : console.warn("Hi! You should give an animation callback function to the Scroller module! :)");
          }
        }
      },

      smoothScroll: function () {
        if (options.navigationContainer !== null) options.navigationContainer.addEventListener("click", this.doSmoothScroll);
      },

      checkActiveStep: function () {
        var scrollPosition = this.scrollPosition;

        [].forEach.call(options.steps, function (step, index) {
          var bBox = step.getBoundingClientRect(),
            position = step.offsetTop - $(window).height() * 0.7,
            height = position + bBox.height;
          if (scrollPosition >= position && scrollPosition < height && currentStep !== step) {
            currentStep = step;
            options.steps.forEach(function (item) {
              item.classList.remove(defaults.currentStepClass);
            });
            step.classList.add(defaults.currentStepClass);
            if(defaults.callback){
              defaults.callback(step,index)
            }
            if (typeof options.onStepChange === "function") options.onStepChange(step, index);
          }

          //step.classList.remove(defaults.currentStepClass);
        });
      },

      destroy: function () {
        window.removeEventListener("scroll", throttledGetScrollPosition);
        window.removeEventListener("resize", throttledGetScrollPosition);
        options.navigationContainer.removeEventListener("click", this.doSmoothScroll);
      },
    };
  })();

  function pen({ trigger = [], triggerName = [], scrollToTopBtn ,callback=null}) {
    var scrollToTopBtn = document.querySelector(scrollToTopBtn),
      steps = [],
      navigationContainer = document.querySelector(".Quick-navigation"),
      links = [];
    trigger.forEach(function (item, index) {
      steps.push(document.querySelector(item));
      const newsEle = document.createElement("a");
      newsEle.innerText = triggerName[index];
      newsEle.classList.add("Quick-navigation-item");
      newsEle.setAttribute("href", "#" + document.querySelector(item).getAttribute("id"));
      navigationContainer.appendChild(newsEle);
      links.push(newsEle);
    });
    ScrollManager.init({
      steps: steps,
      scrollToTopBtn: scrollToTopBtn,
      navigationContainer: navigationContainer,
      links: links,
      callback,
    });
  }
  window.pen = pen;
})(jQuery, window, document);
