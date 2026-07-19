
$('.character-fade .swiper-wrapper').append($('.character-fade .swiper-wrapper').find('.swiper-slide').clone()).ready(function() {
  $('.character-slide .swiper-wrapper').append($('.character-slide .swiper-wrapper').find('.swiper-slide').clone()).ready(function() {
    //swiper.js内容
  
  const slides = document.querySelectorAll('.character-cover');
const isPC = $(window).width() > 999;
const calcWidth = 225;
const calcContainerWidth = 1280;
const multiple = 1.5;
const containerWidth = document.querySelector('.character-slide').clientWidth;
const ratio = calcContainerWidth / containerWidth
const baseWidth = calcWidth / ratio;

let swiper;
let fadeSwiper;
let fixedSpacing;
let firstSlideWidth;
let fixedTransformStep;

// 弧形布局配置
const ARC_RADIUS = 80; // 弧形半径（控制曲线高度）
const VISIBLE_SLIDES = 5; // 可见幻灯片数量
const PEAK_INDEX = Math.floor(VISIBLE_SLIDES / 2); // 最高点的索引

// 预计算尺寸配置表
const sizeConfigs = Array.from({ length: VISIBLE_SLIDES }, (_, i) => {
  const scaleFactor = Math.pow(0.8, i);
  return i === 0 ? baseWidth * multiple : baseWidth * scaleFactor;
});

// 计算固定参数
function calculateLayoutMetrics() {
  const firstWidth = baseWidth * multiple;
  const totalVisibleWidth = sizeConfigs.reduce((sum, width) => sum + width, 0);

  fixedSpacing = (containerWidth - totalVisibleWidth) / (VISIBLE_SLIDES - 1);
  firstSlideWidth = firstWidth;
  fixedTransformStep = baseWidth + fixedSpacing;
}

// 统一调整计算单位
  const calculateSlideUnit = (num) => {
    const fontSize = window.getComputedStyle(document.documentElement).fontSize;
    const number = parseFloat(fontSize) || 100;
    return `${num / number}rem`;
  };
// 计算垂直位置（所有值为正，顶点左侧递增，右侧递减）
function calculateVerticalPosition(index) {
  // 将索引映射到 -π/2 到 π/2 的区间（第三个幻灯片为0）
  const angle = ((index - PEAK_INDEX) / (VISIBLE_SLIDES - 1)) * Math.PI;

  // 使用余弦函数计算垂直偏移，确保所有值为正，并在中心点最大
  const verticalOffset = ARC_RADIUS * (1 - Math.abs(Math.cos(angle)));

  return verticalOffset;
}

// 应用幻灯片尺寸和垂直位置
function applySlideLayout() {
  if (!swiper) return;

  // 重置所有幻灯片样式
  slides.forEach((slide) => {
    slide.style.width = `${calculateSlideUnit(baseWidth)}`;
    slide.style.marginRight = `${calculateSlideUnit(fixedSpacing)}`;
    slide.style.transform = `translateY(${calculateSlideUnit(ARC_RADIUS)})`;
    slide.style.opacity = 0;
  });

  // 获取当前活动索引
  const activeIndex = swiper.activeIndex ?? 0;

  // 特殊处理滚动后的幻灯片
  const expireSlide = activeIndex ? swiper.slides[0] : null;
  if (expireSlide) {
    expireSlide.style.transform = `translateY(${calculateSlideUnit(ARC_RADIUS * multiple * multiple)})`;
  }

  // 特殊处理可见区域外等待的第一个幻灯片
  const prepareSlide = swiper.slides[activeIndex + VISIBLE_SLIDES];
  if (prepareSlide) {
    prepareSlide.style.width = `${calculateSlideUnit(baseWidth * Math.pow(0.8, VISIBLE_SLIDES))}`;
  }

  // 应用可见区域尺寸和垂直位置（只处理可见幻灯片）
  for (let i = 0; i < VISIBLE_SLIDES; i++) {
    const swiperSlide = swiper.slides[activeIndex + i];
    if (swiperSlide) {
      const verticalOffset = calculateVerticalPosition(i);
      swiperSlide.style.width = `${calculateSlideUnit(sizeConfigs[i])}`;
      swiperSlide.style.transform = `translateY(${calculateSlideUnit(verticalOffset)})`;
      swiperSlide.style.opacity = 1;
    }
  }
}

// 自定义Swiper的transform
function updateSwiperTransform() {
  if (!swiper || swiper.activeIndex === undefined) return;
  const translateValue = -swiper.activeIndex * fixedTransformStep;
  swiper.wrapperEl.style.transform = `translate3d(${calculateSlideUnit(translateValue)}, 0, 0)`;
}

// 读取Swiper配置
const getSwiperConfigs = () => {
  if (isPC) {
    // 电脑端初始化布局计算
    calculateLayoutMetrics();

    return {
      slidesPerView: 'auto',
      loop: true,
      autoplay: {
        delay: 12000,
speed: 1000,
        pauseOnMouseEnter: true
      },
      autoplay: true,
      allowTouchMove: false,
      on: {
        init: () => {
          applySlideLayout();
          updateSwiperTransform();
        },
        slideChange: () => {
          applySlideLayout();
          updateSwiperTransform();
          if (fadeSwiper) {
            fadeSwiper.slideTo(swiper.realIndex, 300, false);
          }
        },
        resize: () => {
          calculateLayoutMetrics();
          applySlideLayout();
          updateSwiperTransform();
        }
      },
      navigation: {
        prevEl: '.swiper-button-prev',
        nextEl: '.swiper-button-next'
      }
    }
  } else {
    return {
      slidesPerView: '1',
      loop: true,
      autoplay: {
        delay: 12000,
speed: 1000,
        pauseOnMouseEnter: true
      },
      autoplay: true,
      allowTouchMove: false,
      on: {
        slideChange: () => {
          if (fadeSwiper) {
            fadeSwiper.slideTo(swiper.realIndex, 300, false);
          }
        }
      },
      navigation: {
        prevEl: '.swiper-button-prev',
        nextEl: '.swiper-button-next'
      },
      breakpoints: {
        320: {
          slidesPerView: 1,
          spaceBetween: 64
        },
        479: {
          slidesPerView: 2,
          spaceBetween: 56
        },
        640: {
          slidesPerView: 3,
          spaceBetween: 48
        },
        767: {
          slidesPerView: 4,
          spaceBetween: 40
        }
      }
    }
  }
}
swiper = new Swiper('.character-slide', getSwiperConfigs());

fadeSwiper = new Swiper('.character-fade', {
  slidesPerView: 1,
  effect: 'fade',
  loop: true,
speed: 1000,
  allowTouchMove: false,
  fadeEffect: {
    crossFade: true
  }
});
})
})



