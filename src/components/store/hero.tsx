"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowLeft, MoveUpRight } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";

const slides = [
  { kicker: "New season. Same you. More expression.", line1: "Wear your", line2: "own kind", line3: "of vibe.", text: "Fresh fits. Big energy. A little more you.", image: "/images/previews/men-4.jpg", alt: "Supplied collection preview: a cream polo styled with blue jeans", cta: "Find your fit", href: "/shop" },
  { kicker: "The festive edit", line1: "Big days.", line2: "Bolder", line3: "fits.", text: "For every celebration on your calendar.", image: "/images/previews/men-1.jpg", alt: "Supplied collection preview: a lavender printed shirt with cream trousers", cta: "Explore the edit", href: "/#festivals" },
  { kicker: "Made to be your favourite", line1: "Everyday", line2: "with a", line3: "little extra.", text: "Easy layers. Unmistakably your style.", image: "/images/previews/men-13.jpg", alt: "Supplied collection preview: a dark green knit polo", cta: "Discover more", href: "/shop" },
];

export function Hero() {
  const [emblaRef, embla] = useEmblaCarousel({ loop: true });
  const [selected, setSelected] = useState(0);
  const reducedMotion = useReducedMotion();
  const onSelect = useCallback(() => { if (embla) setSelected(embla.selectedScrollSnap()); }, [embla]);
  useEffect(() => { if (!embla) return; embla.on("select", onSelect); return () => { embla.off("select", onSelect); }; }, [embla, onSelect]);

  return <section className="hero" aria-label="Featured collections" aria-roledescription="carousel">
    <div className="hero-viewport" ref={emblaRef}><div className="hero-container">
      {slides.map((slide, i) => <div className={`hero-slide hero-slide-${i}`} key={slide.line1} role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${slides.length}`} inert={selected !== i}>
        <div className="hero-copy"><p className="eyebrow">{slide.kicker}</p>
          <motion.div initial={reducedMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
            {i === 0 ? <h1>{slide.line1}<br /><span className="outline-word">{slide.line2}</span><br />{slide.line3}</h1> : <h2>{slide.line1}<br /><span className="outline-word">{slide.line2}</span><br />{slide.line3}</h2>}
          </motion.div>
          <p className="hero-description">{slide.text}</p><Button asChild><Link href={slide.href}>{slide.cta}<ArrowRight /></Link></Button>
        </div>
        <div className="hero-photo"><Image src={slide.image} alt={slide.alt} fill sizes="(max-width: 640px) 70vw, 55vw" priority={i === 0} /><span className="photo-caption">The ThreadLabz edit / 01</span></div>
        <span className="hero-sticker" aria-hidden="true">Make<br />your mark<MoveUpRight size={18} /></span>
      </div>)}
    </div></div>
    <div className="hero-controls"><div className="hero-dots" aria-label="Choose a collection">{slides.map((_, i) => <button key={i} aria-label={`Go to collection ${i + 1}`} aria-pressed={selected === i} onClick={() => embla?.scrollTo(i)}><span /></button>)}</div><span className="slide-counter" aria-live="polite">0{selected + 1}<span> / 03</span></span><div className="hero-arrows"><button className="icon-button" aria-label="Previous collection" onClick={() => embla?.scrollPrev()}><ArrowLeft size={19} /></button><button className="icon-button" aria-label="Next collection" onClick={() => embla?.scrollNext()}><ArrowRight size={19} /></button></div></div>
  </section>;
}
