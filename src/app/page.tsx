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
import { CollectionPath } from "@/services/firebase-service/types/types";
import {
  TestCollection,
  TestCollectionEnum,
} from "@/services/firebase-service/types/collection-types";
import { Input } from "@/components/ui/input";

export default function Home() {
  const [user, setUser] = useState<User>();

  const [docIdToUpdate, setDocIdToUpdate] = useState<string>("");
  const [documentName, setDocumentName] = useState<string>("");
  const [object, setObject] = useState<TestCollection>();

  useEffect(() => {
    const fetchData = async () => {
      const { documents: docs, lastDocument } =
        await fireBaseService.getDocumentsFromCollectionWithLimit({
          collectionPath: CollectionPath.Test,
          documentLimit: 2,
          orderByField: TestCollectionEnum.NAME,
        });
      console.log("🚀 ~ fetchData ~ docs:", docs);

      if (docs.length > 0 && lastDocument) {
        const { documents: startAfterDocs } =
          await fireBaseService.getDocumentsFromCollectionWithLimit({
            collectionPath: CollectionPath.Test,
            documentLimit: 2,
            startAfterDocument: lastDocument,
            orderByField: TestCollectionEnum.NAME,
          });
        console.log("🚀 ~ fetchData ~ startAfterDocs:", startAfterDocs);
      }
    };

    fetchData();
  }, []);

  const searchDocumentWithField = async () => {
    const { document: testDoc, snapshot } =
      await fireBaseService.getDocumentByField({
        collectionPath: CollectionPath.Test,
        fieldName: TestCollectionEnum.NAME,
        fieldValue: documentName,
      });

    console.log("🚀 ~ searchDocumentWithField ~ snapshot:", snapshot);
    setObject(testDoc as TestCollection);
    setDocIdToUpdate(snapshot?.id || "");
  };
  const addDataWithAutoId = async () => {
    const data: TestCollection = {
      name: documentName,
    };

    await fireBaseService.createDocumentWithAutoId(CollectionPath.Test, data);
  };

  const addDataWithCustomId = async () => {
    const data: TestCollection = {
      name: "custom name",
    };

    await fireBaseService.createDocumentWithCustomId(
      CollectionPath.Test,
      "customId",
      data
    );
  };

  const updateDocument = async () => {
    const data: TestCollection = {
      name: documentName,
    };

    await fireBaseService.updateDocumentById(
      CollectionPath.Test,
      docIdToUpdate,
      data
    );
  };

  const deleteDocument = async () => {
    await fireBaseService.deleteDocumentById(
      CollectionPath.Test,
      docIdToUpdate
    );
  };

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
    <main className="flex min-h-screen flex-col items-center">
      <div className="w-1/2 m-4">
        <div className="flex">
          <Input
            className="mr-2"
            placeholder="Enter Document name."
            onChange={(e) => setDocumentName(e.target.value)}
          />
          <Button onClick={searchDocumentWithField}>Search</Button>
          <Button onClick={addDataWithAutoId}>Create</Button>
          <Button onClick={updateDocument}>Update</Button>
          <Button onClick={deleteDocument}>Delete</Button>
        </div>
      </div>
      <div className="w-1/2 m-4">{object?.name}</div>

      {user ? (
        <Button onClick={signOutWithGoogle}>Sign Out</Button>
      ) : (
        <Button onClick={signInWithGoogle}>Sign In</Button>
      )}
    </main>
  );
}
