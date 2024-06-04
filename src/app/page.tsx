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
import firebaseOperations from "@/services/firebase-service/firebase-operations";

import {
  TestCollection,
  TestCollectionEnum,
} from "@/services/firebase-service/types/collection-types";
import { CollectionPath } from "@/services/firebase-service/types/types";
import { WhereFieldEnum } from "@/services/firebase-service/firebase-operations-types";
import firebaseAuthService from "@/services/firebase-auth-service/firebase-auth-service";
import { setIsAuthenticated } from "@/store/reducers/auth-reducer/auth-slice";
import authReducerSelector from "@/store/reducers/auth-reducer/auth-reducer-selector";

export default function Home() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [docIdToUpdate, setDocIdToUpdate] = useState<string>("");
  const [documentName, setDocumentName] = useState<string>("");
  const [object, setObject] = useState<TestCollection>();

  const dispatch = useDispatch();
  const isLoading = useSelector(uiReducerSelector.getIsLoading);
  const isAuthenticated = useSelector(authReducerSelector.getIsAuthenticated);
  const loginMethod = useSelector(authReducerSelector.getLoginMethod);

  useEffect(() => {
    const fetchData = async () => {
      const { documents: docs, lastDocument } =
        await firebaseOperations.getDocumentsWithQuery({
          collectionPath: CollectionPath.Test,
          documentLimit: 2,
          orderByField: TestCollectionEnum.NAME,
        });
      console.log("🚀 ~ fetchData ~ docs:", docs);

      if (docs.length > 0 && lastDocument) {
        const { documents: startAfterDocs } =
          await firebaseOperations.getDocumentsWithQuery({
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
      await firebaseOperations.getDocumentsWithQuery({
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

    await firebaseOperations.createDocumentWithAutoId(
      CollectionPath.Test,
      data
    );
  };

  const addDataWithCustomId = async () => {
    const data: TestCollection = {
      name: "custom name",
    };

    await firebaseOperations.createDocumentWithCustomId(
      CollectionPath.Test,
      "customId",
      data
    );
  };

  const updateDocument = async () => {
    const data: TestCollection = {
      name: documentName,
    };

    await firebaseOperations.updateDocumentById(
      CollectionPath.Test,
      docIdToUpdate,
      data
    );
  };

  const deleteDocument = async () => {
    await firebaseOperations.deleteDocumentById(
      CollectionPath.Test,
      docIdToUpdate
    );
  };

  const toggleLoadingStatus = () => {
    dispatch(setIsLoading(!isLoading));
  };

  const logout = async () => {
    await firebaseAuthService.signOut();
    setIsAuthModalOpen(false);
    dispatch(setIsAuthenticated(false));
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

      <Button onClick={() => setIsAuthModalOpen(true)} variant="link">
        Open Login Modal
      </Button>
      <AuthModal
        isOpen={!isAuthenticated && isAuthModalOpen}
        onAuthModalOpenChange={() => setIsAuthModalOpen(!isAuthModalOpen)}
      />
      <div className="items-center p-10">
        <Label className="mr-5">{isLoading ? "loading" : "done"}</Label>
        <Button onClick={toggleLoadingStatus}>Toggle</Button>
        <div>
          <Label className="mt-5">
            {isAuthenticated
              ? "user is authenticated"
              : "user is not authenticated"}
          </Label>
          {isAuthenticated && <Button onClick={logout}>Logout</Button>}
        </div>
      </div>
    </main>
  );
}
