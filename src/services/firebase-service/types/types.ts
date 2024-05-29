import { DocumentData, Query, QueryDocumentSnapshot } from "firebase/firestore";

export enum CollectionPath {
  // Example collection path, should be removed later
  Test = "test",

  // TODO: Add collection paths here
}
export type FirebaseSnapshot = QueryDocumentSnapshot<
  DocumentData,
  DocumentData
>;

export type FirebaseQuery = Query<DocumentData, DocumentData>;
