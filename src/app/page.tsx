import { Suspense } from "react";
import { Playground } from "@/components/playground/Playground";
import { PlaygroundProvider } from "@/context/playground-context";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <PlaygroundProvider>
        <Playground />
      </PlaygroundProvider>
    </Suspense>
  );
}