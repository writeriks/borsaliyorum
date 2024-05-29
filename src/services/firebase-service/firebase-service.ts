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
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "./firebase-config";
import {
  FirebaseGetCollectionParams,
  FirebaseQuery,
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
  }: FirebaseGetCollectionParams): Promise<{
    documents: DocumentData[];
    lastDocument: FirebaseSnapshot | null;
    previousLimit: number;
    previousOrderByField?: string | FieldPath;
    previousOrderByDirection: "asc" | "desc";
  }> => {
    try {
      const firebaseQuery = this.generateFirebaseQuery({
        collectionPath,
        documentLimit,
        orderByDirection,
        orderByField,
        startAfterDocument,
      });

      const querySnapshot = await getDocs(firebaseQuery);

      return {
        documents: querySnapshot.docs.map((doc) => doc.data()),
        lastDocument: querySnapshot.docs[querySnapshot.docs.length - 1],
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
   * Generates a firebase query
   * @param collectionPath - The path to the collection
   * @param documentLimit - The limit of documents to get
   * @param startAfterDocument - The document to start after
   * @param orderByField - The field to order the documents by
   * @param orderByDirection - The direction to order the documents by
   */
  private generateFirebaseQuery = ({
    collectionPath,
    documentLimit = 10,
    startAfterDocument,
    orderByField,
    orderByDirection = "asc",
  }: FirebaseGetCollectionParams): FirebaseQuery => {
    const firebaseCollectionRef: CollectionReference<DocumentData> = collection(
      db,
      collectionPath
    );

    let firebaseQuery = query(firebaseCollectionRef);

    // Apply orderBy if orderByField is provided
    if (orderByField) {
      firebaseQuery = query(
        firebaseQuery,
        orderBy(orderByField, orderByDirection)
      );
    }

    // Apply startAfter if startAfterDocument is provided
    if (startAfterDocument) {
      firebaseQuery = query(firebaseQuery, startAfter(startAfterDocument));
    }

    // Apply limit
    firebaseQuery = query(firebaseQuery, limit(documentLimit));

    return firebaseQuery;
  };
}

const firebaseService = new FireBaseService();
export default firebaseService;
