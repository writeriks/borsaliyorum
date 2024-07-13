import {
  collection,
  getDocs,
  getDoc,
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
  DocumentSnapshot,
} from 'firebase/firestore';

import { db } from './firebase-config';

import { User } from 'firebase/auth';

import {
  FirebaseDocumentQueryResponse,
  QueryParams,
  WhereFieldEnum,
} from '@/services/firebase-service/firebase-operations-types';
import { UserEnum } from '@/services/firebase-service/types/db-types/user';
import { CollectionPath } from '@/services/firebase-service/types/collection-types';

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
    orderByDirection = 'asc',
    whereFields = [],
  }: QueryParams): Promise<FirebaseDocumentQueryResponse> => {
    try {
      const firebaseCollectionRef: CollectionReference<DocumentData> = collection(
        db,
        collectionPath
      );

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
        firebaseQuery = query(firebaseQuery, orderBy(orderByField, orderByDirection));
      }

      // Apply startAfter if startAfterDocument is provided
      if (startAfterDocument) {
        firebaseQuery = query(firebaseQuery, startAfter(startAfterDocument));
      }

      // Apply limit
      firebaseQuery = query(firebaseQuery, limit(documentLimit));

      const querySnapshot = await getDocs(firebaseQuery);

      return {
        documents: querySnapshot.docs.map(document => document.data()),
        lastDocument: querySnapshot.docs[querySnapshot.docs.length - 1] || null,
        previousLimit: documentLimit,
        previousOrderByField: orderByField,
        previousOrderByDirection: orderByDirection,
      };
    } catch (error) {
      console.error('Error getting documents:', error);
      return {
        documents: [],
        lastDocument: null,
        previousLimit: documentLimit,
        previousOrderByField: orderByField,
        previousOrderByDirection: orderByDirection,
      };
    }
  };

  /**
   * Retrieves array of user documents searched by unique user name.
   * @param userName - The username of the user to retrieve.
   * @returns  The user document array, or undefined if not found.
   */
  getUsersFromFirebaseByName = async (userName: string): Promise<User[] | undefined> => {
    try {
      const endUsername = userName + '\uf8ff';
      const { documents } = await this.getDocumentsWithQuery({
        collectionPath: CollectionPath.Users,
        whereFields: [
          {
            field: UserEnum.USERNAME,
            operator: WhereFieldEnum.GREATER_THAN_OR_EQUAL,
            value: userName,
          },
          {
            field: UserEnum.USERNAME,
            operator: WhereFieldEnum.LESS_THAN_OR_EQUAL,
            value: endUsername,
          },
        ],
      });

      return documents as User[];
    } catch (error) {
      console.error('Error getting user:', error);
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
  ): Promise<void> => {
    try {
      await addDoc(collection(db, collectionPath), data);
    } catch (e) {
      console.error('Error adding document: ', e);
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
  ): Promise<void> => {
    try {
      await setDoc(doc(db, collectionPath, docId), data);
    } catch (e) {
      console.error('Error setting document: ', e);
    }
  };

  /*
   * Gets a document by ID
   * @param collectionPath - The path to the collection
   * @param docId - The custom ID for the document
   */
  getDocumentById = async (
    collectionPath: string,
    docId: string
  ): Promise<DocumentSnapshot<DocumentData, DocumentData>> => {
    try {
      const docRef = doc(db, collectionPath, docId);

      return getDoc(docRef);
    } catch (e) {
      console.error('Error getting document: ', e);
      throw e; // Add a throw statement to handle the error case
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
  ): Promise<void> => {
    try {
      const docRef = doc(db, collectionPath, docId);
      await updateDoc(docRef, data);
    } catch (e) {
      console.error('Error updating document: ', e);
    }
  };

  /*
   * Deletes a document by ID
   * @param collectionPath - The path to the collection
   * @param docId - The custom ID for the document
   */
  deleteDocumentById = async (collectionPath: string, docId: string): Promise<void> => {
    try {
      const docRef = doc(db, collectionPath, docId);
      await deleteDoc(docRef);
    } catch (e) {
      console.error('Error deleting document: ', e);
    }
  };
}

const firebaseOperations = new FirebaseOperations();
export default firebaseOperations;
