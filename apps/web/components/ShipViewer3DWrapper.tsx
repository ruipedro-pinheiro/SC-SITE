"use client";

import dynamic from "next/dynamic";

const ShipViewer3D = dynamic(
  () => import("@/components/ShipViewer3D").then((m) => m.ShipViewer3D),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center">
        <span className="text-11 text-overlay0 tracking-micro uppercase animate-pulse">
          loading 3d model...
        </span>
      </div>
    ),
  },
);

interface ShipViewer3DWrapperProps {
  glbUrl: string;
  className?: string;
}

export function ShipViewer3DWrapper({ glbUrl, className }: ShipViewer3DWrapperProps) {
  return <ShipViewer3D glbUrl={glbUrl} className={className ?? "w-full h-full"} />;
}
