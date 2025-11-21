'use client'

import { useEffect, useRef } from 'react'

export default function PromptOptimizer() {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    // 监听 iframe 加载完成
    const iframe = iframeRef.current
    if (!iframe) return

    const handleLoad = () => {
      try {
        // 尝试通过 postMessage 向 iframe 发送主题设置
        iframe.contentWindow?.postMessage(
          {
            type: 'SET_THEME',
            key: 'naive-theme-id',
            value: 'dark'
          },
          'http://192.168.1.114:28081'
        )
      } catch (error) {
        console.warn('无法向 iframe 发送消息:', error)
      }
    }

    iframe.addEventListener('load', handleLoad)
    return () => iframe.removeEventListener('load', handleLoad)
  }, [])

  return (
    <div className="w-full h-screen">
      <iframe
        ref={iframeRef}
        src="http://192.168.1.114:28081/"
        className="w-full h-full border-0"
        title="提示词优化工具"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  )
}
