import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare, Users } from 'lucide-react';
import React from 'react';

const Features = (): React.ReactNode => {
  return (
    <section className='border-t bg-muted/40 space-y-6 py-8 md:py-12 lg:py-24'>
      <div className='mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center'>
        <p className='max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7'>
          Yatırım dünyasında sosyal etkileşimin gücünü keşfedin
        </p>
      </div>
      <div className='mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-[64rem] md:grid-cols-2'>
        <Card className='p-6'>
          <CardContent className='space-y-2'>
            <MessageSquare className='h-12 w-12 text-blue-400' />
            <h3 className='font-bold text-slate-50'>Topluluk Tartışmaları</h3>
            <p className='text-sm text-slate-300'>
              Diğer yatırımcılarla görüşlerinizi paylaşın ve tartışmalara katılın
            </p>
          </CardContent>
        </Card>
        <Card className='p-6'>
          <CardContent className='space-y-2'>
            <Users className='h-12 w-12 text-blue-400' />
            <h3 className='font-bold text-slate-50'>Yatırımcı Ağı</h3>
            <p className='text-sm text-slate-300'>
              Deneyimli yatırımcılarla bağlantı kurun ve tecrübelerinden faydalanın
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default Features;
