import userService from "@/services/user-service/user-service";
import { NextResponse, NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const asd = request.headers.get("Cookie");
  const token = asd?.split("identity=")[1];

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
  matcher: ["/posts/:path*", "/stocks/:path*", "/profile/:path*"],
};
