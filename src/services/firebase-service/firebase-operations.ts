import {
  collection,
  getDocs,
  orderBy,
  limit,
  query,
  startAfter,
  CollectionReference,
  DocumentData,
  where,
  addDoc,
  setDoc,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "./firebase-config";
import { CollectionPath } from "@/services/firebase-service/types/types";
import {
  FirebaseDocumentQueryResponse,
  QueryParams,
} from "@/services/firebase-service/firebase-operations-types";

class FirebaseOperations {
  /*
   * Get all documents in a collection
   * @param collectionPath - The path to the collection
   * @param documentLimit - The number of documents to return
   * @param startAfterDocument - The document to start after
   * @param orderByField - The field to order by
   * @param orderByDirection - The direction to order by
   * @param whereFields - The fields to filter by
   *
   * @returns An array of documents
   */
  getDocumentsWithQuery = async ({
    collectionPath,
    documentLimit = 10,
    startAfterDocument,
    orderByField,
    orderByDirection = "asc",
    whereFields = [],
  }: QueryParams): Promise<FirebaseDocumentQueryResponse> => {
    try {
      const firebaseCollectionRef: CollectionReference<DocumentData> =
        collection(db, collectionPath);

      // Build the query
      let firebaseQuery = query(firebaseCollectionRef);

      // Apply where clauses if provided
      if (whereFields.length > 0) {
        whereFields.forEach(({ field, operator, value }) => {
          firebaseQuery = query(firebaseQuery, where(field, operator, value));
        });
      }

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

const firebaseOperations = new FirebaseOperations();
export default firebaseOperations;
