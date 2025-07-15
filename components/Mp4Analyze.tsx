'use client';
import React, { useRef, useState } from 'react';
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
  const [poster, setPoster] = useState<string>('');
  const [videoTracks, setVideoTracks] = useState<VideoTrackInfo[]>([]);
  const [textTracks, setTextTracks] = useState<TextTrackInfo[]>([]);
  const [error, setError] = useState<string>('');
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
    loadVideoMeta(url);
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
    loadVideoMeta(url);
  };

  // 用 createElement 加载视频元信息并生成封面
  const loadVideoMeta = (url: string) => {
    setDuration(0);
    setVideoWidth(0);
    setVideoHeight(0);
    setPoster('');
    setVideoTracks([]);
    setTextTracks([]);
    setError('');
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = url;
    video.crossOrigin = 'anonymous';
    video.onloadedmetadata = () => {
      setDuration(video.duration);
      setVideoWidth(video.videoWidth);
      setVideoHeight(video.videoHeight);
      // 轨道信息
      try {
        // videoTracks: MediaTrackList (只在部分浏览器支持)
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
        // textTracks: TextTrackList
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
      // 截取首帧做封面
      try {
        video.currentTime = 0;
        video.onseeked = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
              setPoster(canvas.toDataURL('image/png'));
            }
          } catch {
            setPoster('');
          }
          setLoading(false);
          // 释放本地文件URL
          if (url.startsWith('blob:')) {
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }
        };
      } catch {
        setPoster('');
        setLoading(false);
      }
    };
    video.onerror = () => {
      setError('视频加载失败，请检查链接或文件格式');
      setLoading(false);
    };
  };

  // 清空
  const handleClear = () => {
    setVideoUrl('');
    setFileName('');
    setDuration(0);
    setVideoWidth(0);
    setVideoHeight(0);
    setPoster('');
    setVideoTracks([]);
    setTextTracks([]);
    setError('');
    setLoading(false);
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

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 bg-[#000]">
      <Card className="w-full max-w-xl bg-[#232326] border border-[#333] text-zinc-100 shadow-xl">
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
          {loading && (
            <div className="flex flex-col items-center gap-2 my-4">
              <Skeleton className="w-full h-48 rounded bg-zinc-700/30" />
              <div className="text-zinc-400 text-sm">视频加载中...</div>
            </div>
          )}
          {error && <div className="text-red-400 text-sm mb-2">{error}</div>}
          {!loading && videoUrl && (
            <div className="flex flex-col gap-4">
              {poster && (
                <div className="flex flex-col items-center">
                  <img
                    src={poster}
                    alt="视频封面"
                    className="rounded shadow max-h-48 object-contain bg-black border border-[#333]"
                  />
                </div>
              )}
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Mp4Analyze;
