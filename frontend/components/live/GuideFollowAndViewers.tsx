"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { GuideAvatar } from "@/components/ui/GuideAvatar";
import {
  followGuideApi,
  getGuideFollowStatus,
  getStreamViewers,
  unfollowGuideApi,
  type StreamViewer,
} from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthProvider";
import { destinationIfSignedIn } from "@/lib/auth/gatedPath";

export function FollowGuideButton({
  guideId,
  className = "",
  variant = "secondary",
}: {
  guideId: string;
  className?: string;
  variant?: "primary" | "secondary";
}) {
  const { session, profile } = useAuth();
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const isSelf = session?.user.id === guideId;
  const canFollow = Boolean(session && profile?.role === "tourist" && !isSelf);

  useEffect(() => {
    let cancelled = false;
    getGuideFollowStatus(guideId, session?.access_token)
      .then((res) => {
        if (!cancelled) {
          setFollowing(res.following);
          setFollowerCount(res.followerCount);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [guideId, session?.access_token]);

  const toggle = useCallback(async () => {
    if (!session?.access_token || !canFollow) return;
    setLoading(true);
    try {
      const res = following
        ? await unfollowGuideApi(guideId, session.access_token)
        : await followGuideApi(guideId, session.access_token);
      setFollowing(res.following);
      setFollowerCount(res.followerCount);
    } finally {
      setLoading(false);
    }
  }, [canFollow, following, guideId, session?.access_token]);

  if (isSelf) return null;

  if (!session) {
    return (
      <Link href={destinationIfSignedIn(`/guides/${guideId}`, false)} className={className}>
        <Button variant={variant} className="w-full">
          Sign in to follow
        </Button>
      </Link>
    );
  }

  if (profile?.role !== "tourist") return null;

  return (
    <div className={className}>
      <Button variant={variant} className="w-full" disabled={loading} onClick={() => void toggle()}>
        {loading ? "…" : following ? "Following · email alerts on" : "Follow · get live emails"}
      </Button>
      {followerCount != null && followerCount > 0 && (
        <p className="mt-1 text-center text-[10px] text-brand-muted">{followerCount} followers</p>
      )}
    </div>
  );
}

export function StreamViewersPanel({
  streamId,
  accessToken,
  compact,
}: {
  streamId: string;
  accessToken: string;
  compact?: boolean;
}) {
  const [viewers, setViewers] = useState<StreamViewer[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      getStreamViewers(streamId, accessToken)
        .then(({ viewers: list }) => {
          if (!cancelled) setViewers(list);
        })
        .catch(() => {});
    };
    load();
    const t = setInterval(load, 25_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [streamId, accessToken]);

  return (
    <Card className={compact ? "p-4" : "p-5 sm:p-6"}>
      <h2 className="text-sm font-bold text-brand-blueDark">Viewers</h2>
      <p className="mt-0.5 text-xs text-brand-muted">Signed-in accounts who joined this stream.</p>
      {viewers.length === 0 ? (
        <p className="mt-3 text-sm text-brand-muted">No viewers yet.</p>
      ) : (
        <ul className={`mt-3 space-y-2 ${compact ? "max-h-40" : "max-h-56"} overflow-y-auto`}>
          {viewers.map((v) => (
            <li key={v.profileId} className="flex items-center gap-2">
              <GuideAvatar name={v.displayName} avatarUrl={v.avatarUrl} size="sm" />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/tourists/${v.profileId}`}
                  className="truncate text-sm font-semibold text-brand-blueDark hover:underline"
                >
                  {v.displayName}
                </Link>
                <p className="text-[10px] text-brand-muted">
                  {v.joinCount > 1 ? `${v.joinCount} joins · ` : ""}
                  {new Date(v.joinedAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
