import {
  collection,
  getDocs,
  orderBy,
  limit,
  query,
  FieldPath,
  startAfter,
  CollectionReference,
  DocumentData,
  where,
  QueryConstraint,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "./firebase-config";
import {
  FirebaseGetCollectionDocumentsParams,
  FirebaseGetDocumentByFieldParams,
  FirebaseSnapshot,
} from "@/services/firebase-service/types";

class FireBaseService {
  /*
   * Gets documents from a collection
   * @param collectionPath - The path to the collection
   * @param documentLimit - The limit of documents to get
   * @param startAfterDocument - The document to start after
   * @param orderByField - The field to order the documents by
   * @param orderByDirection - The direction to order the documents by
   */
  getDocumentsFromCollectionWithLimit = async ({
    collectionPath,
    documentLimit = 10,
    startAfterDocument,
    orderByField,
    orderByDirection = "asc",
  }: FirebaseGetCollectionDocumentsParams): Promise<{
    documents: DocumentData[];
    lastDocument: FirebaseSnapshot | null;
    previousLimit: number;
    previousOrderByField?: string | FieldPath;
    previousOrderByDirection: "asc" | "desc";
  }> => {
    try {
      const firebaseCollectionRef: CollectionReference<DocumentData> =
        collection(db, collectionPath);

      const queryConstraints: QueryConstraint[] = [limit(documentLimit)];

      if (orderByField) {
        queryConstraints.push(orderBy(orderByField, orderByDirection));
      }

      if (startAfterDocument) {
        queryConstraints.push(startAfter(startAfterDocument));
      }

      const firebaseQuery = query(firebaseCollectionRef, ...queryConstraints);

      const querySnapshot = await getDocs(firebaseQuery);

      return {
        documents: querySnapshot.docs.map((doc) => doc.data()),
        lastDocument: querySnapshot.docs[querySnapshot.docs.length - 1] || null,
        previousLimit: documentLimit,
        previousOrderByField: orderByField,
        previousOrderByDirection: orderByDirection,
      };
    } catch (error) {
      console.error("Error getting documents:", error);
      return {
        documents: [],
        lastDocument: null,
        previousLimit: documentLimit,
        previousOrderByField: orderByField,
        previousOrderByDirection: orderByDirection,
      };
    }
  };

  /*
   * Gets a document from a collection by a field
   * @param collectionPath - The path to the collection
   * @param fieldName - The field name to query
   * @param fieldValue - The field value to query
   */
  getDocumentByField = async ({
    collectionPath,
    fieldName,
    fieldValue,
  }: FirebaseGetDocumentByFieldParams): Promise<{
    document: DocumentData | null;
    snapshot: FirebaseSnapshot | null;
  }> => {
    try {
      const collectionRef = collection(db, collectionPath);
      const q = query(collectionRef, where(fieldName, "==", fieldValue));

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const document = querySnapshot.docs[0];
        return { document: document.data(), snapshot: document };
      } else {
        console.log(`No document found with ${fieldName} == ${fieldValue}`);
        return { document: null, snapshot: null };
      }
    } catch (error) {
      console.error("Error getting document: ", error);
      return { document: null, snapshot: null };
    }
  };
}

const firebaseService = new FireBaseService();
export default firebaseService;
