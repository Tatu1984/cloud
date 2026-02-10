import { NextRequest, NextResponse } from 'next/server';
import https from 'https';

const MDC_BACKEND = process.env.NEXT_PUBLIC_MDC_API_URL || 'https://www.microdatacluster.com';

// Agent that accepts self-signed certificates
const agent = new https.Agent({ rejectUnauthorized: false });

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params.path);
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params.path, await req.text());
}

export async function PUT(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params.path, await req.text());
}

export async function PATCH(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params.path, await req.text());
}

export async function DELETE(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params.path);
}

async function proxy(req: NextRequest, pathSegments: string[], body?: string) {
  const path = '/' + pathSegments.join('/');
  const search = req.nextUrl.search; // includes '?'
  const url = `${MDC_BACKEND}${path}${search}`;

  const headers: Record<string, string> = {};
  // Forward relevant headers
  for (const key of ['content-type', 'accept', 'x-api-key', 'authorization']) {
    const val = req.headers.get(key);
    if (val) headers[key] = val;
  }

  try {
    // Use Node.js http module to make request with custom agent (self-signed cert support)
    const response = await nodeFetch(url, {
      method: req.method,
      headers,
      body: body || undefined,
    });

    return new NextResponse(response.body, {
      status: response.status,
      headers: {
        'content-type': response.headers.get('content-type') || 'application/json',
      },
    });
  } catch (err) {
    console.error('[MDC Proxy] Error:', err);
    return NextResponse.json(
      { error: 'Failed to connect to MDC backend' },
      { status: 502 },
    );
  }
}

// Custom fetch using Node.js https module to bypass self-signed cert
function nodeFetch(
  url: string,
  options: { method: string; headers: Record<string, string>; body?: string }
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const reqOptions: https.RequestOptions = {
      hostname: parsed.hostname,
      port: parsed.port || 443,
      path: parsed.pathname + parsed.search,
      method: options.method,
      headers: options.headers,
      agent,
    };

    const req = https.request(reqOptions, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const responseHeaders = new Headers();
        if (res.headers['content-type']) {
          responseHeaders.set('content-type', res.headers['content-type'] as string);
        }
        resolve(new Response(buffer, {
          status: res.statusCode || 500,
          headers: responseHeaders,
        }));
      });
    });

    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}
