import { NextRequest } from "next/server";

const BE_URL = () => process.env.BE_API_URL || "http://localhost:3001";

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params);
}

async function proxy(req: NextRequest, { path }: { path: string[] }) {
  const target = `${BE_URL()}/api/${path.join("/")}${req.nextUrl.search}`;

  const headers = new Headers(req.headers);
  headers.delete("host");

  const res = await fetch(target, {
    method: req.method,
    headers,
    body: req.body,
    // @ts-expect-error duplex is required for streaming request bodies
    duplex: "half",
  });

  return new Response(res.body, {
    status: res.status,
    headers: res.headers,
  });
}
