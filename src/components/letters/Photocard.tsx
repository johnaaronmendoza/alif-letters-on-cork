import type { CSSProperties } from "react";
import { ImagePlus } from "lucide-react";

/**
 * A printed photo card tucked in with the letter: white border, slight paper
 * sheen, soft shadow. Shows a grey well (or an "add image" prompt) when empty.
 */
export function Photocard({ src, prompt = false, className = "", style }: {
  src: string | null | undefined;
  /** Show "add image" inside the empty well (editor only). */
  prompt?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`bg-[#fbfaf7] p-[5.5%] ${className}`}
      style={{ boxShadow: "0 1px 2px rgb(0 0 0 / .12), 0 14px 30px -10px rgb(30 20 10 / .45)", ...style }}
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#e4e5ea]">
        {src ? (
          <img src={src} alt="photocard" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
        ) : prompt ? (
          <span className="absolute inset-0 grid place-content-center justify-items-center gap-2 font-typewriter text-[11px] uppercase tracking-[0.14em] text-ink/45">
            <ImagePlus className="h-6 w-6" />
            add image
          </span>
        ) : null}
        {/* glossy print sheen */}
        <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgb(255_255_255/.22),transparent_40%)]" />
      </div>
    </div>
  );
}
