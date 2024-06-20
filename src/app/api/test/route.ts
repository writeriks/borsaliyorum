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

  return NextResponse.json({ message: "Hello World!" });
}
