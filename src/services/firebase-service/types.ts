import {
  DocumentData,
  FieldPath,
  Query,
  QueryDocumentSnapshot,
} from "firebase/firestore";

export enum CollectionPath {
  Test = "test",
}
export type FirebaseSnapshot = QueryDocumentSnapshot<
  DocumentData,
  DocumentData
>;

export interface FirebaseGetCollectionDocumentsParams {
  collectionPath: string;
  documentLimit: number;
  startAfterDocument?: FirebaseSnapshot;
  orderByField?: string | FieldPath;
  orderByDirection?: "asc" | "desc";
}

export interface FirebaseGetDocumentByFieldParams {
  collectionPath: string;
  fieldName: string;
  fieldValue: any;
}

export type FirebaseQuery = Query<DocumentData, DocumentData>;
