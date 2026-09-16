    import { type NextRequest } from 'next/server'

   export function middleware(request: NextRequest) {
     // your code here
   }

   export const config = {
     matcher: ['/dashboard/:path*']
   }