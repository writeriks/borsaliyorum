"use client";

import { Button } from "@/components/ui/button";

import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase-config";
import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    const fetchData = async () => {
      const querySnapshot = await getDocs(collection(db, "test"));
      const docs = querySnapshot.docs.map((doc) => doc.data());
      console.log("🚀 ~ fetchData ~ docs:", docs);
    };

    fetchData();
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-between">
      <Button>Test Button</Button>
    </main>
  );
}
