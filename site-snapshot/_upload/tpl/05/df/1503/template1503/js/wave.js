function wave(options) {
  const defaultOptions = {
    canvasId: 'wave', // 元素ID
    waveCount: 4, // 波浪起伏次数
    period: 5000, // 波浪周期（毫秒），完成一个波长的时间
    offset: 0, // 初始水平偏移量
    color: 'blue', // 波浪颜色
    opacity: 0.5 // 波浪透明度
  };

  const config = { ...defaultOptions, ...options };
  const canvas = document.getElementById(config.canvasId);
  
  if (!canvas) {
    console.error(`未找到 ID 为 "${config.canvasId}" 的 canvas 元素`);
    return;
  }

  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  let offset = config.offset;

  const amplitude = (height - 1) / 2;
  const baseline = height * 0.5;
  const normalizedWaveCount = Math.round(config.waveCount);
  const speed = (2 * Math.PI) / (config.period / 16.67);

  function drawWave() {
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = `rgba(
      ${parseInt(config.color.slice(1, 3), 16)},
      ${parseInt(config.color.slice(3, 5), 16)},
      ${parseInt(config.color.slice(5, 7), 16)},
      ${config.opacity}
    )`;

    ctx.beginPath();

    ctx.moveTo(0, baseline);
    for (let x = 0; x <= width; x++) {
      const angle = (x / width) * normalizedWaveCount * 2 * Math.PI + offset;
      const y = baseline - amplitude * Math.sin(angle);
      ctx.lineTo(x, y);
    }

    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();

    if (config.period > 0) {
      offset += speed;
    }

    requestAnimationFrame(drawWave);
  }

  drawWave();
}