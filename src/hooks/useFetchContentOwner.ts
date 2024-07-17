import { useEffect, useState } from 'react';
import userService from '@/services/user-service/user-service';
import { User } from '@/services/firebase-service/types/db-types/user';

const useFetchContentOwner = (userId: string): User | undefined => {
  const [contentOwner, setContentOwner] = useState<User>();

  useEffect(() => {
    const fetchUser = async (): Promise<void> => {
      const fetchedUser = await userService.getUserById(userId);
      if (fetchedUser) {
        setContentOwner(fetchedUser);
      }
    };

    fetchUser();
  }, [userId]);

  return contentOwner;
};

export default useFetchContentOwner;
