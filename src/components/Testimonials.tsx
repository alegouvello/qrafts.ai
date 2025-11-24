import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Testimonial {
  name: string;
  role: string;
  content: string;
  rating: number;
  avatar: string;
}

export const Testimonials = () => {
  const { t } = useTranslation();

  const testimonials: Testimonial[] = [
    {
      name: t('landing.testimonials.user1.name'),
      role: t('landing.testimonials.user1.role'),
      content: t('landing.testimonials.user1.content'),
      rating: 5,
      avatar: "SJ"
    },
    {
      name: t('landing.testimonials.user2.name'),
      role: t('landing.testimonials.user2.role'),
      content: t('landing.testimonials.user2.content'),
      rating: 5,
      avatar: "MR"
    },
    {
      name: t('landing.testimonials.user3.name'),
      role: t('landing.testimonials.user3.role'),
      content: t('landing.testimonials.user3.content'),
      rating: 5,
      avatar: "AC"
    }
  ];

  return (
    <section className="relative container mx-auto px-4 sm:px-6 py-16 sm:py-24" aria-labelledby="testimonials-heading">
      <div className="text-center mb-12 sm:mb-16 space-y-4">
        <div className="inline-block px-3 sm:px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs sm:text-sm font-medium mb-4">
          {t('landing.testimonials.badge')}
        </div>
        <h3 id="testimonials-heading" className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {t('landing.testimonials.title')}
          </span>
        </h3>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
          {t('landing.testimonials.subtitle')}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
        {testimonials.map((testimonial, index) => (
          <div
            key={index}
            className="group relative bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 sm:p-8 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 hover:scale-105"
          >
            {/* Quote decoration */}
            <div className="absolute top-4 right-4 text-6xl text-primary/10 font-serif leading-none">"</div>
            
            {/* Rating */}
            <div className="flex gap-1 mb-4">
              {Array.from({ length: testimonial.rating }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-accent text-accent" />
              ))}
            </div>

            {/* Content */}
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed mb-6 relative z-10">
              {testimonial.content}
            </p>

            {/* User info */}
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-sm shadow-lg">
                {testimonial.avatar}
              </div>
              <div>
                <p className="font-semibold text-foreground">{testimonial.name}</p>
                <p className="text-sm text-muted-foreground">{testimonial.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Stats bar */}
      <div className="mt-12 sm:mt-16 flex flex-wrap items-center justify-center gap-8 sm:gap-12">
        <div className="text-center">
          <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            4.9/5
          </div>
          <p className="text-sm text-muted-foreground mt-1">{t('landing.testimonials.averageRating')}</p>
        </div>
        <div className="h-12 w-px bg-border" />
        <div className="text-center">
          <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            500+
          </div>
          <p className="text-sm text-muted-foreground mt-1">{t('landing.testimonials.happyUsers')}</p>
        </div>
        <div className="h-12 w-px bg-border" />
        <div className="text-center">
          <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            98%
          </div>
          <p className="text-sm text-muted-foreground mt-1">{t('landing.testimonials.satisfaction')}</p>
        </div>
      </div>
    </section>
  );
};
