import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 });

  // If RAPIDAPI_KEY is set, try a public instagram downloader on RapidAPI.
  const key = process.env.RAPIDAPI_KEY;
  if (!key) {
    return NextResponse.json({ videoUrl: url });
  }

  try {
    // Example RapidAPI endpoint shape; provider may vary.
    const apiUrl = `https://instagram-downloader-download-instagram-videos-stories1.p.rapidapi.com/?url=${encodeURIComponent(url)}`;
    const resp = await fetch(apiUrl, {
      headers: {
        'x-rapidapi-key': key,
        'x-rapidapi-host': 'instagram-downloader-download-instagram-videos-stories1.p.rapidapi.com',
      },
    });
    if (!resp.ok) throw new Error('Resolve failed');
    const data = await resp.json();
    // Common response shapes include: { media: [ { url: '...' } ] } or { link: '...' }
    const candidate = data?.media?.[0]?.url || data?.media?.[0]?.link || data?.link || data?.url;
    if (candidate && typeof candidate === 'string') {
      return NextResponse.json({ videoUrl: candidate });
    }
    return NextResponse.json({ videoUrl: url });
  } catch {
    return NextResponse.json({ videoUrl: url });
  }
}
