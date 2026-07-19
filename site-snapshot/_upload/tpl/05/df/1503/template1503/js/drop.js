$(function() {

  const $window = $(window);
  const $anchorItems = $('.hhu-anchor li');
  const $sections = $('.container');
  const $drop = $('.anchor-raindrop');
  
  let sectionPositions = [];
  
  $anchorItems.on('click', function() {
    if (!$(this).hasClass('active')) {
      const targetId = $(this).data('dom');
      const $target = $(targetId);
      
      $(this).addClass('active').siblings().removeClass('active');
      
      window.scrollTo({
        top: $target.offset().top-90,
        behavior: 'smooth'
      });
    }
  });
  
  function updateSectionPositions() {
    sectionPositions = [];
    $sections.each(function(index) {
      const $section = $(this);
      sectionPositions.push({
        top: $section.offset().top,
        height: $section.outerHeight(),
        index,
        id: $section.attr('id')
      });
    });
  }
  
  let isScrolling = false;

  function updateDropPosition() {
    const activeIndex = $anchorItems.index($anchorItems.filter('.active'));
    
    if (activeIndex !== -1) {
      let dropTop = 0;
      const liHeight = $anchorItems.first().outerHeight(true);
      
      dropTop = activeIndex * liHeight;
      
      $drop.css({
        top: dropTop,
        opacity: 1
      });
    } else {
      $drop.css('opacity', 0);
    }
  }
  
  function handleScroll() {
    if (!isScrolling) {
      isScrolling = true;
      
      requestAnimationFrame(() => {
        const scrollTop = $window.scrollTop();
        const windowHeight = $window.height();
        let activeIndex = -1;
        
        // 计算当前可视区域的中间位置
        const viewportMiddle = scrollTop + windowHeight / 2;
        
        // 确定当前激活的区域
        for (let i = 0; i < sectionPositions.length; i++) {
          const section = sectionPositions[i];
          if (viewportMiddle >= section.top && viewportMiddle < section.top + section.height) {
            activeIndex = i;
            $sections.eq(activeIndex).addClass('active');
          } else {
            $sections.eq(i).removeClass('active');
          }
        }
        
        if (activeIndex !== -1) {
          $anchorItems.eq(activeIndex).addClass('active').siblings().removeClass('active');
        } else {
          $anchorItems.removeClass('active');
        }

        // 从第一个导航项的data-dom中提取前缀
        const firstDomId = $anchorItems.first().data('dom') || '';
        const prefix = firstDomId.replace(/^#([^0-9]+).*$/, '$1');
        
        // 清除所有锚点导航上之前添加的区域类名
        $anchorItems.removeClass((index, className) => {
          const regex = new RegExp(`(^|\\s)${prefix}\\d+`, 'g');
          return (className.match(regex) || []).join(' ');
        });

        // 为每个锚点导航添加对应区域的类名
        $anchorItems.each(function() {
          const $anchorItem = $(this);
          // 获取导航项相对于窗口顶部的位置
          const anchorTop = $anchorItem.offset().top - scrollTop;
          const anchorBottom = anchorTop + $anchorItem.outerHeight();
          const anchorMiddle = (anchorTop + anchorBottom) / 2; // 导航项的中间位置
          
          let matchedSection = null;
          
          // 找到导航项中间位置所在的区域（从下往上检查，优先匹配下方区域）
          for (let i = sectionPositions.length - 1; i >= 0; i--) {
            const section = sectionPositions[i];
            const sectionTop = section.top - scrollTop;
            const sectionBottom = sectionTop + section.height;
            
            // 如果导航项中间位置在区域内，则添加该区域类名
            if (anchorMiddle >= sectionTop && anchorMiddle < sectionBottom) {
              matchedSection = section;
              break;
            }
          }
          
          // 如果找到匹配的区域，则添加对应的类名
          if (matchedSection) {
            $anchorItem.addClass(matchedSection.id);
          }
        });

        updateDropPosition();
        
        isScrolling = false;
      });
    }
  }
  
  $window.on('scroll', handleScroll);
  
  $window.on('resize', () => {
    updateSectionPositions();
    handleScroll();
  });
  
  $window.on('load', () => {
    updateSectionPositions();
    handleScroll();
  });
  
  updateSectionPositions();
  handleScroll();

});