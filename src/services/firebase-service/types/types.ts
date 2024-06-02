import { DocumentData, Query, QueryDocumentSnapshot } from "firebase/firestore";

export enum CollectionPath {
  // Example collection path, should be removed later
  Test = "test",

  Users = "users",
  Posts = "posts",
  Likes = "likes",
  Comments = "comments",
  Stocks = "stocks",
  Following = "following",
  Followers = "followers",
}
export type FirebaseSnapshot = QueryDocumentSnapshot<
  DocumentData,
  DocumentData
>;

export type FirebaseQuery = Query<DocumentData, DocumentData>;
