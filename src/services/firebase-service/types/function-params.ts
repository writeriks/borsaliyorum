import {
  CollectionPath,
  FirebaseSnapshot,
} from "@/services/firebase-service/types/types";
import { FieldPath } from "firebase/firestore";

export interface FirebaseGetCollectionDocumentsParams {
  collectionPath: CollectionPath;
  documentLimit: number;
  startAfterDocument?: FirebaseSnapshot;
  orderByField?: string | FieldPath;
  orderByDirection?: "asc" | "desc";
}

export interface FirebaseGetDocumentByFieldParams {
  collectionPath: CollectionPath;
  fieldName: string;
  fieldValue: any;
}
