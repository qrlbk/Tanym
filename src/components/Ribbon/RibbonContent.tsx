"use client";

import { useUIStore } from "@/stores/uiStore";
import HomeTab from "./tabs/HomeTab";
import InsertTab from "./tabs/InsertTab";
import DesignTab from "./tabs/DesignTab";
import LayoutTab from "./tabs/LayoutTab";
import ReferencesTab from "./tabs/ReferencesTab";
import MailingsTab from "./tabs/MailingsTab";
import ReviewTab from "./tabs/ReviewTab";
import ViewTab from "./tabs/ViewTab";

export default function RibbonContent() {
  const activeTab = useUIStore((s) => s.activeTab);

  return (
    <div
      id="ribbon-tabpanel"
      role="tabpanel"
      aria-labelledby={`ribbon-tab-${activeTab}`}
      className="shrink-0 border-b"
      style={{ background: "#FFFFFF", borderColor: "#D1D1D1", height: 90, overflowX: "auto", overflowY: "hidden" }}
    >
      {activeTab === "home" && <HomeTab />}
      {activeTab === "insert" && <InsertTab />}
      {activeTab === "design" && <DesignTab />}
      {activeTab === "layout" && <LayoutTab />}
      {activeTab === "references" && <ReferencesTab />}
      {activeTab === "mailings" && <MailingsTab />}
      {activeTab === "review" && <ReviewTab />}
      {activeTab === "view" && <ViewTab />}
    </div>
  );
}
