"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";

const urlSchema = z.string().url();

async function fetchResolved(url: string): Promise<string> {
  const res = await fetch(`/api/resolve?url=${encodeURIComponent(url)}`);
  if (!res.ok) {
    // Fallback: assume supplied URL is already direct video URL
    return url;
  }
  const data = await res.json();
  if (data?.videoUrl && typeof data.videoUrl === "string") return data.videoUrl;
  return url;
}

export default function Home() {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<string>("");
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [title, setTitle] = useState("My Reel");
  const [bgColor, setBgColor] = useState("#0b0f14");
  const [accent, setAccent] = useState("#7c3aed");
  const [ready, setReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const isValidUrl = useMemo(() => {
    const parsed = urlSchema.safeParse(input.trim());
    return parsed.success;
  }, [input]);

  const handleResolve = useCallback(async () => {
    try {
      setStatus("Resolving...");
      const resolved = await fetchResolved(input.trim());
      setVideoUrl(resolved);
      setStatus("Resolved");
    } catch (e) {
      setStatus("Failed to resolve; try direct MP4 URL");
    }
  }, [input]);

  useEffect(() => {
    let raf = 0;
    function draw() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const width = 720; // vertical design 9:16
      const height = 1280;
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;

      // background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);

      // video fit center with letterbox
      const vw = video.videoWidth || 720;
      const vh = video.videoHeight || 1280;
      const targetAspect = width / height;
      const videoAspect = vw / vh;
      let dw = width;
      let dh = width / videoAspect;
      if (videoAspect < targetAspect) {
        dh = height;
        dw = height * videoAspect;
      }
      const dx = (width - dw) / 2;
      const dy = (height - dh) / 2;
      try { ctx.drawImage(video, dx, dy, dw, dh); } catch {}

      // title bar
      const pad = 24;
      const barH = 96;
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = "#0f1524";
      ctx.fillRect(0, 0, width, barH + pad);
      ctx.globalAlpha = 1;

      // title text
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 36px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto";
      ctx.textBaseline = "middle";
      ctx.fillText(title, pad, barH / 2 + pad / 2);

      // accent pill
      ctx.fillStyle = accent;
      ctx.beginPath();
      const pillW = 140, pillH = 36, r = 18;
      ctx.roundRect(width - pad - pillW, pad + (barH - pillH) / 2, pillW, pillH, r);
      ctx.fill();

      ctx.fillStyle = "#fff";
      ctx.font = "600 16px ui-sans-serif, system-ui";
      ctx.fillText("Reel", width - pad - pillW + 20, pad + barH / 2);

      raf = requestAnimationFrame(draw);
    }
    if (ready) raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [ready, bgColor, accent, title]);

  const handleExportPNG = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "frame.png";
    a.click();
  }, []);

  const handleInsertToCanva = useCallback(async () => {
    // best-effort insert via Canva SDK if present
    const anyWin: any = window as any;
    if (!anyWin?.Canva?.App) return;
    try {
      const { app } = anyWin.Canva;
      // Provide the video URL as a remote media for Canva to fetch
      await app.onReady();
      await app.addMedia({
        type: "video",
        src: videoUrl,
        mimeType: "video/mp4",
        name: title || "Reel",
      });
      await app.close();
    } catch (e) {
      console.error(e);
    }
  }, [videoUrl, title]);

  return (
    <main className="container">
      <div className="card">
        <h1 className="hdr">Reel ? Canva Agent</h1>
        <p className="sub">Download a Reel, place into a vertical design, export.</p>

        <div className="row" style={{ marginBottom: 12 }}>
          <input className="input" placeholder="Paste Instagram Reel URL or direct MP4 URL" value={input} onChange={(e) => setInput(e.target.value)} />
          <button className="btn" disabled={!isValidUrl} onClick={handleResolve}>Fetch</button>
          <span className="badge">{status || "Idle"}</span>
        </div>

        <div className="grid">
          <div className="stack">
            <div>
              <div className="label">Title</div>
              <input className="input" value={title} onChange={(e)=>setTitle(e.target.value)} />
            </div>
            <div className="row">
              <div className="stack" style={{ flex: 1 }}>
                <div className="label">Background</div>
                <input className="input" type="color" value={bgColor} onChange={(e)=>setBgColor(e.target.value)} />
              </div>
              <div className="stack" style={{ flex: 1 }}>
                <div className="label">Accent</div>
                <input className="input" type="color" value={accent} onChange={(e)=>setAccent(e.target.value)} />
              </div>
            </div>
            <div className="tools">
              <button className="btn secondary" onClick={handleExportPNG}>Export Frame PNG</button>
              <button className="btn" disabled={!videoUrl} onClick={handleInsertToCanva}>Insert to Canva</button>
            </div>
            <div className="sep" />
            <div className="tools">
              <span className="badge">Canva SDK: best-effort</span>
              <span className="badge">Export: PNG frame</span>
            </div>
          </div>

          <div className="videoBox">
            <canvas ref={canvasRef} style={{ width: '100%', height: 520 }} />
            {videoUrl ? (
              <video
                ref={videoRef}
                src={videoUrl}
                style={{ display: 'none' }}
                playsInline
                autoPlay
                muted
                loop
                onCanPlay={() => setReady(true)}
              />
            ) : (
              <div style={{ padding: 16, color: '#9ca3af' }}>No video loaded</div>
            )}
          </div>
        </div>
      </div>
      <footer>
        <div>? {new Date().getFullYear()} Reel to Canva Agent</div>
      </footer>
    </main>
  );
}
