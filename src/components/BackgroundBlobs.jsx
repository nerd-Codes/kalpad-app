// src/components/BackgroundBlobs.jsx
"use client";
import { Box } from '@mantine/core';
import classes from './BackgroundBlobs.module.css';

export function BackgroundBlobs() {
  return (
    <Box className={classes.background}>
      <Box className={`${classes.blob} ${classes.blob1}`} />
      <Box className={`${classes.blob} ${classes.blob2}`} />
      <Box className={`${classes.blob} ${classes.blob3}`} />
    </Box>
  );
}