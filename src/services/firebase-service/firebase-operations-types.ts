import { FirebaseSnapshot } from "@/services/firebase-service/types/types";
import { DocumentData, FieldPath, WhereFilterOp } from "firebase/firestore";

export type QueryParams = {
  collectionPath: string;
  documentLimit?: number;
  startAfterDocument?: DocumentData;
  orderByField?: string | FieldPath;
  orderByDirection?: "asc" | "desc";
  whereFields?: Array<{ field: string; operator: WhereFilterOp; value: any }>;
};

export type FirebaseDocumentQueryResponse = {
  documents: DocumentData[];
  lastDocument: FirebaseSnapshot | null;
  previousLimit: number;
  previousOrderByField?: string | FieldPath;
  previousOrderByDirection: "asc" | "desc";
};

export enum WhereFieldEnum {
  EQUALS = "==",
  NOT_EQUALS = "!=",
  LESS_THAN = "<",
  LESS_THAN_OR_EQUAL = "<=",
  GREATER_THAN = ">",
  GREATER_THAN_OR_EQUAL = ">=",
  ARRAY_CONTAINS = "array-contains",
  ARRAY_CONTAINS_ANY = "array-contains-any",
  IN = "in",
  NOT_IN = "not-in",
}
