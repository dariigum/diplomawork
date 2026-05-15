import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from './lib/auth';

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isProtectedRoute = path.startsWith('/dashboard') || path.startsWith('/admin');
  const isPublicRoute = path === '/login' || path.startsWith('/signup');

  const sessionCookie = request.cookies.get('session')?.value;
  let session: any = null;

  if (sessionCookie) {
    try {
      session = await decrypt(sessionCookie);
    } catch (e) {
      session = null;
    }
  }

  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL('/login', request.nextUrl));
  }

  // Redirect authenticated users away from public routes like login/signup
  if (isPublicRoute && session) {
    if (session.user?.role === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin', request.nextUrl));
    }
    if (session.user?.role === 'EMPLOYER') {
      return NextResponse.redirect(new URL('/dashboard/employer', request.nextUrl));
    }
    return NextResponse.redirect(new URL('/dashboard/employee', request.nextUrl));
  }

  // Role-based protection within the dashboard
  if (path.startsWith('/dashboard/employee') && session?.user?.role !== 'EMPLOYEE') {
    return NextResponse.redirect(new URL('/dashboard/employer', request.nextUrl));
  }

  if (path.startsWith('/dashboard/employer') && session?.user?.role !== 'EMPLOYER') {
    return NextResponse.redirect(new URL('/dashboard/employee', request.nextUrl));
  }

  if (path.startsWith('/admin') && session?.user?.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/', request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};
