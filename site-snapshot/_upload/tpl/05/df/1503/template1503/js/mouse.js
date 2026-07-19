$(function () {
  const cursor = $('.mouse_cursor');
  const maxTrails = 1;
  let trails = [];
  let lastPos = { x: 0, y: 0 };
  const threshold = 1;

  const maxWaves = 10;
  let wavePool = [];
  let activeWaves = 0;

  function initTrails() {
    for (let i = 0; i < maxTrails; i++) {
      const trail = $('<div class="mouse_trail"></div>').appendTo('body');
      trails.push(trail);
    }
  }

  function initWavePool() {
    for (let i = 0; i < maxWaves; i++) {
      const wave = $('<div class="click_wave"></div>').appendTo('body');
      wavePool.push({
        element: wave,
        inUse: false
      });
    }
  }

  function getWaveFromPool() {
    for (let i = 0; i < wavePool.length; i++) {
      if (!wavePool[i].inUse) {
        wavePool[i].inUse = true;
        activeWaves++;
        return wavePool[i].element;
      }
    }
    return null;
  }

  function releaseWave(waveElement) {
    for (let i = 0; i < wavePool.length; i++) {
      if (wavePool[i].element.is(waveElement)) {
        wavePool[i].inUse = false;
        activeWaves--;
        waveElement.removeClass('wave-active');
        break;
      }
    }
  }

  function updateTrails(x, y) {
    const cursorTransform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;

    trails[0].css({
      transform: cursorTransform,
      opacity: 0.8
    });

    for (let i = 1; i < maxTrails; i++) {
      const prevTrail = trails[i - 1];
      const prevTransform = prevTrail.css('transform');

      trails[i].css({
        transform: prevTransform,
        opacity: 0.8 - i * 0.15
      });
    }
  }

  function updateCursorPosition(x, y) {
    if (
      Math.abs(x - lastPos.x) > threshold ||
      Math.abs(y - lastPos.y) > threshold
    ) {
      cursor.css(
        'transform',
        `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`
      );
      lastPos.x = x;
      lastPos.y = y;
    }

    updateTrails(x, y);
  }

  function createClickWave(x, y) {
    const wave = getWaveFromPool();
    if (!wave) return;

    wave.css({
      left: x,
      top: y,
      opacity: 1,
      transform: 'translate(-50%, -50%) scale(0)'
    });

    setTimeout(() => {
      wave.addClass('wave-active');
    }, 10);

    setTimeout(() => {
      releaseWave(wave);
    }, 1200);
  }

  let animationFrameId;
  $(document).on('mousemove', function (e) {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }

    animationFrameId = requestAnimationFrame(() => {
      updateCursorPosition(e.clientX, e.clientY);
    });
  });

  $(document).on('click', function (e) {
    createClickWave(e.clientX, e.clientY);
  });

  function animate() {
    updateCursorPosition(lastPos.x, lastPos.y);
    requestAnimationFrame(animate);
  }

  initTrails();
  initWavePool();
  animate();
});