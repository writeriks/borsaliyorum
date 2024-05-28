"use client";

import { Button } from "@/components/ui/button";

import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase-config";
import { useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  User,
  signInWithPopup,
  signOut,
} from "firebase/auth";

export default function Home() {
  const [user, setUser] = useState<User>();

  useEffect(() => {
    const fetchData = async () => {
      const querySnapshot = await getDocs(collection(db, "test"));
      const docs = querySnapshot.docs.map((doc) => doc.data());
      console.log("🚀 ~ fetchData ~ docs:", docs);
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
