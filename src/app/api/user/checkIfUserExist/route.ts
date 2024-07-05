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

export async function POST(request: Request): Promise<Response> {
  const body = await request.json();
  const username = body["username"] as string;
  const email = body["email"] as string;
  const displayName = body["displayName"] as string;

  const badRequestProps = {
    status: 400,
    statusText: "Bad Request",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  };

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

  const isUsernameTaken = async (): Promise<boolean> => {
    const result = await searchField(UserEnum.USERNAME, username.toLowerCase());

    return result.documents.length > 0;
  };

  const isEmailTaken = async (): Promise<boolean> => {
    const result = await searchField(UserEnum.EMAIL, email.toLowerCase());

    return result.documents.length > 0;
  };

  // Check if username is valid
  if (!isValidUsername(username)) {
    const message = "Geçersiz kullanıcı adı.";

    return NextResponse.json({ error: message }, badRequestProps);
  }

  // Check if email is valid
  if (!isValidEmail(email)) {
    const message = "Geçersiz e-posta.";

    return NextResponse.json({ error: message }, badRequestProps);
  }

  // Check if display name is valid
  if (!isValidDisplayName(displayName)) {
    const message = "Geçersiz ad soyad.";

    return NextResponse.json({ error: message }, badRequestProps);
  }

  // Check if email or username is already taken
  try {
    const emailTaken = await isEmailTaken();

    if (emailTaken) {
      const message = "Bu e-posta adresi ile bir kullanıcı zaten mevcut.";

      return NextResponse.json({ error: message }, badRequestProps);
    }

    const usernameTaken = await isUsernameTaken();

    if (usernameTaken) {
      const message =
        "Bu kullanıcı adı daha önce alınmış. Lütfen farklı bir kullanıcı adı ile tekrar deneyin.";

      return NextResponse.json({ error: message }, badRequestProps);
    }

    return new Response(null, {
      status: 200,
      statusText: "SUCCESS",
    });
  } catch (error) {
    return new Response(null, {
      status: 500,
      statusText: "Internal Server Error",
    });
  }
}
