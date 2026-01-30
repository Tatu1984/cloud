import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Get response
  const response = NextResponse.next()

  // Security Headers
  const headers = response.headers

  // Prevent clickjacking
  headers.set('X-Frame-Options', 'DENY')

  // Prevent MIME type sniffing
  headers.set('X-Content-Type-Options', 'nosniff')

  // Enable XSS filter
  headers.set('X-XSS-Protection', '1; mode=block')

  // Referrer policy
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Permissions policy
  headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  )

  // Content Security Policy
  // Adjust this based on your application needs
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:8080'
  const apiHost = new URL(apiUrl).origin

  // MicroDataCluster API
  const mdcApiUrl = process.env.NEXT_PUBLIC_MDC_API_URL || 'https://www.microdatacluster.com'

  // Entra ID / CIAM authentication domains
  const entraAuthority = process.env.NEXT_PUBLIC_ENTRA_AUTHORITY || ''
  const entraDomains = [
    'https://login.microsoftonline.com',
    'https://*.ciamlogin.com',
    'https://graph.microsoft.com',
    entraAuthority,
  ].filter(Boolean).join(' ')

  const csp = [
    "default-src 'self'",
    // Next.js requires unsafe-eval in dev, stricter in production
    process.env.NODE_ENV === 'production'
      ? "script-src 'self' 'unsafe-inline'"
      : "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'", // Tailwind and styled-jsx need this
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    `connect-src 'self' ${apiHost} ${mdcApiUrl} ${entraDomains} wss: ws:`, // API, MDC, Entra ID, and WebSocket
    `frame-src 'self' ${entraDomains}`, // Allow Entra ID popups/iframes
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
  ].join('; ')

  headers.set('Content-Security-Policy', csp)

  // HSTS - only enable in production
  if (process.env.NODE_ENV === 'production') {
    headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    )
  }

  return response
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
