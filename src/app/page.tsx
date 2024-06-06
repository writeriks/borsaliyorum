"use client";

import { useEffect, useState } from "react";

import { useDispatch, useSelector } from "react-redux";

import { auth } from "../services/firebase-service/firebase-config";
import {
  GoogleAuthProvider,
  User,
  signInWithPopup,
  signOut,
} from "firebase/auth";

import { AuthModal } from "@/components/auth/auth-modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

import { setIsLoading } from "@/store/reducers/ui-reducer/ui-slice";
import uiReducerSelector from "@/store/reducers/ui-reducer/ui-reducer-selector";
import fireBaseOperations from "@/services/firebase-service/firebase-operations";

import {
  TestCollection,
  TestCollectionEnum,
} from "@/services/firebase-service/types/collection-types";
import { CollectionPath } from "@/services/firebase-service/types/types";
import { WhereFieldEnum } from "@/services/firebase-service/firebase-operations-types";

export default function Home() {
  const [user, setUser] = useState<User>();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [docIdToUpdate, setDocIdToUpdate] = useState<string>("");
  const [documentName, setDocumentName] = useState<string>("");
  const [object, setObject] = useState<TestCollection>();

  const dispatch = useDispatch();
  const isLoading = useSelector(uiReducerSelector.getIsLoading);

  useEffect(() => {
    const fetchData = async () => {
      const { documents: docs, lastDocument } =
        await fireBaseOperations.getDocumentsWithQuery({
          collectionPath: CollectionPath.Test,
          documentLimit: 2,
          orderByField: TestCollectionEnum.NAME,
        });
      console.log("🚀 ~ fetchData ~ docs:", docs);

      if (docs.length > 0 && lastDocument) {
        const { documents: startAfterDocs } =
          await fireBaseOperations.getDocumentsWithQuery({
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
    const { documents: testDoc, lastDocument } =
      await fireBaseOperations.getDocumentsWithQuery({
        collectionPath: CollectionPath.Test,
        whereFields: [
          {
            field: TestCollectionEnum.NAME,
            operator: WhereFieldEnum.EQUALS,
            value: documentName,
          },
        ],
      });

    console.log(
      "🚀 ~ searchDocumentWithField ~ lastDocument:",
      lastDocument?.id
    );
    console.log("🚀 ~ searchDocumentWithField ~ testDoc[0]:", testDoc[0]);

    setObject(testDoc[0] as TestCollection);
    setDocIdToUpdate(lastDocument?.id || "");
  };
  const addDataWithAutoId = async () => {
    const data: TestCollection = {
      name: documentName,
    };

    await fireBaseOperations.createDocumentWithAutoId(
      CollectionPath.Test,
      data
    );
  };

  const addDataWithCustomId = async () => {
    const data: TestCollection = {
      name: "custom name",
    };

    await fireBaseOperations.createDocumentWithCustomId(
      CollectionPath.Test,
      "customId",
      data
    );
  };

  const updateDocument = async () => {
    const data: TestCollection = {
      name: documentName,
    };

    await fireBaseOperations.updateDocumentById(
      CollectionPath.Test,
      docIdToUpdate,
      data
    );
  };

  const deleteDocument = async () => {
    await fireBaseOperations.deleteDocumentById(
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

  const toggleLoadingStatus = () => {
    dispatch(setIsLoading(!isLoading));
  };

  return (
    <div className="flex flex-col items-center">
      <div className="m-4 flex">
        <div className="flex-col">
          <Input
            className="mb-2"
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

      <Button onClick={() => setIsAuthModalOpen(true)} variant="link">
        Open Login Modal
      </Button>
      <AuthModal
        isOpen={isAuthModalOpen}
        onAuthModalOpenChange={() => setIsAuthModalOpen(!isAuthModalOpen)}
      />
      <div className="flex items-center p-10">
        <Label className="mr-5">{isLoading ? "loading" : "done"}</Label>
        <Button onClick={toggleLoadingStatus}>Toggle</Button>
      </div>

      {user ? (
        <Button onClick={signOutWithGoogle}>Sign Out</Button>
      ) : (
        <Button onClick={signInWithGoogle}>Sign In</Button>
      )}
    </div>
  );
}
