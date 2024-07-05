import { auth } from "@/services/firebase-service/firebase-admin";
import { NextResponse } from "next/server";

export async function POST(request: Request): Promise<Response> {
  const body = await request.json();
  const token: string = body["token"];

  try {
    const decodedToken = await auth.verifyIdToken(token);
    const uid = decodedToken.uid;

    const responseBody = { message: "Logged in successfully", uid };

    return NextResponse.json(responseBody, {
      status: 200,
      statusText: "SUCCESS",
      headers: {
        "Set-Cookie": `identity=${token}; HttpOnly; Secure; Max-Age=86400; SameSite=Lax; Path=/`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Unauthorized ${error}` },
      {
        status: 401,
        statusText: "Unauthorized",
      }
    );
  }
}
