'use client';

import dynamic from 'next/dynamic';

const TrackingCompare = dynamic(() => import('../../../../components/TrackingCompare'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen">
      <div className="text-zinc-400">加载中...</div>
    </div>
  ),
});

export default function TrackingComparePage() {
  return <TrackingCompare />;
}
