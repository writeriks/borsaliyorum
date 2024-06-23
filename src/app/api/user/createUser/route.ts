import firebaseOperations from "@/services/firebase-service/firebase-operations";
import { CollectionPath } from "@/services/firebase-service/types/collection-types";
import {
  User,
  UserEnum,
} from "@/services/firebase-service/types/db-types/user";
import { Timestamp } from "firebase/firestore";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const userData = body["user"] as User;
  let response;

  try {
    // Create user document
    await firebaseOperations.createDocumentWithCustomId(
      CollectionPath.Users,
      userData.userId,
      {
        ...userData,
        [UserEnum.CREATED_AT]: Timestamp.now(),
        [UserEnum.USERNAME]: userData.username.toLowerCase(),
        [UserEnum.EMAIL]: userData.email.toLowerCase(),
      }
    );

    response = NextResponse.json(null, {
      status: 200,
      statusText: "SUCCESS",
    });
  } catch (error) {
    console.log("ERROR:", error);
    response = NextResponse.json(null, {
      status: 500,
      statusText: "Internal Server Error",
    });
  }

  return response;
}
