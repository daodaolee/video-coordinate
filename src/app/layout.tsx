import './globals.css';
import { Sidebar, SidebarProvider, SidebarRail } from '@/components/ui/sidebar';
import Link from 'next/link';
import { Analytics } from '@vercel/analytics/next';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="flex min-h-screen bg-background">
        <SidebarProvider>
          <div className="flex h-screen w-full">
            <Sidebar className="border-r border-[#232329] bg-black text-white transition-all duration-200">
              <div className="flex flex-col h-full">
                <nav className="flex-1 flex flex-col gap-2 p-2">
                  <Link
                    href="/tools/video-annotator"
                    className="px-3 py-2 rounded hover:bg-[#232329] transition"
                  >
                    视频标注工具
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
      </body>
      <Analytics />
    </html>
  );
}
