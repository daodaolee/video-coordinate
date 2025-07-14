'use client';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Info, RotateCcw, Play, Pause } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import JSZip from 'jszip';
import NPYJS from 'npyjs';
import {
  Select,
  SelectTrigger,
  // SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { File, Link2 } from 'lucide-react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAnimationFrame } from 'framer-motion';
import { SelectValue } from '@radix-ui/react-select';

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const VideoAnnotator: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  // 视频相关
  const [videoUrl, setVideoUrl] = useState('');
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [highlightIdx, setHighlightIdx] = useState<number | null>(null);
  // 缩放与绘制
  const [currentZoom, setCurrentZoom] = useState(1);
  const [drawMode, setDrawMode] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  // 1. state
  const [videoLoading, setVideoLoading] = useState(false);

  // 框数据
  const [boxes, setBoxes] = useState<
    { coords: number[]; type: 'npz' | 'manual' | 'draw'; npzIndex?: number }[]
  >([]);
  const [inputValue, setInputValue] = useState('');

  // npz面板数据（每项本地/链接二选一，含样式）
  const [npzItems, setNpzItems] = useState<
    Array<{
      id: string;
      type: 'file' | 'url';
      file?: File;
      url?: string;
      boxes: { coords: number[]; type: 'npz'; npzIndex: number }[];
    }>
  >([]);

  // npz 颜色统一管理，主npz更显著，后续更浅
  const [npzBoxColor, setNpzBoxColor] = useState('#DA1010');
  const [npzTextColor, setNpzTextColor] = useState('#DA1010');
  const [npzFontSize, setNpzFontSize] = useState(22);
  const [npzLineWidth, setNpzLineWidth] = useState(7);
  const getNpzBoxColor = (npzIndex: number) => (npzIndex === 0 ? npzBoxColor : `${npzBoxColor}80`); // 主npz不透明，后续加透明度

  // 恢复手动画框样式state
  const [drawBoxColor, setDrawBoxColor] = useState('#e27d08');
  const [drawTextColor, setDrawTextColor] = useState('#e27d08');
  const [drawFontSize, setDrawFontSize] = useState(22);
  const [drawLineWidth, setDrawLineWidth] = useState(7);
  // 手动输入框样式 state
  const [manualBoxColor, setManualBoxColor] = useState('#2ac0be');
  const [manualTextColor, setManualTextColor] = useState('#2ac0be');
  const [manualFontSize, setManualFontSize] = useState(22);
  const [manualLineWidth, setManualLineWidth] = useState(7);

  // 新增 npz 链接输入框
  // 删除 npz 链接输入框
  // 修改 npz 链接内容

  // 导入所有 npz 链接

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      setProgress(video.duration ? video.currentTime / video.duration : 0);
    };
    const onLoaded = () => {
      setDuration(video.duration);
      setCurrentTime(video.currentTime);
      setVideoLoading(false);
    };
    const onSeeking = () => setVideoLoading(true);
    const onSeeked = () => setVideoLoading(false);
    const onLoadStart = () => setVideoLoading(true);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', onLoaded);
    video.addEventListener('seeking', onSeeking);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('loadstart', onLoadStart);
    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('seeking', onSeeking);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('loadstart', onLoadStart);
    };
  }, [videoUrl]);

  // 1. 彩虹色动画 state（组件顶层）
  const [rainbowHue, setRainbowHue] = useState(0);
  const rainbowActive = highlightIdx !== null;
  // 2. 彩虹动画驱动
  useAnimationFrame(() => {
    if (rainbowActive) {
      setRainbowHue((h) => (h + 2) % 360);
    }
  });

  // Draw coordinates
  const drawCoordinates = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // 3. drawCoordinates 里高亮框线条用彩虹色
    boxes.forEach((box, idx) => {
      let stroke = '#22d3ee'; // Default to manual color
      let fill = '#22d3ee'; // Default to manual color
      let font = '18px Arial'; // Default to manual font size
      let lw = 5; // Default to manual line width
      let labelPrefix = '';
      if (box.type === 'npz') {
        stroke = npzBoxColor;
        fill = npzTextColor;
        font = `${npzFontSize}px Arial`;
        lw = npzLineWidth;
        labelPrefix = 'N';
      } else if (box.type === 'manual') {
        stroke = manualBoxColor;
        fill = manualTextColor;
        font = `${manualFontSize}px Arial`;
        lw = manualLineWidth;
        labelPrefix = 'M';
      } else if (box.type === 'draw') {
        stroke = drawBoxColor;
        fill = drawTextColor;
        font = `${drawFontSize}px Arial`;
        lw = drawLineWidth;
        labelPrefix = 'D';
      }
      // 高亮
      if (highlightIdx === idx) {
        stroke = `hsl(${rainbowHue}, 100%, 50%)`;
        lw = lw + 2;
      }
      ctx.beginPath();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lw;
      ctx.globalAlpha = 0.9;
      ctx.strokeRect(
        box.coords[0],
        box.coords[1],
        box.coords[2] - box.coords[0],
        box.coords[3] - box.coords[1],
      );
      ctx.fillStyle = fill;
      ctx.globalAlpha = 1;
      ctx.font = font;
      ctx.fillText(`(${box.coords[0]},${box.coords[1]})`, box.coords[0], box.coords[1] - 5);
      ctx.fillText(
        `(${box.coords[2]},${box.coords[3]})`,
        box.coords[2],
        box.coords[3] + parseInt(font),
      );
      // 框中心用圆形标注编号
      const centerX = (box.coords[0] + box.coords[2]) / 2;
      const centerY = (box.coords[1] + box.coords[3]) / 2;
      // 半径加大
      const centerRadius = Math.max(20, parseInt(font) * 1.1);
      ctx.beginPath();
      ctx.arc(centerX, centerY, centerRadius, 0, 2 * Math.PI);
      ctx.fillStyle = '#222';
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#fff';
      ctx.globalAlpha = 1;
      ctx.stroke();
      ctx.font = `bold ${parseInt(font) - 2}px Arial`;
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // 主npz加字样
      const label = labelPrefix + (idx + 1);
      // if (box.type === 'npz' && box.npzIndex === 0) label = `主npz`;
      ctx.fillText(label, centerX, centerY);
      ctx.textAlign = 'start';
      ctx.textBaseline = 'alphabetic';
    });
  }, [
    boxes,
    npzBoxColor,
    npzTextColor,
    npzFontSize,
    npzLineWidth,
    drawBoxColor,
    drawTextColor,
    drawFontSize,
    drawLineWidth,
    highlightIdx,
    manualBoxColor,
    manualTextColor,
    manualFontSize,
    manualLineWidth,
    rainbowHue, // Added rainbowHue to dependencies
  ]);

  // 修复 canvas 尺寸同步问题
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const drawCanvas = drawCanvasRef.current;
    if (!video || !canvas || !drawCanvas) return;

    const setCanvasSize = () => {
      if (video.videoWidth && video.videoHeight) {
        // 像素宽高：原始分辨率
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        drawCanvas.width = video.videoWidth;
        drawCanvas.height = video.videoHeight;
        // 样式宽高：和video实际显示宽高一致
        canvas.style.width = video.offsetWidth + 'px';
        canvas.style.height = video.offsetHeight + 'px';
        drawCanvas.style.width = video.offsetWidth + 'px';
        drawCanvas.style.height = video.offsetHeight + 'px';
        drawCoordinates();
      }
    };

    // 关键：在 metadata 加载后设置
    video.onloadedmetadata = setCanvasSize;
    // resize 时也同步
    window.addEventListener('resize', setCanvasSize);

    // 如果已经加载好，直接设置一次
    setCanvasSize();

    return () => {
      window.removeEventListener('resize', setCanvasSize);
      video.onloadedmetadata = null;
    };
  }, [videoUrl, currentZoom, drawCoordinates]);

  // 快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!videoUrl) return;
      if (e.code === 'Space') {
        e.preventDefault();
        handlePlayPause();
      } else if (e.code === 'Delete') {
        if (boxes.length > 0) {
          handleDeleteCoord(boxes.length - 1);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (boxes.length > 0) {
          handleDeleteCoord(boxes.length - 1);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [boxes, videoUrl]);

  // 绘制预览框
  const drawPreview = (
    start: { x: number; y: number } | null,
    end: { x: number; y: number } | null,
  ) => {
    const drawCanvas = drawCanvasRef.current;
    if (!drawCanvas) return;
    const ctx = drawCanvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    if (start && end) {
      ctx.beginPath();
      ctx.strokeStyle = '#DA1010';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5;
      ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
      ctx.globalAlpha = 1;
    }
  };

  // Drawing events
  const getScaledCoordinates = (e: React.MouseEvent) => {
    const drawCanvas = drawCanvasRef.current;
    if (!drawCanvas) return { x: 0, y: 0 };
    const rect = drawCanvas.getBoundingClientRect();
    const scaleX = drawCanvas.width / rect.width;
    const scaleY = drawCanvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!videoUrl || !drawMode) return;
    setIsDrawing(true);
    setStart(getScaledCoordinates(e));
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !start) return;
    const { x, y } = getScaledCoordinates(e);
    drawPreview(start, { x, y });
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDrawing || !start) return;
    setIsDrawing(false);
    const drawCanvas = drawCanvasRef.current;
    if (!drawCanvas) return;
    const ctx = drawCanvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    const { x, y } = getScaledCoordinates(e);
    // Ensure top-left to bottom-right
    const x1 = Math.min(start.x, x);
    const y1 = Math.min(start.y, y);
    const x2 = Math.max(start.x, x);
    const y2 = Math.max(start.y, y);
    if (Math.abs(x2 - x1) < 5 || Math.abs(y2 - y1) < 5) {
      setStart(null);
      return; // 忽略过小的框
    }
    const newCoord = [Math.round(x1), Math.round(y1), Math.round(x2), Math.round(y2)];
    setBoxes((prev) => {
      const next = [...prev, { coords: newCoord, type: 'draw' as const }];
      setInputValue(next.map((b) => `[${b.coords.join(',')}]`).join(','));
      // 自动滚动到新坐标
      setTimeout(() => {
        const list = document.getElementById('coord-list-scroll');
        if (list) list.scrollTop = list.scrollHeight;
      }, 100);
      return next;
    });
    setStart(null);
  };

  // 鼠标离开时清除预览
  const handleMouseLeave = () => {
    setIsDrawing(false);
    const drawCanvas = drawCanvasRef.current;
    if (drawCanvas) {
      const ctx = drawCanvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    }
    drawCoordinates();
  };

  // 高亮坐标框
  const handleCoordMouseEnter = (idx: number) => {
    setHighlightIdx(idx);
  };
  const handleCoordMouseLeave = () => {
    setHighlightIdx(null);
  };

  // Parse coordinates from input
  const parseCoordinates = (input: string) => {
    try {
      input = input.replace(/\s/g, '');
      if (!input) return [];
      return (
        input.match(/\[\d+,\d+,\d+,\d+\]/g)?.map((coord) => {
          const numbers = coord.slice(1, -1).split(',').map(Number);
          if (numbers.length !== 4 || numbers.some(isNaN)) throw new Error('格式错误');
          return numbers;
        }) || []
      );
    } catch {
      return [];
    }
  };

  // Draw from input
  const handleDrawFromInput = () => {
    const coords = parseCoordinates(inputValue);
    coords.forEach(checkBounds);
    setBoxes((prev) => {
      const next = [...prev, ...coords.map((c) => ({ coords: c, type: 'manual' as const }))];
      setInputValue(next.map((b) => `[${b.coords.join(',')}]`).join(','));
      return next;
    });
  };

  // Check bounds
  const checkBounds = (coord: number[]) => {
    const video = videoRef.current;
    if (!video) return;
    const [x1, y1, x2, y2] = coord;
    const outOfBounds: string[] = [];
    if (x1 < 0) outOfBounds.push('左');
    if (y1 < 0) outOfBounds.push('上');
    if (x2 > video.videoWidth) outOfBounds.push('右');
    if (y2 > video.videoHeight) outOfBounds.push('下');
    if (outOfBounds.length > 0) {
      // debugger;
    }
  };

  // Video controls
  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  const handleProgressClick = (e: React.MouseEvent) => {
    const video = videoRef.current;
    if (!video) return;
    const rect = (e.target as HTMLDivElement).getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    video.currentTime = pos * video.duration;
  };

  // 文件选择优化
  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setVideoUrl(URL.createObjectURL(e.target.files[0]));
    }
  };

  // Video URL load
  const handleLoadUrl = () => {
    if (!videoUrl.trim()) {
      // setError('请输入视频URL'); // Removed as per edit hint
      return;
    }
    // setError(''); // Removed as per edit hint
    setVideoUrl(videoUrl.trim());
  };

  // Redraw coordinates when changed
  useEffect(() => {
    drawCoordinates();
  }, [boxes]);

  // Redraw on zoom
  useEffect(() => {
    const wrapper = document.getElementById('videoWrapper');
    if (wrapper) {
      wrapper.style.transform = `scale(${currentZoom})`;
    }
    drawCoordinates();
  }, [currentZoom]);

  // 删除单个框
  const handleDeleteCoord = (idx: number) => {
    setBoxes((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      setInputValue(next.map((b) => `[${b.coords.join(',')}]`).join(','));
      return next;
    });
  };

  // 播放/暂停按钮和进度条禁用逻辑
  const controlsDisabled = !videoUrl || !videoRef.current?.videoWidth;

  // wheel缩放逻辑恢复
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      let nextZoom = currentZoom + (e.deltaY < 0 ? 0.1 : -0.1);
      nextZoom = Math.max(0.2, Math.min(10, nextZoom));
      setCurrentZoom(nextZoom);
    }
  };

  // --- PR3: 每类框独立样式设置 ---
  // 手动输入框样式
  // 手动画框样式
  // npz 框字号、线宽（颜色已用 npzColor）

  // 1. 移除比对相关 state 和逻辑
  // 2. 移除主npz相关逻辑
  // 3. 重构右侧面板结构
  // 4. npz面板每项支持本地/链接导入二选一，支持新增/删除
  // 5. 其它面板结构初步调整

  // --- 新增 npzItems state，每项支持本地/链接导入二选一 ---
  // --- npz面板操作函数 ---
  const handleAddNpzItem = () => {
    setNpzItems((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2),
        type: 'url',
        url: '',
        boxes: [],
      },
    ]);
  };
  // 1. npz面板每项导入逻辑
  const handleImportNpzItem = async (item: (typeof npzItems)[0], idx: number) => {
    try {
      let arrayBuffer: ArrayBuffer | null = null;
      if (item.type === 'file' && item.file) {
        arrayBuffer = await item.file.arrayBuffer();
      } else if (item.type === 'url' && item.url) {
        const res = await fetch(item.url.trim());
        if (!res.ok) throw new Error('下载失败');
        arrayBuffer = await res.arrayBuffer();
      }
      if (!arrayBuffer) return;
      const zip = await JSZip.loadAsync(arrayBuffer);
      const npyFile = zip.file('crop_box.npy');
      if (!npyFile) return;
      const npyBuffer = await npyFile.async('arraybuffer');
      const npy = new NPYJS();
      const arr = await npy.parse(npyBuffer);
      const coords: number[][] = [];
      for (let i = 0; i < arr.shape[0]; i++) {
        const row = [];
        for (let j = 0; j < arr.shape[1]; j++) {
          row.push(arr.data[i * arr.shape[1] + j]);
        }
        coords.push(row.map((x) => Math.round(Number(x))));
      }
      // 更新npzItems中本项的boxes
      setNpzItems((prev) =>
        prev.map((it, i) =>
          i === idx
            ? { ...it, boxes: coords.map((c) => ({ coords: c, type: 'npz', npzIndex: idx })) }
            : it,
        ),
      );
      // 更新全局boxes，先移除所有type:npz且npzIndex为idx的，再加上新解析的
      setBoxes((prev) => [
        ...prev.filter((b) => !(b.type === 'npz' && b.npzIndex === idx)),
        ...coords.map((c) => ({ coords: c, type: 'npz' as const, npzIndex: idx })),
      ]);
    } catch (e) {
      // 可加错误提示
    }
  };
  // 2. npz面板每项清空本项标注
  const handleClearNpzItem = (idx: number) => {
    setNpzItems((prev) => prev.map((it, i) => (i === idx ? { ...it, boxes: [] } : it)));
    setBoxes((prev) => prev.filter((b) => !(b.type === 'npz' && b.npzIndex === idx)));
  };
  // 3. 删除npz项时同步清空boxes
  const handleRemoveNpzItem = (id: string) => {
    setNpzItems((prev) => prev.filter((item) => item.id !== id));
    // 找到idx
    const idx = npzItems.findIndex((item) => item.id === id);
    if (idx !== -1) {
      setBoxes((prev) => prev.filter((b) => !(b.type === 'npz' && b.npzIndex === idx)));
    }
  };
  const handleNpzTypeChange = (id: string, type: 'file' | 'url') => {
    setNpzItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, type, file: undefined, url: '' } : item)),
    );
  };
  const handleNpzUrlChange = (id: string, url: string) => {
    setNpzItems((prev) => prev.map((item) => (item.id === id ? { ...item, url } : item)));
  };
  // 修改 handleNpzFileChange 签名，允许 file 为 File | null
  const handleNpzFileChange = (id: string, file: File | null) => {
    setNpzItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, file: file || undefined } : item)),
    );
  };

  // 1. npz面板每项样式设置
  const handleNpzColorChange = (idx: number, color: string) => {
    setNpzBoxColor(color);
    setNpzTextColor(color);
  };
  const handleNpzFontSizeChange = (idx: number, delta: number) => {
    setNpzFontSize(Math.max(12, Math.min(48, npzFontSize + delta)));
  };
  const handleNpzLineWidthChange = (idx: number, delta: number) => {
    setNpzLineWidth(Math.max(1, Math.min(10, npzLineWidth + delta)));
  };

  // 自动解析npzItems的file/url
  useEffect(() => {
    npzItems.forEach(async (item, idx) => {
      // 只在有file/url且未解析时自动导入
      if (
        item.boxes.length === 0 &&
        ((item.type === 'file' && item.file) || (item.type === 'url' && item.url))
      ) {
        try {
          let arrayBuffer: ArrayBuffer | null = null;
          if (item.type === 'file' && item.file) {
            arrayBuffer = await item.file.arrayBuffer();
          } else if (item.type === 'url' && item.url) {
            const res = await fetch(item.url.trim());
            if (!res.ok) throw new Error('下载失败');
            arrayBuffer = await res.arrayBuffer();
          }
          if (!arrayBuffer) return;
          const zip = await JSZip.loadAsync(arrayBuffer);
          const npyFile = zip.file('crop_box.npy');
          if (!npyFile) return;
          const npyBuffer = await npyFile.async('arraybuffer');
          const npy = new NPYJS();
          const arr = await npy.parse(npyBuffer);
          const coords: number[][] = [];
          for (let i = 0; i < arr.shape[0]; i++) {
            const row = [];
            for (let j = 0; j < arr.shape[1]; j++) {
              row.push(arr.data[i * arr.shape[1] + j]);
            }
            coords.push(row.map((x) => Math.round(Number(x))));
          }
          // 更新npzItems中本项的boxes
          setNpzItems((prev) =>
            prev.map((it, i) =>
              i === idx
                ? { ...it, boxes: coords.map((c) => ({ coords: c, type: 'npz', npzIndex: idx })) }
                : it,
            ),
          );
          // 更新全局boxes，先移除所有type:npz且npzIndex为idx的，再加上新解析的
          setBoxes((prev) => [
            ...prev.filter((b) => !(b.type === 'npz' && b.npzIndex === idx)),
            ...coords.map((c) => ({ coords: c, type: 'npz' as const, npzIndex: idx })),
          ]);
        } catch (e) {
          // 可加错误提示
        }
      }
      // 如果file/url被清空，自动移除boxes
      if (
        item.boxes.length > 0 &&
        ((item.type === 'file' && !item.file) || (item.type === 'url' && !item.url))
      ) {
        setNpzItems((prev) => prev.map((it, i) => (i === idx ? { ...it, boxes: [] } : it)));
        setBoxes((prev) => prev.filter((b) => !(b.type === 'npz' && b.npzIndex === idx)));
      }
    });
  }, [npzItems]);

  // inputValue 只反映 type: 'manual' 的框
  useEffect(() => {
    setInputValue(
      boxes
        .filter((b) => b.type === 'manual')
        .map((b) => `[${b.coords.join(',')}]`)
        .join(','),
    );
  }, [boxes]);

  // npz面板顶部批量导入Dialog
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [batchInput, setBatchInput] = useState('');
  const handleBatchImport = () => {
    let urls: string[] = [];
    try {
      // 先尝试 JSON.parse
      const parsed = JSON.parse(batchInput);
      if (Array.isArray(parsed)) {
        urls = parsed.map((u) => String(u).trim()).filter(Boolean);
      }
    } catch {
      // 非JSON格式，提取所有 http(s) 链接
      urls = batchInput
        .replace(/\[|\]|"|'/g, '') // 去除方括号和引号
        .split(/,|\n/)
        .map((u) => u.trim())
        .filter((u) => /^https?:\/\/.+\.npz$/i.test(u));
    }
    if (!urls.length) return;
    setNpzItems((prev) => [
      ...prev,
      ...urls.map((url) => ({
        id: Math.random().toString(36).slice(2),
        type: 'url' as const,
        url,
        boxes: [],
      })),
    ]);
    setBatchDialogOpen(false);
    setBatchInput('');
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center py-8">
      <div className="max-w-[1500px] w-full flex gap-10">
        {/* 左侧：视频与标注 */}
        <Card className="flex-1 flex flex-col items-center max-h-[90vh] bg-[#18181b] shadow border-none">
          <CardHeader className="w-full flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold tracking-wide text-white">
              视频坐标标注工具
            </CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-5 h-5 text-gray-400 hover:text-gray-200 transition-colors" />
              </TooltipTrigger>
              <TooltipContent
                side="left"
                className="text-xs bg-[#222] text-gray-200 border border-gray-700"
              >
                按住 Ctrl/Command + 滚轮可缩放视频
              </TooltipContent>
            </Tooltip>
          </CardHeader>
          <CardContent className="flex flex-col items-center w-full flex-1">
            <div className="relative rounded-xl overflow-auto mb-4 w-full flex-1 flex items-center justify-center max-h-[70vh] bg-[#101014] border border-[#232329] shadow-inner scrollbar-hide">
              {/* 悬浮操作说明Tip */}
              <div className="absolute top-2 right-4 z-20">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-5 h-5 text-gray-400 hover:text-gray-200 cursor-pointer" />
                  </TooltipTrigger>
                  <TooltipContent
                    side="left"
                    className="text-xs bg-[#222] text-gray-200 border border-gray-700 max-w-xs"
                  >
                    <div className="mb-1">
                      快捷键：空格播放/暂停，Delete 删除最后一个框，Ctrl+Z 撤销
                    </div>
                    <div className="mb-1">
                      缩放：按住 Ctrl/Command + 滚轮，支持 0.2~10 倍，缩放以鼠标为中心
                    </div>
                    <div className="mb-1">
                      红色数字表示该点超出视频边界，行尾&#34;超出边界&#34;标识
                    </div>
                    <div>框线、字号均可自定义，编号和圆圈大小自适应分辨率</div>
                  </TooltipContent>
                </Tooltip>
              </div>
              {videoLoading && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-200" />
                  <span className="ml-4 text-white text-lg">加载中...</span>
                </div>
              )}
              <div
                id="videoWrapper"
                className="relative mx-auto"
                style={{
                  transform: `scale(${currentZoom})`,
                  transformOrigin: '50% 50%',
                  maxHeight: '70vh',
                  maxWidth: '100%',
                  display: 'inline-block',
                }}
                onWheel={handleWheel}
              >
                <video
                  ref={videoRef}
                  className="block max-w-full max-h-[70vh] rounded-lg bg-black"
                  src={videoUrl}
                  onError={() => {
                    console.error('视频加载失败', videoUrl);
                  }}
                  controls={false}
                  tabIndex={-1}
                  style={{
                    cursor: controlsDisabled ? 'not-allowed' : 'pointer',
                    maxHeight: '70vh',
                    maxWidth: '100%',
                  }}
                >
                  您的浏览器不支持 video 标签。
                </video>
                <canvas ref={canvasRef} className="absolute top-0 left-0 pointer-events-none" />
                <canvas
                  ref={drawCanvasRef}
                  className="absolute top-0 left-0 cursor-crosshair"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseLeave}
                />
              </div>
            </div>
            {/* 控制区 */}
            <div className="flex items-center gap-4 bg-[#232329] rounded-lg px-6 py-3 mb-4 w-full max-w-2xl shadow border border-[#232329]">
              <Button
                variant="secondary"
                size="icon"
                onClick={handlePlayPause}
                className="ml-2 bg-black text-gray-400 hover:bg-[#18181b] border border-[#232329]"
                disabled={controlsDisabled}
              >
                {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </Button>
              <div
                className={`flex-1 h-2 rounded-full cursor-pointer relative overflow-hidden ${controlsDisabled ? 'bg-gray-800' : 'bg-gray-700'}`}
                onClick={controlsDisabled ? undefined : handleProgressClick}
              >
                <div
                  className={`h-2 rounded-full transition-all ${controlsDisabled ? 'bg-gray-700' : 'bg-gray-400'}`}
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <span className="font-mono text-xs min-w-[90px] text-gray-300">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
              <span className="ml-2 text-gray-400 text-xs font-mono tracking-wider">
                {Math.round(currentZoom * 100)}%
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="ml-2 bg-black text-gray-400 hover:bg-[#18181b] border border-[#232329]"
                    onClick={() => setCurrentZoom(1)}
                    disabled={controlsDisabled}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-[#222] text-gray-200 border border-gray-700">
                  重置缩放
                </TooltipContent>
              </Tooltip>
            </div>
          </CardContent>
        </Card>
        {/* 右侧：设置与结果，全部平铺，无Tabs */}
        <div className="w-[420px] flex-shrink-0 flex flex-col gap-6 max-h-[90vh] overflow-auto scrollbar-hide md:max-h-screen">
          {/* 视频面板 */}
          <Card className="bg-[#18181b] border border-[#232329] shadow mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-white">视频面板</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    className="bg-black text-gray-400 hover:bg-[#18181b] border border-[#232329] px-4"
                    onClick={handleFileButtonClick}
                    disabled={playing}
                  >
                    本地视频
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={playing}
                  />
                  <Input
                    type="text"
                    className="text-sm bg-[#232329] border border-[#232329] text-white placeholder:text-gray-500 flex-1 min-w-0"
                    placeholder="视频URL"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    disabled={playing}
                  />
                  <Button
                    variant="secondary"
                    onClick={handleLoadUrl}
                    className="bg-black text-gray-400 hover:bg-[#18181b] border border-[#232329] px-4"
                    disabled={playing}
                  >
                    URL导入
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          {/* npz面板 */}
          <Card className="bg-[#18181b] border border-[#232329] shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-white flex justify-between">
                <span>npz面板</span>
                <div>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="bg-black text-gray-400 hover:bg-[#18181b] border border-[#232329] px-4"
                    onClick={() => setBatchDialogOpen(true)}
                  >
                    批量导入
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center gap-2 mb-2">
                {/* 样式设置区 */}
                <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
                  <DialogContent className="bg-[#18181b] border border-[#232329] text-white max-w-md">
                    <DialogHeader>
                      <DialogTitle>批量导入npz链接</DialogTitle>
                    </DialogHeader>
                    <div className="text-xs text-gray-400 mb-2">
                      支持多种格式：
                      <br />
                      1. 每行一个链接
                      <br />
                      2. 用逗号分隔的链接
                      <br />
                      3.{' '}
                      <span className="font-mono">
                        [&quot;url1&quot;, &quot;url2&quot;, ...]
                      </span>{' '}
                      形式的JSON数组
                    </div>
                    <textarea
                      className="w-full min-h-[100px] bg-[#232329] border border-[#232329] text-white rounded p-2 text-sm mb-2"
                      placeholder="每行一个链接或用逗号分隔"
                      value={batchInput}
                      onChange={(e) => setBatchInput(e.target.value)}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button variant="secondary" onClick={() => setBatchDialogOpen(false)}>
                        取消
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={handleBatchImport}
                        disabled={!batchInput.trim()}
                      >
                        导入
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <label className="text-xs text-gray-400 flex items-center gap-1">
                  线色
                  <input
                    type="color"
                    value={npzBoxColor}
                    onChange={(e) => handleNpzColorChange(0, e.target.value)}
                    className="w-6 h-6 border-none bg-transparent cursor-pointer"
                  />
                </label>
                <label className="text-xs text-gray-400 flex items-center gap-1">
                  字色
                  <input
                    type="color"
                    value={npzTextColor}
                    onChange={(e) => setNpzTextColor(e.target.value)}
                    className="w-6 h-6 border-none bg-transparent cursor-pointer"
                  />
                </label>
                <span className="text-xs text-gray-400 ml-2">字号</span>
                <button
                  type="button"
                  className="px-2 py-1 bg-[#232329] border border-[#232329] text-white rounded hover:bg-[#333]"
                  onClick={() => handleNpzFontSizeChange(0, -4)}
                >
                  -
                </button>
                <button
                  type="button"
                  className="px-2 py-1 bg-[#232329] border border-[#232329] text-white rounded hover:bg-[#333]"
                  onClick={() => handleNpzFontSizeChange(0, 4)}
                >
                  +
                </button>
                <span className="text-xs text-gray-400 ml-2">线宽</span>
                <button
                  type="button"
                  className="px-2 py-1 bg-[#232329] border border-[#232329] text-white rounded hover:bg-[#333]"
                  onClick={() => handleNpzLineWidthChange(0, -2)}
                >
                  -
                </button>
                <button
                  type="button"
                  className="px-2 py-1 bg-[#232329] border border-[#232329] text-white rounded hover:bg-[#333]"
                  onClick={() => handleNpzLineWidthChange(0, 2)}
                >
                  +
                </button>
              </div>
              {npzItems.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-2 border-b border-[#232329] pb-2 mb-2"
                >
                  <div className="flex items-center gap-2">
                    <Select
                      value={item.type}
                      onValueChange={(val) => handleNpzTypeChange(item.id, val as 'file' | 'url')}
                    >
                      <SelectTrigger className="w-12 border-0">
                        <SelectValue>
                          {item.type === 'file' ? (
                            <File className="inline text-white" />
                          ) : (
                            <Link2 className="inline text-white" />
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-[#18181b] text-white border-0">
                        <SelectItem value="file">
                          <File className="inline " />
                          <span>文件</span>
                        </SelectItem>
                        <SelectItem value="url">
                          <Link2 className="inline" />
                          <span>链接</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {item.type === 'file' ? (
                      <>
                        <input
                          type="file"
                          accept=".npz"
                          id={`npz-file-input-${item.id}`}
                          className="hidden"
                          onChange={(ev) => {
                            const file = ev.target.files?.[0];
                            if (file) handleNpzFileChange(item.id, file);
                          }}
                        />
                        <Button
                          variant="secondary"
                          className="px-3 py-1 text-xs w-[287px]"
                          onClick={() =>
                            document.getElementById(`npz-file-input-${item.id}`)?.click()
                          }
                        >
                          {item.file ? item.file.name : '选择文件'}
                        </Button>
                        {item.file && (
                          <Button
                            variant="ghost"
                            className="px-2 py-1 text-xs"
                            onClick={() => handleNpzFileChange(item.id, null)}
                          >
                            ×
                          </Button>
                        )}
                      </>
                    ) : (
                      <Input
                        type="text"
                        className="text-sm bg-[#232329] border border-[#232329] text-white placeholder:text-gray-500 flex-1"
                        placeholder="npz文件URL"
                        value={item.url || ''}
                        onChange={(e) => handleNpzUrlChange(item.id, e.target.value)}
                        disabled={item.boxes.length > 0}
                      />
                    )}
                    <Button
                      variant="secondary"
                      size="icon"
                      className="bg-black text-gray-400 hover:bg-[#18181b] border border-[#232329] px-1 py-0 h-5 w-5"
                      onClick={() => handleRemoveNpzItem(item.id)}
                      tabIndex={-1}
                    >
                      ×
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                variant="secondary"
                className="bg-black text-gray-400 hover:bg-[#18181b] border border-[#232329] px-4"
                onClick={handleAddNpzItem}
              >
                新增npz项
              </Button>
              <Button
                variant="secondary"
                className="bg-black text-gray-400 hover:bg-[#18181b] border border-[#232329] px-4"
                onClick={() => {
                  setNpzItems((prev) =>
                    prev.map((it) => ({ ...it, boxes: [], file: undefined, url: '' })),
                  );
                  setBoxes((prev) => prev.filter((b) => b.type !== 'npz'));
                }}
              >
                清空npz框
              </Button>
            </CardContent>
          </Card>
          {/* 手动输入面板（含样式设置） */}
          <Card className="bg-[#18181b] border border-[#232329] shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-white">手动输入坐标</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {/* 样式设置后续补充 */}
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs text-gray-400 flex items-center gap-1">
                  线色
                  <input
                    type="color"
                    value={manualBoxColor}
                    onChange={(e) => setManualBoxColor(e.target.value)}
                    className="w-6 h-6 border-none bg-transparent cursor-pointer"
                  />
                </label>
                <label className="text-xs text-gray-400 flex items-center gap-1">
                  字色
                  <input
                    type="color"
                    value={manualTextColor}
                    onChange={(e) => setManualTextColor(e.target.value)}
                    className="w-6 h-6 border-none bg-transparent cursor-pointer"
                  />
                </label>
                <span className="text-xs text-gray-400 ml-2">字号</span>
                <button
                  type="button"
                  className="px-2 py-1 bg-[#232329] border border-[#232329] text-white rounded hover:bg-[#333]"
                  onClick={() => setManualFontSize((f) => Math.max(12, f - 4))}
                >
                  -
                </button>
                <button
                  type="button"
                  className="px-2 py-1 bg-[#232329] border border-[#232329] text-white rounded hover:bg-[#333]"
                  onClick={() => setManualFontSize((f) => Math.min(48, f + 4))}
                >
                  +
                </button>
                <span className="text-xs text-gray-400 ml-2">线宽</span>
                <button
                  type="button"
                  className="px-2 py-1 bg-[#232329] border border-[#232329] text-white rounded hover:bg-[#333]"
                  onClick={() => setManualLineWidth((w) => Math.max(1, w - 2))}
                >
                  -
                </button>
                <button
                  type="button"
                  className="px-2 py-1 bg-[#232329] border border-[#232329] text-white rounded hover:bg-[#333]"
                  onClick={() => setManualLineWidth((w) => Math.min(10, w + 2))}
                >
                  +
                </button>
              </div>
              <Textarea
                placeholder="输入格式: [x1,y1,x2,y2],[x1,y1,x2,y2]..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="text-sm min-h-[80px] bg-[#232329] border border-[#232329] text-white placeholder:text-gray-500"
                disabled={playing}
              />
              <Button
                onClick={handleDrawFromInput}
                variant="secondary"
                className="w-full bg-black text-gray-400 hover:bg-[#18181b] border border-[#232329]"
                disabled={playing}
              >
                绘制坐标框
              </Button>
              <Button
                variant="secondary"
                className="bg-black text-gray-400 hover:bg-[#18181b] border border-[#232329] px-4"
                onClick={() => setBoxes((prev) => prev.filter((b) => b.type !== 'manual'))}
              >
                清空手动输入框
              </Button>
            </CardContent>
          </Card>
          {/* 手动画框面板 */}
          <Card className="bg-[#18181b] border border-[#232329] shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-white">手动画框</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center gap-2 mb-2">
                <Switch
                  checked={drawMode}
                  onCheckedChange={setDrawMode}
                  id="draw-mode-switch"
                  className={
                    drawMode
                      ? 'data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500'
                      : ''
                  }
                />
                <label htmlFor="draw-mode-switch" className="text-xs text-gray-300 select-none">
                  {drawMode ? '手动画框模式：开' : '手动画框模式：关'}
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs text-gray-400 flex items-center gap-1">
                  线色
                  <input
                    type="color"
                    value={drawBoxColor}
                    onChange={(e) => setDrawBoxColor(e.target.value)}
                    className="w-6 h-6 border-none bg-transparent cursor-pointer"
                  />
                </label>
                <label className="text-xs text-gray-400 flex items-center gap-1">
                  字色
                  <input
                    type="color"
                    value={drawTextColor}
                    onChange={(e) => setDrawTextColor(e.target.value)}
                    className="w-6 h-6 border-none bg-transparent cursor-pointer"
                  />
                </label>
                <span className="text-xs text-gray-400 ml-2">字号</span>
                <button
                  type="button"
                  className="px-2 py-1 bg-[#232329] border border-[#232329] text-white rounded hover:bg-[#333]"
                  onClick={() => setDrawFontSize((f) => Math.max(12, f - 4))}
                >
                  -
                </button>
                <button
                  type="button"
                  className="px-2 py-1 bg-[#232329] border border-[#232329] text-white rounded hover:bg-[#333]"
                  onClick={() => setDrawFontSize((f) => Math.min(48, f + 4))}
                >
                  +
                </button>
                <span className="text-xs text-gray-400 ml-2">线宽</span>
                <button
                  type="button"
                  className="px-2 py-1 bg-[#232329] border border-[#232329] text-white rounded hover:bg-[#333]"
                  onClick={() => setDrawLineWidth((w) => Math.max(1, w - 2))}
                >
                  -
                </button>
                <button
                  type="button"
                  className="px-2 py-1 bg-[#232329] border border-[#232329] text-white rounded hover:bg-[#333]"
                  onClick={() => setDrawLineWidth((w) => Math.min(10, w + 2))}
                >
                  +
                </button>
              </div>
              <Button
                variant="secondary"
                className="bg-black text-gray-400 hover:bg-[#18181b] border border-[#232329] px-4 mt-2"
                onClick={() => setBoxes((prev) => prev.filter((b) => b.type !== 'draw'))}
              >
                清空手动画框
              </Button>
            </CardContent>
          </Card>
          {/* 坐标列表区块 */}
          <Card className="bg-[#18181b] border border-[#232329] shadow">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base text-white">坐标列表</CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs text-gray-400 underline cursor-help ml-2">标记说明</span>
                </TooltipTrigger>
                <TooltipContent className="bg-[#222] text-gray-200 border border-gray-700 text-xs max-w-xs pl-5">
                  <ul className="list-disc">
                    <li className="pb-1">
                      <b>N</b>：npz导入
                    </li>
                    <li className="pb-1">
                      <b>D</b>：手动画框
                    </li>
                    <li className="pb-1">
                      <b>M</b>：手动输入
                    </li>
                    <li className="pb-1">红色数字表示超出视频边界</li>
                    <li className="pb-1">鼠标hover出现彩虹高亮</li>
                  </ul>
                </TooltipContent>
              </Tooltip>
            </CardHeader>
            <CardContent>
              <ScrollArea
                id="coord-list-scroll"
                className="h-40 rounded border border-[#232329] bg-[#232329] p-2"
              >
                <div className="space-y-1">
                  {boxes.length === 0 && (
                    <div className="text-xs text-gray-500 flex justify-center items-center h-30">
                      暂无标注
                    </div>
                  )}
                  {boxes.map((box, idx) => {
                    const video = videoRef.current;
                    const pointColor: (string | undefined)[] = [
                      undefined,
                      undefined,
                      undefined,
                      undefined,
                    ];
                    if (video) {
                      if (box.coords[0] < 0) pointColor[0] = 'red';
                      if (box.coords[1] < 0) pointColor[1] = 'red';
                      if (box.coords[2] > video.videoWidth) pointColor[2] = 'red';
                      if (box.coords[3] > video.videoHeight) pointColor[3] = 'red';
                    }
                    // 区分来源
                    let prefix = '';
                    let color = '';
                    if (box.type === 'npz') {
                      prefix = 'N';
                      color = npzBoxColor;
                    } else if (box.type === 'manual') {
                      prefix = 'M';
                      color = manualBoxColor;
                    } else if (box.type === 'draw') {
                      prefix = 'D';
                      color = drawBoxColor;
                    }

                    return (
                      <div
                        key={idx}
                        className="text-xs font-mono flex items-center gap-2 group cursor-pointer"
                        style={{ color: '#fff' }}
                        onMouseEnter={() => setHighlightIdx(idx)}
                        onMouseLeave={() => setHighlightIdx(null)}
                      >
                        <span className="font-bold">
                          {prefix}
                          {idx + 1}
                        </span>
                        : [
                        <span style={{ color: pointColor[0] ? 'red' : '#fff' }}>
                          {box.coords[0]}
                        </span>
                        ,
                        <span style={{ color: pointColor[1] ? 'red' : '#fff' }}>
                          {box.coords[1]}
                        </span>
                        ,
                        <span style={{ color: pointColor[2] ? 'red' : '#fff' }}>
                          {box.coords[2]}
                        </span>
                        ,
                        <span style={{ color: pointColor[3] ? 'red' : '#fff' }}>
                          {box.coords[3]}
                        </span>
                        ]
                        <span
                          className="ml-2 px-1 py-0.5 rounded text-[10px] flex items-center justify-center"
                          style={{
                            display: 'block',
                            background: color + 'B3', // 70% 透明度
                            fontWeight: 500,
                            borderRadius: '50%',
                            width: 15,
                            height: 15,
                          }}
                        ></span>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="ml-1 bg-black text-gray-400 hover:bg-[#18181b] border border-[#232329] px-1 py-0 h-5 w-5 opacity-0 group-hover:opacity-100 transition"
                          onClick={() => handleDeleteCoord(idx)}
                          tabIndex={-1}
                        >
                          ×
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default VideoAnnotator;
