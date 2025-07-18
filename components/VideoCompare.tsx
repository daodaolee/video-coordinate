'use client';
import React, { useRef, useState, useEffect } from 'react';
// import { getInfo } from 'react-mediainfo';
import { Button } from '../src/components/ui/button';
import { Input } from '../src/components/ui/input';
import { Slider } from '../src/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '../src/components/ui/card';
import { Collapse } from '@mui/material';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Trash2,
  ChevronUp as ChevronUpIcon,
  ChevronDown as ChevronDownIcon,
  FilePlus2,
  Link2,
  FolderOpen,
  Captions,
  CaptionsOff,
  Loader2,
  Clock4,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../src/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '../src/components/ui/dialog';
import { Textarea } from '../src/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../src/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '../src/components/ui/tabs';
import { Badge } from '../src/components/ui/badge';
import { Switch } from '../src/components/ui/switch';

// 视频源类型
interface VideoSource {
  id: string;
  url: string;
  name: string;
  file?: File;
  meta?: unknown;
}

const MAX_WIDTH = '80vw';
const FRAME_RATE = 30; // 假定 30fps
const FRAME_DURATION = 1 / FRAME_RATE;

// 工具函数：格式化时长为 x时x分x秒
function formatDuration(ms: string | number | undefined) {
  if (!ms) return '未知';
  let sec = Math.floor(Number(ms) / 1000);
  const h = Math.floor(sec / 3600);
  sec = sec % 3600;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${h > 0 ? h + '时' : ''}${m}分${s}秒`;
}

const VideoCompare: React.FC = () => {
  const [videos, setVideos] = useState<VideoSource[]>([]);
  const [playing, setPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [metaOpenArr, setMetaOpenArr] = useState<boolean[]>([]);
  useEffect(() => {
    setMetaOpenArr(Array(videos.length).fill(false));
  }, [videos.length]);
  const toggleMeta = (idx: number) => {
    setMetaOpenArr((arr) => arr.map((v, i) => (i === idx ? !v : v)));
  };

  // 选择本地文件
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const fileArr = Array.from(files);
    const newVideos: VideoSource[] = await Promise.all(
      fileArr.map(async (file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        url: URL.createObjectURL(file),
        name: file.name,
        file,
        meta: await getMediaInfo(file),
      })),
    );
    setVideos((prev) => {
      const existingIds = new Set(prev.map((v) => v.id));
      return [...prev, ...newVideos.filter((v) => !existingIds.has(v.id))];
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 获取媒体信息
  async function getMediaInfo(fileOrUrl: File | string): Promise<unknown> {
    try {
      const { getInfo } = await import('react-mediainfo');
      const info = await getInfo(fileOrUrl);
      return info;
    } catch (e) {
      return undefined;
    }
  }

  // 播放/暂停
  const handlePlayPause = () => {
    setPlaying((prev) => {
      const next = !prev;
      videoRefs.current.forEach((v) => {
        if (v) {
          if (next) v.play();
          else v.pause();
        }
      });
      return next;
    });
  };

  // 清空
  const handleClear = () => {
    setVideos([]);
    setVideoLoadingArr([]);
    setVideoDurations([]);
    setMetaOpenArr([]);
    setCurrentTime(0);
    setSliderValue(0);
    setGlobalLoading(false);
    setPlaying(false);
    setPlaybackRate(1);
    videoRefs.current = [];
  };

  // 重置
  const handleReset = () => {
    videoRefs.current.forEach((v) => {
      if (v) {
        v.currentTime = 0;
        v.pause();
      }
    });
    setPlaying(false);
  };

  // 保证所有 video 的 playbackRate 跟随状态
  useEffect(() => {
    videoRefs.current.forEach((v) => {
      if (v) v.playbackRate = playbackRate;
    });
  }, [playbackRate, videos.length]);

  const [videoLoadingArr, setVideoLoadingArr] = useState<boolean[]>([]);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [videoDurations, setVideoDurations] = useState<number[]>([]);

  useEffect(() => {
    setVideoLoadingArr((prev) => [...prev, ...Array(videos.length - prev.length).fill(true)]);
  }, [videos.length]);

  function handleVideoLoaded(idx: number) {
    setVideoLoadingArr((arr) => arr.map((v, i) => (i === idx ? false : v)));
    // 记录每个视频的 duration
    setVideoDurations((arr) => {
      const newArr = [...arr];
      newArr[idx] = videoRefs.current[idx]?.duration || 0;
      return newArr;
    });
  }

  // 1. currentTime 取所有视频中当前播放进度最大的那个
  const [currentTime, setCurrentTime] = useState(0);
  useEffect(() => {
    let raf: number;
    function update() {
      // 取所有视频中当前播放进度最大的那个
      const maxCurrent = videoRefs.current.reduce((max, v) => {
        if (v && !isNaN(v.currentTime)) {
          return Math.max(max, v.currentTime);
        }
        return max;
      }, 0);
      setCurrentTime(maxCurrent);
      raf = requestAnimationFrame(update);
    }
    update();
    return () => cancelAnimationFrame(raf);
  }, [videos.length]);

  // Seek 模式: 'time' | 'percent'
  const [seekMode, setSeekMode] = useState<'time' | 'percent'>('time');
  const [sliderValue, setSliderValue] = useState(0); // 单位：秒或百分比

  // 计算最长视频时长
  const allLoaded = videoDurations.length === videos.length && videoDurations.every((d) => d > 0);
  const maxDuration = allLoaded ? Math.max(...videoDurations) : 0;

  // seek 逻辑
  function handleSliderChange([val]: number[]) {
    setSliderValue(val);
    if (seekMode === 'time') {
      videoRefs.current.forEach((v) => {
        if (v) {
          v.currentTime = Math.min(val, v.duration || 0);
        }
      });
    } else {
      videoRefs.current.forEach((v) => {
        if (v) {
          v.currentTime = ((v.duration || 0) * val) / 100;
        }
      });
    }
  }

  // 拖动结束时统一 seek
  const handleSliderCommit = (val: number | number[]) => {
    const v = Array.isArray(val) ? val[0] : val;
    setSliderValue(v);
    if (seekMode === 'time') {
      handleSeek(v);
    } else {
      videoRefs.current.forEach((video) => {
        if (video) {
          video.currentTime = ((video.duration || 0) * v) / 100;
        }
      });
    }
  };

  // 切换模式时重置 seekValue
  useEffect(() => {
    setSliderValue(0);
  }, [seekMode, videos.length]);

  // 渲染媒体信息
  function renderMeta(meta: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = meta as any;
    if (!m || !m.media) return <div className="text-zinc-400">无媒体信息</div>;
    console.log(m);
    const g = m.media.track || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const general = g.find((t: any) => t['@type'] === 'General') || {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const video = g.find((t: any) => t['@type'] === 'Video') || {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const audio = g.find((t: any) => t['@type'] === 'Audio') || {};
    // 文件名和后缀
    const fileName = general.FileName || general.CompleteName || '未知';
    const ext = fileName.includes('.') ? fileName.split('.').pop() : '';
    // 格式
    const format = general.Format || '未知';
    // 时长
    const duration = formatDuration(general.Duration);
    return (
      <div className="bg-[#232326] text-zinc-200 rounded-md p-3 text-xs mt-2 w-full">
        <div className="mb-1 font-semibold">
          {fileName}
          {ext ? <span className="text-zinc-400">.{ext}</span> : ''}
          <span className="text-zinc-400">({format})</span>
        </div>
        <div>时长：{duration}</div>
        <div>
          分辨率：{video.Width} x {video.Height}
        </div>
        <div>比特率：{general.OverallBitRate || video.BitRate || '未知'}</div>
        <div>帧率：{video.FrameRate || '未知'}</div>
        <div>
          视频编码：{video.Format} {video.Format_Profile}
        </div>
        <div>音频编码：{audio.Format}</div>
        <div>音频码率：{audio.BitRate}</div>
      </div>
    );
  }

  const [videoLoadedFlag, setVideoLoadedFlag] = useState(0); // 用于强制刷新

  // seek/同步/变速/上下帧等操作都loading
  const handleSeek = async (time: number) => {
    setGlobalLoading(true);
    setPlaying(false);
    await Promise.all(
      videoRefs.current.map(async (v, idx) => {
        if (v) {
          setVideoLoadingArr((arr) => arr.map((val, i) => (i === idx ? true : val)));
          v.currentTime = time;
        }
      }),
    );
    setGlobalLoading(false);
  };

  const handlePrevFrame = async () => {
    setGlobalLoading(true);
    setPlaying(false);
    await Promise.all(
      videoRefs.current.map(async (v, idx) => {
        if (v) {
          setVideoLoadingArr((arr) => arr.map((val, i) => (i === idx ? true : val)));
          v.currentTime = Math.max(0, v.currentTime - FRAME_DURATION);
        }
      }),
    );
    setGlobalLoading(false);
  };
  const handleNextFrame = async () => {
    setGlobalLoading(true);
    setPlaying(false);
    await Promise.all(
      videoRefs.current.map(async (v, idx) => {
        if (v) {
          setVideoLoadingArr((arr) => arr.map((val, i) => (i === idx ? true : val)));
          v.currentTime = Math.min(v.duration || 0, v.currentTime + FRAME_DURATION);
        }
      }),
    );
    setGlobalLoading(false);
  };
  // 1. 修复 handleSetRate loading
  const handleSetRate = async (rate: number) => {
    setPlaybackRate(rate);
    setPlaying(false);
    setGlobalLoading(true);
    await Promise.all(
      videoRefs.current.map(async (v, idx) => {
        if (v) {
          v.playbackRate = rate;
          v.pause();
          setVideoLoadingArr((arr) => arr.map((val, i) => (i === idx ? true : val)));
        }
      }),
    );
    setGlobalLoading(false); // 确保 loading 关闭
  };

  // 2. 新增 handleSyncTime
  const handleSyncTime = async () => {
    setGlobalLoading(true);
    setPlaying(false);
    const syncTime = currentTime;
    await Promise.all(
      videoRefs.current.map(async (v, idx) => {
        if (v) {
          setVideoLoadingArr((arr) => arr.map((val, i) => (i === idx ? true : val)));
          v.currentTime = syncTime;
        }
      }),
    );
    setGlobalLoading(false);
  };

  // 2. 视频区域支持拖拽文件导入
  const [dragActive, setDragActive] = useState(false);
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('video/'));
    if (files.length === 0) return;
    const newVideos: VideoSource[] = await Promise.all(
      files.map(async (file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        url: URL.createObjectURL(file),
        name: file.name,
        file,
        meta: await getMediaInfo(file),
      })),
    );
    setVideos((prev) => {
      const existingIds = new Set(prev.map((v) => v.id));
      return [...prev, ...newVideos.filter((v) => !existingIds.has(v.id))];
    });
  };

  // 单个视频删除
  const handleDeleteVideo = (idx: number) => {
    setVideos((prev) => prev.filter((_, i) => i !== idx));
    setVideoLoadingArr((prev) => prev.filter((_, i) => i !== idx));
    setVideoDurations((prev) => prev.filter((_, i) => i !== idx));
    setMetaOpenArr((prev) => prev.filter((_, i) => i !== idx));
    videoRefs.current.splice(idx, 1);
    // 如果删完了，重置其它状态
    if (videos.length === 1) {
      setCurrentTime(0);
      setSliderValue(0);
      setGlobalLoading(false);
      setPlaying(false);
      setPlaybackRate(1);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#000] flex flex-col justify-between p-8 gap-10">
      {/* 视频区大框加拖拽事件和提示 */}
      <div
        className="w-full flex-1 mx-auto bg-[#000] border-[#232326] shadow-lg flex items-center justify-center overflow-y-auto relative"
        style={{ maxHeight: 'calc(100vh - 220px)' }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {dragActive && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 pointer-events-none">
            <div className="text-2xl text-cyan-400 font-bold animate-pulse">
              拖拽视频文件到此处导入
            </div>
          </div>
        )}
        {/* 视频区大框下的视频容器加最大宽度和横向滚动 */}
        <div className="flex flex-row gap-x-2 w-full items-start justify-start overflow-x-auto max-w-[100vw]">
          {videos.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center h-[320px] w-full col-span-2 cursor-pointer select-none"
              onClick={() => fileInputRef.current?.click()}
              style={{ transition: 'background 0.2s' }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="text-zinc-500 text-5xl mb-4">
                <FolderOpen size={48} />
              </div>
              <div className="text-zinc-400 text-lg text-center mb-2">点击或拖拽导入视频文件</div>
              <input
                type="file"
                accept="video/*"
                multiple
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>
          ) : (
            videos.map((video, idx) => {
              const ref = videoRefs.current[idx];
              // meta 信息优先展示文件名和后缀
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const m = video.meta as any;
              let fileName: string = video.name;
              let ext: string = '';
              let format: string = '';
              let durationStr = '';
              const durationNum =
                ref?.duration && !isNaN(ref.duration) && ref.duration > 0
                  ? ref.duration
                  : undefined;
              const duration = durationNum !== undefined ? formatTime(durationNum) : '未知';
              if (ref && ref.duration && !isNaN(ref.duration)) {
                // 只用 video 标签的 duration 和文件名
                const sec = Math.floor(ref.duration % 60);
                const min = Math.floor((ref.duration / 60) % 60);
                const hour = Math.floor(ref.duration / 3600);
                durationStr = `${hour > 0 ? hour + '时' : ''}${min}分${sec}秒`;
                fileName = video.name;
              }
              // meta 解析
              let metaInfo: React.ReactNode = null;
              if (m && m.media) {
                const g = m.media.track || [];
                const general =
                  g.find((t: unknown) => (t as Record<string, unknown>)['@type'] === 'General') ||
                  {};
                const videoTrack =
                  g.find((t: unknown) => (t as Record<string, unknown>)['@type'] === 'Video') || {};
                const audioTrack =
                  g.find((t: unknown) => (t as Record<string, unknown>)['@type'] === 'Audio') || {};
                ext = (general.FileExtension || '').toString();
                format = (general.Format || '').toString();
                metaInfo = (
                  <Collapse in={metaOpenArr[idx]} timeout={300} unmountOnExit>
                    <div className="bg-[#232326] text-zinc-200 rounded-md p-3 text-xs mt-2 w-full">
                      <div className="flex  gap-6 w-full">
                        {/* 通用信息 */}
                        <div className="flex-1 min-w-0 mb-2 md:mb-0">
                          <div className="font-semibold text-zinc-300 mb-1">通用信息</div>
                          <div>格式：{format || '未知'}</div>
                          <div>
                            文件大小：
                            {general.FileSize
                              ? `${(Number(general.FileSize) / 1024 / 1024).toFixed(2)} MB`
                              : '未知'}
                          </div>
                          <div>
                            比特率：
                            {general.OverallBitRate
                              ? `${(Number(general.OverallBitRate) / 1000).toFixed(0)} kbps`
                              : '未知'}
                          </div>
                          <div>时长：{duration}</div>
                          <div>
                            分辨率：
                            {videoTrack && videoTrack.Width && videoTrack.Height
                              ? `${videoTrack.Width} x ${videoTrack.Height}`
                              : '未知'}
                          </div>
                        </div>
                        {/* 视频信息 */}
                        <div className="flex-1 min-w-0 mb-2 md:mb-0">
                          <div className="font-semibold text-zinc-300 mb-1">视频信息</div>
                          <div>
                            编码：{videoTrack.Format} {videoTrack.Format_Profile}
                          </div>
                          <div>帧率：{videoTrack.FrameRate || '未知'}</div>
                          <div>
                            比特率：
                            {videoTrack.BitRate
                              ? `${(Number(videoTrack.BitRate) / 1000).toFixed(0)} kbps`
                              : '未知'}
                          </div>
                        </div>
                        {/* 音频信息 */}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-zinc-300 mb-1">音频信息</div>
                          <div>编码：{audioTrack.Format || '未知'}</div>
                          <div>
                            码率：
                            {audioTrack.BitRate
                              ? `${(Number(audioTrack.BitRate) / 1000).toFixed(0)} kbps`
                              : '未知'}
                          </div>
                          <div>声道数：{audioTrack.Channels || '未知'}</div>
                          <div>
                            采样率：
                            {audioTrack.SamplingRate ? `${audioTrack.SamplingRate} Hz` : '未知'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Collapse>
                );
              }
              // 动画状态
              const infoOpen = metaOpenArr[idx];
              return (
                <Card
                  key={video.id}
                  className="shrink-0 bg-[#232326] rounded-lg p-2 flex flex-col border border-[#333] relative overflow-y-auto"
                >
                  {videoLoadingArr[idx] && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 rounded-lg">
                      <Loader2 className="animate-spin text-zinc-400" size={36} />
                    </div>
                  )}
                  {/* 信息块固定在头部，横向排列，带3D翻页动效 */}
                  <div
                    className={`w-full flex flex-row items-center gap-2 px-4 transition-all duration-500 origin-top z-20 ${infoOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} `}
                    style={{
                      position: 'absolute',
                      top: 32,
                      left: 0,
                      right: 0,
                      transform: infoOpen
                        ? 'perspective(800px) rotateX(0deg) scaleY(1)'
                        : 'perspective(800px) rotateX(-90deg) scaleY(0.7)',
                      transition: 'transform 0.5s cubic-bezier(0.4,0.2,0.2,1), opacity 0.4s',
                      willChange: 'transform, opacity',
                    }}
                  >
                    <div className="flex flex-col w-full">
                      <div className="flex flex-row items-center gap-2 mb-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-red-400 hover:text-white"
                          onClick={() => handleDeleteVideo(idx)}
                        >
                          <Trash2 size={18} />
                        </Button>
                        <h3 className="text-white text-base font-semibold truncate flex-1">
                          {fileName}
                          {ext ? <span className="text-zinc-400">.{ext}</span> : ''}{' '}
                        </h3>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-zinc-400 hover:text-white"
                          onClick={() => toggleMeta(idx)}
                        >
                          {infoOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </Button>
                      </div>
                      <div className="w-full">
                        <div className="bg-[#18181b] border border-[#333] rounded-lg shadow p-3">
                          {metaInfo}
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* 视频区，scale以自身中心缩放，内容不被遮挡 */}
                  <div
                    className={`flex items-center justify-center relative transition-all duration-500 z-0`}
                    style={{
                      minHeight: '320px',
                      // marginTop: infoOpen ? 128 : 32,
                      transform: infoOpen
                        ? 'scale(0.85) translateY(80px)'
                        : 'scale(1) translateY(0)',
                      transformOrigin: 'center top',
                      willChange: 'transform',
                    }}
                  >
                    <video
                      ref={(el) => {
                        videoRefs.current[idx] = el;
                      }}
                      src={video.url}
                      className="rounded-md bg-black max-w-full max-h-[80vh] mx-auto min-w-[700px]"
                      style={{ display: 'block' }}
                      controls
                      preload="metadata"
                      onLoadedMetadata={() => {
                        handleVideoLoaded(idx);
                        setVideoLoadedFlag((f) => f + 1);
                      }}
                      onSeeked={() => handleVideoLoaded(idx)}
                    />
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
      {/* 操作面板底部 grid 分组排版 */}
      <div className="footer shrink-0 w-full flex flex-col items-center justify-center">
        <Card className="bottom-0 left-0 max-w-full bg-[#232326] border-t border-[#333] z-50 shadow-xl px-2">
          <CardContent className="md:px-2 flex flex-row items-center justify-between gap-6">
            {/* 播放/暂停按钮最左侧 */}
            <div className="flex items-center shrink-0 gap-4">
              <Button
                onClick={handlePlayPause}
                className="bg-[#18181b] text-white border border-[#333] hover:bg-[#333] hover:text-primary"
                size="icon"
              >
                {playing ? <Pause size={18} /> : <Play size={18} />}
              </Button>
              {/* 播放按钮后面的时间显示用 currentTime 和 maxDuration */}
              <span className="text-zinc-300 text-xs min-w-[120px] text-center font-mono">
                {(() => {
                  if (!allLoaded) return `00:00.000 / --:--`;
                  const fmt = (s: number) => formatTime(s);
                  return `${fmt(currentTime)} / ${fmt(maxDuration)}`;
                })()}
              </span>
            </div>

            {/* 操作栏右侧按钮区，所有按钮加Tooltip */}
            <TooltipProvider>
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handlePrevFrame}
                      className="bg-[#18181b] text-white border border-[#333] hover:bg-[#333] hover:text-primary"
                      size="icon"
                    >
                      <ChevronLeft size={18} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>上一帧</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleNextFrame}
                      className="bg-[#18181b] text-white border border-[#333] hover:bg-[#333] hover:text-primary"
                      size="icon"
                    >
                      <ChevronRight size={18} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>下一帧</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Select
                      value={String(playbackRate)}
                      onValueChange={(val) => handleSetRate(Number(val))}
                    >
                      <SelectTrigger className="w-20 bg-[#18181b] text-white border border-[#333]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#232326] text-white">
                        <SelectItem value="0.25">0.25x</SelectItem>
                        <SelectItem value="0.5">0.5x</SelectItem>
                        <SelectItem value="1">1x</SelectItem>
                        <SelectItem value="1.5">1.5x</SelectItem>
                        <SelectItem value="2">2x</SelectItem>
                      </SelectContent>
                    </Select>
                  </TooltipTrigger>
                  <TooltipContent>倍速播放</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleReset}
                      className="bg-[#18181b] text-white border border-[#333] hover:bg-[#333] hover:text-primary"
                      size="icon"
                    >
                      <RotateCcw size={18} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>重置所有视频进度</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleClear}
                      className="bg-[#18181b] text-white border border-[#333] hover:bg-[#333] hover:text-primary"
                      size="icon"
                    >
                      <Trash2 size={18} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>清空所有视频</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleSyncTime}
                      className="bg-[#18181b] text-white border border-[#333] hover:bg-[#333] hover:text-primary"
                      size="icon"
                    >
                      <Clock4 size={18} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>同步所有视频到当前时间</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className="bg-[#18181b] text-white border border-[#333] hover:bg-[#333] hover:text-primary"
                      onClick={() => setMetaOpenArr((arr) => arr.map((v) => !arr.every(Boolean)))}
                      size="icon"
                    >
                      {metaOpenArr.every(Boolean) ? (
                        <CaptionsOff size={18} />
                      ) : (
                        <Captions size={18} />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {metaOpenArr.every(Boolean) ? '收起所有视频信息' : '展开所有视频信息'}
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>

            <div className="flex  items-center gap-2 w-full mt-1">
              <div className="flex items-center gap-2 mb-1">
                <Switch
                  checked={seekMode === 'percent'}
                  onCheckedChange={(checked) => setSeekMode(checked ? 'percent' : 'time')}
                  className="data-[state=checked]:bg-[#38bdf8] data-[state=unchecked]:bg-[#fb923c]"
                />
                <div className="text-xs text-zinc-400 select-none w-[40px]">
                  {seekMode === 'percent' ? '百分比' : '时间'}
                </div>
              </div>
              <Slider
                min={seekMode === 'time' ? 0 : 0}
                max={seekMode === 'time' ? maxDuration : 100}
                value={[sliderValue]}
                step={seekMode === 'time' ? 0.01 : 0.1}
                onValueChange={handleSliderChange}
                onValueCommit={handleSliderCommit}
                className="w-[160px]"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VideoCompare;

// formatTime 工具函数（可放在文件顶部或 utils）
function formatTime(sec: number) {
  if (!isFinite(sec)) return '--:--';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec - Math.floor(sec)) * 1000);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}
