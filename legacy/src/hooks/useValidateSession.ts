import userApiService from '@/services/api-service/user-api-service/user-api-service';
import { auth } from '@/services/firebase-service/firebase-config';
import { useQuery } from '@tanstack/react-query';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useEffect, useState } from 'react';

const useValidateSession = (): void => {
  const [user, setUser] = useState<User>();

  const { refetch } = useQuery({
    queryKey: ['validate-user'],
    queryFn: () => userApiService.validateUser(user as User),
    enabled: false,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async fbUser => {
      if (fbUser?.displayName) {
        setUser(fbUser);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user?.email) {
      refetch();
    }
  }, [user?.email, refetch]);
};

export default useValidateSession;
