import { auth } from '@/auth'

export default auth((req) => {
  const isAuth = !!req.auth
  const { pathname, origin } = req.nextUrl

  const isAuthPage = pathname === '/login' || pathname === '/register'
  const isLandingPage = pathname === '/'

  if (isAuthPage && isAuth) {
    return Response.redirect(new URL('/', origin))
  }

  if (!isAuth && !isAuthPage && !isLandingPage) {
    return Response.redirect(new URL('/login', origin))
  }
})

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.[^/]+$).*)',
  ],
}
