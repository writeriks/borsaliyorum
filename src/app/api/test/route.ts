import firebaseOperations from "@/services/firebase-service/firebase-operations";
import {
  CollectionPath,
  TestCollectionEnum,
} from "@/services/firebase-service/types/collection-types";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  console.log("TEST");

  const { documents: docs, lastDocument } =
    await firebaseOperations.getDocumentsWithQuery({
      collectionPath: CollectionPath.Test,
      documentLimit: 2,
      orderByField: TestCollectionEnum.NAME,
    });
  console.log("🚀 ~ GET ~ docs:", docs);

  const jsonResponse = NextResponse.json(
    {
      anan: 500,
      ami: "Internal Server Error",
    },
    { status: 500, statusText: "Internal Server Error" }
  );

  jsonResponse.cookies.set("theme", "dark");

  return jsonResponse;
}
