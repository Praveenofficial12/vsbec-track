import { NextRequest, NextResponse } from 'next/server'

// POST: Proxy email requests to the email mini-service (port 3030).
// The gateway requires ?XTransformPort=3030 in the URL.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { searchParams } = new URL(req.url)
    const port = searchParams.get('XTransformPort') || '3030'

    // Forward the request to the email mini-service via the gateway
    const res = await fetch(`http://localhost:${port}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return NextResponse.json({ error: data.error || 'Email service error' }, { status: res.status })
    }
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Email proxy error:', error)
    return NextResponse.json({ error: error.message || 'Failed to send email' }, { status: 500 })
  }
}
