import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

import { Home, Compass, Search, User } from 'lucide-react';

import {
  ActiveSideBar,
  setActiveSideBar,
  setIsSearchModalOpen,
  toggleHamburgerMenuOpen,
} from '@/store/reducers/ui-reducer/ui-slice';
import { useRouter } from '@/i18n/routing';
import useUser from '@/hooks/useUser';

enum ActiveTabEnum {
  FEED = 'feed',
  DISCOVER = 'discover',
  SEARCH = 'search',
  PROFILE = 'profile',
  USERS = 'users',
  NOTIFICATIOS = 'notifications',
  EDIT_PROFILE = 'edit-profile',
  SETTINGS = 'settings',
}

const TabBarController: React.FC = () => {
  const [activeTab, setActiveTab] = useState(ActiveTabEnum.FEED);

  const dispatch = useDispatch();

  const { currentUser } = useUser();

  const router = useRouter();

  const path = window.location.pathname.split('/')[2];
  useEffect(() => {
    switch (path) {
      case ActiveTabEnum.DISCOVER:
        setActiveTab(ActiveTabEnum.DISCOVER);
        break;
      case ActiveTabEnum.SEARCH:
        setActiveTab(ActiveTabEnum.SEARCH);
        break;
      case ActiveTabEnum.USERS:
      case ActiveTabEnum.PROFILE:
      case ActiveTabEnum.NOTIFICATIOS:
      case ActiveTabEnum.EDIT_PROFILE:
      case ActiveTabEnum.SETTINGS:
        setActiveTab(ActiveTabEnum.PROFILE);
        break;
      case ActiveTabEnum.FEED:
      default:
        setActiveTab(ActiveTabEnum.FEED);
        break;
    }
  }, [path]);

  const onTabClick = (tab: ActiveTabEnum): void => {
    setActiveTab(tab);
    dispatch(setIsSearchModalOpen(false));

    switch (tab) {
      case ActiveTabEnum.FEED:
        router.push('/feed');
        break;
      case ActiveTabEnum.DISCOVER:
        dispatch(toggleHamburgerMenuOpen());
        dispatch(setActiveSideBar(ActiveSideBar.DISCOVER));
        break;
      case ActiveTabEnum.SEARCH:
        dispatch(setIsSearchModalOpen(true));
        break;
      case ActiveTabEnum.PROFILE:
        router.push(`/users/${currentUser?.username}`);
        break;
      default:
        break;
    }
  };

  return (
    <div className='flex h-full flex-col mt-12 '>
      <nav className='fixed -bottom-1 py-1 z-10 flex w-full bg-background shadow-lg'>
        <button
          className={`flex-1 py-1 text-center transition-colors ${
            activeTab === ActiveTabEnum.FEED
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
          onClick={() => onTabClick(ActiveTabEnum.FEED)}
        >
          <div className='flex flex-col items-center gap-1'>
            <Home className='h-6 w-6' />
            <span className='text-xs font-medium'>Akış</span>
          </div>
        </button>
        <button
          className={`flex-1 py-1 text-center transition-colors ${
            activeTab === ActiveTabEnum.DISCOVER
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
          onClick={() => onTabClick(ActiveTabEnum.DISCOVER)}
        >
          <div className='flex flex-col items-center gap-1'>
            <Compass className='h-6 w-6' />
            <span className='text-xs font-medium'>Keşfet</span>
          </div>
        </button>
        <button
          className={`flex-1 py-1 text-center transition-colors ${
            activeTab === ActiveTabEnum.SEARCH
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
          onClick={() => onTabClick(ActiveTabEnum.SEARCH)}
        >
          <div className='flex flex-col items-center gap-1'>
            <Search className='h-6 w-6' />
            <span className='text-xs font-medium'>Ara</span>
          </div>
        </button>
        <button
          className={`flex-1 py-1 text-center transition-colors ${
            activeTab === ActiveTabEnum.PROFILE
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
          onClick={() => onTabClick(ActiveTabEnum.PROFILE)}
        >
          <div className='flex flex-col items-center gap-1'>
            <User className='h-6 w-6' />
            <span className='text-xs font-medium'>Profil</span>
          </div>
        </button>
      </nav>
    </div>
  );
};

export default TabBarController;
