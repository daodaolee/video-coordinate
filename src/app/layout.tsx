'use client';

import './globals.css';
import { Sidebar, SidebarProvider, SidebarRail, SidebarTrigger } from '@/components/ui/sidebar';
import Link from 'next/link';
import { Analytics } from '@vercel/analytics/next';
import { usePathname } from 'next/navigation';

import { Film, SplitSquareHorizontal, FileIcon, Subtitles, FileSearch, Sparkles, GitCompare } from 'lucide-react';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  return (
    <html lang="en">
      <body className="flex min-h-screen bg-background">
        <SidebarProvider>
          <div className="flex h-screen w-full">
            <Sidebar
              collapsible="icon"
              className="border-r border-[#232329] bg-black text-white transition-all duration-200 group/sidebar-wrapper group-data-[collapsible=icon]:w-16"
            >
              <div className="flex flex-col h-full">
                {/* 顶部伸缩按钮 */}
                <div className="flex items-center justify-center py-2">
                  <SidebarTrigger />
                </div>
                <nav className="flex-1 flex flex-col gap-2 p-2">
                  <Link
                    href="/tools/video-annotator"
                    className={`px-3 py-2 rounded flex items-center gap-2 transition font-medium group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 ${pathname === '/tools/video-annotator' ? 'bg-[#232329] text-cyan-400' : 'hover:bg-[#232329] text-white'}`}
                  >
                    <Film size={18} />
                    <span className="group-data-[collapsible=icon]:hidden">视频标注工具</span>
                  </Link>
                  <Link
                    href="/tools/video-compare"
                    className={`px-3 py-2 rounded flex items-center gap-2 transition font-medium group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 ${pathname === '/tools/video-compare' ? 'bg-[#232329] text-cyan-400' : 'hover:bg-[#232329] text-white'}`}
                  >
                    <SplitSquareHorizontal size={18} />
                    <span className="group-data-[collapsible=icon]:hidden">视频比较工具</span>
                  </Link>
                  <Link
                    href="/tools/media-analyze"
                    className={`px-3 py-2 rounded flex items-center gap-2 transition font-medium group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 ${pathname === '/tools/media-analyze' ? 'bg-[#232329] text-cyan-400' : 'hover:bg-[#232329] text-white'}`}
                  >
                    <FileSearch size={18} />
                    <span className="group-data-[collapsible=icon]:hidden">媒体文件分析</span>
                  </Link>
                  <Link
                    href="/tools/srt-parser"
                    className={`px-3 py-2 rounded flex items-center gap-2 transition font-medium group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 ${pathname === '/tools/srt-parser' ? 'bg-[#232329] text-cyan-400' : 'hover:bg-[#232329] text-white'}`}
                  >
                    <Subtitles size={18} />
                    <span className="group-data-[collapsible=icon]:hidden">解析 SRT</span>
                  </Link>
                  <Link
                    href="/tools/prompt-optimizer"
                    className={`px-3 py-2 rounded flex items-center gap-2 transition font-medium group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 ${pathname === '/tools/prompt-optimizer' ? 'bg-[#232329] text-cyan-400' : 'hover:bg-[#232329] text-white'}`}
                  >
                    <Sparkles size={18} />
                    <span className="group-data-[collapsible=icon]:hidden">提示词优化</span>
                  </Link>
                  <Link
                    href="/tools/tracking-compare"
                    className={`px-3 py-2 rounded flex items-center gap-2 transition font-medium group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 ${pathname === '/tools/tracking-compare' ? 'bg-[#232329] text-cyan-400' : 'hover:bg-[#232329] text-white'}`}
                  >
                    <GitCompare size={18} />
                    <span className="group-data-[collapsible=icon]:hidden">埋点对比</span>
                  </Link>
                  {/* 未来可加更多工具 */}
                </nav>
              </div>
              {/* 右侧灰色分割线 */}
              <div className="absolute top-0 right-0 h-full w-px bg-[#232329]" />
              {/* 可伸缩按钮 */}
              <SidebarRail />
            </Sidebar>
            <main className="flex-1 min-h-screen bg-black text-white">{children}</main>
          </div>
        </SidebarProvider>
        <Analytics />
      </body>
    </html>
  );
}
