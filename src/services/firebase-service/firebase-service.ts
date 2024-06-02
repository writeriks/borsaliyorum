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
  addDoc,
  setDoc,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "./firebase-config";
import {
  CollectionPath,
  FirebaseSnapshot,
} from "@/services/firebase-service/types/types";
import {
  FirebaseGetCollectionDocumentsParams,
  FirebaseGetDocumentByFieldParams,
} from "@/services/firebase-service/types/function-params";

class FirebaseService {
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
   * Gets a document from a collection by provided field name and value
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

  /*
   * Creates a document with an auto-generated ID
   * @param collectionPath - The path to the collection
   * @param data - The data to add to the document
   */
  createDocumentWithAutoId = async (
    collectionPath: CollectionPath,
    data: Record<string, any>
  ) => {
    try {
      const docRef = await addDoc(collection(db, collectionPath), data);
      console.log("Document written with ID: ", docRef.id);
    } catch (e) {
      console.error("Error adding document: ", e);
    }
  };

  /*
   * Creates a document with a custom ID
   * @param collectionPath - The path to the collection
   * @param docId - The custom ID for the document
   * @param data - The data to add to the document
   */
  createDocumentWithCustomId = async (
    collectionPath: string,
    docId: string,
    data: Record<string, any>
  ) => {
    try {
      await setDoc(doc(db, collectionPath, docId), data);
      console.log("Document written with ID: ", docId);
    } catch (e) {
      console.error("Error setting document: ", e);
    }
  };

  /*
   * Updates a document by ID
   * @param collectionPath - The path to the collection
   * @param docId - The custom ID for the document
   * @param data - The data to add to the document
   */
  updateDocumentById = async (
    collectionPath: string,
    docId: string,
    data: Record<string, any>
  ) => {
    try {
      const docRef = doc(db, collectionPath, docId);
      await updateDoc(docRef, data);
      console.log("Document updated with ID: ", docId);
    } catch (e) {
      console.error("Error updating document: ", e);
    }
  };

  /*
   * Deletes a document by ID
   * @param collectionPath - The path to the collection
   * @param docId - The custom ID for the document
   */
  deleteDocumentById = async (collectionPath: string, docId: string) => {
    try {
      const docRef = doc(db, collectionPath, docId);
      await deleteDoc(docRef);
      console.log("Document deleted with ID: ", docId);
    } catch (e) {
      console.error("Error deleting document: ", e);
    }
  };
}

const firebaseService = new FirebaseService();
export default firebaseService;
