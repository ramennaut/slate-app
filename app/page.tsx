import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="container mx-auto p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>left</div>
        <div>right</div>
      </main>
    </div>
  );
}
