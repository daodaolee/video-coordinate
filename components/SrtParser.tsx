'use client';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../src/components/ui/card';
import { Button } from '../src/components/ui/button';
import { Input } from '../src/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../src/components/ui/tabs';

interface SrtItem {
  index: number;
  start: string;
  end: string;
  text: string;
}

const SrtParser: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'file' | 'url'>('file');
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [url1, setUrl1] = useState<string>('');
  const [url2, setUrl2] = useState<string>('');
  const [items1, setItems1] = useState<SrtItem[]>([]);
  const [items2, setItems2] = useState<SrtItem[]>([]);
  const [error, setError] = useState<string>('');
  const [meta, setMeta] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // 解析SRT格式
  const parseSRT = (text: string): SrtItem[] => {
    const src = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const blocks = src.split(/\n\s*\n/).filter(Boolean);
    const items: SrtItem[] = [];
    const timeRe = /^(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/;

    for (const block of blocks) {
      const lines = block.split('\n');
      if (lines.length === 0) continue;

      let idx: number | null = null;
      let t1: string | null = null;
      let t2: string | null = null;
      let i = 0;

      // 检查是否有序号
      if (/^\d+$/.test(lines[0].trim())) {
        idx = parseInt(lines[0].trim(), 10);
        i = 1;
      }

      // 解析时间码
      const m = lines[i] ? lines[i].match(timeRe) : null;
      if (m) {
        t1 = m[1];
        t2 = m[2];
        i += 1;
      } else {
        continue;
      }

      // 提取字幕文本
      const textLines = lines.slice(i);
      const textContent = textLines.join('\n').trim();
      items.push({
        index: idx ?? items.length + 1,
        start: t1,
        end: t2,
        text: textContent,
      });
    }

    return items;
  };

  // 读取本地文件
  const readFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsText(file, 'UTF-8');
    });
  };

  // 获取远程URL
  const fetchURL = async (url: string): Promise<string> => {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`请求失败: ${res.status} ${res.statusText}`);
    }
    return await res.text();
  };

  // 加载本地文件
  const handleLoadFiles = async () => {
    if (!file1) {
      setError('请至少选择第一个 SRT 文件');
      return;
    }

    setError('');
    setMeta('加载中...');
    setLoading(true);

    try {
      const t0 = performance.now();
      const results: string[] = [];

      const srt1 = await readFile(file1);
      const parsed1 = parseSRT(srt1);
      setItems1(parsed1);
      results.push(`SRT 1: ${parsed1.length} 条字幕`);

      if (file2) {
        const srt2 = await readFile(file2);
        const parsed2 = parseSRT(srt2);
        setItems2(parsed2);
        results.push(`SRT 2: ${parsed2.length} 条字幕`);
      } else {
        setItems2([]);
      }

      const ms = Math.round(performance.now() - t0);
      setMeta(`已加载 ${results.join('，')}，用时 ${ms}ms`);
    } catch (e) {
      setError(String((e as Error)?.message || e));
      setMeta('');
    } finally {
      setLoading(false);
    }
  };

  // 加载远程URL
  const handleLoadUrls = async () => {
    if (!url1.trim()) {
      setError('请至少输入第一个 SRT 文件 URL');
      return;
    }

    setError('');
    setMeta('加载中...');
    setLoading(true);

    try {
      const t0 = performance.now();
      const results: string[] = [];

      const srt1 = await fetchURL(url1);
      const parsed1 = parseSRT(srt1);
      setItems1(parsed1);
      results.push(`SRT 1: ${parsed1.length} 条字幕`);

      if (url2.trim()) {
        const srt2 = await fetchURL(url2);
        const parsed2 = parseSRT(srt2);
        setItems2(parsed2);
        results.push(`SRT 2: ${parsed2.length} 条字幕`);
      } else {
        setItems2([]);
      }

      const ms = Math.round(performance.now() - t0);
      setMeta(`已加载 ${results.join('，')}，用时 ${ms}ms`);
    } catch (e) {
      setError(String((e as Error)?.message || e));
      setMeta('');
    } finally {
      setLoading(false);
    }
  };

  // 清空
  const handleClear = () => {
    setFile1(null);
    setFile2(null);
    setUrl1('');
    setUrl2('');
    setItems1([]);
    setItems2([]);
    setError('');
    setMeta('');
  };

  // 渲染字幕列表
  const renderSubtitles = (items: SrtItem[]) => {
    if (items.length === 0) return null;

    return (
      <div className="h-[500px] overflow-y-auto bg-[#18181b] border border-[#333] rounded-lg p-4">
        {items.map((item) => (
          <div key={item.index} className="mb-4 pb-4 border-b border-[#333] last:border-b-0">
            <div className="text-sm text-cyan-400 font-mono mb-1">
              {item.index}. {item.start} → {item.end}
            </div>
            <div className="text-zinc-200 leading-relaxed whitespace-pre-wrap">{item.text}</div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-[#000]">
      <Card className="w-full max-w-7xl bg-[#232326] border border-[#333] text-zinc-100 shadow-xl">
        <CardHeader>
          <CardTitle className="text-lg text-white">SRT 字幕解析</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'file' | 'url')}>
            <TabsList className="grid w-full max-w-md grid-cols-2 bg-[#18181b] mb-4">
              <TabsTrigger
                value="file"
                className="text-white data-[state=active]:bg-[#38bdf8] data-[state=active]:text-white"
              >
                本地文件
              </TabsTrigger>
              <TabsTrigger
                value="url"
                className="text-white data-[state=active]:bg-[#38bdf8] data-[state=active]:text-white"
              >
                远程 URL
              </TabsTrigger>
            </TabsList>

            <TabsContent value="file">
              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2">
                  <label className="min-w-[80px] text-zinc-300 font-semibold">SRT 1:</label>
                  <Input
                    type="file"
                    accept=".srt"
                    onChange={(e) => setFile1(e.target.files?.[0] || null)}
                    className="flex-1 bg-[#18181b] text-zinc-100 border border-[#333] file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-[#333] file:text-zinc-200 hover:file:bg-[#444]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="min-w-[80px] text-zinc-300 font-semibold">SRT 2:</label>
                  <Input
                    type="file"
                    accept=".srt"
                    onChange={(e) => setFile2(e.target.files?.[0] || null)}
                    className="flex-1 bg-[#18181b] text-zinc-100 border border-[#333] file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-[#333] file:text-zinc-200 hover:file:bg-[#444]"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleLoadFiles}
                    disabled={loading}
                    className="bg-[#38bdf8] text-white hover:bg-[#0ea5e9]"
                  >
                    {loading ? '加载中...' : '加载'}
                  </Button>
                  <Button
                    onClick={handleClear}
                    variant="outline"
                    className="border border-[#333] text-zinc-300 bg-transparent hover:bg-[#232326]"
                  >
                    清空
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="url">
              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2">
                  <label className="min-w-[80px] text-zinc-300 font-semibold">SRT 1:</label>
                  <Input
                    type="url"
                    placeholder="输入第一个 SRT 文件的 URL"
                    value={url1}
                    onChange={(e) => setUrl1(e.target.value)}
                    className="flex-1 bg-[#18181b] text-zinc-100 border border-[#333] placeholder:text-zinc-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="min-w-[80px] text-zinc-300 font-semibold">SRT 2:</label>
                  <Input
                    type="url"
                    placeholder="输入第二个 SRT 文件的 URL（可选）"
                    value={url2}
                    onChange={(e) => setUrl2(e.target.value)}
                    className="flex-1 bg-[#18181b] text-zinc-100 border border-[#333] placeholder:text-zinc-500"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleLoadUrls}
                    disabled={loading}
                    className="bg-[#38bdf8] text-white hover:bg-[#0ea5e9]"
                  >
                    {loading ? '加载中...' : '加载'}
                  </Button>
                  <Button
                    onClick={handleClear}
                    variant="outline"
                    className="border border-[#333] text-zinc-300 bg-transparent hover:bg-[#232326]"
                  >
                    清空
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {meta && <div className="text-sm text-zinc-400 mb-3">{meta}</div>}

          {error && (
            <div className="text-sm text-red-400 mb-3 p-3 bg-red-950/30 border border-red-900/50 rounded">
              {error}
            </div>
          )}

          {(items1.length > 0 || items2.length > 0) && (
            <div
              className="grid gap-4 mt-4"
              style={{ gridTemplateColumns: items2.length > 0 ? '1fr 1fr' : '1fr' }}
            >
              {items1.length > 0 && (
                <div>
                  <h3 className="text-sm text-zinc-400 mb-2">SRT 1</h3>
                  {renderSubtitles(items1)}
                </div>
              )}
              {items2.length > 0 && (
                <div>
                  <h3 className="text-sm text-zinc-400 mb-2">SRT 2</h3>
                  {renderSubtitles(items2)}
                </div>
              )}
            </div>
          )}

          {items1.length === 0 && items2.length === 0 && !error && !loading && (
            <div className="text-center text-zinc-500 py-12">
              请选择本地文件或输入远程 URL 来解析 SRT 字幕文件
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-center text-zinc-500 text-xs mt-4 max-w-2xl">
        提示：本地文件模式直接在浏览器中解析，无需上传服务器。远程 URL 模式需要目标服务器允许 CORS
        跨域访问。
      </div>
    </div>
  );
};

export default SrtParser;
