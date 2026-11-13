import { useEffect, useRef } from "react";

const ACCENT = "#F33333";
const CHILLAX_FONT = "Chillax, system-ui, sans-serif";
const GENERAL_FONT = "General, system-ui, sans-serif";
const INSET = 10; // Gap between the canvas edge and the marks
const LABEL_FONT_SIZE = 162;

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

// Length of the mark at minute i
function markLength(i: number) {
  if (i % 5 !== 0) return 40;
  if (i === 0 || i === 30) return 100;
  if (i === 10 || i === 20 || i === 40 || i === 50) return 300;
  return 180;
}

// Distance from the center to the middle of the 3 and 9 labels
function sideLabelDistance(width: number) {
  return width / 2 - INSET - markLength(15) - LABEL_FONT_SIZE * 0.75;
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  function drawMinuteMarks(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.save(); // Save context state before starting transformations

    const centerX = width / 2;
    const centerY = height / 2;

    // Half-extents of the rectangle the marks sit on, inset from the canvas edge
    const halfWidth = centerX - INSET;
    const halfHeight = centerY - INSET;

    ctx.translate(centerX, centerY); // Move the pivot point to the center

    ctx.strokeStyle = ACCENT;
    ctx.lineCap = "round";

    for (let i = 0; i < 60; i++) {
      // Every 5th mark lands on an hour: 3x longer and 2x wider than a minute mark
      const isHourMark = i % 5 === 0;
      const length = markLength(i);

      // Position on the rectangle, clockwise from 12 o'clock. Marks 10, 20, 40 and 50
      // sit on the corners; the marks between them are evenly spaced along each edge.
      let x: number;
      let y: number;
      if (i <= 10) {
        x = (i / 10) * halfWidth; // Top edge, center to right corner
        y = -halfHeight;
      } else if (i <= 20) {
        x = halfWidth; // Right edge, top to bottom
        y = ((i - 15) / 5) * halfHeight;
      } else if (i <= 40) {
        x = ((30 - i) / 10) * halfWidth; // Bottom edge, right to left
        y = halfHeight;
      } else if (i <= 50) {
        x = -halfWidth; // Left edge, bottom to top
        y = ((45 - i) / 5) * halfHeight;
      } else {
        x = ((i - 60) / 10) * halfWidth; // Top edge, left corner to center
        y = -halfHeight;
      }

      // Point the mark toward the center
      const edge = Math.hypot(x, y);
      const dirX = x / edge;
      const dirY = y / edge;

      ctx.beginPath();
      ctx.lineWidth = isHourMark ? 5 : 2;

      // Draw a line from the rectangle edge inward toward the center
      ctx.moveTo(dirX * edge, dirY * edge);
      ctx.lineTo(dirX * (edge - length), dirY * (edge - length));
      ctx.stroke();

      // Label 12, 3, 6 and 9 just inside the end of their hour mark
      if (i % 15 === 0) {
        const labelDistance = edge - length - LABEL_FONT_SIZE * 0.75;

        ctx.fillStyle = ACCENT;
        ctx.font = `700 ${LABEL_FONT_SIZE}px ${CHILLAX_FONT}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(i === 0 ? 12 : i / 5), dirX * labelDistance, dirY * labelDistance);
      }
    }

    ctx.restore(); // Restore context state
  }

  // Digital hh:mm on the left and day/date on the right, halfway between the center
  // and the 9 and 3 labels
  function drawComplications(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    now: Date,
    color: string,
  ) {
    ctx.save();
    ctx.translate(width / 2, height / 2);

    const fontSize = 26;
    const offset = (sideLabelDistance(width) - LABEL_FONT_SIZE * 0.5) / 2;

    ctx.font = `600 ${fontSize}px ${GENERAL_FONT}`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    ctx.fillStyle = color;
    ctx.fillText(`${hours}:${minutes}`, -offset, 0);

    // Weekday in the accent color, then the day of the month and the month, centered as one line
    const weekday = now.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase() + " ";
    const day = `${String(now.getDate())}, `;
    const month = MONTHS[now.getMonth()];

    const weekdayWidth = ctx.measureText(weekday).width;
    const dayWidth = ctx.measureText(day).width;
    const monthWidth = ctx.measureText(month).width;
    const startX = offset - (weekdayWidth + dayWidth + monthWidth) / 2;

    ctx.textAlign = "left";
    ctx.fillStyle = ACCENT;
    ctx.fillText(weekday, startX, 0);
    ctx.fillStyle = color;
    ctx.fillText(day, startX + weekdayWidth, 0);
    ctx.fillText(month, startX + weekdayWidth + dayWidth, 0);

    ctx.restore();
  }

  function drawHands(ctx: CanvasRenderingContext2D, width: number, height: number, now: Date) {
    ctx.save();
    ctx.translate(width / 2, height / 2);

    const radius = Math.min(width, height) / 2 - INSET;

    // Fractional time so every hand moves smoothly
    const seconds = now.getSeconds() + now.getMilliseconds() / 1000;
    const minutes = now.getMinutes() + seconds / 60;
    const hours = (now.getHours() % 12) + minutes / 60;

    // Hour and minute hand from docs/hand.png: a rounded bar joined by a narrow neck to a ring
    // around the pivot. Proportions are relative to the bar width (64px in the design).
    function shapedHand(turn: number, length: number, barWidth: number) {
      const ringRadius = barWidth / 2;
      const holeRadius = barWidth * (12 / 64);
      const neckWidth = barWidth * (26 / 64);
      const barStart = barWidth * (82 / 64); // Pivot to the bottom of the bar

      ctx.save();
      ctx.rotate(turn * 2 * Math.PI);
      ctx.beginPath();
      ctx.roundRect(-barWidth / 2, -length, barWidth, length - barStart, barWidth / 2);
      ctx.rect(-neckWidth / 2, -barStart - ringRadius + 2, neckWidth, barStart);
      ctx.arc(0, 0, ringRadius, 0, 2 * Math.PI);
      // Wind the hole the other way so it stays see-through
      ctx.moveTo(holeRadius, 0);
      ctx.arc(0, 0, holeRadius, 0, 2 * Math.PI, true);
      ctx.fillStyle = ACCENT;
      ctx.fill();
      ctx.restore();
    }

    const barWidth = Math.max(12, radius * 0.05);
    shapedHand(hours / 12, radius * 0.5, barWidth);
    shapedHand(minutes / 60, radius * 0.8, barWidth);

    // Second hand: thin line with a short tail, joined to the same pivot ring as the
    // hour and minute hands. The line stops at the ring so the hole stays see-through.
    const ringRadius = barWidth / 2;
    const holeRadius = barWidth * (12 / 64);
    const lineWidth = 2;
    const length = radius * 0.9;
    const tail = radius * 0.12;

    ctx.save();
    ctx.rotate((seconds / 60) * 2 * Math.PI);
    ctx.beginPath();
    ctx.roundRect(-lineWidth / 2, -length, lineWidth, length - ringRadius, lineWidth / 2);
    ctx.roundRect(-lineWidth / 2, ringRadius, lineWidth, tail - ringRadius, lineWidth / 2);
    ctx.arc(0, 0, ringRadius, 0, 2 * Math.PI);
    ctx.moveTo(holeRadius, 0);
    ctx.arc(0, 0, holeRadius, 0, 2 * Math.PI, true);
    ctx.fillStyle = ACCENT;
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let dprQuery: MediaQueryList | undefined;
    let width = 0;
    let height = 0;
    let frame = 0;

    function resize() {
      if (!canvas || !ctx) return;
      const dpr = window.devicePixelRatio || 1;
      ({ width, height } = canvas.getBoundingClientRect());

      // Match the backing store to physical pixels so lines stay sharp on high-DPI screens
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);

      // Draw in CSS pixels; the transform maps them to device pixels
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw() {
      if (!canvas || !ctx) return;
      const now = new Date();
      // Follow the page's text color so hands stay visible in light and dark mode
      const color =
        getComputedStyle(document.documentElement).getPropertyValue("--text-h").trim() || "#000";

      ctx.clearRect(0, 0, width, height);
      drawMinuteMarks(ctx, width, height);
      drawComplications(ctx, width, height, now, color);
      drawHands(ctx, width, height, now);

      frame = requestAnimationFrame(draw);
    }

    // Re-render when the pixel ratio changes (browser zoom, moving between monitors)
    function watchPixelRatio() {
      dprQuery?.removeEventListener("change", onPixelRatioChange);
      dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      dprQuery.addEventListener("change", onPixelRatioChange);
    }

    function onPixelRatioChange() {
      resize();
      watchPixelRatio();
    }

    resize();
    watchPixelRatio();
    window.addEventListener("resize", resize);

    // Canvas text alone doesn't trigger a web font download, so request each face the canvas
    // draws with. The frame loop picks them up as soon as they have loaded.
    for (const font of ["700 1em Chillax", "600 1em Chillax", "600 1em General"]) {
      document.fonts.load(font).catch(() => {
        // Keep the fallback font
      });
    }

    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      dprQuery?.removeEventListener("change", onPixelRatioChange);
    };
  }, []);

  return (
    <canvas id="clock" ref={canvasRef}>
      Apple like clock
    </canvas>
  );
}

export default App;
