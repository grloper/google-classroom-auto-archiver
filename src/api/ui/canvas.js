class ArchiveCanvas {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.scanLineY = 0;
    this.blips = [];
    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.animate();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const w = this.canvas.width;
    const h = this.canvas.height;
    
    // Clear background
    this.ctx.fillStyle = '#050505';
    this.ctx.fillRect(0, 0, w, h);

    // Draw Grid
    this.ctx.strokeStyle = '#141414';
    this.ctx.lineWidth = 1;
    const gridSize = 60;
    
    this.ctx.beginPath();
    for(let x = 0; x < w; x += gridSize) {
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, h);
    }
    for(let y = 0; y < h; y += gridSize) {
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(w, y);
    }
    this.ctx.stroke();

    // Crosshairs at major intersections
    this.ctx.strokeStyle = '#333333';
    this.ctx.lineWidth = 2;
    for(let x = 0; x < w; x += gridSize * 3) {
      for(let y = 0; y < h; y += gridSize * 3) {
        this.ctx.beginPath();
        this.ctx.moveTo(x - 8, y); this.ctx.lineTo(x + 8, y);
        this.ctx.moveTo(x, y - 8); this.ctx.lineTo(x, y + 8);
        this.ctx.stroke();
      }
    }

    // Scanning Line
    this.scanLineY += 1.5;
    if (this.scanLineY > h) this.scanLineY = 0;

    const grad = this.ctx.createLinearGradient(0, this.scanLineY - 40, 0, this.scanLineY);
    grad.addColorStop(0, 'rgba(255, 85, 0, 0)');
    grad.addColorStop(1, 'rgba(255, 85, 0, 0.15)');
    
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, this.scanLineY - 40, w, 40);
    
    this.ctx.fillStyle = 'rgba(255, 85, 0, 0.8)';
    this.ctx.fillRect(0, this.scanLineY, w, 1);

    // Random Data Blips
    if (Math.random() > 0.96) {
      this.blips.push({
        x: Math.random() * w,
        y: Math.random() * h,
        life: 1.0,
        text: `0x${Math.floor(Math.random()*65535).toString(16).toUpperCase()}`
      });
    }

    // Render Blips
    for (let i = this.blips.length - 1; i >= 0; i--) {
      let b = this.blips[i];
      b.life -= 0.015;
      if (b.life <= 0) {
        this.blips.splice(i, 1);
        continue;
      }
      
      this.ctx.fillStyle = `rgba(0, 255, 102, ${b.life})`;
      this.ctx.fillRect(b.x - 2, b.y - 2, 4, 4);
      
      this.ctx.font = '11px "JetBrains Mono", monospace';
      this.ctx.fillText(b.text, b.x + 10, b.y + 4);
      
      // Connecting line to nearest grid intersection
      const nearestX = Math.round(b.x / gridSize) * gridSize;
      const nearestY = Math.round(b.y / gridSize) * gridSize;
      
      this.ctx.strokeStyle = `rgba(0, 255, 102, ${b.life * 0.3})`;
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(b.x, b.y);
      this.ctx.lineTo(nearestX, b.y);
      this.ctx.lineTo(nearestX, nearestY);
      this.ctx.stroke();
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new ArchiveCanvas('bg-canvas');
});
