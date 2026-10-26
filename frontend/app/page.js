"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/api";
import { Loader2 } from "lucide-react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (token) {
      router.replace("/projects");
    } else {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-page">
      <div className="text-center text-text-muted flex flex-col items-center space-y-3">
        <Loader2 className="animate-spin text-accent" size={24} strokeWidth={1.75} />
        <p className="text-sm">Loading PixelForge...</p>
      </div>
    </div>
  );
}
