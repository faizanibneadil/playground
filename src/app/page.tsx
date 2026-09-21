import { Playground } from "@/components/playground/Playground";
import { PlaygroundProvider } from "@/context/playground-context";

export default function Home() {
  return (
    <PlaygroundProvider>
      <Playground />
    </PlaygroundProvider>
  );
}
