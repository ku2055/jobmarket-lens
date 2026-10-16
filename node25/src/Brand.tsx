import {
  ArrowUpRight,
  Grid2X2,
  Network,
  ShieldCheck,
  LockKeyhole,
  Box,
} from "lucide-react";
import type { Workspace } from "./types";
export function Brand() {
  return (
    <a
      className="brand"
      href="/canvas"
      aria-label="JobMarket Lens research canvas"
    >
      <img src="/brand/mark.svg" width="36" height="36" alt="" />
      <span>
        <strong>JobMarket Lens</strong>
        <small>
          RESEARCH CANVAS <b>2.5</b>
        </small>
      </span>
    </a>
  );
}
export function Header({
  workspace,
  onNavigate,
}: {
  workspace?: Workspace;
  onNavigate?: (w: Workspace) => void;
}) {
  return (
    <header className="topbar">
      <Brand />
      <nav aria-label="Research workspaces">
        {(["canvas", "skills", "evidence"] as const).map((w, i) => {
          const Icon = [Grid2X2, Network, ShieldCheck][i];
          return (
            <a
              key={w}
              href={"/" + w}
              aria-current={workspace === w ? "page" : undefined}
              onClick={(e) => {
                if (onNavigate) {
                  e.preventDefault();
                  onNavigate(w);
                }
              }}
            >
              <Icon size={15} />
              {
                ["Research canvas", "Skill connections", "Evidence & sources"][
                  i
                ]
              }
            </a>
          );
        })}
        <a
          href="/spatial"
          aria-current={
            location.pathname.replace(/\/$/, "") === "/spatial"
              ? "page"
              : undefined
          }
        >
          <Box size={15} />
          Spatial Lab
        </a>
      </nav>
      <div className="header-links">
        <a
          className="baseline-link"
          href="https://jobmarket.feedos.si"
          target="_blank"
          rel="noreferrer"
        >
          V2 baseline <ArrowUpRight size={13} />
        </a>
        <a
          href="/admin"
          className="admin-link"
          aria-label="Owner administration"
        >
          <LockKeyhole size={16} />
        </a>
      </div>
    </header>
  );
}
