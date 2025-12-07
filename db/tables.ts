/**
 * Novel Outliner - outline chapters and story beats for novels.
 *
 * Design goals:
 * - Focused on long-form novels (vs StoryCrafter which is more general).
 * - Support: Novel -> Parts (optional) -> Chapters -> Beats.
 * - Flexible enough to skip Parts (some novels only have chapters).
 */

import { defineTable, column, NOW } from "astro:db";

export const Novels = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    userId: column.text(),
    title: column.text(),
    subtitle: column.text({ optional: true }),
    genre: column.text({ optional: true }),
    targetAudience: column.text({ optional: true }),     // "YA", "Adult", etc.
    status: column.text({ optional: true }),             // "idea", "outlining", "drafting", "revising"
    logline: column.text({ optional: true }),            // one-sentence pitch
    notes: column.text({ optional: true }),
    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
  },
});

export const NovelParts = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    novelId: column.text({
      references: () => Novels.columns.id,
    }),
    orderIndex: column.number(),                         // 1, 2, 3...
    title: column.text({ optional: true }),              // "Part I - Beginnings"
    summary: column.text({ optional: true }),
    createdAt: column.date({ default: NOW }),
  },
});

export const NovelChapters = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    novelId: column.text({
      references: () => Novels.columns.id,
    }),
    partId: column.text({
      references: () => NovelParts.columns.id,
      optional: true,                                    // chapters can exist without parts
    }),
    orderIndex: column.number(),                         // chapter order
    title: column.text({ optional: true }),
    povCharacter: column.text({ optional: true }),       // point-of-view character
    summary: column.text({ optional: true }),
    wordCountGoal: column.number({ optional: true }),
    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
  },
});

export const NovelBeats = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    novelId: column.text({
      references: () => Novels.columns.id,
    }),
    chapterId: column.text({
      references: () => NovelChapters.columns.id,
      optional: true,
    }),
    orderIndex: column.number(),                         // ordering inside chapter/novel
    beatType: column.text({ optional: true }),           // "inciting-incident", "climax", "reveal", etc.
    description: column.text(),                          // what happens
    viewpoint: column.text({ optional: true }),          // internal notes for POV/emotion
    createdAt: column.date({ default: NOW }),
  },
});

export const tables = {
  Novels,
  NovelParts,
  NovelChapters,
  NovelBeats,
} as const;
