import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let response: Response;
  try {
    const body = { message: "Logged out successfully" };

    response = NextResponse.json(body, {
      status: 200,
      statusText: "SUCCESS",
      headers: {
        "Set-Cookie": `identity=; HttpOnly; Secure; Max-Age=86400; SameSite=Lax; Path=/`,
      },
    });

    return response;
  } catch (error) {
    response = NextResponse.json(
      { error: `Unauthorized ${error}` },
      {
        status: 401,
        statusText: "Unauthorized",
      }
    );
  }
}
