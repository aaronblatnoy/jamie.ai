/**
 * Spinner — pure CSS rotating ring.
 * Uses the .spinner utility class from index.css.
 * size: 'sm' renders .spinner--sm (18px); default 40px.
 */
import React from 'react';

export default function Spinner({ size }) {
  const cls = size === 'sm' ? 'spinner spinner--sm' : 'spinner';
  return <div className={cls} role="status" aria-label="Loading" />;
}
