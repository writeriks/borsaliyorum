import {
  DocumentData,
  FieldPath,
  Query,
  QueryDocumentSnapshot,
} from "firebase/firestore";

export type CollectionPath = "users" | "posts" | "comments" | "test";
export type FirebaseSnapshot = QueryDocumentSnapshot<
  DocumentData,
  DocumentData
>;

export interface FirebaseGetCollectionParams {
  collectionPath: string;
  documentLimit: number;
  startAfterDocument?: FirebaseSnapshot;
  orderByField?: string | FieldPath;
  orderByDirection?: "asc" | "desc";
}

export type FirebaseQuery = Query<DocumentData, DocumentData>;
