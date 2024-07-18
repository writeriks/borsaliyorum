import { useEffect, useState } from 'react';
import { User } from '@/services/firebase-service/types/db-types/user';
import userApiService from '@/services/api-service/user-api-service/user-api-service';

const useFetchContentOwner = (userId: string): User | undefined => {
  const [contentOwner, setContentOwner] = useState<User>();

  useEffect(() => {
    const fetchUser = async (): Promise<void> => {
      const fetchedUser = await userApiService.getUserById(userId);
      if (fetchedUser) {
        setContentOwner(fetchedUser);
      }
    };

    fetchUser();
  }, [userId]);

  return contentOwner;
};

export default useFetchContentOwner;
