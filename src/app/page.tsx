"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

import { auth } from "../services/firebase-service/firebase-config";
import {
  GoogleAuthProvider,
  User,
  signInWithPopup,
  signOut,
} from "firebase/auth";

import fireBaseService from "@/services/firebase-service/firebase-service";
import { CollectionPath } from "@/services/firebase-service/types";

export default function Home() {
  const [user, setUser] = useState<User>();

  useEffect(() => {
    const fetchData = async () => {
      const { documents: docs, lastDocument } =
        await fireBaseService.getDocumentsFromCollectionWithLimit({
          collectionPath: "test",
          documentLimit: 2,
          orderByField: "name",
        });
      console.log("🚀 ~ fetchData ~ docs:", docs);

      if (docs.length > 0 && lastDocument) {
        const { documents: startAfterDocs } =
          await fireBaseService.getDocumentsFromCollectionWithLimit({
            collectionPath: "test",
            documentLimit: 2,
            startAfterDocument: lastDocument,
            orderByField: "name",
          });
        console.log("🚀 ~ fetchData ~ startAfterDocs:", startAfterDocs);
      }

      const { document: testDoc, snapshot } =
        await fireBaseService.getDocumentByField({
          collectionPath: CollectionPath.Test,
          fieldName: "name",
          fieldValue: "test",
        });
      console.log("🚀 ~ fetchData ~ snapshot:", snapshot);
      console.log("🚀 ~ fetchData ~ testDoc:", testDoc);
    };

    fetchData();
  }, []);

  useEffect(() => {
    console.log(user);
  }, [user]);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      // TODO: add user to the state
      setUser(result.user);
      console.log(result);
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  };

  const signOutWithGoogle = async () => {
    try {
      await signOut(auth);
      setUser(undefined);
    } catch (error) {
      console.error("Error signing out with Google:", error);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between">
      <Button>Test Button</Button>
      {user ? (
        <Button onClick={signOutWithGoogle}>Sign Out</Button>
      ) : (
        <Button onClick={signInWithGoogle}>Sign In</Button>
      )}
    </main>
  );
}
