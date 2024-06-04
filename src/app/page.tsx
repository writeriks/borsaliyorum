"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

import firebaseService from "@/services/firebase-service/firebase-service";
import { CollectionPath } from "@/services/firebase-service/types/types";
import {
  TestCollection,
  TestCollectionEnum,
} from "@/services/firebase-service/types/collection-types";
import { Input } from "@/components/ui/input";
import { AuthModal } from "@/components/auth/auth-modal";
import { useDispatch, useSelector } from "react-redux";
import { setIsLoading } from "@/store/reducers/ui-reducer/ui-slice";
import uiReducerSelector from "@/store/reducers/ui-reducer/ui-reducer-selector";
import { Label } from "@/components/ui/label";
import authReducerSelector from "@/store/reducers/auth-reducer/auth-reducer-selector";
import {
  LoginMethod,
  setIsAuthenticated,
} from "@/store/reducers/auth-reducer/auth-slice";
import firebaseAuthService from "@/services/firebase-auth-service/firebase-auth-service";

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
        await firebaseService.getDocumentsFromCollectionWithLimit({
          collectionPath: CollectionPath.Test,
          documentLimit: 2,
          orderByField: TestCollectionEnum.NAME,
        });
      console.log("🚀 ~ fetchData ~ docs:", docs);

      if (docs.length > 0 && lastDocument) {
        const { documents: startAfterDocs } =
          await firebaseService.getDocumentsFromCollectionWithLimit({
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
      await firebaseService.getDocumentByField({
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

    await firebaseService.createDocumentWithAutoId(CollectionPath.Test, data);
  };

  const addDataWithCustomId = async () => {
    const data: TestCollection = {
      name: "custom name",
    };

    await firebaseService.createDocumentWithCustomId(
      CollectionPath.Test,
      "customId",
      data
    );
  };

  const updateDocument = async () => {
    const data: TestCollection = {
      name: documentName,
    };

    await firebaseService.updateDocumentById(
      CollectionPath.Test,
      docIdToUpdate,
      data
    );
  };

  const deleteDocument = async () => {
    await firebaseService.deleteDocumentById(
      CollectionPath.Test,
      docIdToUpdate
    );
  };

  const toggleLoadingStatus = () => {
    dispatch(setIsLoading(!isLoading));
  };

  const logout = async () => {
    await firebaseAuthService.signOut();
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
