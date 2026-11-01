"use client";

import { motion } from 'framer-motion';
import styles from './landing-intro.module.css';

export function IntroTransition({ revealing, duration }: { revealing: boolean; duration: number }) {
  return <div className={styles.curtains} aria-hidden="true">
    {[-1, 1].map(direction => <motion.div key={direction}
      className={`${styles.curtain} ${direction < 0 ? styles.top : styles.bottom}`}
      initial={{ opacity: 0, y: '0%' }}
      animate={revealing ? { opacity: [0, 1, 1], y: ['0%', '0%', `${direction * 101}%`] } : { opacity: 0, y: '0%' }}
      transition={{ duration: duration / 1000, times: [0, 0.16, 1], ease: [0.76, 0, 0.24, 1] }}
    />)}
  </div>;
}
