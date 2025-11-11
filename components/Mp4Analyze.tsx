'use client';
import React, { useRef, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../src/components/ui/card';
import { Button } from '../src/components/ui/button';
import { Input } from '../src/components/ui/input';
import { Skeleton } from '../src/components/ui/skeleton';

// 定义轨道类型
interface VideoTrackInfo {
  id?: string;
  kind?: string;
  label?: string;
  language?: string;
  selected?: boolean;
}
interface TextTrackInfo {
  kind?: string;
  label?: string;
  language?: string;
  mode?: string;
  cues?: number;
}

const Mp4Analyze: React.FC = () => {
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [duration, setDuration] = useState<number>(0);
  const [videoWidth, setVideoWidth] = useState<number>(0);
  const [videoHeight, setVideoHeight] = useState<number>(0);
  const [videoTracks, setVideoTracks] = useState<VideoTrackInfo[]>([]);
  const [textTracks, setTextTracks] = useState<TextTrackInfo[]>([]);
  const [error, setError] = useState<string>('');
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [videoLoading, setVideoLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理本地文件
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError('');
    setFileName(file.name);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    // 其余信息在video事件中获取
  };

  // 处理链接输入
  const handleUrlInput = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const url = (e.currentTarget.elements.namedItem('videoUrl') as HTMLInputElement).value.trim();
    if (!url) return;
    setLoading(true);
    setError('');
    setFileName(url);
    setVideoUrl(url);
  };

  // video元数据加载
  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);
    setVideoWidth(video.videoWidth);
    setVideoHeight(video.videoHeight);
    // 轨道信息
    try {
      const vTracks: VideoTrackInfo[] = [];
      const vts = (video as unknown as { videoTracks?: unknown[] }).videoTracks;
      if (vts && (vts as unknown[]).length > 0) {
        for (let i = 0; i < (vts as unknown[]).length; i++) {
          const t = (vts as Record<string, unknown>[])[i];
          vTracks.push({
            id: t.id as string,
            kind: t.kind as string,
            label: t.label as string,
            language: t.language as string,
            selected: t.selected as boolean,
          });
        }
      }
      setVideoTracks(vTracks);
      const tTracks: TextTrackInfo[] = [];
      const tts = video.textTracks;
      if (tts && tts.length > 0) {
        for (let i = 0; i < tts.length; i++) {
          const t = tts[i];
          tTracks.push({
            kind: t.kind,
            label: t.label,
            language: t.language,
            mode: t.mode,
            cues: t.cues ? t.cues.length : 0,
          });
        }
      }
      setTextTracks(tTracks);
    } catch {}
    setLoading(false);
    setVideoLoading(false);
  };

  // video加载开始
  const handleLoadStart = () => {
    setVideoLoading(true);
  };

  // video加载失败
  const handleError = () => {
    setError('视频加载失败，请检查链接或文件格式');
    setLoading(false);
    setVideoLoading(false);
    setDuration(0);
    setVideoWidth(0);
    setVideoHeight(0);
    setVideoTracks([]);
    setTextTracks([]);
  };

  // 清空
  const handleClear = () => {
    setVideoUrl('');
    setFileName('');
    setDuration(0);
    setVideoWidth(0);
    setVideoHeight(0);
    setVideoTracks([]);
    setTextTracks([]);
    setError('');
    setLoading(false);
    setVideoLoading(false);
    setPlaybackRate(1);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 格式化时长
  const formatDuration = (sec: number) => {
    if (!isFinite(sec)) return '--:--';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec - Math.floor(sec)) * 1000);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  // 倍速切换
  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
  };

  // 同步video标签的playbackRate
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate, videoUrl]);

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 bg-[#000]">
      <Card className="w-full max-w-2xl bg-[#232326] border border-[#333] text-zinc-100 shadow-xl">
        <CardHeader>
          <CardTitle className="text-lg text-white">MP4 视频解析</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUrlInput} className="flex gap-2 mb-4">
            <Input
              name="videoUrl"
              placeholder="输入视频链接..."
              className="flex-1 bg-[#18181b] text-zinc-100 border border-[#333] placeholder:text-zinc-400"
            />
            <Button
              type="submit"
              className="bg-[#18181b] text-white border border-[#333] hover:bg-[#333] hover:text-primary"
            >
              加载链接
            </Button>
          </form>
          <div className="flex gap-2 mb-4 items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/webm,video/ogg"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-[#18181b] text-white border border-[#333] hover:bg-[#333] hover:text-primary"
            >
              选择本地文件
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleClear}
              className="border border-[#333] text-zinc-300 bg-transparent hover:bg-[#232326]"
            >
              清空
            </Button>
          </div>
          {error && <div className="text-red-400 text-sm mb-2">{error}</div>}
          <div className="flex flex-col items-center w-full mb-4">
            {videoUrl && (
              <div className="relative w-full flex justify-center items-center min-h-[320px] bg-black rounded-lg border border-[#333]">
                {videoLoading && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <Skeleton className="w-full h-[360px] rounded bg-zinc-700/30" />
                    <span className="absolute text-zinc-400 text-sm">视频加载中...</span>
                  </div>
                )}
                <video
                  ref={videoRef}
                  src={videoUrl || undefined}
                  className="w-full max-w-3xl h-[360px] rounded-lg bg-black border border-[#333]"
                  style={{ objectFit: 'contain' }}
                  controls
                  preload="metadata"
                  onLoadedMetadata={handleLoadedMetadata}
                  onLoadStart={handleLoadStart}
                  onError={handleError}
                  onPlay={() => setVideoLoading(false)}
                  onPause={() => setVideoLoading(false)}
                  onSeeking={() => setVideoLoading(true)}
                  onSeeked={() => setVideoLoading(false)}
                />
              </div>
            )}
            {videoUrl && (
              <div className="flex gap-2 mt-2 items-center">
                <span className="text-zinc-300">倍速：</span>
                {[0.25, 0.5, 1, 1.5, 2].map((rate) => (
                  <Button
                    key={rate}
                    size="sm"
                    variant={playbackRate === rate ? 'default' : 'outline'}
                    className={
                      playbackRate === rate
                        ? 'bg-[#38bdf8] text-white border border-[#38bdf8]'
                        : 'border border-[#333] text-zinc-300 bg-transparent hover:bg-[#232326]'
                    }
                    onClick={() => handleRateChange(rate)}
                  >
                    {rate}x
                  </Button>
                ))}
              </div>
            )}
          </div>
          {!loading && videoUrl && (
            <div className="grid grid-cols-2 gap-2 text-sm text-zinc-200">
              <div className="font-semibold text-zinc-300">文件/链接：</div>
              <div className="truncate" title={fileName}>
                {fileName}
              </div>
              <div className="font-semibold text-zinc-300">时长：</div>
              <div>{formatDuration(duration)}</div>
              <div className="font-semibold text-zinc-300">分辨率：</div>
              <div>{videoWidth && videoHeight ? `${videoWidth} x ${videoHeight}` : '--'}</div>
              <div className="font-semibold text-zinc-300">视频轨道(videoTracks)：</div>
              <div>
                {videoTracks.length === 0 ? (
                  <span className="text-zinc-400">无</span>
                ) : (
                  <ul className="list-disc ml-4">
                    {videoTracks.map((t, i) => (
                      <li key={i} className="break-all">
                        {Object.entries(t).map(([k, v]) => (
                          <span key={k} className="mr-2">
                            <span className="text-zinc-400">{k}:</span> {String(v)}
                          </span>
                        ))}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="font-semibold text-zinc-300">字幕轨道(textTracks)：</div>
              <div>
                {textTracks.length === 0 ? (
                  <span className="text-zinc-400">无</span>
                ) : (
                  <ul className="list-disc ml-4">
                    {textTracks.map((t, i) => (
                      <li key={i} className="break-all">
                        {Object.entries(t).map(([k, v]) => (
                          <span key={k} className="mr-2">
                            <span className="text-zinc-400">{k}:</span> {String(v)}
                          </span>
                        ))}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Mp4Analyze;
