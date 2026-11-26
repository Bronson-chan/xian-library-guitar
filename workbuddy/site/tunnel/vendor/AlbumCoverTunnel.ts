import { mountAlbumCoverTunnel, type AlbumCoverTunnelOptions } from "./AlbumCoverTunnelEngine.js";
import type { MotionController } from "./motion-runtime";

/** Mount into any DOM node. Call update() for options and destroy() on removal. */
export function mount(target: HTMLElement, options: AlbumCoverTunnelOptions = {}): MotionController {
  return mountAlbumCoverTunnel(target, options);
}
export type { AlbumCoverTunnelOptions };
