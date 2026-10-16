import { useEffect, useRef } from "react";
import type { Workspace } from "./types";
declare global {
  interface Window {
    umami?: {
      track: (data: { website: string; url: string; title: string }) => void;
    };
  }
}
const privacyOptOut = () =>
  navigator.doNotTrack === "1" ||
  (navigator as Navigator & { globalPrivacyControl?: boolean })
    .globalPrivacyControl === true;
export function Analytics({
  config,
  workspace,
}: {
  config: { scriptUrl: string; websiteId: string } | null | undefined;
  workspace: Workspace;
}) {
  const last = useRef("");
  useEffect(() => {
    if (!config || privacyOptOut()) return;
    const routes = ["/canvas", "/skills", "/evidence", "/"];
    const path = location.pathname.replace(/\/$/, "") || "/canvas";
    if (!routes.includes(path)) return;
    const send = () => {
      if (privacyOptOut()) return;
      const current = location.pathname.replace(/\/$/, "") || "/canvas";
      if (
        !routes.includes(current) ||
        last.current === current ||
        !window.umami
      )
        return;
      window.umami.track({
        website: config.websiteId,
        url: current,
        title: `JobMarket Lens ${current.slice(1) || "canvas"}`,
      });
      last.current = current;
    };
    let script = document.getElementById(
      "lens-umami",
    ) as HTMLScriptElement | null;
    if (!script) {
      let url: URL;
      try {
        url = new URL(config.scriptUrl);
      } catch {
        return;
      }
      if (
        url.username ||
        url.password ||
        (url.protocol !== "https:" &&
          !(
            url.protocol === "http:" &&
            ["localhost", "127.0.0.1"].includes(url.hostname)
          ))
      )
        return;
      script = document.createElement("script");
      script.id = "lens-umami";
      script.src = url.href;
      script.async = true;
      script.dataset.websiteId = config.websiteId;
      script.dataset.autoTrack = "false";
      script.dataset.excludeSearch = "true";
      script.dataset.excludeHash = "true";
      script.dataset.doNotTrack = "true";
      document.head.append(script);
    }
    script.addEventListener("load", send);
    send();
    return () => script.removeEventListener("load", send);
  }, [config?.scriptUrl, config?.websiteId, workspace]);
  return null;
}
