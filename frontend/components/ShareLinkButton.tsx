"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { buildAppUrl } from "@/lib/share";

interface ShareLinkButtonProps {
  path: string;
  label?: string;
  shareTitle?: string;
  shareText?: string;
  variant?: "primary" | "accent" | "secondary" | "outline";
  className?: string;
}

export function ShareLinkButton({
  path,
  label = "Share link",
  shareTitle,
  shareText,
  variant = "secondary",
  className,
}: ShareLinkButtonProps) {
  const { toast } = useToast();
  const [sharing, setSharing] = useState(false);

  async function handleShare() {
    setSharing(true);
    const url = buildAppUrl(path);
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url,
        });
        toast("Link shared", "success");
      } else if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        toast("Link copied to clipboard", "success");
      } else {
        window.prompt("Copy this link:", url);
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      toast((err as Error).message || "Could not share link", "error");
    } finally {
      setSharing(false);
    }
  }

  return (
    <Button
      variant={variant}
      type="button"
      className={className}
      disabled={sharing}
      onClick={() => void handleShare()}
    >
      {sharing ? "Sharing..." : label}
    </Button>
  );
}
