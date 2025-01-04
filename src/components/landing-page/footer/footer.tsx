import React from 'react';
import { LineChartIcon } from 'lucide-react';

const Footer = (): React.ReactNode => {
  return (
    <footer className='border-t border-gray-700 py-6 md:py-0'>
      <div className='container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row'>
        <div className='flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0'>
          <LineChartIcon className='h-6 w-6 text-gray-100' />
          <p className='text-center text-sm leading-loose text-gray-300 md:text-left'>
            Built by{' '}
            <a
              href='/'
              target='_blank'
              rel='noreferrer'
              className='font-medium text-gray-100 underline underline-offset-4'
            >
              Borsalıyorum
            </a>
            . The source code is available on
            <a
              href='#'
              target='_blank'
              rel='noreferrer'
              className='font-medium text-gray-100 underline underline-offset-4'
            >
              GitHub
            </a>
            .
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
