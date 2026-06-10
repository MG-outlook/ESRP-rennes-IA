import { APP_VERSION } from "@/lib/version";

/**
 * Small, unobtrusive version tag shown at the top of every page (fixed corner).
 * Non-interactive so it never blocks clicks.
 */
export default function VersionBadge() {
  return (
    <div className="fixed top-1 right-2 z-[60] text-[10px] font-mono text-[#B8B8B8] pointer-events-none select-none">
      {APP_VERSION}
    </div>
  );
}
