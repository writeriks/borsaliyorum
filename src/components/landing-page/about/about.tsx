import { Flame, MessageSquare, Users } from 'lucide-react';
import React from 'react';

const About = (): React.ReactNode => {
  return (
    <section className='container flex py-8 md:py-12 lg:py-24'>
      <div className='mx-auto items-center'>
        <div className='space-y-4'>
          <h2 className='font-heading text-3xl leading-[1.1] sm:text-3xl md:text-4xl'>
            Modern Yatırımcının Sosyal Platformu
          </h2>
          <p className='text-muted-foreground'>
            Kullanıcı dostu arayüzümüz ile piyasaları takip etmek ve toplulukla etkileşimde bulunmak
            artık çok daha kolay.
          </p>
          <ul className='grid gap-2'>
            <li className='flex items-center gap-2'>
              <Flame className='h-4 w-4 text-primary' />
              <span>Trend olan hisseleri keşfedin</span>
            </li>
            <li className='flex items-center gap-2'>
              <MessageSquare className='h-4 w-4 text-primary' />
              <span>Anlık piyasa yorumlarına ulaşın</span>
            </li>
            <li className='flex items-center gap-2'>
              <Users className='h-4 w-4 text-primary' />
              <span>Yatırımcı topluluğuna katılın</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
};

export default About;
