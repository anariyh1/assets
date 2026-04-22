"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardContent } from "@/components/dashboard-content";
import { AssetsContent } from "@/components/assets/assets-content";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AssetFilter } from "@/components/assets/asset-filter";
import { QRCensusContent } from "@/components/qr/qr-census-content";
import { ReportContent } from "@/components/reports/report-content";

export function DashboardPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const resolvedTitle = useMemo(() => {
    const section = searchParams.get("section");
    if (section === "assets") return "Эд Хөрөнгө";
    return "Хянах самбар";
  }, [searchParams]);

  const [activeTitle, setActiveTitle] = useState(resolvedTitle);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    setActiveTitle(resolvedTitle);
  }, [resolvedTitle]);

  const handleOpenAssets = (status: string) => {
    setActiveTitle("Эд Хөрөнгө");

    const params = new URLSearchParams(searchParams.toString());
    params.set("section", "assets");
    if (status === "all") {
      params.delete("status");
    } else {
      params.set("status", status);
    }

    router.replace(`/?${params.toString()}`);
  };

  return (
    <div className="h-svh overflow-hidden bg-muted/30">
      <SidebarProvider
        className="h-full"
        defaultOpen={true}
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        style={
          {
            "--sidebar-width": "240px",
            "--sidebar-width-icon": "72px",
          } as CSSProperties
        }
      >
        <DashboardHeader sidebarOpen={sidebarOpen} />

        <AppSidebar
          activeTitle={activeTitle}
          onSelect={setActiveTitle}
          sidebarClassName="top-14 bottom-0 h-[calc(100svh-56px)]"
        />

        <SidebarInset className="mt-14 h-[calc(100svh-56px)] overflow-y-auto bg-transparent">
          <div>
            {activeTitle === "Хянах самбар" ? (
              <DashboardContent onOpenAssets={handleOpenAssets} />
            ) : null}
            {activeTitle === "Хөрөнгө" ? <AssetsContent /> : null}
            {activeTitle === "Эд Хөрөнгө" ? <AssetFilter /> : null}
            {activeTitle === "Тайлан" ? <ReportContent /> : null}
            {activeTitle === "QR тооллого" ? <QRCensusContent /> : null}

            {activeTitle !== "Хянах самбар" &&
            activeTitle !== "Хөрөнгө" &&
            activeTitle !== "Эд Хөрөнгө" &&
            activeTitle !== "Тайлан" &&
            activeTitle !== "Хөрөнгө хуваарилах" &&
            activeTitle !== "QR тооллого" ? (
              <div />
            ) : null}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
