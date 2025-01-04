import { Button } from '@/components/ui/button';
import React from 'react';

const CallToAction = (): React.ReactNode => {
  return (
    <section className='border-t bg-muted/40'>
      <div className='container py-8 md:py-12 lg:py-24'>
        <div className='mx-auto flex max-w-[58rem] flex-col items-center justify-center gap-4 text-center'>
          <h2 className='font-heading text-3xl leading-[1.1] sm:text-3xl md:text-6xl'>
            Hemen Başlayın
          </h2>
          <p className='max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7'>
            Yatırım dünyasının sosyal boyutunu keşfetmek için bugün aramıza katılın.
          </p>
          <Button size='lg' className='mt-4'>
            Ücretsiz Hesap Oluştur
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CallToAction;
