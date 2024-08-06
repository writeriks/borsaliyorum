import React, { useEffect, useState } from 'react';
import { Home, Compass, Search, User } from 'lucide-react';

enum ActiveTabEnum {
  FEED = 'feed',
  DISCOVER = 'discover',
  SEARCH = 'search',
  PROFILE = 'profile',
}

const TabBarController: React.FC = () => {
  const [activeTab, setActiveTab] = useState('feed');

  const path = window.location.pathname.split('/')[1];

  useEffect(() => {
    switch (path) {
      case ActiveTabEnum.DISCOVER:
        setActiveTab(ActiveTabEnum.DISCOVER);
        break;
      case ActiveTabEnum.SEARCH:
        setActiveTab(ActiveTabEnum.SEARCH);
        break;
      case ActiveTabEnum.PROFILE:
        setActiveTab(ActiveTabEnum.PROFILE);
        break;
      case ActiveTabEnum.FEED:
        setActiveTab(ActiveTabEnum.FEED);
        break;
      default:
        break;
    }
  }, [path]);

  const onTabClick = (tab: ActiveTabEnum): void => {
    setActiveTab(tab);
    window.location.pathname = `/${tab}`;
  };

  return (
    <div className='flex h-full flex-col  '>
      <nav className='fixed bottom-0 z-10 flex w-full bg-background shadow-lg'>
        <button
          className={`flex-1 py-1 text-center transition-colors ${
            activeTab === 'feed'
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
            activeTab === 'discover'
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
            activeTab === 'search'
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
            activeTab === 'profile'
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
