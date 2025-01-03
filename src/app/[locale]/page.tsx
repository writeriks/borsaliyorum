import Hero from '@/components/hero/hero';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { verifyUserAuthenticationForServerPage } from '@/services/user-service/user-service';
import { generateRedirectUrl } from '@/utils/api-utils/api-utils';
import { Flame, MessageSquare, Users, TrendingUp } from 'lucide-react';
import { headers } from 'next/headers';

const Home = async (props: any): Promise<React.ReactNode> => {
  try {
    const currentUser = await verifyUserAuthenticationForServerPage();

    if (currentUser) {
      const redirectUrl = generateRedirectUrl(props.params.locale, '/feed', headers());
      return (
        <div>
          <meta httpEquiv='refresh' content={`0; url=${redirectUrl.toString()}`} />
        </div>
      );
    }
  } catch {
    // ignore error
  }

  return (
    <>
      <Hero />

      <section className='container space-y-6 py-8 md:py-12 lg:py-24'>
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

      <section className='container flex py-8 md:py-12 lg:py-24'>
        <div className='mx-auto items-center'>
          <div className='space-y-4'>
            <h2 className='font-heading text-3xl leading-[1.1] sm:text-3xl md:text-4xl'>
              Modern Yatırımcının Sosyal Platformu
            </h2>
            <p className='text-muted-foreground'>
              Kullanıcı dostu arayüzümüz ile piyasaları takip etmek ve toplulukla etkileşimde
              bulunmak artık çok daha kolay.
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
    </>
  );
};

export default Home;
