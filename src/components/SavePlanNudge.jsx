// /src/components/SavePlanNudge.jsx
"use client";

import { Paper, Text, Group } from '@mantine/core';
import { IconArrowBigDown} from '@tabler/icons-react';
import { motion } from 'framer-motion';
import classes from './SavePlanNudge.module.css'; // We will create this CSS module next

export function SavePlanNudge() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className={classes.nudgeContainer}
    >
      <Paper withBorder shadow="md" p="sm" radius="lg" className={classes.nudgePaper}>
        <Group gap="xs">
          <Text fw={500} size="sm">
            Don't forget to save your plan to unlock notes & quizzes!
          </Text>
          <IconArrowBigDown size={20} className={classes.arrowIcon} />
        </Group>
      </Paper>
    </motion.div>
  );
}