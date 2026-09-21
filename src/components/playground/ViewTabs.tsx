"use client";

import { BookOpen, SquareCode } from "lucide-react";
import { Tabs, TabsIndicator, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePlayground } from "@/context/playground-context";

export function ViewTabs() {
  const { state, actions } = usePlayground();

  return (
    <Tabs
      value={state.mainView}
      onValueChange={(v) => actions.setMainView(v as "theory" | "practical")}
    >
      <TabsList>
        <TabsIndicator />
        <TabsTrigger value="theory" className="gap-1.5">
          <BookOpen className="size-3.5" />
          <span className="hidden md:inline">Theory</span>
        </TabsTrigger>
        <TabsTrigger value="practical" className="gap-1.5">
          <SquareCode className="size-3.5" />
          <span className="hidden md:inline">Practical</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
