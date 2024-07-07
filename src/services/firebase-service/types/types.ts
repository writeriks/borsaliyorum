import { DocumentData, Query, QueryDocumentSnapshot } from 'firebase/firestore';

export type FirebaseSnapshot = QueryDocumentSnapshot<DocumentData, DocumentData>;

export type FirebaseQuery = Query<DocumentData, DocumentData>;
