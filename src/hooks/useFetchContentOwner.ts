import { useEffect, useState } from 'react';
import userApiService from '@/services/api-service/user-api-service/user-api-service';
import { User } from '@prisma/client';

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
