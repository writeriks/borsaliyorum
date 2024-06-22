import {
  isValidDisplayName,
  isValidEmail,
  isValidUsername,
} from "@/app/utils/user-utils/user-utils";
import firebaseOperations from "@/services/firebase-service/firebase-operations";
import {
  FirebaseDocumentQueryResponse,
  WhereFieldEnum,
} from "@/services/firebase-service/firebase-operations-types";
import { CollectionPath } from "@/services/firebase-service/types/collection-types";
import { UserEnum } from "@/services/firebase-service/types/db-types/user";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const username = body["username"] as string;
  const email = body["email"] as string;
  const displayName = body["displayName"] as string;
  let response;

  const searchField = async (
    field: UserEnum,
    value: string
  ): Promise<FirebaseDocumentQueryResponse> => {
    return firebaseOperations.getDocumentsWithQuery({
      collectionPath: CollectionPath.Users,
      whereFields: [
        {
          field,
          operator: WhereFieldEnum.EQUALS,
          value,
        },
      ],
    });
  };

  const isUsernameTaken = async (username: string): Promise<boolean> => {
    const result = await searchField(UserEnum.USERNAME, username);

    return result.documents.length > 0;
  };

  const isEmailTaken = async (email: string): Promise<boolean> => {
    const result = await searchField(UserEnum.EMAIL, email);

    return result.documents.length > 0;
  };

  // Check if username is valid
  if (!isValidUsername(username)) {
    return NextResponse.json(null, {
      status: 400,
      statusText:
        "Invalid username. Must be 3-20 characters long and can only contain letters, numbers, and underscores.",
    });
  }

  // Check if email is valid
  if (!isValidEmail(email)) {
    return NextResponse.json(null, {
      status: 400,
      statusText: "Invalid email format.",
    });
  }

  // Check if display name is valid
  if (!isValidDisplayName(displayName)) {
    return NextResponse.json(null, {
      status: 400,
      statusText: "Invalid display name. Must be 3-80 characters.",
    });
  }

  // Check if email or username is already taken
  try {
    const emailTaken = await isEmailTaken(email.toLowerCase());

    if (emailTaken) {
      return NextResponse.json(null, {
        status: 400,
        statusText: "Email is already taken.",
      });
    }

    const usernameTaken = await isUsernameTaken(username.toLowerCase());

    if (usernameTaken) {
      return NextResponse.json(null, {
        status: 400,
        statusText: "Username is already taken.",
      });
    }

    response = NextResponse.json(null, {
      status: 200,
      statusText: "Username and email are available.",
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
