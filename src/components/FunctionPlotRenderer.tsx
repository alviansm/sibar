'use client';

import React, { useMemo, useState, useRef } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Activity, Eye, EyeOff } from 'lucide-react';

interface FunctionPlotProps {
  content: string; // The raw block content
  className?: string;
}

interface PlotConfig {
  functions: string[];
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  title?: string;
  grid: boolean;
  points?: Array<[number, number, string?]>;
  showEquationByDefault: boolean;
}

// Convert human math syntax into valid JS Math expression
function compileMathExpr(rawExpr: string): (x: number) => number | null {
  try {
    let expr = rawExpr.trim();
    // Replace caret with power
    expr = expr.replace(/\^/g, '**');

    // Replace constant terms
    expr = expr.replace(/\bpi\b/gi, 'Math.PI');
    expr = expr.replace(/\be\b/g, 'Math.E');

    // Replace functions with Math equivalents
    const mathFuncs = [
      'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
      'sinh', 'cosh', 'tanh',
      'sqrt', 'cbrt', 'abs', 'floor', 'ceil', 'round', 'exp'
    ];
    for (const fn of mathFuncs) {
      const regex = new RegExp(`\\b${fn}\\b`, 'g');
      expr = expr.replace(regex, `Math.${fn}`);
    }

    // ln(x) -> Math.log(x), log(x) -> Math.log10(x)
    expr = expr.replace(/\bln\b/g, 'Math.log');
    expr = expr.replace(/\blog10\b/g, 'Math.log10');
    expr = expr.replace(/\blog\b/g, 'Math.log10');

    // Handle implicit multiplication like 2x -> 2*x, 3(x) -> 3*(x)
    expr = expr.replace(/(\d+)\s*([a-zA-Z\(])/g, '$1 * $2');
    expr = expr.replace(/\)\s*([a-zA-Z0-9\(])/g, ') * $1');

    // Create safe evaluation function
    // eslint-disable-next-line no-new-func
    const fn = new Function('x', 'Math', `
      try {
        const val = ${expr};
        if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) return null;
        return val;
      } catch (e) {
        return null;
      }
    `);

    return (xVal: number) => {
      try {
        return fn(xVal, Math);
      } catch {
        return null;
      }
    };
  } catch {
    return () => null;
  }
}

// Parse configuration from simple key-value or raw expression
function parsePlotConfig(raw: string): PlotConfig {
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  const config: PlotConfig = {
    functions: [],
    xMin: -5,
    xMax: 5,
    yMin: -5,
    yMax: 5,
    grid: true,
    points: [],
    showEquationByDefault: false,
  };

  let explicitFnFound = false;

  for (const line of lines) {
    if (line.startsWith('fn:') || line.startsWith('f(x):') || line.startsWith('y:')) {
      const val = line.substring(line.indexOf(':') + 1).trim();
      const fns = val.split(',').map((f) => f.trim()).filter(Boolean);
      config.functions.push(...fns);
      explicitFnFound = true;
    } else if (line.startsWith('range:') || line.startsWith('xDomain:')) {
      const match = line.match(/\[\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\]/);
      if (match) {
        config.xMin = parseFloat(match[1]);
        config.xMax = parseFloat(match[2]);
      }
    } else if (line.startsWith('yDomain:') || line.startsWith('yRange:')) {
      const match = line.match(/\[\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\]/);
      if (match) {
        config.yMin = parseFloat(match[1]);
        config.yMax = parseFloat(match[2]);
      }
    } else if (line.startsWith('title:')) {
      config.title = line.substring(6).trim();
    } else if (line.startsWith('grid:')) {
      config.grid = line.substring(5).trim().toLowerCase() !== 'false';
    } else if (line.startsWith('showEquation:') || line.startsWith('showLegend:') || line.startsWith('legend:')) {
      const val = line.substring(line.indexOf(':') + 1).trim().toLowerCase();
      config.showEquationByDefault = val === 'true';
    } else if (line.startsWith('points:')) {
      try {
        const jsonPart = line.substring(7).trim();
        const pts = JSON.parse(jsonPart);
        if (Array.isArray(pts)) config.points = pts;
      } catch {}
    } else if (!explicitFnFound && !line.includes(':')) {
      // If line is just a direct expression, e.g. "x^2 - 4"
      config.functions.push(line);
    }
  }

  if (config.functions.length === 0) {
    config.functions.push('x^2');
  }

  // Ensure minimum range validity
  if (config.xMin >= config.xMax) {
    config.xMin = -5;
    config.xMax = 5;
  }
  if (config.yMin >= config.yMax) {
    config.yMin = -5;
    config.yMax = 5;
  }

  return config;
}

const PALETTE = [
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Violet
  '#06b6d4', // Cyan
];

export const FunctionPlotRenderer: React.FC<FunctionPlotProps> = ({ content, className = '' }) => {
  const initialConfig = useMemo(() => parsePlotConfig(content), [content]);

  const [xMin, setXMin] = useState(initialConfig.xMin);
  const [xMax, setXMax] = useState(initialConfig.xMax);
  const [yMin, setYMin] = useState(initialConfig.yMin);
  const [yMax, setYMax] = useState(initialConfig.yMax);
  const [showEquation, setShowEquation] = useState(initialConfig.showEquationByDefault);

  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number; px: number; py: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const width = 540;
  const height = 340;
  const padding = 36;

  const toScreenX = (x: number) => padding + ((x - xMin) / (xMax - xMin)) * (width - 2 * padding);
  const toScreenY = (y: number) => height - padding - ((y - yMin) / (yMax - yMin)) * (height - 2 * padding);

  const fromScreenX = (px: number) => xMin + ((px - padding) / (width - 2 * padding)) * (xMax - xMin);
  const fromScreenY = (py: number) => yMin + ((height - padding - py) / (height - 2 * padding)) * (yMax - yMin);

  // Generate paths for each function
  const paths = useMemo(() => {
    const samples = 300;
    const step = (xMax - xMin) / samples;

    return initialConfig.functions.map((fnStr) => {
      const evalFn = compileMathExpr(fnStr);
      let d = '';
      let isDrawing = false;

      for (let i = 0; i <= samples; i++) {
        const x = xMin + i * step;
        const y = evalFn(x);

        if (y === null || isNaN(y) || y < yMin - (yMax - yMin) * 2 || y > yMax + (yMax - yMin) * 2) {
          isDrawing = false;
          continue;
        }

        const sx = toScreenX(x);
        const sy = toScreenY(y);

        if (!isDrawing) {
          d += `M ${sx.toFixed(1)} ${sy.toFixed(1)}`;
          isDrawing = true;
        } else {
          d += ` L ${sx.toFixed(1)} ${sy.toFixed(1)}`;
        }
      }

      return { fnStr, d };
    });
  }, [initialConfig.functions, xMin, xMax, yMin, yMax]);

  // Compute grid tick steps
  const xSpan = xMax - xMin;
  const ySpan = yMax - yMin;
  const getStep = (span: number) => {
    const raw = span / 8;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const rel = raw / mag;
    if (rel < 1.5) return mag;
    if (rel < 3.5) return 2 * mag;
    if (rel < 7.5) return 5 * mag;
    return 10 * mag;
  };

  const xStep = getStep(xSpan);
  const yStep = getStep(ySpan);

  const xTicks: number[] = [];
  for (let x = Math.ceil(xMin / xStep) * xStep; x <= xMax; x += xStep) {
    if (Math.abs(x) < 1e-9) xTicks.push(0);
    else xTicks.push(Number(x.toFixed(4)));
  }

  const yTicks: number[] = [];
  for (let y = Math.ceil(yMin / yStep) * yStep; y <= yMax; y += yStep) {
    if (Math.abs(y) < 1e-9) yTicks.push(0);
    else yTicks.push(Number(y.toFixed(4)));
  }

  const handleZoom = (factor: number) => {
    const cx = (xMin + xMax) / 2;
    const cy = (yMin + yMax) / 2;
    const halfX = ((xMax - xMin) * factor) / 2;
    const halfY = ((yMax - yMin) * factor) / 2;
    setXMin(Number((cx - halfX).toFixed(2)));
    setXMax(Number((cx + halfX).toFixed(2)));
    setYMin(Number((cy - halfY).toFixed(2)));
    setYMax(Number((cy + halfY).toFixed(2)));
  };

  const handleReset = () => {
    setXMin(initialConfig.xMin);
    setXMax(initialConfig.xMax);
    setYMin(initialConfig.yMin);
    setYMax(initialConfig.yMax);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (width / rect.width);
    const py = (e.clientY - rect.top) * (height / rect.height);

    if (px >= padding && px <= width - padding && py >= padding && py <= height - padding) {
      const x = fromScreenX(px);
      const y = fromScreenY(py);
      setHoverCoord({ x, y, px, py });
    } else {
      setHoverCoord(null);
    }
  };

  const originX = toScreenX(0);
  const originY = toScreenY(0);

  return (
    <div className={`my-4 flex flex-col items-center bg-slate-50/90 dark:bg-slate-900/90 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-3 shadow-sm ${className}`}>
      {/* Title & Controls */}
      <div className="w-full flex items-center justify-between pb-2 mb-1 border-b border-slate-200/70 dark:border-slate-800/80 px-2 gap-2 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-2 flex-shrink-0">
          <Activity className="w-4 h-4 text-blue-500" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            {initialConfig.title || 'Cartesian Plane'}
          </span>
        </div>

        {/* Legend (Anti-Spoiler by Default) */}
        <div className="flex items-center gap-2">
          {initialConfig.functions.map((fn, idx) => {
            const curveLabel = initialConfig.functions.length > 1 ? `Curve ${idx + 1}` : 'Graph Curve';
            return (
              <div key={idx} className="flex items-center gap-1.5 text-[11px] font-mono text-slate-600 dark:text-slate-300">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0"
                  style={{ backgroundColor: PALETTE[idx % PALETTE.length] }}
                />
                <span>
                  {showEquation ? `y = ${fn}` : curveLabel}
                </span>
              </div>
            );
          })}

          {/* Toggle Equation Button (Anti-Spoiler) */}
          <button
            type="button"
            onClick={() => setShowEquation(!showEquation)}
            title={showEquation ? 'Hide equation formula (Anti-Spoiler)' : 'Reveal equation formula'}
            className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 text-[10px] font-sans font-medium"
          >
            {showEquation ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{showEquation ? 'Hide Equation' : 'Reveal Equation'}</span>
          </button>
        </div>

        {/* Zoom & Reset buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => handleZoom(0.75)}
            title="Zoom In"
            className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded transition-colors"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleZoom(1.33)}
            title="Zoom Out"
            className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded transition-colors"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleReset}
            title="Reset Range"
            className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full max-w-[540px] overflow-hidden rounded-xl bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverCoord(null)}
        >
          <defs>
            <clipPath id="plot-clip">
              <rect x={padding} y={padding} width={width - 2 * padding} height={height - 2 * padding} />
            </clipPath>
          </defs>

          {/* Grid lines */}
          {initialConfig.grid && (
            <g className="stroke-slate-100 dark:stroke-slate-900 stroke-[1]">
              {xTicks.map((xVal, i) => (
                <line key={`gx-${i}`} x1={toScreenX(xVal)} y1={padding} x2={toScreenX(xVal)} y2={height - padding} />
              ))}
              {yTicks.map((yVal, i) => (
                <line key={`gy-${i}`} x1={padding} y1={toScreenY(yVal)} x2={width - padding} y2={toScreenY(yVal)} />
              ))}
            </g>
          )}

          {/* X and Y Axes */}
          <g className="stroke-slate-300 dark:stroke-slate-700 stroke-[1.5]">
            {/* X axis line */}
            {originY >= padding && originY <= height - padding && (
              <line x1={padding} y1={originY} x2={width - padding} y2={originY} />
            )}
            {/* Y axis line */}
            {originX >= padding && originX <= width - padding && (
              <line x1={originX} y1={padding} x2={originX} y2={height - padding} />
            )}
          </g>

          {/* Tick Marks & Labels */}
          <g className="fill-slate-400 dark:fill-slate-500 text-[10px] font-mono select-none">
            {xTicks.map((xVal, i) => {
              const sx = toScreenX(xVal);
              const sy = Math.min(Math.max(originY + 14, padding + 12), height - padding + 14);
              return (
                <text key={`tx-${i}`} x={sx} y={sy} textAnchor="middle">
                  {xVal}
                </text>
              );
            })}
            {yTicks.map((yVal, i) => {
              if (yVal === 0) return null; // Avoid overlapping (0,0)
              const sy = toScreenY(yVal) + 3;
              const sx = Math.max(Math.min(originX - 6, width - padding - 6), padding + 14);
              return (
                <text key={`ty-${i}`} x={sx} y={sy} textAnchor="end">
                  {yVal}
                </text>
              );
            })}
          </g>

          {/* Function Curves */}
          <g clipPath="url(#plot-clip)">
            {paths.map((p, idx) => (
              <path
                key={idx}
                d={p.d}
                fill="none"
                stroke={PALETTE[idx % PALETTE.length]}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}

            {/* Custom Points */}
            {initialConfig.points?.map((pt, i) => {
              const px = toScreenX(pt[0]);
              const py = toScreenY(pt[1]);
              return (
                <g key={`pt-${i}`}>
                  <circle cx={px} cy={py} r="4" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
                  {pt[2] && (
                    <text x={px + 6} y={py - 6} fill="#ef4444" className="text-[10px] font-semibold">
                      {pt[2]}
                    </text>
                  )}
                </g>
              );
            })}
          </g>

          {/* Hover Crosshairs & Coordinates */}
          {hoverCoord && (
            <g>
              <line
                x1={hoverCoord.px}
                y1={padding}
                x2={hoverCoord.px}
                y2={height - padding}
                stroke="#94a3b8"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <line
                x1={padding}
                y1={hoverCoord.py}
                x2={width - padding}
                y2={hoverCoord.py}
                stroke="#94a3b8"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <circle cx={hoverCoord.px} cy={hoverCoord.py} r="3" fill="#3b82f6" />
            </g>
          )}
        </svg>

        {/* Hover Coordinate Badge */}
        {hoverCoord && (
          <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[10px] font-mono pointer-events-none shadow">
            x: {hoverCoord.x.toFixed(2)}, y: {hoverCoord.y.toFixed(2)}
          </div>
        )}
      </div>
    </div>
  );
};
