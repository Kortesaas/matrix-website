// Fresh monochrome snow instead of translating a repeating tile.
document.querySelectorAll<HTMLCanvasElement>('[data-tv-noise]').forEach((canvas) => {
  const context = canvas.getContext('2d', { alpha: false });
  const computer = canvas.closest<HTMLAnchorElement>('.why__computer');
  if (!context || !computer) return;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const hover = matchMedia('(hover: hover)');
  let visible = false;
  let timer = 0;
  let frame: ImageData;

  function draw() {
    const pixels = frame.data;
    for (let y = 0; y < canvas.height; y++) {
      const rowBias = (Math.random() - 0.5) * 24;
      let previous = Math.random() * 255;
      for (let x = 0; x < canvas.width; x++) {
        // Slight horizontal correlation creates short irregular flecks.
        const value = Math.round((Math.random() * 255 + previous * 0.2) / 1.2 + rowBias);
        const offset = (y * canvas.width + x) * 4;
        pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = value;
        pixels[offset + 3] = 255;
        previous = value;
      }
    }
    context!.putImageData(frame, 0, 0);
  }

  function update() {
    clearTimeout(timer);
    if (!visible || document.hidden || reduce.matches || !hover.matches || computer!.matches(':hover, :focus-visible')) return;
    draw();
    timer = window.setTimeout(update, 75);
  }

  const resize = new ResizeObserver(() => {
    // About 1.4 CSS pixels per grain: visible snow without large square tiles.
    canvas.width = Math.max(1, Math.ceil(canvas.clientWidth / 1.4));
    canvas.height = Math.max(1, Math.ceil(canvas.clientHeight / 1.4));
    frame = context.createImageData(canvas.width, canvas.height);
    draw();
    update();
  });
  resize.observe(canvas);
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (frame) update();
  });
  observer.observe(canvas);
  computer.addEventListener('pointerenter', () => clearTimeout(timer));
  computer.addEventListener('pointerleave', update);
  computer.addEventListener('focusin', () => clearTimeout(timer));
  computer.addEventListener('focusout', () => { window.setTimeout(update, 0); });
  document.addEventListener('visibilitychange', update);
  reduce.addEventListener('change', update);
  hover.addEventListener('change', update);
  window.addEventListener('pagehide', () => {
    clearTimeout(timer);
    resize.disconnect();
    observer.disconnect();
  });
});
