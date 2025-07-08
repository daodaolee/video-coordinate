'use client';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Info, RotateCcw, Play, Pause } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import JSZip from 'jszip';
import NPYJS from 'npyjs';

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const VideoAnnotator: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [coordinates, setCoordinates] = useState<number[][]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [currentZoom, setCurrentZoom] = useState(1);
  const [toastMsg, setToastMsg] = useState('');
  const [error, setError] = useState('');
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [boxColor, setBoxColor] = useState('#DA1010'); // 默认 cyan
  const [textColor, setTextColor] = useState('#22d3ee'); // 默认 cyan
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [highlightIdx, setHighlightIdx] = useState<number | null>(null);
  const [drawMode, setDrawMode] = useState(false);
  const [npzUrl, setNpzUrl] = useState('');

  // Toast logic (use sonner)
  useEffect(() => {
    if (toastMsg) {
      toast(toastMsg, { duration: 2000 });
      setToastMsg('');
    }
  }, [toastMsg]);

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
    };
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', onLoaded);
    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('loadedmetadata', onLoaded);
    };
  }, [videoUrl]);

  // Draw coordinates
  const drawCoordinates = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    coordinates.forEach((coord, idx) => {
      ctx.beginPath();
      ctx.strokeStyle = idx === highlightIdx ? '#fff' : boxColor;
      ctx.lineWidth = idx === highlightIdx ? 3 : 2;
      ctx.globalAlpha = idx === highlightIdx ? 1 : 0.9;
      ctx.strokeRect(coord[0], coord[1], coord[2] - coord[0], coord[3] - coord[1]);
      ctx.fillStyle = idx === highlightIdx ? '#fff' : textColor;
      ctx.globalAlpha = 1;
      ctx.font = '12px Arial';
      ctx.fillText(`(${coord[0]},${coord[1]})`, coord[0], coord[1] - 5);
      ctx.fillText(`(${coord[2]},${coord[3]})`, coord[2], coord[3] + 15);
      // 框中心用圆形标注"1234"
      const centerX = (coord[0] + coord[2]) / 2;
      const centerY = (coord[1] + coord[3]) / 2;
      const radius = 9; // 缩小圆的半径
      // 画圆
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fillStyle = idx === highlightIdx ? '#fff' : '#222';
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = idx === highlightIdx ? boxColor : '#fff';
      ctx.globalAlpha = 1;
      ctx.stroke();
      // 写数字
      ctx.font = 'bold 11px Arial'; // 缩小字体
      ctx.fillStyle = idx === highlightIdx ? boxColor : '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${idx + 1}`, centerX, centerY);
      ctx.textAlign = 'start';
      ctx.textBaseline = 'alphabetic';
    });
  }, [coordinates, boxColor, textColor, highlightIdx]);

  // 修复 canvas 尺寸同步问题
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const drawCanvas = drawCanvasRef.current;
    if (!video || !canvas || !drawCanvas) return;

    const setCanvasSize = () => {
      if (video.videoWidth && video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        drawCanvas.width = video.videoWidth;
        drawCanvas.height = video.videoHeight;
        // 样式宽高用于适配缩放
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
        if (coordinates.length > 0) {
          handleDeleteCoord(coordinates.length - 1);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (coordinates.length > 0) {
          handleDeleteCoord(coordinates.length - 1);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [coordinates, videoUrl]);

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
      ctx.strokeStyle = boxColor;
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
    setCoordinates((prev) => {
      const next = [...prev, newCoord];
      setInputValue(next.map((c) => `[${c.join(',')}]`).join(','));
      setToastMsg('已添加标注框');
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
  const handleCoordMouseEnter = (idx: number) => setHighlightIdx(idx);
  const handleCoordMouseLeave = () => setHighlightIdx(null);

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
      setToastMsg('坐标格式错误，请检查输入');
      return [];
    }
  };

  // Draw from input
  const handleDrawFromInput = () => {
    const coords = parseCoordinates(inputValue);
    coords.forEach(checkBounds);
    setCoordinates(coords);
  };

  // Clear all
  const handleClear = () => {
    setCoordinates([]);
    setInputValue('');
  };

  // Check bounds
  const checkBounds = (coord: number[], index: number) => {
    const video = videoRef.current;
    if (!video) return;
    const [x1, y1, x2, y2] = coord;
    const outOfBounds = [];
    if (x1 < 0) outOfBounds.push('左');
    if (y1 < 0) outOfBounds.push('上');
    if (x2 > video.videoWidth) outOfBounds.push('右');
    if (y2 > video.videoHeight) outOfBounds.push('下');
    if (outOfBounds.length > 0) {
      setToastMsg(`第${index + 1}个框超出视频${outOfBounds.join('、')}边界`);
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

  // Zoom controls
  const handleWheel = (e: React.WheelEvent) => {
    // 只有按住 Ctrl 或 Meta（Command）时才缩放
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      let nextZoom = currentZoom + (e.deltaY < 0 ? 0.1 : -0.1);
      nextZoom = Math.max(0.5, Math.min(3, nextZoom));
      if (nextZoom === currentZoom) {
        setToastMsg(nextZoom === 0.5 ? '已到最小缩放' : '已到最大缩放');
      }
      setCurrentZoom(nextZoom);
    }
    // 否则让页面正常滚动
  };

  // 文件选择优化
  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setError('');
      setVideoUrl(URL.createObjectURL(e.target.files[0]));
    }
  };

  // Video URL load
  const handleLoadUrl = () => {
    if (!videoUrl.trim()) {
      setError('请输入视频URL');
      return;
    }
    setError('');
    setVideoUrl(videoUrl.trim());
  };

  // Redraw coordinates when changed
  useEffect(() => {
    drawCoordinates();
  }, [coordinates]);

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
    setCoordinates((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      setInputValue(next.map((c) => `[${c.join(',')}]`).join(','));
      setToastMsg('已删除标注框');
      return next;
    });
  };

  // 播放/暂停按钮和进度条禁用逻辑
  const controlsDisabled = !videoUrl || !videoRef.current?.videoWidth;

  // npz 解析
  const handleNpzFile = async (file: File) => {
    try {
      const zip = await JSZip.loadAsync(file);
      const npyFile = zip.file('crop_box.npy');
      if (!npyFile) {
        setToastMsg('未找到 crop_box.npy');
        return;
      }
      const npyBuffer = await npyFile.async('arraybuffer');
      const npy = new NPYJS();
      const arr = await npy.parse(npyBuffer);
      // arr.data 是 Float32Array/Int32Array，arr.shape 是 [N, 4]
      const coords: number[][] = [];
      for (let i = 0; i < arr.shape[0]; i++) {
        const row = [];
        for (let j = 0; j < arr.shape[1]; j++) {
          row.push(arr.data[i * arr.shape[1] + j]);
        }
        coords.push(row.map((x) => Math.round(Number(x))));
      }
      setCoordinates((prev) => [...prev, ...coords]);
      setInputValue((prev) => {
        const prevArr = parseCoordinates(prev);
        const all = [...prevArr, ...coords];
        return all.map((c) => `[${c.join(',')}]`).join(',');
      });
      setToastMsg('crop_box 解析成功');
    } catch (e) {
      console.log(e);
      setToastMsg('npz 解析失败');
    }
  };
  const npzInputRef = useRef<HTMLInputElement>(null);
  const handleNpzButtonClick = () => npzInputRef.current?.click();

  const handleNpzUrlImport = async () => {
    if (!npzUrl.trim()) return;
    try {
      const res = await fetch(npzUrl.trim());
      if (!res.ok) throw new Error('下载失败');
      const arrayBuffer = await res.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      const npyFile = zip.file('crop_box.npy');
      if (!npyFile) {
        setToastMsg('未找到 crop_box.npy');
        return;
      }
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
      setCoordinates((prev) => [...prev, ...coords]);
      setInputValue((prev) => {
        const prevArr = parseCoordinates(prev);
        const all = [...prevArr, ...coords];
        return all.map((c) => `[${c.join(',')}]`).join(',');
      });
      setToastMsg('npz URL 解析成功');
    } catch (e: unknown) {
      let msg = '';
      if (e instanceof Error) msg = e.message;
      else if (typeof e === 'string') msg = e;
      else msg = JSON.stringify(e);
      setToastMsg('npz URL 解析失败: ' + msg);
    }
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
              {/* 绘制模式开关 - Switch */}
              <div className="flex items-center gap-2 ml-4">
                <Switch
                  checked={drawMode}
                  onCheckedChange={setDrawMode}
                  disabled={controlsDisabled}
                  id="draw-mode-switch"
                  className={
                    drawMode
                      ? 'data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500'
                      : ''
                  }
                />
                <label htmlFor="draw-mode-switch" className="text-xs text-gray-300 select-none">
                  {drawMode ? '绘制模式：开' : '绘制模式：关'}
                </label>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* 右侧：设置与结果，全部平铺，无Tabs */}
        <div className="w-[420px] flex-shrink-0 flex flex-col gap-6 max-h-[90vh] overflow-auto scrollbar-hide md:max-h-screen">
          {/* 视频设置区块 */}
          <Card className="bg-[#18181b] border border-[#232329] shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-white">视频设置</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {/* 视频导入分组 */}
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
                    className="text-sm bg-[#232329] border border-[#232329] text-white placeholder:text-gray-500 flex-1"
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
              {/* npz导入分组 */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    className="bg-black text-gray-400 hover:bg-[#18181b] border border-[#232329] px-4"
                    onClick={handleNpzButtonClick}
                    disabled={playing}
                  >
                    本地npz
                  </Button>
                  <input
                    ref={npzInputRef}
                    type="file"
                    accept=".npz"
                    className="hidden"
                    onChange={(ev) => {
                      const file = ev.target.files?.[0];
                      if (file) handleNpzFile(file);
                    }}
                    disabled={playing}
                  />
                  <Input
                    type="text"
                    className="text-sm bg-[#232329] border border-[#232329] text-white placeholder:text-gray-500 flex-1"
                    placeholder="npz文件URL"
                    value={npzUrl}
                    onChange={(e) => setNpzUrl(e.target.value)}
                    disabled={playing}
                  />
                  <Button
                    variant="secondary"
                    className="bg-black text-gray-400 hover:bg-[#18181b] border border-[#232329] px-4"
                    onClick={handleNpzUrlImport}
                    disabled={playing || !npzUrl.trim()}
                  >
                    URL导入
                  </Button>
                </div>
              </div>
              {/* 标注操作分组 */}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Button
                  variant="secondary"
                  onClick={handleClear}
                  className="bg-black text-gray-400 hover:bg-[#18181b] border border-[#232329] px-4"
                  disabled={playing}
                >
                  清空标注
                </Button>
                <label className="text-xs text-gray-400 flex items-center gap-1">
                  框颜色
                  <input
                    type="color"
                    value={boxColor}
                    onChange={(e) => setBoxColor(e.target.value)}
                    className="w-6 h-6 border-none bg-transparent cursor-pointer"
                    disabled={playing}
                  />
                </label>
                <label className="text-xs text-gray-400 flex items-center gap-1">
                  文字颜色
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="w-6 h-6 border-none bg-transparent cursor-pointer"
                    disabled={playing}
                  />
                </label>
              </div>
              {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
            </CardContent>
          </Card>
          {/* 坐标输入区块 */}
          <Card className="bg-[#18181b] border border-[#232329] shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-white">输入坐标信息</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Textarea
                placeholder="输入格式: [x1,y1,x2,y2],[x1,y1,x2,y2]... 例如: [68,760,641,873],[6,570,705,757]"
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
            </CardContent>
          </Card>
          {/* 坐标列表区块 */}
          <Card className="bg-[#18181b] border border-[#232329] shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-white">坐标列表</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea
                id="coord-list-scroll"
                className="h-40 rounded border border-[#232329] bg-[#232329] p-2"
              >
                <div className="space-y-1">
                  {coordinates.length === 0 && (
                    <div className="text-xs text-gray-500">暂无标注</div>
                  )}
                  {coordinates.map((coord, idx) => (
                    <div
                      key={idx}
                      className="text-xs text-cyan-400 font-mono flex items-center gap-2 group cursor-pointer"
                      onMouseEnter={() => handleCoordMouseEnter(idx)}
                      onMouseLeave={handleCoordMouseLeave}
                    >
                      框{idx + 1}: [{coord.join(', ')}]
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
                  ))}
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
