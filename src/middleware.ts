import { NextResponse, NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const cookie = request.headers.get("Cookie");
  const token = cookie?.split("identity=")[1];

  try {
    if (token) {
      return NextResponse.next();
    } else {
      return NextResponse.redirect(new URL("/", request.url));
    }
  } catch (error) {
    console.error("Authentication error:", error);
    return NextResponse.redirect(new URL("/", request.url));
  }
}

export const config = {
  matcher: ["/feed/:path*", "/stocks/:path*", "/profile/:path*"],
};
